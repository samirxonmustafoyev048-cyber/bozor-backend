import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MAX_QUANTITY, MAX_QUANTITY_MESSAGE } from '../../common/limits';
import { StockMovementType } from '../../../generated/prisma/enums';

export class AdjustStockDto {
  @IsEnum(StockMovementType)
  type: StockMovementType;

  /** Always positive; the type decides whether it is added or taken away. */
  @IsInt()
  @Min(1)
  @Max(MAX_QUANTITY, { message: MAX_QUANTITY_MESSAGE })
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
