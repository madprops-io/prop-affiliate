import Link from "next/link";


export default function NotFound() {
return (
<div className="container max-w-2xl py-16 text-center">
<h1 className="text-2xl font-semibold">Firm not found</h1>
<p className="mt-2 text-muted-foreground">
  We couldn&apos;t find that firm. It might have been moved or removed.
</p>
<div className="mt-6">
<Link href="/firms" className="underline">Browse all firms</Link>
</div>
</div>
);
}