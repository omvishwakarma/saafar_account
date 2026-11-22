"use client";

import { company } from "@/lib/company";

export function Logo({ className = "h-14 w-auto" }: { className?: string }) {
  return <img src="/alomma-logo.png" alt={company.name} className={className} />;
}
