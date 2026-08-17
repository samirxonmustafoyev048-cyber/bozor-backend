import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { StockMovementType } from '../../../generated/prisma/enums';

export class AdjustStockDto {
  @IsEnum(StockMovementType)
  type: StockMovementType;

  /** Always positive; the type decides whether it is added or taken away. */
  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
