import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({ where: { slug } });
    if (!category) {
      throw new NotFoundException(`"${slug}" kategoriyasi topilmadi`);
    }
    return category;
  }

  create(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.ensureExists(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);

    // The database would refuse this delete anyway; counting first lets us say
    // what is in the way and how much of it, instead of a generic conflict.
    const [products, children] = await Promise.all([
      this.prisma.product.count({ where: { categoryId: id } }),
      this.prisma.category.count({ where: { parentId: id } }),
    ]);

    if (products > 0 || children > 0) {
      const blockers = [
        products > 0 ? `${products} ta mahsulot` : null,
        children > 0 ? `${children} ta ichki kategoriya` : null,
      ].filter(Boolean);

      throw new ConflictException(
        `Bu kategoriyani o'chirib bo'lmaydi: unda ${blockers.join(' va ')} bor. ` +
          `Avval ularni boshqa kategoriyaga ko'chiring yoki o'chiring.`,
      );
    }

    await this.prisma.category.delete({ where: { id } });
    return { success: true };
  }

  private async ensureExists(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Kategoriya (id: ${id}) topilmadi`);
    }
  }
}
