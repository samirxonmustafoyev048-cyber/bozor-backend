import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../../../generated/prisma/enums';
import {
  UZ_PHONE_MESSAGE,
  UZ_PHONE_REGEX,
  normalizeUzPhone,
} from '../../common/phone';
import { OrderItemInput } from './create-order.dto';

/**
 * A sale rung up at the till. Unlike a web order there is no address and no
 * delivery fee, and the customer is standing there — so a phone number is
 * optional, kept only when they want the order in their history.
 */
export class CreatePosOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  items: OrderItemInput[];

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @Transform(({ value }) => (value ? normalizeUzPhone(value) : undefined))
  @Matches(UZ_PHONE_REGEX, { message: UZ_PHONE_MESSAGE })
  phone?: string;
}
