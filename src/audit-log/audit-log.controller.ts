import { Controller, Delete, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  findAll(
    @Query('entity') entity?: string,
    @Query('action') action?: string,
    @Query('take') take?: string,
  ) {
    return this.auditLogService.findAll({
      entity,
      action,
      take: take ? Number(take) : undefined,
    });
  }

  @Get('entities')
  entities() {
    return this.auditLogService.entities();
  }

  @Delete()
  clear() {
    return this.auditLogService.clear();
  }
}
