import { Star } from "lucide-react";


export function RatingStars({ value = 0 }: { value?: number }) {
const filled = Math.round(value);
return (
<span className="inline-flex -ml-0.5">
{Array.from({ length: 5 }).map((_, i) => (
<Star
key={i}
className={`h-4 w-4 ${i < filled ? "fill-current" : "opacity-30"}`}
/>
))}
</span>
);
}
