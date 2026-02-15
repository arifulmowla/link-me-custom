import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { generateShortCode } from "@/lib/short-code";
import { normalizeUrl } from "@/lib/url";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIp, hashIp } from "@/lib/ip";

export const runtime = "nodejs";

const shortenSchema = z.object({
  url: z.string(),
  source: z.string(),
});

const SHORTEN_LIMIT = 10;
const SHORTEN_WINDOW_MS = 60_000;

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
    const ipHash = hashIp(getClientIp(request.headers), process.env.IP_HASH_SALT ?? "change-me");
    const rateLimit = await consumeRateLimit({
      key: `shorten:${ipHash}`,
      endpoint: "shorten",
      limit: SHORTEN_LIMIT,
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

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateShortCode(7);
      try {
        const link = await db.link.create({
          data: {
            code,
            targetUrl: normalized.url,
            source: parsed.data.source,
            ownerUserId: null,
          },
          select: {
            code: true,
          },
        });

        const baseUrl = (process.env.APP_BASE_URL ?? request.nextUrl.origin).replace(/\/+$/, "");

        console.log(
          JSON.stringify({
            event: "shorten_success",
            ...logBase,
            code: link.code,
          }),
        );
        return NextResponse.json({
          shortUrl: `${baseUrl}/${link.code}`,
          code: link.code,
        });
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
