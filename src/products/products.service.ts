import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryProductDto) {
    const where: Prisma.ProductWhereInput = {};

    if (query.category) {
      where.category = { slug: query.category };
    }
    if (query.discountOnly) {
      where.discountPrice = { not: null };
    }
    if (query.q) {
      where.name = { contains: query.q };
    }

    const all = await this.prisma.product.findMany({
      where,
      include: { category: true },
    });

    const effectivePrice = (p: (typeof all)[number]) =>
      p.discountPrice ?? p.price;

    let filtered = all.filter((p) => {
      const price = effectivePrice(p);
      if (query.minPrice !== undefined && price < query.minPrice) return false;
      if (query.maxPrice !== undefined && price > query.maxPrice) return false;
      return true;
    });

    switch (query.sort) {
      case 'price-asc':
        filtered = filtered.sort(
          (a, b) => effectivePrice(a) - effectivePrice(b),
        );
        break;
      case 'price-desc':
        filtered = filtered.sort(
          (a, b) => effectivePrice(b) - effectivePrice(a),
        );
        break;
      case 'new':
        filtered = filtered.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        );
        break;
      case 'popular':
      default:
        filtered = filtered.sort(
          (a, b) => Number(b.isPopular) - Number(a.isPopular),
        );
        break;
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return {
      items,
      total: filtered.length,
      page,
      pageSize,
    };
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { category: true },
    });
    if (!product) {
      throw new NotFoundException(`"${slug}" mahsuloti topilmadi`);
    }
    return product;
  }

  async findRelated(slug: string, limit = 5) {
    const product = await this.findBySlug(slug);
    return this.prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
      },
      take: limit,
    });
  }

  create(dto: CreateProductDto) {
    return this.prisma.product.create({ data: dto });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.ensureExists(id);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.product.delete({ where: { id } });
    return { success: true };
  }

  private async ensureExists(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Mahsulot (id: ${id}) topilmadi`);
    }
  }
}
