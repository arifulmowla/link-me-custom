import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientIp, hashIp } from "@/lib/ip";
import { isReservedCode, SHORT_CODE_PATTERN } from "@/lib/reserved-codes";

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

    try {
      await db.linkClick.create({
        data: {
          linkId: link.id,
          ipHash,
          userAgent,
          referrer,
        },
      });
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
