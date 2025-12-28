import { NextResponse } from "next/server";

const TARGET_URL = "https://www.fundedfuturesnetwork.com/?via=madprops&ref=TJ";

export async function GET() {
  const response = NextResponse.redirect(TARGET_URL, 302);
  response.headers.set("X-Robots-Tag", "noindex");
  return response;
}
