// app/firms/FirmsViewToggle.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import FirmsTable from "@/components/FirmTable";

type InitialSP = Record<string, string | string[] | undefined>;

export default function FirmsViewToggle({
  fallbackCards,
  initialSearchParams,
}: {
  fallbackCards: React.ReactNode;
  initialSearchParams?: InitialSP;
}) {
  const sp = useSearchParams();
  const router = useRouter();

  // Prefer live client params; fall back to server-provided ones for prerender
  const initialView =
    typeof initialSearchParams?.view === "string"
      ? initialSearchParams.view
      : Array.isArray(initialSearchParams?.view)
      ? initialSearchParams!.view[0]
      : "grid";

  const view = (sp?.get("view") ?? initialView ?? "grid").toLowerCase();

  // If you want to preserve any other existing params when toggling:
  const makeUrl = (nextView: "grid" | "table") => {
    const params = new URLSearchParams(sp?.toString() ?? "");
    params.set("view", nextView);
    const q = params.toString();
    return `/firms${q ? `?${q}` : ""}`;
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.replace(makeUrl("grid"))}
          className={`rounded-md px-3 py-1 text-sm ${
            view === "grid" ? "bg-white/10 text-white" : "bg-white/5 text-white/70"
          }`}
        >
          Grid
        </button>
        <button
          onClick={() => router.replace(makeUrl("table"))}
          className={`rounded-md px-3 py-1 text-sm ${
            view === "table" ? "bg-white/10 text-white" : "bg-white/5 text-white/70"
          }`}
        >
          Table
        </button>
      </div>

      <div className="mt-4">
        {view === "table" ? (
          <div className="mx-auto max-w-7xl px-0 sm:px-2">
            <FirmsTable />
          </div>
        ) : (
          fallbackCards
        )}
      </div>
    </>
  );
}
