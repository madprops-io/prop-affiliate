"use client";

import { use, useEffect, useState } from "react";
import type { Firm } from "@/lib/types";
import { FIRMS } from "@/lib/firms";
import { FirmDirectoryCards } from "@/app/firms/FirmDirectoryCards";

export default function FirmDetailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key: firmKey } = use(params);
  const firm = FIRMS.find((f) => f.key === firmKey);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  if (!firm) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#040912] via-[#02050a] to-[#010307] text-white px-4 py-16 text-center">
        <h1 className="text-3xl font-semibold">Firm not found</h1>
        <p className="mt-2 text-white/70">Try returning to the full directory.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#040912] via-[#02050a] to-[#010307] text-white px-4 py-10">
      <div className="mx-auto max-w-[1100px] space-y-6">
        <h1 className="text-3xl font-bold">Firm details</h1>
        {hydrated ? <FirmDirectoryCards firms={FIRMS as Firm[]} initialExpandedKey={firm.key} /> : null}
      </div>
    </main>
  );
}
