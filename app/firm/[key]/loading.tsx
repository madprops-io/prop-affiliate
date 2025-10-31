export default function Loading() {
return (
<div className="container max-w-6xl py-8 animate-pulse">
<div className="h-4 w-48 rounded bg-muted" />
<div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
<div className="lg:col-span-2 space-y-4">
<div className="h-7 w-64 rounded bg-muted" />
<div className="h-20 w-full rounded bg-muted" />
<div className="grid grid-cols-2 gap-4">
<div className="h-20 rounded bg-muted" />
<div className="h-20 rounded bg-muted" />
</div>
</div>
<div className="space-y-3">
<div className="h-5 w-40 rounded bg-muted" />
<div className="h-24 w-full rounded bg-muted" />
<div className="h-24 w-full rounded bg-muted" />
</div>
</div>
</div>
);
}