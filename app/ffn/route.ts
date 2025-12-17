import { NextResponse } from "next/server";

const TARGET_URL = "https://www.fundedfuturesnetwork.com/?via=madprops&ref=TJ";

export async function GET() {
  return NextResponse.redirect(TARGET_URL, 302);
}
