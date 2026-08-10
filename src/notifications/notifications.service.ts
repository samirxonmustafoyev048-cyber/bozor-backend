import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  findAll(onlyUnread = false) {
    return this.prisma.notification.findMany({
      where: onlyUnread ? { read: false } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  unreadCount() {
    return this.prisma.notification.count({ where: { read: false } });
  }

  create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({ data: dto });
  }

  /**
   * Fire-and-forget variant for other services (a new order, a failed payment).
   * A notification is never important enough to fail the operation that
   * triggered it, so errors are swallowed.
   */
  async emit(title: string, body: string) {
    await this.prisma.notification
      .create({ data: { title, body } })
      .catch(() => {});
  }

  async markRead(id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!notification) {
      throw new NotFoundException(`Xabarnoma (id: ${id}) topilmadi`);
    }
    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllRead() {
    const { count } = await this.prisma.notification.updateMany({
      where: { read: false },
      data: { read: true },
    });
    return { success: true, count };
  }

  async remove(id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!notification) {
      throw new NotFoundException(`Xabarnoma (id: ${id}) topilmadi`);
    }
    await this.prisma.notification.delete({ where: { id } });
    return { success: true };
  }

  async removeRead() {
    const { count } = await this.prisma.notification.deleteMany({
      where: { read: true },
    });
    return { success: true, count };
  }
}
