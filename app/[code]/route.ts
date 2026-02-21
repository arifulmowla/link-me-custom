import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientIp, hashIp } from "@/lib/ip";
import { getDeviceType, getGeoFromHeaders } from "@/lib/geo";
import { isReservedCode, SHORT_CODE_PATTERN } from "@/lib/reserved-codes";
import { canTrackMoreClicks, monthStartUtc } from "@/lib/plans";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ code: string }> | { code: string };
};

function renderNotFoundHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>urlsy.co — Link not found</title>
    <style>
      :root {
        color-scheme: light;
      }
      body {
        margin: 0;
        font-family: "Avenir Next", "Segoe UI", "Helvetica Neue", "Trebuchet MS", sans-serif;
        background: radial-gradient(circle at 20% -10%, #fff8c5, #f4f1e8);
        color: #121212;
      }
      .wrap {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }
      .card {
        width: 100%;
        max-width: 520px;
        background: #ffffff;
        border: 1.5px solid #1a1a1a;
        border-radius: 32px;
        box-shadow: 0 16px 35px rgba(18, 18, 18, 0.1);
        padding: 32px;
        text-align: center;
      }
      .eyebrow {
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        font-weight: 700;
        color: #4a4a4a;
      }
      h1 {
        margin: 10px 0 0;
        font-size: 32px;
        font-weight: 800;
      }
      p {
        margin: 12px 0 0;
        font-size: 14px;
        color: #4a4a4a;
      }
      a {
        display: inline-flex;
        margin-top: 24px;
        padding: 10px 20px;
        border-radius: 999px;
        border: 1.5px solid #1a1a1a;
        background: #121212;
        color: #ffffff;
        font-size: 14px;
        font-weight: 600;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <div class="eyebrow">404 error</div>
        <h1>Link not found</h1>
        <p>The short link you followed doesn’t exist or was removed.</p>
        <a href="/">Back to home</a>
      </div>
    </div>
  </body>
</html>`;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const { code } = await Promise.resolve(context.params);
  const normalizedCode = code.trim();

  if (!SHORT_CODE_PATTERN.test(normalizedCode) || isReservedCode(normalizedCode)) {
    return new NextResponse(renderNotFoundHtml(), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  try {
    const now = new Date();
    const link = await db.link.findFirst({
      where: {
        code: normalizedCode,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: {
        id: true,
        code: true,
        targetUrl: true,
        ownerUserId: true,
        owner: {
          select: {
            planTier: true,
          },
        },
      },
    });

    if (!link) {
      console.log(
        JSON.stringify({
          event: "redirect_miss",
          route: "/[code]",
          requestId,
          code: normalizedCode,
        }),
      );
      return new NextResponse(renderNotFoundHtml(), {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const ipHash = hashIp(getClientIp(request.headers), process.env.IP_HASH_SALT ?? "change-me");
    const userAgent = request.headers.get("user-agent");
    const referrer = request.headers.get("referer");
    const { country, region, city } = getGeoFromHeaders(request.headers);
    const deviceType = getDeviceType(userAgent);
    const usageMonthStart = monthStartUtc();

    let shouldTrackClick = true;
    if (link.ownerUserId && link.owner?.planTier === "FREE") {
      const usage = await db.usageMonthly.findUnique({
        where: {
          userId_monthStart: {
            userId: link.ownerUserId,
            monthStart: usageMonthStart,
          },
        },
        select: {
          trackedClicks: true,
        },
      });

      const trackedClicks = usage?.trackedClicks ?? 0;
      shouldTrackClick = canTrackMoreClicks("FREE", trackedClicks);
      if (!shouldTrackClick) {
        console.log(
          JSON.stringify({
            event: "click_tracking_capped",
            route: "/[code]",
            requestId,
            code: normalizedCode,
          }),
        );
      }
    }

    try {
      if (shouldTrackClick) {
        if (link.ownerUserId) {
          await db.$transaction([
            db.linkClick.create({
              data: {
                linkId: link.id,
                ipHash,
                userAgent,
                referrer,
                country,
                region,
                city,
                deviceType,
              },
            }),
            db.usageMonthly.upsert({
              where: {
                userId_monthStart: {
                  userId: link.ownerUserId,
                  monthStart: usageMonthStart,
                },
              },
              create: {
                userId: link.ownerUserId,
                monthStart: usageMonthStart,
                trackedClicks: 1,
                createdLinks: 0,
              },
              update: {
                trackedClicks: {
                  increment: 1,
                },
              },
            }),
          ]);
        } else {
          await db.linkClick.create({
            data: {
              linkId: link.id,
              ipHash,
              userAgent,
              referrer,
              country,
              region,
              city,
              deviceType,
            },
          });
        }
      }
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "redirect_click_log_failed",
          route: "/[code]",
          requestId,
          code: normalizedCode,
          reason: error instanceof Error ? error.message : "unknown",
        }),
      );
    }

    console.log(
      JSON.stringify({
        event: "redirect_hit",
        route: "/[code]",
        requestId,
        code: link.code,
      }),
    );

    return NextResponse.redirect(link.targetUrl, 307);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "redirect_server_error",
        route: "/[code]",
        requestId,
        code: normalizedCode,
        reason: error instanceof Error ? error.message : "unknown",
      }),
    );
    return new NextResponse("Server error", { status: 500 });
  }
}
