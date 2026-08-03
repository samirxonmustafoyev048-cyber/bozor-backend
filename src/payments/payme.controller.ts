import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { PaymeService } from './payme.service';
import { PaymeRpcException } from './payme-rpc.exception';
import { PaymeErrorCode } from './payme.constants';

interface JsonRpcRequest {
  id: number | string | null;
  method: string;
  params?: Record<string, unknown>;
}

function isAuthorized(header: string | undefined): boolean {
  if (!header?.startsWith('Basic ')) return false;
  const decoded = Buffer.from(header.slice('Basic '.length), 'base64').toString(
    'utf8',
  );
  const [login, key] = decoded.split(':');
  return (
    login === 'Paycom' &&
    key === (process.env.PAYME_KEY ?? 'test_payme_key_change_me')
  );
}

@Controller('payments/payme')
export class PaymeController {
  constructor(private readonly paymeService: PaymeService) {}

  @Post()
  @HttpCode(200)
  async handle(
    @Body() body: JsonRpcRequest,
    @Headers('authorization') authorization?: string,
  ) {
    if (!isAuthorized(authorization)) {
      return this.errorResponse(
        body?.id ?? null,
        PaymeErrorCode.INVALID_AUTHORIZATION,
        {
          uz: "Avtorizatsiyadan o'tilmadi",
          ru: 'Ошибка авторизации',
          en: 'Insufficient privilege',
        },
      );
    }

    try {
      const result = await this.dispatch(body.method, body.params ?? {});
      return { jsonrpc: '2.0', id: body.id, result };
    } catch (err) {
      if (err instanceof PaymeRpcException) {
        return this.errorResponse(
          body?.id ?? null,
          err.code,
          { uz: err.message, ru: err.message, en: err.message },
          err.data,
        );
      }
      throw err;
    }
  }

  private dispatch(method: string, params: Record<string, unknown>) {
    switch (method) {
      case 'CheckPerformTransaction':
        return this.paymeService.checkPerformTransaction(params as never);
      case 'CreateTransaction':
        return this.paymeService.createTransaction(params as never);
      case 'PerformTransaction':
        return this.paymeService.performTransaction(params as never);
      case 'CancelTransaction':
        return this.paymeService.cancelTransaction(params as never);
      case 'CheckTransaction':
        return this.paymeService.checkTransaction(params as never);
      case 'GetStatement':
        return this.paymeService.getStatement(params as never);
      default:
        throw new PaymeRpcException(
          PaymeErrorCode.METHOD_NOT_FOUND,
          `Unknown method: ${method}`,
        );
    }
  }

  private errorResponse(
    id: number | string | null,
    code: number,
    message: { uz: string; ru: string; en: string },
    data: string | null = null,
  ) {
    return { jsonrpc: '2.0', id, error: { code, message, data } };
  }
}
