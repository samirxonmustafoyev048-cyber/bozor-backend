import * as crypto from 'crypto';
import { ClickService } from './click.service';
import { PrismaService } from '../prisma/prisma.service';

function md5(input: string): string {
  return crypto.createHash('md5').update(input).digest('hex');
}

describe('ClickService', () => {
  const SECRET = 'unit-test-secret';
  const SERVICE_ID = '123';
  const ORDER_ID = 'order-1';
  const AMOUNT = '15000';

  let prisma: {
    order: { findUnique: jest.Mock; update: jest.Mock };
    payment: {
      upsert: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let service: ClickService;

  beforeEach(() => {
    process.env.CLICK_SECRET_KEY = SECRET;
    prisma = {
      order: { findUnique: jest.fn(), update: jest.fn() },
      payment: { upsert: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    };
    service = new ClickService(prisma as unknown as PrismaService);
  });

  describe('prepare', () => {
    function buildBody(overrides: Partial<Record<string, string>> = {}) {
      const base = {
        click_trans_id: 'trans-1',
        service_id: SERVICE_ID,
        merchant_trans_id: ORDER_ID,
        amount: AMOUNT,
        action: '0',
        sign_time: '2026-01-01 00:00:00',
      };
      const merged = { ...base, ...overrides };
      const sign_string = md5(
        `${merged.click_trans_id}${merged.service_id}${SECRET}${merged.merchant_trans_id}${merged.amount}${merged.action}${merged.sign_time}`,
      );
      return { ...merged, sign_string };
    }

    it('rejects a request with an incorrect signature', async () => {
      const body = buildBody();
      body.sign_string = 'not-the-real-signature';

      const result = await service.prepare(body);

      expect(result.error).toBe(-1);
      expect(prisma.order.findUnique).not.toHaveBeenCalled();
    });

    it('rejects when the order does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      const result = await service.prepare(buildBody());

      expect(result.error).toBe(-5);
    });

    it('rejects when the amount does not match the order total', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: ORDER_ID,
        totalPrice: 99999,
        paid: false,
      });

      const result = await service.prepare(buildBody());

      expect(result.error).toBe(-2);
    });

    it('rejects an already-paid order', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: ORDER_ID,
        totalPrice: Number(AMOUNT),
        paid: true,
      });

      const result = await service.prepare(buildBody());

      expect(result.error).toBe(-4);
    });

    it('creates a payment and returns success for a valid request', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: ORDER_ID,
        totalPrice: Number(AMOUNT),
        paid: false,
      });
      prisma.payment.upsert.mockResolvedValue({ id: 'payment-1' });

      const result = await service.prepare(buildBody());

      expect(result.error).toBe(0);
      expect(result.merchant_prepare_id).toBe('payment-1');
      expect(prisma.payment.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.objectContaining() is typed to return `any`
          create: expect.objectContaining({
            provider: 'CLICK',
            orderId: ORDER_ID,
            amount: Number(AMOUNT),
          }),
        }),
      );
    });
  });

  describe('complete', () => {
    function buildBody(overrides: Partial<Record<string, string>> = {}) {
      const base = {
        click_trans_id: 'trans-1',
        service_id: SERVICE_ID,
        merchant_trans_id: ORDER_ID,
        merchant_prepare_id: 'payment-1',
        amount: AMOUNT,
        action: '1',
        error: '0',
        sign_time: '2026-01-01 00:00:00',
      };
      const merged = { ...base, ...overrides };
      const sign_string = md5(
        `${merged.click_trans_id}${merged.service_id}${SECRET}${merged.merchant_trans_id}${merged.merchant_prepare_id}${merged.amount}${merged.action}${merged.sign_time}`,
      );
      return { ...merged, sign_string };
    }

    it('rejects a request with an incorrect signature', async () => {
      const body = buildBody();
      body.sign_string = 'wrong';

      const result = await service.complete(body);

      expect(result.error).toBe(-1);
    });

    it('marks the order as paid on a valid completion', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'payment-1',
        orderId: ORDER_ID,
        state: 1,
      });
      prisma.payment.update.mockResolvedValue({ id: 'payment-1' });

      const result = await service.complete(buildBody());

      expect(result.error).toBe(0);
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ORDER_ID },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.objectContaining() is typed to return `any`
          data: expect.objectContaining({ paid: true }),
        }),
      );
    });

    it('is idempotent when the payment was already performed', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'payment-1',
        orderId: ORDER_ID,
        state: 2,
      });

      const result = await service.complete(buildBody());

      expect(result.error).toBe(0);
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });
  });
});
