import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateQrPng } from "@/lib/qr";
import { isReservedCode, SHORT_CODE_PATTERN } from "@/lib/reserved-codes";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ code: string }> | { code: string };
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { code } = await Promise.resolve(context.params);
  const normalizedCode = code.trim();

  if (!SHORT_CODE_PATTERN.test(normalizedCode) || isReservedCode(normalizedCode)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const link = await db.link.findFirst({
    where: {
      code: normalizedCode,
      isActive: true,
    },
    select: { code: true },
  });

  if (!link) {
    return new NextResponse("Not found", { status: 404 });
  }

  const origin = request.nextUrl.origin;
  const shortUrl = `${origin}/${link.code}`;
  const png = await generateQrPng(shortUrl, 320);
  const body = new Uint8Array(png);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
