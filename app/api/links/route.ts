import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { normalizeUrl } from "@/lib/url";
import { generateShortCode } from "@/lib/short-code";
import type { DashboardLinksResponse } from "@/lib/dashboard-types";

export const runtime = "nodejs";

const createLinkSchema = z.object({
  url: z.string(),
});

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [links, totalClicks, clicksLast7d] = await Promise.all([
    db.link.findMany({
      where: { ownerUserId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        code: true,
        targetUrl: true,
        createdAt: true,
        _count: {
          select: {
            clicks: true,
          },
        },
      },
    }),
    db.linkClick.count({
      where: {
        link: { ownerUserId: userId },
      },
    }),
    db.linkClick.count({
      where: {
        clickedAt: { gte: sevenDaysAgo },
        link: { ownerUserId: userId },
      },
    }),
  ]);

  const response: DashboardLinksResponse = {
    kpis: {
      totalLinks: links.length,
      totalClicks,
      clicksLast7d,
    },
    links: links.map((link) => ({
      id: link.id,
      code: link.code,
      targetUrl: link.targetUrl,
      createdAt: link.createdAt.toISOString(),
      clickCount: link._count.clicks,
    })),
  };

  return NextResponse.json(response);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const parsed = createLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const normalized = normalizeUrl(parsed.data.url);
  if (!normalized.ok) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const link = await db.link.create({
        data: {
          code: generateShortCode(7),
          targetUrl: normalized.url,
          source: "dashboard_create",
          ownerUserId: userId,
          guestToken: null,
        },
        select: {
          id: true,
          code: true,
        },
      });

      const baseUrl = (process.env.APP_BASE_URL ?? request.nextUrl.origin).replace(/\/+$/, "");
      return NextResponse.json({
        id: link.id,
        code: link.code,
        targetUrl: normalized.url,
        shortUrl: `${baseUrl}/${link.code}`,
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        console.error("dashboard_create_link_error", error);
        return NextResponse.json({ error: "server_error" }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ error: "server_error" }, { status: 500 });
}
