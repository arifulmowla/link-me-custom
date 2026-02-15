import { createHash } from "crypto";

const CLIENT_IP_HEADERS = [
  "x-forwarded-for",
  "x-real-ip",
  "cf-connecting-ip",
  "x-vercel-forwarded-for",
];

function firstForwardedIp(value: string) {
  return value.split(",")[0]?.trim();
}

export function getClientIp(headers: Headers) {
  for (const headerName of CLIENT_IP_HEADERS) {
    const headerValue = headers.get(headerName);
    if (!headerValue) continue;

    const ip = firstForwardedIp(headerValue);
    if (ip) return ip;
  }

  return "0.0.0.0";
}

export function hashIp(ip: string, salt: string) {
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
