import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { normalizeUrl } from "@/lib/url";
import { generateShortCode } from "@/lib/short-code";
import type { DashboardLinksResponse } from "@/lib/dashboard-types";
import {
  activeLinksLimitForPlan,
  canCreateMoreActiveLinks,
  canUseAlias,
  canUseExpiry,
  monthStartUtc,
  trackedClicksLimitForPlan,
} from "@/lib/plans";
import { isReservedCode, SHORT_CODE_PATTERN } from "@/lib/reserved-codes";

export const runtime = "nodejs";

const createLinkSchema = z.object({
  url: z.string(),
  alias: z.string().optional(),
  expiresAt: z.string().optional(),
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

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
  const monthStart = monthStartUtc();
  const now = new Date();

  const [user, links, totalClicks, clicksLast7d, usageMonth, activeLinks] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { planTier: true },
    }),
    db.link.findMany({
      where: { ownerUserId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        code: true,
        targetUrl: true,
        createdAt: true,
        expiresAt: true,
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
    db.usageMonthly.findUnique({
      where: {
        userId_monthStart: {
          userId,
          monthStart,
        },
      },
      select: {
        trackedClicks: true,
      },
    }),
    db.link.count({
      where: {
        ownerUserId: userId,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    }),
  ]);

  const plan = user?.planTier ?? "FREE";
  const response: DashboardLinksResponse = {
    plan,
    usage: {
      activeLinks,
      activeLinksLimit: activeLinksLimitForPlan(plan),
      trackedClicksThisMonth: usageMonth?.trackedClicks ?? 0,
      trackedClicksLimit: trackedClicksLimitForPlan(plan),
    },
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
      expiresAt: link.expiresAt?.toISOString() ?? null,
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

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { planTier: true },
  });
  const plan = user?.planTier ?? "FREE";

  const normalized = normalizeUrl(parsed.data.url);
  if (!normalized.ok) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  const now = new Date();
  const activeLinks = await db.link.count({
    where: {
      ownerUserId: userId,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
  });

  if (!canCreateMoreActiveLinks(plan, activeLinks)) {
    return NextResponse.json({ error: "free_limit_reached" }, { status: 403 });
  }

  const rawAlias = parsed.data.alias?.trim();
  if (rawAlias && !canUseAlias(plan)) {
    return NextResponse.json({ error: "pro_required" }, { status: 402 });
  }

  const rawExpiresAt = parsed.data.expiresAt?.trim();
  if (rawExpiresAt && !canUseExpiry(plan)) {
    return NextResponse.json({ error: "pro_required" }, { status: 402 });
  }

  if (rawAlias && (!SHORT_CODE_PATTERN.test(rawAlias) || isReservedCode(rawAlias))) {
    return NextResponse.json({ error: "invalid_alias" }, { status: 400 });
  }

  let expiresAt: Date | null = null;
  if (rawExpiresAt) {
    expiresAt = new Date(rawExpiresAt);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= now) {
      return NextResponse.json({ error: "invalid_expires_at" }, { status: 400 });
    }
  }

  const usageMonthStart = monthStartUtc();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const codeCandidate = rawAlias ?? generateShortCode(7);
    try {
      const [link] = await db.$transaction([
        db.link.create({
          data: {
            code: codeCandidate,
            targetUrl: normalized.url,
            source: "dashboard_create",
            ownerUserId: userId,
            guestToken: null,
            expiresAt,
          },
          select: {
            id: true,
            code: true,
            expiresAt: true,
          },
        }),
        db.usageMonthly.upsert({
          where: {
            userId_monthStart: {
              userId,
              monthStart: usageMonthStart,
            },
          },
          create: {
            userId,
            monthStart: usageMonthStart,
            trackedClicks: 0,
            createdLinks: 1,
          },
          update: {
            createdLinks: {
              increment: 1,
            },
          },
        }),
      ]);

      const baseUrl = (process.env.APP_BASE_URL ?? request.nextUrl.origin).replace(/\/+$/, "");
      return NextResponse.json({
        id: link.id,
        code: link.code,
        targetUrl: normalized.url,
        shortUrl: `${baseUrl}/${link.code}`,
        expiresAt: link.expiresAt?.toISOString() ?? null,
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        if (rawAlias) {
          return NextResponse.json({ error: "alias_taken" }, { status: 409 });
        }
        continue;
      }
      console.error("dashboard_create_link_error", error);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "server_error" }, { status: 500 });
}
