import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";
  const comingSoon = process.env.COMING_SOON === "true";

  // Disable redirect in development
  if (!isProd || !comingSoon) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  // Allow assets, API routes, and the coming-soon page itself
  const isAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/images") ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|txt|xml|json|css|js)$/);

  if (pathname === "/coming-soon" || pathname === "/ffn" || isAsset) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/coming-soon";
  const response = NextResponse.redirect(url);
  response.headers.set("X-Robots-Tag", "noindex");
  return response;
}

// Apply middleware to all routes
export const config = {
  matcher: "/:path*",
};
