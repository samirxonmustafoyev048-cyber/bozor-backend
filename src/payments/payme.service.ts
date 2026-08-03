import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymeRpcException } from './payme-rpc.exception';
import {
  PAYME_CANCEL_REASON_TIMEOUT,
  PAYME_TRANSACTION_TIMEOUT_MS,
  PaymeErrorCode,
  PaymeState,
} from './payme.constants';

interface CheckPerformParams {
  amount: number;
  account: { order_id?: string };
}

interface CreateParams {
  id: string;
  time: number;
  amount: number;
  account: { order_id?: string };
}

interface IdParams {
  id: string;
}

interface CancelParams {
  id: string;
  reason: number;
}

interface StatementParams {
  from: number;
  to: number;
}

function toMs(date: Date | null): number {
  return date ? date.getTime() : 0;
}

@Injectable()
export class PaymeService {
  constructor(private prisma: PrismaService) {}

  private async findOrder(orderId: string | undefined, amount: number) {
    if (!orderId) {
      throw new PaymeRpcException(
        PaymeErrorCode.ORDER_NOT_FOUND,
        'Buyurtma topilmadi',
        'account.order_id',
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new PaymeRpcException(
        PaymeErrorCode.ORDER_NOT_FOUND,
        'Buyurtma topilmadi',
        'account.order_id',
      );
    }

    const expectedTiyin = order.totalPrice * 100;
    if (amount !== expectedTiyin) {
      throw new PaymeRpcException(
        PaymeErrorCode.INVALID_AMOUNT,
        "Summa noto'g'ri",
        'amount',
      );
    }

    return order;
  }

  async checkPerformTransaction(params: CheckPerformParams) {
    await this.findOrder(params.account?.order_id, params.amount);
    return { allow: true };
  }

  async createTransaction(params: CreateParams) {
    const existing = await this.prisma.payment.findUnique({
      where: {
        provider_providerTxId: { provider: 'PAYME', providerTxId: params.id },
      },
    });

    if (existing) {
      await this.autoCancelIfExpired(existing);
      const fresh = await this.prisma.payment.findUniqueOrThrow({
        where: { id: existing.id },
      });
      if (fresh.state !== PaymeState.CREATED) {
        throw new PaymeRpcException(
          PaymeErrorCode.CANNOT_PERFORM_OPERATION,
          "Operatsiyani bajarib bo'lmadi",
        );
      }
      return {
        create_time: toMs(fresh.createTime),
        transaction: fresh.id,
        state: fresh.state,
      };
    }

    const order = await this.findOrder(params.account?.order_id, params.amount);

    const activeForOrder = await this.prisma.payment.findFirst({
      where: { orderId: order.id, state: PaymeState.CREATED },
    });
    if (activeForOrder) {
      throw new PaymeRpcException(
        PaymeErrorCode.ORDER_NOT_FOUND,
        'Ushbu buyurtma uchun boshqa faol tranzaksiya mavjud',
        'account.order_id',
      );
    }

    const payment = await this.prisma.payment.create({
      data: {
        provider: 'PAYME',
        providerTxId: params.id,
        orderId: order.id,
        amount: params.amount,
        state: PaymeState.CREATED,
      },
    });

    return {
      create_time: toMs(payment.createTime),
      transaction: payment.id,
      state: payment.state,
    };
  }

  async performTransaction(params: IdParams) {
    const payment = await this.getPaymentOrThrow(params.id);
    await this.autoCancelIfExpired(payment);

    const fresh = await this.prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });

    if (fresh.state === PaymeState.PERFORMED) {
      return {
        transaction: fresh.id,
        perform_time: toMs(fresh.performTime),
        state: fresh.state,
      };
    }

    if (fresh.state !== PaymeState.CREATED) {
      throw new PaymeRpcException(
        PaymeErrorCode.CANNOT_PERFORM_OPERATION,
        "Operatsiyani bajarib bo'lmadi",
      );
    }

    const performTime = new Date();
    const updated = await this.prisma.payment.update({
      where: { id: fresh.id },
      data: { state: PaymeState.PERFORMED, performTime },
    });
    await this.prisma.order.update({
      where: { id: fresh.orderId },
      data: { paid: true, paidAt: performTime },
    });

    return {
      transaction: updated.id,
      perform_time: toMs(updated.performTime),
      state: updated.state,
    };
  }

  async cancelTransaction(params: CancelParams) {
    const payment = await this.getPaymentOrThrow(params.id);

    if (
      payment.state === PaymeState.CANCELLED_AFTER_CREATE ||
      payment.state === PaymeState.CANCELLED_AFTER_PERFORM
    ) {
      return {
        transaction: payment.id,
        cancel_time: toMs(payment.cancelTime),
        state: payment.state,
      };
    }

    const nextState =
      payment.state === PaymeState.PERFORMED
        ? PaymeState.CANCELLED_AFTER_PERFORM
        : PaymeState.CANCELLED_AFTER_CREATE;
    const cancelTime = new Date();

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { state: nextState, cancelTime, reason: params.reason },
    });

    if (payment.state === PaymeState.PERFORMED) {
      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: { paid: false, paidAt: null },
      });
    }

    return {
      transaction: updated.id,
      cancel_time: toMs(updated.cancelTime),
      state: updated.state,
    };
  }

  async checkTransaction(params: IdParams) {
    const payment = await this.getPaymentOrThrow(params.id);
    return {
      create_time: toMs(payment.createTime),
      perform_time: toMs(payment.performTime),
      cancel_time: toMs(payment.cancelTime),
      transaction: payment.id,
      state: payment.state,
      reason: payment.reason,
    };
  }

  async getStatement(params: StatementParams) {
    const payments = await this.prisma.payment.findMany({
      where: {
        provider: 'PAYME',
        createTime: {
          gte: new Date(params.from),
          lte: new Date(params.to),
        },
      },
    });

    return {
      transactions: payments.map((p) => ({
        id: p.providerTxId,
        time: toMs(p.createTime),
        amount: p.amount,
        create_time: toMs(p.createTime),
        perform_time: toMs(p.performTime),
        cancel_time: toMs(p.cancelTime),
        transaction: p.id,
        state: p.state,
        reason: p.reason,
      })),
    };
  }

  private async getPaymentOrThrow(providerTxId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { provider_providerTxId: { provider: 'PAYME', providerTxId } },
    });
    if (!payment) {
      throw new PaymeRpcException(
        PaymeErrorCode.TRANSACTION_NOT_FOUND,
        'Tranzaksiya topilmadi',
      );
    }
    return payment;
  }

  private async autoCancelIfExpired(payment: {
    id: string;
    state: number;
    createTime: Date;
  }) {
    if (payment.state !== PaymeState.CREATED) return;
    const age = Date.now() - payment.createTime.getTime();
    if (age <= PAYME_TRANSACTION_TIMEOUT_MS) return;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        state: PaymeState.CANCELLED_AFTER_CREATE,
        cancelTime: new Date(),
        reason: PAYME_CANCEL_REASON_TIMEOUT,
      },
    });
  }
}
