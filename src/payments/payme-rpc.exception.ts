export class PaymeRpcException extends Error {
  code: number;
  data: string | null;

  constructor(code: number, message: string, data: string | null = null) {
    super(message);
    this.code = code;
    this.data = data;
  }
}
