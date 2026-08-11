/**
 * Canonical stored form for a phone number: "+998901234567".
 *
 * `User.phone` is unique, so without one agreed shape "+998901234567" and
 * "998901234567" would sign in as two different people. Every DTO that takes
 * a phone normalizes to this before validating.
 */
export const UZ_PHONE_REGEX = /^\+998\d{9}$/;

export const UZ_PHONE_MESSAGE =
  "Telefon raqam 998 bilan boshlanib, 12 ta raqamdan iborat bo'lishi kerak";

/** "+998 90 123 45 67", "998901234567", "(998) 90-123-45-67" -> "+998901234567" */
export function normalizeUzPhone(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const digits = value.replace(/\D/g, '');
  // Leave empty input alone so @IsNotEmpty reports it rather than a format error.
  return digits ? `+${digits}` : value;
}
