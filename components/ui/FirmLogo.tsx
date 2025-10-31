// components/ui/FirmLogo.tsx
import Image from "next/image";
import * as React from "react";

type Props = {
  src?: string;
  alt?: string;          // e.g., `${firm.name} logo`
  name?: string;         // optional; if omitted we'll use `alt`
  size?: number;         // px box size
  className?: string;
  unoptimized?: boolean; // useful if some logos are SVGs from remote
};

export function FirmLogo({
  src,
  alt,
  name,
  size = 48,
  className = "",
  unoptimized,
}: Props) {
  const label = alt ?? (name ? `${name} logo` : "Logo");

  // Build safe initials from name or alt, with solid fallbacks
  const base = (name ?? alt ?? "").trim();
  const initials =
    base
      ? (base.match(/\b\w/g) ?? []) // first letter of each word
          .join("")
          .slice(0, 3)
          .toUpperCase()
      : "?";

  // If we have a src, show the image; otherwise show an initials badge
  if (src) {
    return (
      <div
        aria-label={label}
        className={`relative overflow-hidden rounded ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={src}
          alt={label}
          fill
          sizes={`${size}px`}
          className="object-contain"
          unoptimized={unoptimized}
        />
      </div>
    );
  }

  return (
    <div
      aria-label={label}
      className={`grid place-items-center rounded bg-white/10 text-white/90 ${className}`}
      style={{ width: size, height: size, fontWeight: 600, fontSize: Math.max(12, size * 0.4) }}
    >
      {initials}
    </div>
  );
}
