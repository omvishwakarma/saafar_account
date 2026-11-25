import { NextResponse, type NextRequest } from "next/server";
import { inspectSession, safeNext, sessionCookie, sessionCookieOptions, touchSession } from "@/lib/session";

function prefetch(request: NextRequest) {
  return (
    request.headers.has("next-router-prefetch") ||
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("sec-purpose") === "prefetch"
  );
}

export async function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(sessionCookie.name)?.value;
  const { status, user } = await inspectSession(token);

  if (pathname === "/login") {
    if (status === "ok") return NextResponse.redirect(new URL("/", request.url));
    const response = NextResponse.next({ request: { headers } });
    if (request.method === "GET" && token) response.cookies.delete(sessionCookie.name);
    return response;
  }

  if (status !== "ok") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", safeNext(`${pathname}${search}`));
    if (status === "idle") url.searchParams.set("reason", "idle");
    const response = NextResponse.redirect(url);
    if (token) response.cookies.delete(sessionCookie.name);
    return response;
  }

  if (pathname.startsWith("/admin") && user?.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const response = NextResponse.next({ request: { headers } });
  if (request.method === "GET" && !prefetch(request)) {
    const fresh = await touchSession(token);
    if (fresh) response.cookies.set(sessionCookie.name, fresh, sessionCookieOptions());
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next|icon.svg|favicon.ico).*)"],
};
