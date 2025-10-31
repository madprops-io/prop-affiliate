// components/FirmTable.tsx
import Link from "next/link";

// Helpers
const fmtMoney = (n: number | string | undefined) => {
  const num = Number(n);
  return Number.isFinite(num)
    ? num.toLocaleString(undefined, { style: "currency", currency: "USD" })
    : "—";
};

const fmtDiscount = (d: { type?: string; value?: number; code?: string } | undefined) => {
  const t = (d?.type ?? "none").toLowerCase();
  const v = d?.value ?? 0;
  if (t === "percent" && v) return `${v}%`;
  if (t === "amount" && v) return fmtMoney(v);
  return "—";
};

export default function FirmTable({ firms }: { firms?: any }) {
  // Accept common shapes: array, {data: []}, or undefined
  const list: any[] = Array.isArray(firms)
    ? firms
    : Array.isArray((firms as any)?.data)
    ? (firms as any).data
    : [];

  // sort by server-computed true_cost
  const rows = [...list].sort(
    (a, b) => (a?.true_cost ?? Number.POSITIVE_INFINITY) - (b?.true_cost ?? Number.POSITIVE_INFINITY)
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        {/* header with subtle bottom gold line */}
<thead className="sticky top-0 bg-[#0b1320] text-white">
  <tr className="[&>th]:py-2 [&>th]:px-3 text-left border-b border-amber-400/40">
    <th>Firm</th>
    <th>Program</th>
    <th>Acct</th>
    <th>Eval Cost</th>
    <th>Discount</th>
    <th>Activation</th>
    <th className="relative">
      True Cost
      <span className="ml-2 rounded-full bg-emerald-400/15 px-2 py-[2px] text-[10px] text-emerald-300 ring-1 ring-emerald-300/30">
        Sorted ↑
      </span>
    </th>
  </tr>
</thead>

        {/* gold dividers between rows */}
<tbody className="divide-y divide-amber-400/10">
  {rows.map((f) => (
    <tr
      key={f.key ?? f.name}
      className="hover:bg-amber-400/10 transition-colors duration-150"
    >
              <td className="py-2 px-3">
                <Link
                  href={f.signup || f.homepage || "#"}
                  className="no-underline font-semibold text-white/90 hover:text-amber-300 focus-visible:text-amber-300"
                >
                  {f.name ?? "—"}
                </Link>
              </td>
              <td className="py-2 px-3">{f.model?.[0] ?? "—"}</td>
              <td className="py-2 px-3">
                {((f.accountSizes?.[0] ?? "") as any)?.toLocaleString?.() || "—"}
              </td>
              <td className="py-2 px-3">{fmtMoney(f.eval_cost_usd ?? f.pricing?.evalFee)}</td>
              <td className="py-2 px-3">
                {fmtDiscount(f.discount)}
                {f?.discount?.code && (
                  <span className="ml-2 inline-block rounded-full border border-white/20 px-2 py-[2px] text-[10px] opacity-80">
                    Code: {f.discount.code}
                  </span>
                )}
              </td>
              <td className="py-2 px-3">{fmtMoney(f.activation_fee_usd ?? f.pricing?.activationFee)}</td>
              <td className="py-2 px-3 font-semibold">{fmtMoney(f.true_cost)}</td>
            </tr>
          ))}

          {rows.length === 0 && (
            <tr>
              <td className="py-4 px-3 text-sm text-white/60" colSpan={7}>
                No firms to display.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
