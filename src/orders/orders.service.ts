import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryType } from '../../generated/prisma/enums';
import { SettingsService } from '../settings/settings.service';
import { PromoCodesService } from '../promo-codes/promo-codes.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

function generateOrderNumber(): string {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `BZR-${random}`;
}

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
    private promoCodesService: PromoCodesService,
    private notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateOrderDto, authUserId?: string) {
    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException("Savatdagi ba'zi mahsulotlar topilmadi");
    }

    const priceById = new Map(
      products.map((p) => [p.id, p.discountPrice ?? p.price]),
    );

    const subtotal = dto.items.reduce(
      (sum, item) => sum + priceById.get(item.productId)! * item.quantity,
      0,
    );
    const settings = await this.settingsService.get();
    const deliveryFee =
      dto.deliveryType === DeliveryType.YETKAZISH
        ? settings.deliveryFee
        : 0;

    let discountAmount = 0;
    if (dto.promoCode) {
      const result = await this.promoCodesService.validate(
        dto.promoCode,
        subtotal,
      );
      discountAmount = result.discountAmount;
    }

    const order = await this.prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        deliveryType: dto.deliveryType,
        address: dto.address,
        branchId: dto.branchId,
        phone: dto.phone,
        paymentMethod: dto.paymentMethod,
        userId: authUserId ?? dto.userId,
        deliveryFee,
        discountAmount,
        promoCode: dto.promoCode?.toUpperCase(),
        totalPrice: Math.max(0, subtotal + deliveryFee - discountAmount),
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: priceById.get(item.productId)!,
          })),
        },
      },
      include: { items: { include: { product: true } }, branch: true },
    });

    if (dto.promoCode) {
      await this.promoCodesService.incrementUsage(dto.promoCode);
    }

    await this.notificationsService.emit(
      'Yangi buyurtma',
      `${order.orderNumber} — ${order.totalPrice} so'm, ${order.phone}`,
    );

    return order;
  }

  findAll(userId?: string) {
    return this.prisma.order.findMany({
      where: userId ? { userId } : undefined,
      include: { items: { include: { product: true } }, branch: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(idOrNumber: string) {
    const order = await this.prisma.order.findFirst({
      where: { OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }] },
      include: { items: { include: { product: true } }, branch: true },
    });
    if (!order) {
      throw new NotFoundException(`Buyurtma (${idOrNumber}) topilmadi`);
    }
    return order;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    await this.findOne(id);
    return this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
    });
  }
}
