import { type NextRequest, NextResponse } from "next/server";
import { firmUpdateStatus, loadFirmCsv } from "@/lib/firmData";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("status") === "1") {
    return NextResponse.json(firmUpdateStatus(), { headers: { "Cache-Control": "no-store" } });
  }
  try {
    return new Response(await loadFirmCsv(), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Data unavailable" }, { status: 502 });
  }
}
