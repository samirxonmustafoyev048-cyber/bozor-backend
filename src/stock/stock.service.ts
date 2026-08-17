import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementType } from '../../generated/prisma/enums';
import { AdjustStockDto } from './dto/adjust-stock.dto';

/** Below this a product is flagged for reordering in the warehouse panel. */
const LOW_STOCK_THRESHOLD = 10;

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  async overview(search?: string) {
    const products = await this.prisma.product.findMany({
      where: search
        ? { name: { contains: search } }
        : undefined,
      include: { category: true },
      orderBy: { stock: 'asc' },
    });

    return {
      lowStockThreshold: LOW_STOCK_THRESHOLD,
      outOfStock: products.filter((p) => p.stock <= 0).length,
      lowStock: products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD)
        .length,
      totalUnits: products.reduce((sum, p) => sum + p.stock, 0),
      products,
    };
  }

  movements(productId?: string) {
    return this.prisma.stockMovement.findMany({
      where: productId ? { productId } : undefined,
      include: { product: { select: { name: true, unit: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async adjust(productId: string, dto: AdjustStockDto, actorName: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Mahsulot (id: ${productId}) topilmadi`);
    }

    // CHIQIM removes stock, the other two add it; TUZATISH is a manual
    // correction upwards after a recount.
    const delta =
      dto.type === StockMovementType.CHIQIM ? -dto.quantity : dto.quantity;
    const stockAfter = product.stock + delta;

    if (stockAfter < 0) {
      throw new BadRequestException(
        `Zaxirada faqat ${product.stock} ${product.unit} bor`,
      );
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.product.update({
        where: { id: productId },
        data: { stock: stockAfter },
      }),
      this.prisma.stockMovement.create({
        data: {
          productId,
          type: dto.type,
          quantity: dto.quantity,
          stockAfter,
          reason: dto.reason,
          actorName,
        },
      }),
    ]);

    return updated;
  }
}
