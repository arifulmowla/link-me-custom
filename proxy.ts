import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/api/links",
  "/api/billing",
  "/api/analytics/advanced",
  "/auth/claim",
];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSession = Boolean(
    request.cookies.get("__Secure-authjs.session-token") ??
      request.cookies.get("authjs.session-token"),
  );
  const hasBearer = request.headers.get("authorization")?.startsWith("Bearer ");
  const isAuthenticated = hasSession || Boolean(hasBearer);

  if (!isAuthenticated && isProtectedPath(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const redirectUrl = new URL("/login", request.nextUrl.origin);
    redirectUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthenticated && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/links/:path*",
    "/api/billing/:path*",
    "/api/analytics/advanced",
    "/auth/claim",
    "/login",
  ],
};
