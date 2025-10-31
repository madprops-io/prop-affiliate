import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export function FirmMiniCard({
  firm,
}: {
  firm: { key: string; name: string; model?: string[]; platforms?: string[] };
}) {
  return (
    <Link
      href={`/firm/${firm.key}`}
      className="block rounded-xl border p-3 hover:border-primary hover:shadow-sm transition"
    >
      <div className="font-medium leading-tight">{firm.name}</div>
      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
        {firm.model?.slice(0, 1).map((m) => (
          <Badge key={m} variant="outline" className="px-1.5 py-0 text-[11px]">
            {m}
          </Badge>
        ))}
        {firm.platforms?.slice(0, 1).map((p) => (
          <Badge key={p} className="px-1.5 py-0 text-[11px]">
            {p}
          </Badge>
        ))}
      </div>
    </Link>
  );
}
