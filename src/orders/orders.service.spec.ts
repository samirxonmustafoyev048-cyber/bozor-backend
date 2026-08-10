import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { PromoCodesService } from '../promo-codes/promo-codes.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('OrdersService', () => {
  let prisma: {
    product: { findMany: jest.Mock };
    order: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };
  let settingsService: { get: jest.Mock };
  let promoCodesService: { validate: jest.Mock; incrementUsage: jest.Mock };
  let notificationsService: { emit: jest.Mock };
  let service: OrdersService;

  beforeEach(() => {
    prisma = {
      product: { findMany: jest.fn() },
      order: {
        create: jest.fn((args: { data: unknown }) => args.data),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    settingsService = { get: jest.fn().mockResolvedValue({ deliveryFee: 15000 }) };
    promoCodesService = {
      validate: jest.fn(),
      incrementUsage: jest.fn(),
    };
    notificationsService = { emit: jest.fn().mockResolvedValue(undefined) };
    service = new OrdersService(
      prisma as unknown as PrismaService,
      settingsService as unknown as SettingsService,
      promoCodesService as unknown as PromoCodesService,
      notificationsService as unknown as NotificationsService,
    );
  });

  it('charges the discounted price when a product has one, and adds the delivery fee for home delivery', async () => {
    prisma.product.findMany.mockResolvedValue([
      { id: 'p1', price: 20000, discountPrice: 15000 },
      { id: 'p2', price: 5000, discountPrice: null },
    ]);

    const order = await service.create({
      deliveryType: 'YETKAZISH',
      address: 'Toshkent',
      phone: '+998900000000',
      paymentMethod: 'NAQD',
      items: [
        { productId: 'p1', quantity: 2 },
        { productId: 'p2', quantity: 1 },
      ],
    } as never);

    // 2 * 15000 (discounted) + 1 * 5000 + 15000 delivery fee = 50000
    expect(order.deliveryFee).toBe(15000);
    expect(order.totalPrice).toBe(50000);
  });

  it('does not charge a delivery fee for branch pickup', async () => {
    prisma.product.findMany.mockResolvedValue([
      { id: 'p1', price: 10000, discountPrice: null },
    ]);

    const order = await service.create({
      deliveryType: 'OLIB_KETISH',
      branchId: 'branch-1',
      phone: '+998900000000',
      paymentMethod: 'NAQD',
      items: [{ productId: 'p1', quantity: 1 }],
    } as never);

    expect(order.deliveryFee).toBe(0);
    expect(order.totalPrice).toBe(10000);
  });

  it('rejects an order that references a product that no longer exists', async () => {
    prisma.product.findMany.mockResolvedValue([]);

    await expect(
      service.create({
        deliveryType: 'OLIB_KETISH',
        phone: '+998900000000',
        paymentMethod: 'NAQD',
        items: [{ productId: 'missing', quantity: 1 }],
      } as never),
    ).rejects.toThrow();
  });

  it('prefers the authenticated user id over a client-supplied userId', async () => {
    prisma.product.findMany.mockResolvedValue([
      { id: 'p1', price: 1000, discountPrice: null },
    ]);

    const order = await service.create(
      {
        deliveryType: 'OLIB_KETISH',
        phone: '+998900000000',
        paymentMethod: 'NAQD',
        userId: 'client-supplied-id',
        items: [{ productId: 'p1', quantity: 1 }],
      } as never,
      'authenticated-user-id',
    );

    expect(order.userId).toBe('authenticated-user-id');
  });
});
