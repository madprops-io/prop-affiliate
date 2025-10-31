// app/api/debug-env/route.ts
import { NextResponse } from "next/server";

// (Optional) run on Edge; remove this line if you prefer Node
export const runtime = "edge";

export async function GET() {
  return NextResponse.json({
    COMING_SOON: process.env.COMING_SOON ?? null,
    NEXT_PUBLIC_PREVIEW_TOKEN: process.env.NEXT_PUBLIC_PREVIEW_TOKEN ?? null,
    nodeEnv: process.env.NODE_ENV ?? null,
  });
}

