"use client";


import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils"; // if you have a cn helper; otherwise remove


export function Breadcrumbs({
items,
className,
}: {
items: { label: string; href?: string }[];
className?: string;
}) {
return (
<nav aria-label="Breadcrumb" className={cn("text-sm", className)}>
<ol className="flex flex-wrap items-center gap-1 text-muted-foreground">
{items.map((item, i) => (
<li key={i} className="flex items-center">
{item.href ? (
<Link
href={item.href}
className="hover:text-foreground transition-colors"
>
{item.label}
</Link>
) : (
<span className="text-foreground font-medium">{item.label}</span>
)}
{i < items.length - 1 && (
<ChevronRight className="mx-2 h-4 w-4 opacity-60" />
)}
</li>
))}
</ol>
</nav>
);
}
