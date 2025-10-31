"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full border-t border-zinc-800/40 py-6 mt-16 text-center text-sm text-zinc-500">
      <p>
        © {new Date().getFullYear()} MadProps.io —{" "}
        <Link
          href="/disclosure"
          className="text-primary hover:underline hover:text-primary/80 transition-colors"
        >
          Disclosure
        </Link>
      </p>
    </footer>
  );
}
