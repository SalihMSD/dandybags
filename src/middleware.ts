import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

const COOKIE = "dandy_session";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (value && value.length >= 16) return new TextEncoder().encode(value);
  if (process.env.NODE_ENV !== "production") {
    return new TextEncoder().encode("dandy-dev-auth-secret-change-me");
  }
  return new TextEncoder().encode("missing-auth-secret");
}

async function session(request: NextRequest) {
  const token = request.cookies.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { userId: String(payload.sub || ""), role: String(payload.role || "") };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const auth = await session(request);

  const customerProtected =
    pathname.startsWith("/account") ||
    pathname === "/wishlist";

  if (customerProtected) {
    if (!auth) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
    if (auth.role === "ADMIN") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!auth || auth.role !== "ADMIN") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  if (pathname === "/admin/login" && auth?.role === "ADMIN") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  if ((pathname === "/login" || pathname === "/register") && auth?.role === "CUSTOMER") {
    const url = request.nextUrl.clone();
    url.pathname = "/account";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/wishlist", "/admin/:path*", "/login", "/register"],
};
