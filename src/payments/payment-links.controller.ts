import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function buildPaymeUrl(order: {
  id: string;
  totalPrice: number;
  orderNumber: string;
}): string {
  const merchantId =
    process.env.PAYME_MERCHANT_ID ?? '000000000000000000000000';
  const checkoutBase =
    process.env.PAYME_CHECKOUT_URL ?? 'https://checkout.test.paycom.uz';
  const returnUrl = `${process.env.APP_URL ?? 'http://localhost:3000'}/buyurtma/tasdiqlandi?order=${order.orderNumber}`;
  const amountTiyin = order.totalPrice * 100;

  const raw = `m=${merchantId};ac.order_id=${order.id};a=${amountTiyin};c=${returnUrl}`;
  const encoded = Buffer.from(raw, 'utf8').toString('base64');
  return `${checkoutBase}/${encoded}`;
}

function buildClickUrl(order: {
  id: string;
  totalPrice: number;
  orderNumber: string;
}): string {
  const serviceId = process.env.CLICK_SERVICE_ID ?? '00000';
  const merchantId = process.env.CLICK_MERCHANT_ID ?? '00000';
  const checkoutBase =
    process.env.CLICK_CHECKOUT_URL ?? 'https://my.click.uz/services/pay';
  const returnUrl = `${process.env.APP_URL ?? 'http://localhost:3000'}/buyurtma/tasdiqlandi?order=${order.orderNumber}`;

  const params = new URLSearchParams({
    service_id: serviceId,
    merchant_id: merchantId,
    amount: String(order.totalPrice),
    transaction_param: order.id,
    return_url: returnUrl,
  });
  return `${checkoutBase}?${params.toString()}`;
}

@Controller('payments/link')
export class PaymentLinksController {
  constructor(private prisma: PrismaService) {}

  @Get(':orderId')
  async getLinks(@Param('orderId') orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException(`Buyurtma (${orderId}) topilmadi`);
    }

    return {
      paymeUrl: buildPaymeUrl(order),
      clickUrl: buildClickUrl(order),
      paid: order.paid,
    };
  }
}
