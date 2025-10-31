export function BadgeList({ items }: { items: string[] }) {
return (
<div className="flex flex-wrap gap-1.5">
{items.map((t) => (
<span
key={t}
className="rounded-full border px-2 py-0.5 text-[11px] leading-4"
>
{t}
</span>
))}
</div>
);
}