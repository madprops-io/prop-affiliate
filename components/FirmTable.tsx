"use client";
// components/FirmTable.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatStarIcons } from "@/lib/useStarRating";
import { buildAffiliateUrl } from "@/lib/affiliates";
import type { FirmRow } from "@/lib/useFirms";
import { FIRMS } from "@/lib/firms";

type TableFirm = FirmRow & {
  true_cost?: number;
  trueCost?: number;
  payout?: number | null;
  model?: FirmRow["model"] | string;
};

const slugifyKey = (value?: string | null) => (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");

const DIRECTORY_KEY_BY_NAME = new Map(
  FIRMS.map((firm) => [
    firm.name?.toLowerCase().trim() ?? "",
    slugifyKey(firm.key ?? firm.name),
  ])
);

type EnrichedRow = {
  firm: TableFirm;
  program: string;
  evalCost: number | null;
  activationFee: number | null;
  discountPct: number | null;
  discountAmt: number | null;
  discountCode: string | null;
  feeRefund: boolean | null;
  minDays: number | null;
  daysToPayout: number | string | null;
  ddt: string | null;
  payoutPct: number | null;
  payoutDisplay?: string;
  trueCost: number;
  accountSize: number | null;
  daySort: number;
};

const fmtMoney = (n: number | string | null | undefined) => {
  const num = Number(n);
  return Number.isFinite(num)
    ? num.toLocaleString(undefined, { style: "currency", currency: "USD" })
    : "$0.00";
};

const numVal = (v: number | null | undefined) =>
  typeof v === "number" && Number.isFinite(v) ? v : Number.POSITIVE_INFINITY;

const cmp = (a: number, b: number) => {
  if (a === b) return 0;
  return a > b ? 1 : -1;
};

const formatDiscountValue = (pct?: number | null, amt?: number | null) => {
  if (typeof amt === "number" && Number.isFinite(amt) && amt > 0) return fmtMoney(amt);
  if (typeof pct === "number" && Number.isFinite(pct) && pct > 0) return `${pct}%`;
  return "-";
};

const formatPayoutDays = (daysToPayout?: number | string | null) => {
  if (typeof daysToPayout === "string" && daysToPayout.trim()) return daysToPayout;
  const payout = typeof daysToPayout === "number" && Number.isFinite(daysToPayout) ? daysToPayout : null;
  return payout !== null ? `${payout}` : "-";
};

const formatMinDays = (value?: number | null) => {
  if (value === 0) return "Instant";
  if (typeof value === "number" && Number.isFinite(value)) return `${value}`;
  return "-";
};

const getDaySortValue = (value: number | string | null | undefined) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parts = value
      .split(/[^\d]+/)
      .map((part) => Number(part))
      .filter((n) => Number.isFinite(n));
    if (parts.length > 0) return Math.min(...parts);
  }
  return Number.POSITIVE_INFINITY;
};

type FirmTableProps = {
  firms?: TableFirm[] | { data?: TableFirm[] };
  fireDealsMode: boolean;
  columnsPortalRef?: React.RefObject<HTMLDivElement | null>;
  fastPassOnly?: boolean;
  instantFundedOnly?: boolean;
  searchTerm?: string;
  accountSizeFilter?: number | null;
  firmNameFilter?: string;
};

export default function FirmTable({
  firms,
  fireDealsMode,
  columnsPortalRef,
  fastPassOnly = false,
  instantFundedOnly = false,
  searchTerm = "",
  accountSizeFilter = null,
  firmNameFilter = "",
}: FirmTableProps) {
  let list: TableFirm[] = [];
  if (Array.isArray(firms)) {
    list = firms;
  } else if (firms && Array.isArray(firms.data)) {
    list = firms.data ?? [];
  }
  const normalizedSearch = (searchTerm || "").trim().toLowerCase();

  const shouldIncludeByMinDays = (firm: TableFirm) => {
    const value = typeof firm.minDays === "number" ? firm.minDays : null;
    if (fastPassOnly && value !== 1) return false;
    if (instantFundedOnly && value !== 0) return false;
    return true;
  };

  const filteredList = list.filter(shouldIncludeByMinDays);

  const rowsBase = [...filteredList].sort(
    (a, b) =>
      (a.true_cost ?? a.trueCost ?? Number.POSITIVE_INFINITY) -
      (b.true_cost ?? b.trueCost ?? Number.POSITIVE_INFINITY)
  );

  const seen = new Set<string>();
  const deduped = rowsBase.filter((firm) => {
    const programStr = Array.isArray(firm.model)
      ? firm.model.join("|")
      : typeof firm.model === "string"
      ? firm.model
      : "";
    const size = firm.accountSize ?? firm.maxFunding ?? null;
    const accountLabel = firm.accountLabel ?? "";
    const k = `${slugifyKey(firm.key ?? firm.name)}:${programStr}:${size ?? ""}:${accountLabel}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const enriched = useMemo<EnrichedRow[]>(() => {
    return deduped.map((firm) => {
      const program = Array.isArray(firm.model)
        ? firm.model.join(", ")
        : typeof firm.model === "string"
        ? firm.model
        : "-";
      const evalCost = firm?.pricing?.evalCost ?? null;
      const activationFee = firm?.pricing?.activationFee ?? null;
      const discountPct = firm?.pricing?.discount?.percent ?? null;
      const discountAmt = firm?.pricing?.discount?.amount ?? null;
      const discountCode = firm?.pricing?.discount?.code ?? null;
      const feeRefund = firm?.feeRefund ?? null;
      const minDays = firm?.minDays ?? null;
      const daysToPayout = firm?.daysToPayout ?? null;
      const daySort = getDaySortValue(daysToPayout);
      const ddt = firm?.drawdownType ?? null;
      const payoutPct = firm?.payoutSplit ?? (typeof firm?.payout === "number" ? Math.round(firm.payout * 100) : null);
      const payoutDisplay: string | undefined = firm?.payoutDisplay ?? (typeof payoutPct === "number" ? `${payoutPct}%` : undefined);

      const trueCost = (() => {
        const p = firm?.pricing ?? {};
        const evalFee = Number(p?.evalCost ?? 0);
        const activation = Number(p?.activationFee ?? 0);
        const perc = Number(p?.discount?.percent ?? 0);
        const amt = Number(p?.discount?.amount ?? 0);
        const afterDisc = amt > 0 ? Math.max(0, evalFee - amt) : Math.max(0, evalFee * (1 - perc / 100));
        const base = afterDisc + activation;
        const refund = feeRefund ? afterDisc : 0;
        return Math.max(0, base - refund);
      })();

      const accountSize = firm.accountSize ?? null;

      return {
        firm,
        program,
        evalCost,
        activationFee,
        discountPct,
        discountAmt,
        discountCode,
        feeRefund,
        minDays,
        daysToPayout,
        ddt,
        payoutPct,
        payoutDisplay,
        trueCost,
        accountSize,
        daySort,
      };
    });
  }, [deduped]);

  type SortKey =
    | "name"
    | "program"
    | "platforms"
    | "ddt"
    | "payout"
    | "minDays"
    | "daysToPayout"
    | "accountSize"
    | "eval"
    | "activation"
    | "discount"
    | "trueCost";
  const [sortKey, setSortKey] = useState<SortKey>("trueCost");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const ROWS_PER_PAGE = 18;
  const [tablePage, setTablePage] = useState(1);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const prevSortRef = useRef<{ key: SortKey; dir: "asc" | "desc" }>({ key: "trueCost", dir: "asc" });
  const prevFireRef = useRef<boolean>(fireDealsMode);
  const DEFAULT_COLUMNS = {
    accountSize: true,
    trueCost: true,
    eval: true,
    activation: true,
    code: true,
    minDays: true,
    ddt: true,
    daysToPayout: true,
    cta: true,
    discount: true,
    payout: true,
    platforms: false,
  } as const;
  const [columns, setColumns] = useState<typeof DEFAULT_COLUMNS>(DEFAULT_COLUMNS);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
const COLUMN_LABELS: Record<keyof typeof DEFAULT_COLUMNS, string> = {
  accountSize: "Account Size",
  trueCost: "True Cost",
  eval: "Eval Cost",
  activation: "Activation",
  code: "Code",
  minDays: "Min Days (Eval)",
  ddt: "DDT",
  daysToPayout: "Days to Payout",
  cta: "Get Eval",
  discount: "Discount",
  payout: "Payout %",
  platforms: "Platforms",
};
  const toggleColumn = (key: keyof typeof DEFAULT_COLUMNS) => {
    setColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    setTablePage(1);
  }, [enriched.length, fireDealsMode, accountSizeFilter]);

  useEffect(() => {
    if (!copiedCode) return;
    const id = setTimeout(() => setCopiedCode(null), 1500);
    return () => clearTimeout(id);
  }, [copiedCode]);

  useEffect(() => {
    if (fireDealsMode && !prevFireRef.current) {
      prevSortRef.current = { key: sortKey, dir: sortDir };
      setSortKey("trueCost");
      setSortDir("asc");
    } else if (!fireDealsMode && prevFireRef.current && prevSortRef.current) {
      setSortKey(prevSortRef.current.key);
      setSortDir(prevSortRef.current.dir);
    }
    prevFireRef.current = fireDealsMode;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fireDealsMode]);

  const copyCode = async (code: string) => {
    if (!code) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(code);
      } else {
        const ta = document.createElement("textarea");
        ta.value = code;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setCopiedCode(code);
    } catch {
      setCopiedCode(null);
    }
  };

  const sorted = useMemo(() => {
    const arr = [...enriched];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return (a.firm.name || "").localeCompare(b.firm.name || "") * dir;
        case "program":
          return (a.program || "").localeCompare(b.program || "") * dir;
        case "platforms":
          return ((a.firm.platforms || []).join(", ")).localeCompare((b.firm.platforms || []).join(", ")) * dir;
        case "ddt":
          return ((a.ddt || "") as string).localeCompare((b.ddt || "") as string) * dir;
        case "payout":
          return ((a.payoutPct ?? -1) - (b.payoutPct ?? -1)) * dir;
        case "minDays":
          return cmp(numVal(a.minDays as number | null), numVal(b.minDays as number | null)) * dir;
        case "daysToPayout": {
          const primary = cmp(numVal(a.daySort), numVal(b.daySort)) * dir;
          if (primary !== 0) return primary;
          // tie-breaker: true cost, then name
          const costCmp = cmp(numVal(a.trueCost), numVal(b.trueCost)) * dir;
          if (costCmp !== 0) return costCmp;
          return (a.firm.name || "").localeCompare(b.firm.name || "");
        }
        case "eval":
          return ((a.evalCost ?? Number.POSITIVE_INFINITY) - (b.evalCost ?? Number.POSITIVE_INFINITY)) * dir;
        case "activation":
          return ((a.activationFee ?? Number.POSITIVE_INFINITY) - (b.activationFee ?? Number.POSITIVE_INFINITY)) * dir;
        case "discount":
          return (((a.discountPct ?? a.discountAmt) ?? -1) - ((b.discountPct ?? b.discountAmt) ?? -1)) * dir;
        case "accountSize":
          return (((a.accountSize ?? Number.POSITIVE_INFINITY) - (b.accountSize ?? Number.POSITIVE_INFINITY)) * dir);
        case "trueCost":
        default:
          return ((a.trueCost ?? Number.POSITIVE_INFINITY) - (b.trueCost ?? Number.POSITIVE_INFINITY)) * dir;
      }
    });
    return arr;
  }, [enriched, sortKey, sortDir]);

  const filteredRows = useMemo(() => {
    let rows = sorted;
    const normalizedFirmName = (firmNameFilter || "").trim().toLowerCase();
    if (normalizedSearch) {
      rows = rows.filter((row) => (row.firm?.name || "").toLowerCase().includes(normalizedSearch));
    }
    if (normalizedFirmName) {
      rows = rows.filter((row) => (row.firm?.name || "").toLowerCase() === normalizedFirmName);
    }
    if (typeof accountSizeFilter === "number" && Number.isFinite(accountSizeFilter) && accountSizeFilter > 0) {
      const targetSize = Math.round(accountSizeFilter);
      rows = rows.filter((row) => Math.round(row.accountSize ?? 0) === targetSize);
    }
    if (fireDealsMode) {
      rows = rows.filter((row) => {
        const percent =
          row.discountPct ?? row.firm?.pricing?.discount?.percent ?? row.firm?.pricing?.discountPct ?? 0;
        const amount = row.discountAmt ?? row.firm?.pricing?.discount?.amount ?? 0;
        const code = row.discountCode ?? row.firm?.pricing?.discount?.code;
        return (Number(percent) > 0 || Number(amount) > 0 || Boolean(code)) && Number(row.trueCost ?? 0) > 0;
      });
    }
    return rows;
  }, [sorted, fireDealsMode, normalizedSearch, accountSizeFilter, firmNameFilter]);

  const totalRows = filteredRows.length;
  const tablePageCount = Math.max(1, Math.ceil(totalRows / ROWS_PER_PAGE));
  const currentTablePage = Math.min(Math.max(tablePage, 1), tablePageCount);
  const showingStart = totalRows === 0 ? 0 : (currentTablePage - 1) * ROWS_PER_PAGE + 1;
  const showingEnd = Math.min(currentTablePage * ROWS_PER_PAGE, totalRows);

  useEffect(() => {
    if (tablePage > tablePageCount) setTablePage(tablePageCount);
  }, [tablePage, tablePageCount]);

  const visibleRows = useMemo(() => {
    const start = (currentTablePage - 1) * ROWS_PER_PAGE;
    return filteredRows.slice(start, start + ROWS_PER_PAGE);
  }, [filteredRows, currentTablePage, ROWS_PER_PAGE]);

  const setSort = (key: SortKey) => {
    setSortDir((prev) => (sortKey === key ? (prev === "asc" ? "desc" : "asc") : "asc"));
    setSortKey(key);
    setTablePage(1);
  };
  const arrow = (key: SortKey) => (sortKey === key ? (sortDir === "asc" ? "^" : "v") : "");
  const isActiveColumn = (key?: SortKey) => (key ? sortKey === key : false);
  const headerClass = (key?: SortKey) =>
    `px-3 py-2 text-center text-[11px] uppercase tracking-[0.18em] text-white/60 ${
      isActiveColumn(key) ? "text-white" : ""
    }`;
  const headerButtonClass = (key: SortKey) =>
    `w-full text-[11px] uppercase tracking-[0.22em] font-semibold transition ${
      isActiveColumn(key) ? "text-[#5fffd9]" : "text-white/60 hover:text-white"
    }`;
  const cellClass = (key?: SortKey, extra = "") =>
    `py-3 px-3 text-sm ${extra} ${
      isActiveColumn(key) ? "text-[#5fffd9] font-medium" : "text-white/80"
    }`;

  const columnToggle = (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="rounded-full border border-[#26ffd4]/40 bg-[#04131c] text-white/80 shadow-[0_6px_25px_-20px_#14f2c1] transition hover:border-[#26ffd4]/70 hover:text-white"
        onClick={() => setShowColumnPicker((prev) => !prev)}
      >
        Columns
      </Button>
      {showColumnPicker && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[#26ffd4]/30 bg-[#030a16]/95 p-3 text-xs text-white shadow-[0_25px_45px_-25px_#13f6c4] backdrop-blur-xl">
          <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-white/60">Toggle Columns</p>
          <div className="grid gap-2">
            {(Object.keys(COLUMN_LABELS) as Array<keyof typeof DEFAULT_COLUMNS>).map((key) => (
              <label key={key} className="flex items-center justify-between gap-2">
                <span>{COLUMN_LABELS[key]}</span>
                <input
                  type="checkbox"
                  className="accent-emerald-400"
                  checked={columns[key]}
                  onChange={() => toggleColumn(key)}
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const columnsControl =
    columnsPortalRef?.current && typeof window !== "undefined"
      ? createPortal(columnToggle, columnsPortalRef.current)
      : columnToggle;

  return (
    <>
      {columnsPortalRef?.current ? columnsControl : (
        <div className="relative z-10 mb-2 flex justify-end pr-4">{columnToggle}</div>
      )}
      <div className="overflow-x-auto rounded-3xl border border-[#26ffd4]/15 bg-gradient-to-br from-[#020914] via-[#010409] to-[#000103] p-1 shadow-[0_45px_80px_-50px_#12ffd0]">
        <table className="w-full text-sm text-white/80 backdrop-blur-sm">
          <thead className="sticky top-0 z-10 bg-[#040d19]/95 text-white shadow-[0_12px_30px_-20px_#000]">
          <tr className="text-center border-b border-[#26ffd4]/40 divide-x divide-white/10 [&_button]:w-full">
            <th className="w-[140px] px-3 py-2 text-center text-xs uppercase tracking-wide text-white/70">
              <span className="sr-only">Logo</span>
            </th>
            <th className="px-3 py-2 text-center text-xs uppercase tracking-wide">
              <button type="button" className={headerButtonClass("name")} onClick={() => setSort("name")}>
                Firm {arrow("name")}
              </button>
            </th>
            {columns.accountSize && (
              <th className={headerClass("accountSize")}>
                <button
                  type="button"
                  className={headerButtonClass("accountSize")}
                  onClick={() => setSort("accountSize")}
                >
                  Account Size {arrow("accountSize")}
                </button>
              </th>
            )}
            {columns.trueCost && (
              <th className={headerClass("trueCost")}>
                <button
                  type="button"
                  className={headerButtonClass("trueCost")}
                  onClick={() => setSort("trueCost")}
                >
                  True Cost {arrow("trueCost")}
                </button>
              </th>
            )}
            {columns.eval && (
              <th className={headerClass("eval")}>
                <button type="button" className={headerButtonClass("eval")} onClick={() => setSort("eval")}>
                  Eval {arrow("eval")}
                </button>
              </th>
            )}
            {columns.activation && (
              <th className={headerClass("activation")}>
                <button
                  type="button"
                  className={headerButtonClass("activation")}
                  onClick={() => setSort("activation")}
                >
                  Activation {arrow("activation")}
                </button>
              </th>
            )}
            {columns.code && <th className="px-3 py-2 text-center text-xs uppercase tracking-wide text-white">Code</th>}
            {columns.minDays && (
              <th className={headerClass("minDays")}>
                <button type="button" className={headerButtonClass("minDays")} onClick={() => setSort("minDays")}>
                  Min Days (Eval) {arrow("minDays")}
                </button>
              </th>
            )}
            {columns.ddt && (
              <th className={headerClass("ddt")}>
                <button type="button" className={headerButtonClass("ddt")} onClick={() => setSort("ddt")}>
                  DDT {arrow("ddt")}
                </button>
              </th>
            )}
            {columns.daysToPayout && (
              <th className={headerClass("daysToPayout")}>
                <button
                  type="button"
                  className={headerButtonClass("daysToPayout")}
                  onClick={() => setSort("daysToPayout")}
                >
                  Days to Payout {arrow("daysToPayout")}
                </button>
              </th>
            )}
            {columns.cta && <th className="px-3 py-2 text-center text-xs uppercase tracking-wide text-white">Get Eval</th>}
            {columns.discount && (
              <th className={headerClass("discount")}>
                <button className={headerButtonClass("discount")} onClick={() => setSort("discount")}>
                  Discount {arrow("discount")}
                </button>
              </th>
            )}
            {columns.payout && (
              <th className={headerClass("payout")}>
                <button className={headerButtonClass("payout")} onClick={() => setSort("payout")}>
                  Payout % {arrow("payout")}
                </button>
              </th>
            )}
            {columns.platforms && (
              <th className={headerClass("platforms")}>
                <button className={headerButtonClass("platforms")} onClick={() => setSort("platforms")}>
                  Platforms {arrow("platforms")}
                </button>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((r) => {
            const {
              firm,
              program,
              evalCost,
              activationFee,
              discountPct,
              discountAmt,
              discountCode,
          minDays,
          payoutDisplay,
          payoutPct,
          trueCost,
          daysToPayout,
          ddt,
          accountSize,
          firm: { accountLabel },
        } = r;
            const rowKey = `${firm.key}:${program}:${firm.maxFunding ?? ""}`;
            const fallbackSlug = typeof firm.key === "string" ? firm.key.toLowerCase().replace(/[^a-z0-9]+/g, "") : "";
            const discountCodeLabel = (discountCode ?? "").trim();
            const isUseLinkCode = discountCodeLabel.toLowerCase() === "use link";
            const affiliateHref = isUseLinkCode
              ? buildAffiliateUrl(firm.signup || firm.homepage || "", firm.key)
              : null;
            return (
              <tr
                key={rowKey}
                className="border-b border-white/5 bg-transparent align-middle transition-colors duration-300 hover:bg-white/5"
              >
                <td className="py-3 px-3">
                  <FirmLogo name={firm.name} src={firm.logo} fallbackKey={fallbackSlug} />
                </td>
                <td className="py-2 px-3">
                  {(() => {
                    const normalizedName = (firm.name ?? "").toLowerCase().trim();
                    const fallbackKey = slugifyKey(firm.key ?? firm.name ?? normalizedName);
                    const directoryKey = DIRECTORY_KEY_BY_NAME.get(normalizedName) ?? fallbackKey;
                    const targetKey = directoryKey || fallbackKey;
                    return (
                      <Link
                        href={{
                          pathname: "/firms",
                          query: { firm: targetKey },
                          hash: `firm-${targetKey}`,
                        }}
                        prefetch={false}
                        className="font-medium text-white/90 hover:text-[#5fffd9] underline-offset-4 hover:underline"
                      >
                        {firm.name}
                      </Link>
                    );
                  })()}
                  <div className="text-xs font-semibold text-amber-200">
                    <span>{formatStarIcons(firm.trustpilot)}</span>
                    <span className="ml-1 text-white/60">{typeof firm.trustpilot === "number" ? firm.trustpilot.toFixed(1) : "0.0"}</span>
                  </div>
                </td>
                {columns.accountSize && (
                  <td className={cellClass("accountSize", "text-center")}>
                    <div>{typeof accountSize === "number" ? fmtMoney(accountSize) : "-"}</div>
                    {accountLabel ? (
                      <div className="mt-0.5 text-[11px] uppercase tracking-[0.08em] text-white/50">
                        {accountLabel}
                      </div>
                    ) : null}
                  </td>
                )}
                {columns.trueCost && <td className={cellClass("trueCost", "text-center")}>{fmtMoney(trueCost)}</td>}
                {columns.eval && <td className={cellClass("eval", "text-center")}>{fmtMoney(evalCost)}</td>}
                {columns.activation && <td className={cellClass("activation", "text-center")}>{fmtMoney(activationFee)}</td>}
                {columns.code && (
                  <td className={cellClass(undefined, "text-center")}>
                    {discountCode ? (
                      isUseLinkCode && affiliateHref ? (
                        <a
                          href={affiliateHref}
                          target="_blank"
                          rel="nofollow sponsored noopener"
                          className="inline-flex h-7 min-w-[110px] items-center justify-center rounded-full border border-[#26ffd4]/50 bg-[#26ffd4]/15 px-4 text-[11px] font-semibold uppercase tracking-wide text-[#b3ffe9] shadow-[0_12px_25px_-18px_#1dfbd0] transition hover:border-[#26ffd4]/80 hover:bg-[#26ffd4]/25 hover:text-white"
                        >
                          {discountCodeLabel || "Use link"}
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => copyCode(discountCode)}
                          className="inline-flex h-7 min-w-[110px] items-center justify-center rounded-full border border-[#26ffd4]/50 bg-[#26ffd4]/15 px-4 text-[11px] font-semibold uppercase tracking-wide text-[#b3ffe9] shadow-[0_12px_25px_-18px_#1dfbd0] transition hover:border-[#26ffd4]/80 hover:bg-[#26ffd4]/25 hover:text-white"
                        >
                          {copiedCode === discountCode ? "Copied!" : discountCode}
                        </button>
                      )
                    ) : (
                      <span className="text-white/40">-</span>
                    )}
                  </td>
                )}
                {columns.minDays && <td className={cellClass("minDays", "text-center")}>{formatMinDays(minDays)}</td>}
                {columns.ddt && <td className={cellClass("ddt", "text-center")}>{ddt || "-"}</td>}
                {columns.daysToPayout && (
                  <td className={cellClass("daysToPayout", "font-mono text-sm text-white/80 text-center")}>{formatPayoutDays(daysToPayout)}</td>
                )}
                {columns.cta && (
                  <td className={cellClass(undefined, "text-center")}>
                    <a
                      href={firm.signup || firm.homepage || "#"}
                      target="_blank"
                      rel={firm.signup ? "nofollow sponsored noopener" : "nofollow noopener"}
                      className="inline-flex justify-center"
                    >
                      <Button
                        size="sm"
                        className="min-w-[140px] rounded-full border border-[#25ffd2]/50 bg-gradient-to-r from-[#18f5ba] via-[#26ffd4] to-[#58ffe2] font-semibold uppercase tracking-wide text-slate-950 shadow-[0_18px_35px_-18px_#19fccc] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_25px_45px_-20px_#26ffd4] disabled:opacity-40"
                        disabled={!firm.signup && !firm.homepage}
                      >
                        {firm.signup ? "Get Eval" : "Visit Site"}
                      </Button>
                    </a>
                  </td>
                )}
                {columns.discount && (
                  <td className={cellClass("discount", "text-center")}>{formatDiscountValue(discountPct, discountAmt)}</td>
                )}
                {columns.payout && (
                  <td className={cellClass("payout", "text-center")}>{payoutDisplay ?? (typeof payoutPct === "number" ? `${payoutPct}%` : "-")}</td>
                )}
            {columns.platforms && (
              <td
                className={cellClass(undefined, "max-w-[220px] truncate whitespace-nowrap")}
                title={(firm.platforms || []).join(", ") || undefined}
              >
                {(firm.platforms || []).join(", ") || "-"}
              </td>
            )}
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>
      {filteredRows.length > ROWS_PER_PAGE && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            Showing {showingStart}-{showingEnd} of {filteredRows.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentTablePage === 1}
              onClick={() => setTablePage((prev) => Math.max(1, prev - 1))}
              className="rounded-full border-[#f6c850]/50 text-xs font-semibold uppercase tracking-[0.2em] text-[#f6c850] disabled:opacity-40"
            >
              Previous
            </Button>
            <span className="text-xs font-semibold text-white/70">
              Page {currentTablePage} / {tablePageCount}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentTablePage === tablePageCount}
              onClick={() => setTablePage((prev) => Math.min(tablePageCount, prev + 1))}
              className="rounded-full border-[#f6c850]/50 text-xs font-semibold uppercase tracking-[0.2em] text-[#f6c850] disabled:opacity-40"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function FirmLogo({ name, src, fallbackKey }: { name: string; src?: string | null; fallbackKey: string }) {
  const sanitizedKey = (fallbackKey ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  const fallbackSrc = sanitizedKey ? `/logos/${sanitizedKey}.png` : null;
  const preferredSrc = src?.trim() || null;
  const [errored, setErrored] = useState(false);
  const [activeSrc, setActiveSrc] = useState<string | null>(preferredSrc || fallbackSrc);

  useEffect(() => {
    setErrored(false);
    setActiveSrc(preferredSrc || fallbackSrc || null);
  }, [preferredSrc, fallbackSrc]);

  const initials =
    name
      ?.split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "?";

  const LogoPanel = ({ children }: { children: React.ReactNode }) => (
    <div className="relative flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#ffe5a3]/85 via-[#ffcb70]/75 to-[#ff9f48]/70 p-[2px] shadow-[0_10px_20px_-12px_rgba(255,198,88,0.8)]">
      <div className="flex h-full w-full items-center justify-center rounded-[16px] bg-slate-950/90">
        {children}
      </div>
    </div>
  );

  if (errored || !activeSrc) {
    return (
      <LogoPanel>
        <span className="text-xs font-semibold tracking-[0.2em] text-white/80">{initials}</span>
      </LogoPanel>
    );
  }

  const handleError = () => {
    if (fallbackSrc && activeSrc !== fallbackSrc) {
      setActiveSrc(fallbackSrc);
    } else {
      setErrored(true);
    }
  };

  return (
    <LogoPanel>
      <Image
        src={activeSrc}
        alt={`${name} logo`}
        width={56}
        height={56}
        className="h-full w-full object-contain p-1.5"
        unoptimized
        onError={handleError}
      />
    </LogoPanel>
  );
}















