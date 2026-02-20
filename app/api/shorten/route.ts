import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { generateShortCode } from "@/lib/short-code";
import { normalizeUrl } from "@/lib/url";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIp, hashIp } from "@/lib/ip";
import { canCreateMoreActiveLinks, monthStartUtc } from "@/lib/plans";

export const runtime = "nodejs";

const shortenSchema = z.object({
  url: z.string(),
  source: z.string(),
});

const SHORTEN_LIMIT = 10;
const SHORTEN_AUTH_LIMIT = 30;
const SHORTEN_WINDOW_MS = 60_000;
const GUEST_TOKEN_COOKIE = "lm_guest_token";

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const logBase = {
    route: "/api/shorten",
    requestId,
  };

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const parsed = shortenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (parsed.data.source !== "homepage_hero") {
    return NextResponse.json({ error: "invalid_source" }, { status: 400 });
  }

  const normalized = normalizeUrl(parsed.data.url);
  if (!normalized.ok) {
    console.log(
      JSON.stringify({
        event: "shorten_invalid_url",
        ...logBase,
      }),
    );
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  try {
    const session = await auth();
    const userId = session?.user?.id ?? null;
    const ipHash = hashIp(getClientIp(request.headers), process.env.IP_HASH_SALT ?? "change-me");
    const rateLimitKey = userId ? `shorten:user:${userId}` : `shorten:ip:${ipHash}`;
    const rateLimitLimit = userId ? SHORTEN_AUTH_LIMIT : SHORTEN_LIMIT;

    const rateLimit = await consumeRateLimit({
      key: rateLimitKey,
      endpoint: "shorten",
      limit: rateLimitLimit,
      windowMs: SHORTEN_WINDOW_MS,
    });

    if (!rateLimit.allowed) {
      console.log(
        JSON.stringify({
          event: "shorten_rate_limited",
          ...logBase,
          hits: rateLimit.hits,
          retryAfterSec: rateLimit.retryAfterSec,
        }),
      );
      return NextResponse.json(
        { error: "rate_limited" },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSec),
          },
        },
      );
    }

    const currentGuestToken = request.cookies.get(GUEST_TOKEN_COOKIE)?.value;
    const guestToken = userId ? null : currentGuestToken ?? crypto.randomUUID();

    if (userId) {
      const [user, activeLinks] = await Promise.all([
        db.user.findUnique({
          where: { id: userId },
          select: { planTier: true },
        }),
        db.link.count({
          where: {
            ownerUserId: userId,
            isActive: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        }),
      ]);

      const plan = user?.planTier ?? "FREE";
      if (!canCreateMoreActiveLinks(plan, activeLinks)) {
        return NextResponse.json({ error: "free_limit_reached" }, { status: 403 });
      }
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateShortCode(7);
      try {
        const [link] = userId
          ? await db.$transaction([
              db.link.create({
                data: {
                  code,
                  targetUrl: normalized.url,
                  source: parsed.data.source,
                  ownerUserId: userId,
                  guestToken,
                },
                select: {
                  code: true,
                },
              }),
              db.usageMonthly.upsert({
                where: {
                  userId_monthStart: {
                    userId,
                    monthStart: monthStartUtc(),
                  },
                },
                create: {
                  userId,
                  monthStart: monthStartUtc(),
                  trackedClicks: 0,
                  createdLinks: 1,
                },
                update: {
                  createdLinks: {
                    increment: 1,
                  },
                },
              }),
            ])
          : [await db.link.create({
              data: {
                code,
                targetUrl: normalized.url,
                source: parsed.data.source,
                ownerUserId: userId,
                guestToken,
              },
              select: {
                code: true,
              },
            })];

        const baseUrl = (process.env.APP_BASE_URL ?? request.nextUrl.origin).replace(/\/+$/, "");

        console.log(
          JSON.stringify({
            event: "shorten_success",
            ...logBase,
            code: link.code,
            ownerType: userId ? "authenticated" : "guest",
          }),
        );

        const response = NextResponse.json({
          shortUrl: `${baseUrl}/${link.code}`,
          code: link.code,
        });

        if (!userId && guestToken) {
          response.cookies.set({
            name: GUEST_TOKEN_COOKIE,
            value: guestToken,
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 24 * 30,
          });
        }

        return response;
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          continue;
        }
        throw error;
      }
    }

    console.error(
      JSON.stringify({
        event: "shorten_server_error",
        ...logBase,
        reason: "code_generation_exhausted",
      }),
    );
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "shorten_server_error",
        ...logBase,
        reason: error instanceof Error ? error.message : "unknown",
      }),
    );
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
