"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar"; // ← your actual file name

export default function ConditionalNav() {
  const pathname = usePathname();
  if (pathname === "/coming-soon") return null; // hides the navbar only on Coming Soon
  return <Navbar />;
}
