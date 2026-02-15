import { randomBytes } from "crypto";
import { isReservedCode } from "@/lib/reserved-codes";

const CHARSET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function generateShortCode(length = 7) {
  if (length <= 0) {
    throw new Error("Short code length must be greater than zero.");
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const bytes = randomBytes(length);
    let code = "";

    for (let i = 0; i < length; i += 1) {
      code += CHARSET[bytes[i] % CHARSET.length];
    }

    if (!isReservedCode(code)) {
      return code;
    }
  }

  throw new Error("Failed to generate non-reserved short code.");
}
