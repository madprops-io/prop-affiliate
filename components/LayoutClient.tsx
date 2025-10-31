"use client";

import { usePathname } from "next/navigation";
import Navbar from "../components/Navbar"; // adjust if your Navbar path differs
import React from "react";

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isComingSoon = pathname?.startsWith("/coming-soon");

  return (
    <>
      {!isComingSoon && <Navbar />}
      <main>{children}</main>
    </>
  );
}
