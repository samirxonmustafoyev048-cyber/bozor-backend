import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * Accepts either a path served by this site (`/photos/olma.webp`) or a real
 * absolute http(s) URL.
 *
 * Without it any string was stored and then rendered as `<img src>`, so a
 * mistyped address became a broken image plus a console error on every page
 * the product appeared on — the visitor sees the damage, not the admin who
 * typed it.
 */
export function isImageUrl(value: unknown): boolean {
  if (typeof value !== 'string' || value.trim() === '') return false;
  if (/\s/.test(value)) return false;

  if (value.startsWith('/')) return !value.startsWith('//');

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

  // A hostname is letters, digits, dots and hyphens, and ends in a real TLD.
  return /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(url.hostname);
}

export const IMAGE_URL_MESSAGE =
  "Rasm manzili noto'g'ri — '/photos/...' ko'rinishida yoki to'liq https:// manzil bo'lishi kerak";

export function IsImageUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isImageUrl',
      target: object.constructor,
      propertyName,
      options: { message: IMAGE_URL_MESSAGE, ...validationOptions },
      validator: { validate: (value: unknown) => isImageUrl(value) },
    });
  };
}
