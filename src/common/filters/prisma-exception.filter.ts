import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../../../generated/prisma/client';

/** Column names as they should read back to an admin, in Uzbek. */
const FIELD_LABELS: Record<string, string> = {
  slug: 'slug',
  code: 'promo-kod',
  email: 'email',
  phone: 'telefon raqam',
  name: 'nom',
};

/**
 * Turns database constraint violations into answers the admin panel can show.
 *
 * Without this every one of them reached Nest as an unknown error and came back
 * as a bare 500 "Internal server error" — deleting a category that still has
 * products, or reusing a slug, looked to the user like the site was broken
 * rather than like a rule they had hit.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const { status, message } = this.translate(exception, request.method);

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `Kutilmagan Prisma xatosi ${exception.code}: ${exception.message}`,
      );
    }

    response.status(status).json({ statusCode: status, message });
  }

  private translate(
    exception: Prisma.PrismaClientKnownRequestError,
    method: string,
  ): { status: HttpStatus; message: string } {
    switch (exception.code) {
      // Unique constraint — the value is already taken by another row.
      case 'P2002': {
        const fields = this.conflictingFields(exception);
        return {
          status: HttpStatus.CONFLICT,
          message: fields
            ? `Bu ${fields} allaqachon band — boshqasini kiriting`
            : 'Bunday yozuv allaqachon mavjud',
        };
      }

      // Foreign key. Which side broke depends on what was being done: a write
      // points at something missing, a delete is being held by something that
      // still points back.
      case 'P2003':
        return {
          status: HttpStatus.CONFLICT,
          message:
            method === 'DELETE'
              ? "Bu yozuvga boshqa ma'lumotlar bog'langan, shuning uchun uni " +
                "o'chirib bo'lmaydi"
              : "Tanlangan bog'liq yozuv topilmadi — ro'yxatdan mavjudini " +
                'tanlang',
        };

      // Prisma could not find the row it was told to update or delete.
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: "So'ralgan yozuv topilmadi",
        };

      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Serverda kutilmagan xatolik',
        };
    }
  }

  /**
   * Field names behind a unique-constraint error. The driver adapter reports
   * them under its own error cause; `meta.target` is where Prisma puts them
   * without an adapter, so both are read.
   */
  private conflictingFields(
    exception: Prisma.PrismaClientKnownRequestError,
  ): string | null {
    const meta = exception.meta as
      | {
          target?: unknown;
          driverAdapterError?: {
            cause?: { constraint?: { fields?: unknown } };
          };
        }
      | undefined;

    const raw =
      meta?.driverAdapterError?.cause?.constraint?.fields ?? meta?.target;

    const columns = Array.isArray(raw)
      ? raw.map(String)
      : typeof raw === 'string'
        ? [raw]
        : [];

    if (columns.length === 0) return null;

    return columns.map((c) => FIELD_LABELS[c] ?? c).join(', ');
  }
}
