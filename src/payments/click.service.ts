import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ClickError } from './click.constants';

export interface ClickPrepareBody {
  click_trans_id: string;
  service_id: string;
  merchant_trans_id: string;
  amount: string;
  action: string;
  sign_time: string;
  sign_string: string;
}

export interface ClickCompleteBody extends ClickPrepareBody {
  merchant_prepare_id: string;
  error: string;
  error_note?: string;
}

function getSecretKey(): string {
  return process.env.CLICK_SECRET_KEY ?? 'test_click_secret_change_me';
}

function md5(input: string): string {
  return crypto.createHash('md5').update(input).digest('hex');
}

@Injectable()
export class ClickService {
  constructor(private prisma: PrismaService) {}

  private verifyPrepareSign(body: ClickPrepareBody): boolean {
    const expected = md5(
      `${body.click_trans_id}${body.service_id}${getSecretKey()}${body.merchant_trans_id}${body.amount}${body.action}${body.sign_time}`,
    );
    return expected === body.sign_string;
  }

  private verifyCompleteSign(body: ClickCompleteBody): boolean {
    const expected = md5(
      `${body.click_trans_id}${body.service_id}${getSecretKey()}${body.merchant_trans_id}${body.merchant_prepare_id}${body.amount}${body.action}${body.sign_time}`,
    );
    return expected === body.sign_string;
  }

  async prepare(body: ClickPrepareBody) {
    if (!this.verifyPrepareSign(body)) {
      return this.response(body, {
        error: ClickError.SIGN_CHECK_FAILED,
        error_note: "Imzo noto'g'ri",
      });
    }

    const order = await this.prisma.order.findUnique({
      where: { id: body.merchant_trans_id },
    });
    if (!order) {
      return this.response(body, {
        error: ClickError.ORDER_NOT_FOUND,
        error_note: 'Buyurtma topilmadi',
      });
    }

    if (Number(body.amount) !== order.totalPrice) {
      return this.response(body, {
        error: ClickError.INVALID_AMOUNT,
        error_note: "Summa noto'g'ri",
      });
    }

    if (order.paid) {
      return this.response(body, {
        error: ClickError.ALREADY_PAID,
        error_note: "Buyurtma allaqachon to'langan",
      });
    }

    const payment = await this.prisma.payment.upsert({
      where: {
        provider_providerTxId: {
          provider: 'CLICK',
          providerTxId: body.click_trans_id,
        },
      },
      update: {},
      create: {
        provider: 'CLICK',
        providerTxId: body.click_trans_id,
        orderId: order.id,
        amount: Number(body.amount),
        state: 1,
      },
    });

    return this.response(body, {
      error: ClickError.SUCCESS,
      error_note: 'OK',
      merchant_prepare_id: payment.id,
    });
  }

  async complete(body: ClickCompleteBody) {
    if (!this.verifyCompleteSign(body)) {
      return this.response(body, {
        error: ClickError.SIGN_CHECK_FAILED,
        error_note: "Imzo noto'g'ri",
      });
    }

    const payment = await this.prisma.payment.findUnique({
      where: {
        provider_providerTxId: {
          provider: 'CLICK',
          providerTxId: body.click_trans_id,
        },
      },
    });
    if (!payment || payment.id !== body.merchant_prepare_id) {
      return this.response(body, {
        error: ClickError.TRANSACTION_NOT_FOUND,
        error_note: 'Tranzaksiya topilmadi',
      });
    }

    // Click reports its own failure (e.g. card declined) via `error` != 0.
    if (Number(body.error) < 0) {
      const cancelled = await this.prisma.payment.update({
        where: { id: payment.id },
        data: { state: -1, cancelTime: new Date() },
      });
      return this.response(body, {
        error: ClickError.TRANSACTION_CANCELLED,
        error_note: 'Bekor qilindi',
        merchant_confirm_id: cancelled.id,
      });
    }

    if (payment.state === 2) {
      return this.response(body, {
        error: ClickError.SUCCESS,
        error_note: 'OK',
        merchant_confirm_id: payment.id,
      });
    }

    const performTime = new Date();
    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { state: 2, performTime },
    });
    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: { paid: true, paidAt: performTime },
    });

    return this.response(body, {
      error: ClickError.SUCCESS,
      error_note: 'OK',
      merchant_confirm_id: updated.id,
    });
  }

  private response(
    body: ClickPrepareBody,
    extra: {
      error: number;
      error_note: string;
      merchant_prepare_id?: string;
      merchant_confirm_id?: string;
    },
  ) {
    return {
      click_trans_id: body.click_trans_id,
      merchant_trans_id: body.merchant_trans_id,
      ...extra,
    };
  }
}
