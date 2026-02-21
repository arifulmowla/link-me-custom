import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { verifyAccessToken } from "@/lib/auth-token";

function parseBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

export async function getUserIdFromRequest(request: NextRequest) {
  const bearer = parseBearerToken(request);
  if (bearer) {
    try {
      const payload = await verifyAccessToken(bearer);
      const sub = payload.sub;
      if (typeof sub === "string" && sub) return sub;
    } catch {
      return null;
    }
  }

  const session = await auth();
  return session?.user?.id ?? null;
}
