import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  MAX_MONEY,
  MAX_MONEY_MESSAGE,
  MAX_QUANTITY,
  MAX_QUANTITY_MESSAGE,
} from '../../common/limits';

export enum PromoCodeTypeDto {
  PERCENT = 'PERCENT',
  AMOUNT = 'AMOUNT',
}

export class CreatePromoCodeDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsEnum(PromoCodeTypeDto)
  type: PromoCodeTypeDto;

  @IsInt()
  @Min(1)
  @Max(MAX_MONEY, { message: MAX_MONEY_MESSAGE })
  value: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_MONEY, { message: MAX_MONEY_MESSAGE })
  minOrderAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_QUANTITY, { message: MAX_QUANTITY_MESSAGE })
  maxUses?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
