import { SignJWT, jwtVerify } from "jose";

const TOKEN_TTL_SECONDS = 60 * 60;

function getJwtSecret() {
  const secret = process.env.MOBILE_JWT_SECRET;
  if (!secret) {
    throw new Error("MOBILE_JWT_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(payload: { userId: string; email?: string | null }) {
  const secret = getJwtSecret();
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ email: payload.email ?? undefined })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt(now)
    .setExpirationTime(now + TOKEN_TTL_SECONDS)
    .sign(secret);
}

export async function verifyAccessToken(token: string) {
  const secret = getJwtSecret();
  const { payload } = await jwtVerify(token, secret);
  return payload;
}

export function accessTokenTtlSeconds() {
  return TOKEN_TTL_SECONDS;
}
