import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
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
import { IsImageUrl } from '../../common/image-url';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  composition?: string;

  @IsInt()
  @Min(0)
  @Max(MAX_MONEY, { message: MAX_MONEY_MESSAGE })
  price: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_MONEY, { message: MAX_MONEY_MESSAGE })
  discountPrice?: number;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsString()
  @IsNotEmpty()
  emoji: string;

  @IsOptional()
  @IsImageUrl()
  imageUrl?: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_QUANTITY, { message: MAX_QUANTITY_MESSAGE })
  stock?: number;

  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5, { message: "Reyting 0 va 5 orasida bo'lishi kerak" })
  rating?: number;
}
