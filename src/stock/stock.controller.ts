import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StockService } from './stock.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../../generated/prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'OMBORCHI')
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  overview(@Query('q') q?: string) {
    return this.stockService.overview(q);
  }

  @Get('movements')
  movements(@Query('productId') productId?: string) {
    return this.stockService.movements(productId);
  }

  @Patch(':id')
  adjust(
    @Param('id') id: string,
    @Body() dto: AdjustStockDto,
    @CurrentUser() user: User,
  ) {
    return this.stockService.adjust(id, dto, user.name);
  }
}
