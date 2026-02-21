import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth-user";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const userId = await getUserIdFromRequest(_request);

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await Promise.resolve(context.params);
  const result = await db.link.deleteMany({
    where: {
      id,
      ownerUserId: userId,
    },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
