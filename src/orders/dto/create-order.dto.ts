import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { MAX_QUANTITY, MAX_QUANTITY_MESSAGE } from '../../common/limits';
import { DeliveryType, PaymentMethod } from '../../../generated/prisma/enums';
import {
  UZ_PHONE_MESSAGE,
  UZ_PHONE_REGEX,
  normalizeUzPhone,
} from '../../common/phone';

export class OrderItemInput {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(1)
  @Max(MAX_QUANTITY, { message: MAX_QUANTITY_MESSAGE })
  quantity: number;
}

export class CreateOrderDto {
  @IsEnum(DeliveryType)
  deliveryType: DeliveryType;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => normalizeUzPhone(value))
  @Matches(UZ_PHONE_REGEX, { message: UZ_PHONE_MESSAGE })
  phone: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  /** Last four digits only — the full number never reaches the server. */
  @IsOptional()
  @Matches(/^\d{4}$/, {
    message: 'Karta raqamining oxirgi 4 raqami kutilmoqda',
  })
  cardLast4?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  promoCode?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  items: OrderItemInput[];
}
