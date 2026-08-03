// Click (Shop API) error codes — widely-used convention across Click merchant
// integrations. Verify against the current docs (https://docs.click.uz) before
// enabling production traffic.
export const ClickError = {
  SUCCESS: 0,
  SIGN_CHECK_FAILED: -1,
  INVALID_AMOUNT: -2,
  ACTION_NOT_FOUND: -3,
  ALREADY_PAID: -4,
  ORDER_NOT_FOUND: -5,
  TRANSACTION_NOT_FOUND: -6,
  BAD_REQUEST: -8,
  TRANSACTION_CANCELLED: -9,
} as const;

export const ClickAction = {
  PREPARE: '0',
  COMPLETE: '1',
} as const;
