"use client";

export function PartnerLedgerActions({ pdfHref, xlsxHref }: { pdfHref: string; xlsxHref: string }) {
  const cls = "rounded-md border border-line bg-paper px-3.5 py-2 text-sm font-semibold hover:bg-sand";
  return (
    <div className="no-print flex flex-wrap gap-2">
      <button type="button" onClick={() => window.print()} className={cls}>Print</button>
      <a className={cls} href={pdfHref}>PDF</a>
      <a className={cls} href={xlsxHref}>Excel</a>
    </div>
  );
}
