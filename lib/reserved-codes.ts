export const RESERVED_CODES = new Set([
  "api",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "login",
  "signup",
]);

export const SHORT_CODE_PATTERN = /^[A-Za-z0-9]{1,64}$/;

export function isReservedCode(code: string) {
  return RESERVED_CODES.has(code.toLowerCase());
}
