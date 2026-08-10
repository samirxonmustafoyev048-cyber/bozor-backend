import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function last14Days(): string[] {
  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(dayKey(d));
  }
  return days;
}

function trendPercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    const window14Start = new Date(now);
    window14Start.setDate(window14Start.getDate() - 13);
    window14Start.setHours(0, 0, 0, 0);
    const prevWindow14Start = new Date(window14Start);
    prevWindow14Start.setDate(prevWindow14Start.getDate() - 14);

    const [
      totalOrders,
      totalUsers,
      totalProducts,
      revenueAgg,
      statusGroups,
      topItems,
      currentMonthOrders,
      previousMonthOrders,
      recentOrders,
      lowStockProducts,
      recentOrdersRaw,
      priorOrdersRaw,
      recentUsersRaw,
      priorUsersRaw,
      recentProductsRaw,
      priorProductsRaw,
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
      this.prisma.order.findMany({
        where: { paid: true, createdAt: { gte: currentMonthStart } },
        select: { totalPrice: true, createdAt: true },
      }),
      this.prisma.order.findMany({
        where: {
          paid: true,
          createdAt: { gte: previousMonthStart, lt: currentMonthStart },
        },
        select: { totalPrice: true, createdAt: true },
      }),
      this.prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: true, items: true },
      }),
      this.prisma.product.findMany({
        where: { stock: { lt: 20 } },
        orderBy: { stock: 'asc' },
        take: 5,
        include: { category: true },
      }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: window14Start } },
        select: { totalPrice: true, createdAt: true, paid: true },
      }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: prevWindow14Start, lt: window14Start } },
        select: { totalPrice: true, createdAt: true, paid: true },
      }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: window14Start } },
        select: { createdAt: true },
      }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: prevWindow14Start, lt: window14Start } },
        select: { createdAt: true },
      }),
      this.prisma.product.findMany({
        where: { createdAt: { gte: window14Start } },
        select: { createdAt: true },
      }),
      this.prisma.product.findMany({
        where: { createdAt: { gte: prevWindow14Start, lt: window14Start } },
        select: { createdAt: true },
      }),
    ]);

    const products = await this.prisma.product.findMany({
      where: { id: { in: topItems.map((t) => t.productId) } },
    });
    const productById = new Map(products.map((p) => [p.id, p]));

    const sumByDay = (orders: { totalPrice: number; createdAt: Date }[]) => {
      const map = new Map<number, number>();
      for (const o of orders) {
        const day = o.createdAt.getDate();
        map.set(day, (map.get(day) ?? 0) + o.totalPrice);
      }
      return map;
    };
    const currentByDay = sumByDay(currentMonthOrders);
    const previousByDay = sumByDay(previousMonthOrders);
    const daysInCurrentMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();
    const dailySales = Array.from({ length: daysInCurrentMonth }, (_, i) => {
      const day = i + 1;
      return {
        day,
        current: currentByDay.get(day) ?? 0,
        previous: previousByDay.get(day) ?? 0,
      };
    });

    const days = last14Days();
    const countByDay = (dates: Date[]) => {
      const map = new Map<string, number>();
      for (const d of dates) {
        const k = dayKey(d);
        map.set(k, (map.get(k) ?? 0) + 1);
      }
      return days.map((k) => map.get(k) ?? 0);
    };
    const sumPriceByDay = (rows: { totalPrice: number; createdAt: Date }[]) => {
      const map = new Map<string, number>();
      for (const r of rows) {
        const k = dayKey(r.createdAt);
        map.set(k, (map.get(k) ?? 0) + r.totalPrice);
      }
      return days.map((k) => map.get(k) ?? 0);
    };

    const ordersSparkline = countByDay(recentOrdersRaw.map((o) => o.createdAt));
    const revenueSparkline = sumPriceByDay(
      recentOrdersRaw.filter((o) => o.paid),
    );
    const usersSparkline = countByDay(recentUsersRaw.map((u) => u.createdAt));
    const productsSparkline = countByDay(
      recentProductsRaw.map((p) => p.createdAt),
    );

    const trends = {
      orders: trendPercent(recentOrdersRaw.length, priorOrdersRaw.length),
      revenue: trendPercent(
        recentOrdersRaw.filter((o) => o.paid).reduce((s, o) => s + o.totalPrice, 0),
        priorOrdersRaw.filter((o) => o.paid).reduce((s, o) => s + o.totalPrice, 0),
      ),
      users: trendPercent(recentUsersRaw.length, priorUsersRaw.length),
      products: trendPercent(recentProductsRaw.length, priorProductsRaw.length),
    };

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
      dailySales,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.user?.name ?? 'Mehmon',
        itemCount: o.items.length,
        totalPrice: o.totalPrice,
        status: o.status,
        createdAt: o.createdAt,
      })),
      lowStockProducts: lowStockProducts.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        stock: p.stock,
        imageUrl: p.imageUrl,
        category: p.category,
      })),
      trends,
      sparklines: {
        orders: ordersSparkline,
        revenue: revenueSparkline,
        users: usersSparkline,
        products: productsSparkline,
      },
    };
  }

  async getDeliveryStats() {
    const now = new Date();
    const window14Start = new Date(now);
    window14Start.setDate(window14Start.getDate() - 13);
    window14Start.setHours(0, 0, 0, 0);
    const prevWindow14Start = new Date(window14Start);
    prevWindow14Start.setDate(prevWindow14Start.getDate() - 14);
    const window7Start = new Date(now);
    window7Start.setDate(window7Start.getDate() - 6);
    window7Start.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      statusGroups,
      revenueAgg,
      couriers,
      activeAssignments,
      recentOrders,
      branches,
      deliveredLast7,
      recentOrdersRaw,
      priorOrdersRaw,
      deliveredForDuration,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.order.aggregate({
        where: { paid: true },
        _sum: { totalPrice: true },
      }),
      this.prisma.courier.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.order.groupBy({
        by: ['courierId'],
        where: {
          courierId: { not: null },
          status: { in: ['TAYYORLANMOQDA', 'YOLDA'] },
        },
        _count: { _all: true },
      }),
      this.prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { user: true, items: true, courier: true },
      }),
      this.prisma.branch.findMany(),
      this.prisma.order.findMany({
        where: { status: 'YETKAZILDI', updatedAt: { gte: window7Start } },
        select: { updatedAt: true },
      }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: window14Start } },
        select: { status: true, totalPrice: true, paid: true },
      }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: prevWindow14Start, lt: window14Start } },
        select: { status: true, totalPrice: true, paid: true },
      }),
      this.prisma.order.findMany({
        where: { status: 'YETKAZILDI' },
        select: { createdAt: true, updatedAt: true },
        take: 200,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const assignmentByCourier = new Map(
      activeAssignments.map((a) => [a.courierId, a._count._all]),
    );
    const statusCount = (status: string) =>
      statusGroups.find((g) => g.status === status)?._count._all ?? 0;

    const days7: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days7.push(dayKey(d));
    }
    const deliveredByDay = new Map<string, number>();
    for (const o of deliveredLast7) {
      const k = dayKey(o.updatedAt);
      deliveredByDay.set(k, (deliveredByDay.get(k) ?? 0) + 1);
    }
    const deliveryTrend = days7.map((k) => ({
      date: k,
      count: deliveredByDay.get(k) ?? 0,
    }));

    const countIn = (rows: { status: string }[], statuses: string[]) =>
      rows.filter((r) => statuses.includes(r.status)).length;
    const revenueIn = (rows: { paid: boolean; totalPrice: number }[]) =>
      rows.filter((r) => r.paid).reduce((s, r) => s + r.totalPrice, 0);

    const trends = {
      totalOrders: trendPercent(recentOrdersRaw.length, priorOrdersRaw.length),
      delivering: trendPercent(
        countIn(recentOrdersRaw, ['YOLDA']),
        countIn(priorOrdersRaw, ['YOLDA']),
      ),
      delivered: trendPercent(
        countIn(recentOrdersRaw, ['YETKAZILDI']),
        countIn(priorOrdersRaw, ['YETKAZILDI']),
      ),
      cancelled: trendPercent(
        countIn(recentOrdersRaw, ['BEKOR_QILINDI']),
        countIn(priorOrdersRaw, ['BEKOR_QILINDI']),
      ),
      revenue: trendPercent(revenueIn(recentOrdersRaw), revenueIn(priorOrdersRaw)),
    };

    const avgDeliveryMinutes =
      deliveredForDuration.length > 0
        ? Math.round(
            deliveredForDuration.reduce(
              (sum, o) =>
                sum + (o.updatedAt.getTime() - o.createdAt.getTime()) / 60000,
              0,
            ) / deliveredForDuration.length,
          )
        : 0;
    const avgCourierEfficiency =
      couriers.length > 0
        ? Math.round(
            couriers.reduce((sum, c) => sum + c.efficiencyPercent, 0) /
              couriers.length,
          )
        : 0;

    return {
      totalOrders,
      totalRevenue: revenueAgg._sum.totalPrice ?? 0,
      statusCounts: {
        kuryerda: statusCount('TAYYORLANMOQDA'),
        yetkazilmoqda: statusCount('YOLDA'),
        yetkazildi: statusCount('YETKAZILDI'),
        bekorQilingan: statusCount('BEKOR_QILINDI'),
      },
      trends,
      activeCouriers: couriers.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        efficiencyPercent: c.efficiencyPercent,
        activeOrders: assignmentByCourier.get(c.id) ?? 0,
      })),
      onlineCourierCount: couriers.filter((c) => c.status === 'ONLINE').length,
      avgDeliveryMinutes,
      avgCourierEfficiency,
      deliveryTrend,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.user?.name ?? 'Mehmon',
        address: o.address,
        courierName: o.courier?.name ?? null,
        itemCount: o.items.length,
        totalPrice: o.totalPrice,
        status: o.status,
        createdAt: o.createdAt,
      })),
      branches: branches.map((b) => ({
        id: b.id,
        name: b.name,
        address: b.address,
        lat: b.lat,
        lng: b.lng,
      })),
    };
  }

  async getPayments() {
    const payments = await this.prisma.payment.findMany({
      orderBy: { createTime: 'desc' },
      take: 100,
      include: { order: { include: { user: true } } },
    });

    const totalCollected = payments
      .filter((p) => p.state === 2)
      .reduce((sum, p) => sum + p.amount, 0);
    const pendingCount = payments.filter((p) => p.state === 1).length;
    const cancelledCount = payments.filter((p) => p.state < 0).length;

    return {
      totalCollected,
      pendingCount,
      cancelledCount,
      totalCount: payments.length,
      payments: payments.map((p) => ({
        id: p.id,
        provider: p.provider,
        amount: p.amount,
        state: p.state,
        orderNumber: p.order.orderNumber,
        customerName: p.order.user?.name ?? 'Mehmon',
        createTime: p.createTime,
        performTime: p.performTime,
        cancelTime: p.cancelTime,
      })),
    };
  }
}
