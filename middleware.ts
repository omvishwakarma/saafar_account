import { NextResponse, type NextRequest } from "next/server";
import { safeNext, sessionCookie, verifySession } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  const { pathname, search } = request.nextUrl;
  const signedIn = await verifySession(request.cookies.get(sessionCookie.name)?.value);

  if (pathname === "/login") {
    if (signedIn) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next({ request: { headers } });
  }

  if (!signedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", safeNext(`${pathname}${search}`));
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && signedIn.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next|icon.svg|favicon.ico).*)"],
};
