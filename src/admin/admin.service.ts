import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [
      totalOrders,
      totalUsers,
      totalProducts,
      revenueAgg,
      statusGroups,
      topItems,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.user.count(),
      this.prisma.product.count(),
      this.prisma.order.aggregate({
        where: { paid: true },
        _sum: { totalPrice: true },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    const products = await this.prisma.product.findMany({
      where: { id: { in: topItems.map((t) => t.productId) } },
    });
    const productById = new Map(products.map((p) => [p.id, p]));

    return {
      totalOrders,
      totalUsers,
      totalProducts,
      totalRevenue: revenueAgg._sum.totalPrice ?? 0,
      ordersByStatus: statusGroups.map((g) => ({
        status: g.status,
        count: g._count._all,
      })),
      popularProducts: topItems.map((t) => ({
        product: productById.get(t.productId),
        totalSold: t._sum.quantity ?? 0,
      })),
    };
  }
}
