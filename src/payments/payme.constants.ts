// Payme (Paycom) Merchant API — JSON-RPC error codes.
// These follow the conventions documented at https://developer.help.paycom.uz —
// double check against the current docs before enabling production traffic,
// since Payme reserves the exact wording/ranges and may revise them.
export const PaymeErrorCode = {
  INVALID_AMOUNT: -31001,
  TRANSACTION_NOT_FOUND: -31003,
  CANNOT_PERFORM_OPERATION: -31008,
  ORDER_NOT_FOUND: -31050,
  METHOD_NOT_FOUND: -32601,
  INVALID_AUTHORIZATION: -32504,
} as const;

// Transaction state codes as defined by the Payme protocol.
export const PaymeState = {
  CREATED: 1,
  PERFORMED: 2,
  CANCELLED_AFTER_CREATE: -1,
  CANCELLED_AFTER_PERFORM: -2,
} as const;

// A CreateTransaction left in CREATED state longer than this must be
// auto-cancelled (reason 4 = timed out) on the next touch.
export const PAYME_TRANSACTION_TIMEOUT_MS = 12 * 60 * 60 * 1000;

export const PAYME_CANCEL_REASON_TIMEOUT = 4;
