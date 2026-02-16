import { NextResponse } from "next/server";
import { auth } from "@/auth";

const PROTECTED_PREFIXES = ["/dashboard", "/api/links", "/auth/claim"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default auth((request) => {
  const pathname = request.nextUrl.pathname;
  const isLoggedIn = Boolean(request.auth);

  if (!isLoggedIn && isProtectedPath(pathname)) {
    if (pathname.startsWith("/api/links")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const redirectUrl = new URL("/login", request.nextUrl.origin);
    redirectUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/api/links/:path*", "/auth/claim", "/login"],
};
