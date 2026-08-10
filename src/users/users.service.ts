import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../../generated/prisma/enums';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { orders: true } } },
    });
    return users.map((user) => ({ ...user, passwordHash: undefined }));
  }

  async updateRole(id: string, dto: UpdateUserRoleDto, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Foydalanuvchi (id: ${id}) topilmadi`);
    }

    // Losing your own admin rights would lock you out of this very page.
    if (id === actorId && dto.role !== Role.ADMIN) {
      throw new BadRequestException(
        "O'zingizning admin huquqingizni olib tashlay olmaysiz",
      );
    }

    if (user.role === Role.ADMIN && dto.role !== Role.ADMIN) {
      const adminCount = await this.prisma.user.count({
        where: { role: Role.ADMIN },
      });
      if (adminCount <= 1) {
        throw new BadRequestException(
          'Tizimda kamida bitta admin qolishi kerak',
        );
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
    });
    return { ...updated, passwordHash: undefined };
  }
}
