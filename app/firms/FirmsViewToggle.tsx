"use client";
import { useSearchParams, useRouter } from "next/navigation";
import FirmsTable from "@/components/FirmTable";

export default function FirmsViewToggle({ fallbackCards }: { fallbackCards: React.ReactNode }) {
  const sp = useSearchParams();
  const router = useRouter();
  const view = sp.get("view") ?? "grid";

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.replace("/firms?view=grid")}
          className={`rounded-md px-3 py-1 text-sm ${view==="grid" ? "bg-white/10 text-white" : "bg-white/5 text-white/70"}`}
        >
          Grid
        </button>
        <button
          onClick={() => router.replace("/firms?view=table")}
          className={`rounded-md px-3 py-1 text-sm ${view==="table" ? "bg-white/10 text-white" : "bg-white/5 text-white/70"}`}
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
