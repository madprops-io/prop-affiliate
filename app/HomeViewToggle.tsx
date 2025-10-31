"use client";
import { useSearchParams, useRouter } from "next/navigation";
import FirmsTable from "@/components/FirmTable";

export default function HomeViewToggle({
  cards,
  firms,                           // 👈 add this
}: {
  cards: React.ReactNode;
  firms: any[];                     // 👈 and type it
}) {
  const sp = useSearchParams();
  const router = useRouter();
  const view = (sp.get("view") ?? "table") as "table" | "cards";

  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={() => router.replace(view === "table" ? location.pathname : "/?view=table", { scroll:false })}
          className={`rounded-md px-3 py-1 text-sm ${view==="table" ? "bg-white/10 text-white" : "bg-white/5 text-white/70"}`}
        >
          Table
        </button>
        <button
          onClick={() => router.replace("/?view=cards", { scroll:false })}
          className={`rounded-md px-3 py-1 text-sm ${view==="cards" ? "bg-white/10 text-white" : "bg-white/5 text-white/70"}`}
        >
          Cards
        </button>
      </div>

      {view === "table" ? (
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <FirmsTable firms={firms} />   {/* 👈 pass firms */}
        </div>
      ) : (
        cards
      )}
    </>
  );
}
