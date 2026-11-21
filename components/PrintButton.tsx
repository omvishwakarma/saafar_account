"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-md border border-line bg-paper px-3.5 py-2 text-sm font-semibold">
      Print
    </button>
  );
}
