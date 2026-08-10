import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

const SETTINGS_ID = 'singleton';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async get() {
    const existing = await this.prisma.setting.findUnique({
      where: { id: SETTINGS_ID },
    });
    if (existing) return existing;
    return this.prisma.setting.create({ data: { id: SETTINGS_ID } });
  }

  async update(dto: UpdateSettingsDto) {
    await this.get();
    return this.prisma.setting.update({
      where: { id: SETTINGS_ID },
      data: dto,
    });
  }
}
