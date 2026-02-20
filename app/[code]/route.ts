import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientIp, hashIp } from "@/lib/ip";
import { isReservedCode, SHORT_CODE_PATTERN } from "@/lib/reserved-codes";
import { canTrackMoreClicks, monthStartUtc } from "@/lib/plans";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ code: string }> | { code: string };
};

export async function GET(request: NextRequest, context: RouteContext) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const { code } = await Promise.resolve(context.params);
  const normalizedCode = code.trim();

  if (!SHORT_CODE_PATTERN.test(normalizedCode) || isReservedCode(normalizedCode)) {
    return new NextResponse("Link not found", { status: 404 });
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
      return new NextResponse("Link not found", { status: 404 });
    }

    const ipHash = hashIp(getClientIp(request.headers), process.env.IP_HASH_SALT ?? "change-me");
    const userAgent = request.headers.get("user-agent");
    const referrer = request.headers.get("referer");
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
