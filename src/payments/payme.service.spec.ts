import { PaymeService } from './payme.service';
import { PaymeRpcException } from './payme-rpc.exception';
import { PaymeErrorCode } from './payme.constants';
import { PrismaService } from '../prisma/prisma.service';

describe('PaymeService', () => {
  const ORDER_ID = 'order-1';

  let prisma: {
    order: { findUnique: jest.Mock; update: jest.Mock };
    payment: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let service: PaymeService;

  beforeEach(() => {
    prisma = {
      order: { findUnique: jest.fn(), update: jest.fn() },
      payment: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new PaymeService(prisma as unknown as PrismaService);
  });

  describe('checkPerformTransaction', () => {
    it('allows a transaction when the amount matches the order total (in tiyin)', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: ORDER_ID,
        totalPrice: 15000,
      });

      const result = await service.checkPerformTransaction({
        amount: 1500000,
        account: { order_id: ORDER_ID },
      });

      expect(result).toEqual({ allow: true });
    });

    it('rejects when the order cannot be found', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.checkPerformTransaction({
          amount: 1500000,
          account: { order_id: ORDER_ID },
        }),
      ).rejects.toMatchObject({ code: PaymeErrorCode.ORDER_NOT_FOUND });
    });

    it('rejects when the amount does not match (so’m vs tiyin mismatch)', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: ORDER_ID,
        totalPrice: 15000,
      });

      await expect(
        service.checkPerformTransaction({
          amount: 15000,
          account: { order_id: ORDER_ID },
        }),
      ).rejects.toMatchObject({ code: PaymeErrorCode.INVALID_AMOUNT });
    });
  });

  describe('createTransaction', () => {
    it('creates a new transaction in the CREATED state', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.order.findUnique.mockResolvedValue({
        id: ORDER_ID,
        totalPrice: 15000,
      });
      prisma.payment.findFirst.mockResolvedValue(null);
      prisma.payment.create.mockResolvedValue({
        id: 'payment-1',
        createTime: new Date('2026-01-01T00:00:00Z'),
        state: 1,
      });

      const result = await service.createTransaction({
        id: 'payme-tx-1',
        time: Date.now(),
        amount: 1500000,
        account: { order_id: ORDER_ID },
      });

      expect(result.state).toBe(1);
      expect(result.transaction).toBe('payment-1');
    });

    it('is idempotent for a repeated CreateTransaction with the same id', async () => {
      const existing = {
        id: 'payment-1',
        state: 1,
        createTime: new Date(),
      };
      prisma.payment.findUnique.mockResolvedValue(existing);
      prisma.payment.findUniqueOrThrow.mockResolvedValue(existing);

      const result = await service.createTransaction({
        id: 'payme-tx-1',
        time: Date.now(),
        amount: 1500000,
        account: { order_id: ORDER_ID },
      });

      expect(result.transaction).toBe('payment-1');
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });
  });

  describe('performTransaction', () => {
    it('marks the order as paid when performing a created transaction', async () => {
      const payment = {
        id: 'payment-1',
        state: 1,
        orderId: ORDER_ID,
        createTime: new Date(),
      };
      prisma.payment.findUnique.mockResolvedValue(payment);
      prisma.payment.findUniqueOrThrow.mockResolvedValue(payment);
      prisma.payment.update.mockResolvedValue({
        id: 'payment-1',
        state: 2,
        performTime: new Date(),
      });

      const result = await service.performTransaction({ id: 'payme-tx-1' });

      expect(result.state).toBe(2);
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ORDER_ID },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.objectContaining() is typed to return `any`
          data: expect.objectContaining({ paid: true }),
        }),
      );
    });

    it('throws TRANSACTION_NOT_FOUND for an unknown transaction id', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.performTransaction({ id: 'missing' }),
      ).rejects.toMatchObject({
        code: PaymeErrorCode.TRANSACTION_NOT_FOUND,
      });
    });
  });

  describe('cancelTransaction', () => {
    it('cancels a created (not yet performed) transaction', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'payment-1',
        state: 1,
        orderId: ORDER_ID,
      });
      prisma.payment.update.mockResolvedValue({
        id: 'payment-1',
        state: -1,
        cancelTime: new Date(),
      });

      const result = await service.cancelTransaction({
        id: 'payme-tx-1',
        reason: 3,
      });

      expect(result.state).toBe(-1);
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('reverts a performed order back to unpaid when cancelling after perform', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'payment-1',
        state: 2,
        orderId: ORDER_ID,
      });
      prisma.payment.update.mockResolvedValue({
        id: 'payment-1',
        state: -2,
        cancelTime: new Date(),
      });

      await service.cancelTransaction({ id: 'payme-tx-1', reason: 5 });

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { paid: false, paidAt: null } }),
      );
    });
  });
});

describe('PaymeRpcException', () => {
  it('carries the JSON-RPC error code and data field', () => {
    const err = new PaymeRpcException(
      PaymeErrorCode.ORDER_NOT_FOUND,
      'not found',
      'account.order_id',
    );
    expect(err.code).toBe(PaymeErrorCode.ORDER_NOT_FOUND);
    expect(err.data).toBe('account.order_id');
  });
});
