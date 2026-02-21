import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import { db } from "@/lib/db";
import { accessTokenTtlSeconds, signAccessToken } from "@/lib/auth-token";

export const runtime = "nodejs";

const bodySchema = z.object({
  provider: z.literal("google"),
  idToken: z.string(),
  email: z.string().email().optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const client = new OAuth2Client(clientId);

  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken: parsed.data.idToken,
      audience: clientId,
    });
    payload = ticket.getPayload();
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const email = payload?.email;
  if (!email) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const user = await db.user.upsert({
    where: { email },
    update: {
      name: payload?.name ?? undefined,
      image: payload?.picture ?? undefined,
    },
    create: {
      email,
      name: payload?.name ?? null,
      image: payload?.picture ?? null,
    },
  });

  const accessToken = await signAccessToken({ userId: user.id, email: user.email });
  return NextResponse.json({
    accessToken,
    tokenType: "Bearer",
    expiresIn: accessTokenTtlSeconds(),
  });
}
