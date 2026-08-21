/**
 * Upper bounds for the numbers the API accepts.
 *
 * Without them a typo — a stock figure of 934782347213471200, say — is stored
 * happily by SQLite's 64-bit integer column and then breaks *reading* the row:
 * Prisma refuses to return a value JavaScript cannot represent exactly
 * (P2023), so one bad product takes down the whole catalogue endpoint.
 *
 * The caps are far above anything a grocery store needs, so they only ever
 * catch mistakes.
 */

/** So'm, stored as whole units. A billion covers any real product or order. */
export const MAX_MONEY = 1_000_000_000;

export const MAX_MONEY_MESSAGE =
  "Summa juda katta — 1 000 000 000 so'mdan oshmasligi kerak";

/** Units on hand or per order line. Past this it is a typo, not a warehouse. */
export const MAX_QUANTITY = 1_000_000;

export const MAX_QUANTITY_MESSAGE =
  'Miqdor juda katta — 1 000 000 dan oshmasligi kerak';

/** Rows per page; a larger request would be a denial of service, not a page. */
export const MAX_PAGE_SIZE = 200;
