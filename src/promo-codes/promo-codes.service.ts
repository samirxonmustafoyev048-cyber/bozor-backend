import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { UpdatePromoCodeDto } from './dto/update-promo-code.dto';

@Injectable()
export class PromoCodesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const promo = await this.prisma.promoCode.findUnique({ where: { id } });
    if (!promo) {
      throw new NotFoundException(`Promo-kod (id: ${id}) topilmadi`);
    }
    return promo;
  }

  create(dto: CreatePromoCodeDto) {
    return this.prisma.promoCode.create({
      data: { ...dto, code: dto.code.toUpperCase() },
    });
  }

  async update(id: string, dto: UpdatePromoCodeDto) {
    await this.findOne(id);
    return this.prisma.promoCode.update({
      where: { id },
      data: dto.code ? { ...dto, code: dto.code.toUpperCase() } : dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.promoCode.delete({ where: { id } });
    return { success: true };
  }

  async validate(code: string, orderAmount: number) {
    const promo = await this.prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!promo || !promo.active) {
      throw new BadRequestException('Promo-kod topilmadi yoki faol emas');
    }
    if (promo.expiresAt && promo.expiresAt < new Date()) {
      throw new BadRequestException('Promo-kodning muddati tugagan');
    }
    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
      throw new BadRequestException('Promo-kod foydalanish limitiga yetgan');
    }
    if (orderAmount < promo.minOrderAmount) {
      throw new BadRequestException(
        `Minimal buyurtma summasi: ${promo.minOrderAmount} so'm`,
      );
    }

    const discountAmount =
      promo.type === 'PERCENT'
        ? Math.round((orderAmount * promo.value) / 100)
        : Math.min(promo.value, orderAmount);

    return {
      code: promo.code,
      type: promo.type,
      value: promo.value,
      discountAmount,
    };
  }

  async incrementUsage(code: string) {
    await this.prisma.promoCode
      .update({
        where: { code: code.toUpperCase() },
        data: { usedCount: { increment: 1 } },
      })
      .catch(() => {});
  }
}
