import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditLogService } from './audit-log.service';

const ACTION_BY_METHOD: Record<string, string> = {
  POST: 'CREATE',
  PATCH: 'UPDATE',
  PUT: 'UPDATE',
  DELETE: 'DELETE',
};

interface AuditedRequest {
  method: string;
  url: string;
  params?: Record<string, string>;
  route?: { path?: string };
  user?: { name?: string; phone?: string; email?: string | null };
}

/**
 * Records every successful authenticated write so the admin "Tizim loglari"
 * page has a trail, without each service having to remember to log.
 *
 * Reads are ignored, and so are anonymous writes (login, OTP, guest checkout) —
 * those carry no actor worth attributing.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditLog: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuditedRequest>();
    const action = ACTION_BY_METHOD[request.method];

    if (!action) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((body: unknown) => {
        const actor = request.user;
        if (!actor) return;

        void this.auditLog.record({
          action,
          entity: entityFromPath(request.route?.path ?? request.url),
          entityId: request.params?.id ?? idFromBody(body),
          actorName: actor.name || actor.phone || actor.email || 'Noma`lum',
        });
      }),
    );
  }
}

/** "/api/products/:id" -> "products" */
function entityFromPath(path: string): string {
  const [segment] = path
    .replace(/^\/?api\/?/, '')
    .split('?')[0]
    .split('/')
    .filter(Boolean);
  return segment ?? 'unknown';
}

function idFromBody(body: unknown): string | null {
  if (body && typeof body === 'object' && 'id' in body) {
    const { id } = body as { id?: unknown };
    return typeof id === 'string' ? id : null;
  }
  return null;
}
