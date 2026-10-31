import { type NextRequest, NextResponse } from "next/server";
import { firmUpdateStatus, loadFirmCsv } from "@/lib/firmData";
import { stripUnverifiedProposals } from "@/lib/firmUpdateStatus";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("status") === "1") {
    const status = firmUpdateStatus();
    // Never publish unverified collector prices: drop review[].proposed (defense in depth;
    // firmUpdateStatus already strips them). Patches, diagnostics and flags remain.
    return NextResponse.json(
      { ...status, review: stripUnverifiedProposals(status.review) },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    return new Response(await loadFirmCsv(), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Data unavailable" }, { status: 502 });
  }
}
