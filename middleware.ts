// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // Only toggle when COMING_SOON is explicitly "true"
  if (process.env.COMING_SOON !== "true") return NextResponse.next();

  const { pathname } = req.nextUrl;

  // Allow assets, API routes, and the coming-soon page itself
  const isAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/images") ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|txt|xml|json|css|js|map)$/);

  if (pathname === "/coming-soon" || isAsset) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/coming-soon";
  return NextResponse.redirect(url);
}

// Apply middleware to all routes
export const config = { matcher: "/:path*" };

