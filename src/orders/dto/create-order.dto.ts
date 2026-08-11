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
  Min,
  ValidateNested,
} from 'class-validator';
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
