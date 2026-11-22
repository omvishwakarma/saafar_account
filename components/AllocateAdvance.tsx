"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actionAllocateReceipt } from "@/lib/actions";
import { formatMoney } from "@/lib/money";
import { Button, inputClass } from "./ui";

export function AllocateAdvance({
  receiptId,
  openLc,
  documents,
}: {
  receiptId: string;
  openLc: number;
  documents: { id: string; number: string; currency: string; residual: number; dueDate: string }[];
}) {
  const router = useRouter();
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function save() {
    setError("");
    const rows = documents
      .map((row) => ({ moveId: row.id, amount: Number(amounts[row.id] || 0) }))
      .filter((row) => row.amount > 0);
    start(async () => {
      const result = await actionAllocateReceipt(receiptId, rows);
      if (!result.ok) setError(result.error);
      else {
        setAmounts({});
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-6 rounded-xl border border-line bg-sand/40 p-4">
      <h2 className="font-display text-2xl">Allocate advance</h2>
      <p className="mt-1 text-sm text-muted">
        {formatMoney(openLc)} is still free. The bank entry stays as it is. This only ties that amount to an open bill or invoice.
      </p>
      {documents.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No open document for this partner.</p>
      ) : (
        <table className="books mt-4">
          <thead>
            <tr>
              <th>Document</th>
              <th>Due</th>
              <th className="num">Open</th>
              <th className="num">Apply</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((row) => (
              <tr key={row.id}>
                <td className="font-semibold">{row.number}</td>
                <td>{row.dueDate}</td>
                <td className="num">{formatMoney(row.residual, row.currency)}</td>
                <td className="num">
                  <input
                    className={`${inputClass} ml-auto w-32 text-right`}
                    type="number"
                    min="0"
                    step="0.001"
                    value={amounts[row.id] ?? ""}
                    onChange={(event) => setAmounts((current) => ({ ...current, [row.id]: event.target.value }))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {error && <p className="mt-3 text-sm text-red-800">{error}</p>}
      {documents.length > 0 && (
        <Button className="mt-4" disabled={pending} onClick={save}>{pending ? "Allocating…" : "Allocate"}</Button>
      )}
    </div>
  );
}
