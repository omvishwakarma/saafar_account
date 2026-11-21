"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actionSaveReceipt } from "@/lib/actions";
import { round, toBase, todayISO } from "@/lib/money";
import type { AccountRow, CurrencyRow, PartnerRow, ReceiptLineInput } from "@/lib/types";
import { Button, Field, inputClass } from "./ui";

const blank = (accountId: string): ReceiptLineInput => ({
  accountId,
  partnerId: "",
  remarks: "",
  currency: "KWD",
  rate: 1,
  fcAmount: 0,
  side: "debit",
  chequeNo: "",
  chequeDate: "",
  bankName: "",
});

export function ReceiptForm({
  kind,
  accounts,
  partners,
  currencies,
}: {
  kind: "receipt" | "payment";
  accounts: AccountRow[];
  partners: PartnerRow[];
  currencies: CurrencyRow[];
}) {
  const router = useRouter();
  const [date, setDate] = useState(todayISO());
  const [branch, setBranch] = useState("AlOmma");
  const [party, setParty] = useState("");
  const [reference, setReference] = useState("");
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState<ReceiptLineInput[]>([
    { ...blank(accounts.find((account) => account.subtype === "bank")?.id || accounts[0]?.id || ""), side: kind === "receipt" ? "debit" : "credit" },
    { ...blank(accounts.find((account) => account.subtype === (kind === "receipt" ? "receivable" : "expense"))?.id || accounts[0]?.id || ""), side: kind === "receipt" ? "credit" : "debit" },
  ]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function update(index: number, patch: Partial<ReceiptLineInput>) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  const debit = round(lines.reduce((sum, line) => sum + (line.side === "debit" ? toBase(Number(line.fcAmount) || 0, Number(line.rate) || 0) : 0), 0), 3);
  const credit = round(lines.reduce((sum, line) => sum + (line.side === "credit" ? toBase(Number(line.fcAmount) || 0, Number(line.rate) || 0) : 0), 0), 3);
  const difference = round(debit - credit, 3);

  function submit(post: boolean) {
    setError("");
    start(async () => {
      const result = await actionSaveReceipt({
        kind,
        date,
        branch,
        party,
        reference,
        remarks,
        lines: lines.map((line) => ({
          ...line,
          fcAmount: Number(line.fcAmount) || 0,
          rate: Number(line.rate) || 0,
        })),
        post,
      });
      if (!result.ok) setError(result.error);
      else router.push(`/receipts/${result.id}`);
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit(true);
      }}
      className="space-y-4"
    >
      <div className="grid gap-3 rounded-2xl border border-line bg-paper p-5 md:grid-cols-4">
        <Field label="Date"><input className={inputClass} type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field>
        <Field label="Branch"><input className={inputClass} value={branch} onChange={(event) => setBranch(event.target.value)} /></Field>
        <Field label={kind === "receipt" ? "Received from" : "Paid to"}><input className={inputClass} value={party} onChange={(event) => setParty(event.target.value)} /></Field>
        <Field label="Reference"><input className={inputClass} value={reference} onChange={(event) => setReference(event.target.value)} /></Field>
        <div className="md:col-span-4">
          <Field label="Remarks"><textarea className={`${inputClass} min-h-20`} value={remarks} onChange={(event) => setRemarks(event.target.value)} /></Field>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="books min-w-[1100px]">
          <thead>
            <tr>
              <th>Account</th>
              <th>Partner</th>
              <th>Remarks</th>
              <th>Cur</th>
              <th className="num">Rate</th>
              <th className="num">FC amount</th>
              <th>Dr / Cr</th>
              <th className="num">KWD</th>
              <th>Cheque</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={index}>
                <td>
                  <select className={inputClass} value={line.accountId} onChange={(event) => update(index, { accountId: event.target.value })}>
                    {accounts.map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}
                  </select>
                </td>
                <td>
                  <select className={inputClass} value={line.partnerId || ""} onChange={(event) => update(index, { partnerId: event.target.value })}>
                    <option value="">—</option>
                    {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
                  </select>
                </td>
                <td><input className={inputClass} value={line.remarks} onChange={(event) => update(index, { remarks: event.target.value })} /></td>
                <td>
                  <select
                    className={`${inputClass} w-24`}
                    value={line.currency}
                    onChange={(event) => {
                      const currency = event.target.value;
                      const found = currencies.find((item) => item.code === currency);
                      update(index, { currency, rate: found?.rate || 1 });
                    }}
                  >
                    {currencies.map((item) => <option key={item.code}>{item.code}</option>)}
                  </select>
                </td>
                <td><input className={`${inputClass} w-24 text-right`} type="number" step="0.000001" value={line.rate} onChange={(event) => update(index, { rate: Number(event.target.value) })} /></td>
                <td><input className={`${inputClass} w-28 text-right`} type="number" step="0.001" value={line.fcAmount || ""} onChange={(event) => update(index, { fcAmount: Number(event.target.value) })} /></td>
                <td>
                  <select className={`${inputClass} w-24`} value={line.side} onChange={(event) => update(index, { side: event.target.value as "debit" | "credit" })}>
                    <option value="debit">Debit</option>
                    <option value="credit">Credit</option>
                  </select>
                </td>
                <td className="num tabular-nums">{toBase(Number(line.fcAmount) || 0, Number(line.rate) || 0).toFixed(3)}</td>
                <td><input className={`${inputClass} w-28`} placeholder="Cheque no" value={line.chequeNo || ""} onChange={(event) => update(index, { chequeNo: event.target.value })} /></td>
                <td><button type="button" className="text-xs text-muted" onClick={() => setLines((current) => current.filter((_, i) => i !== index))}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-wrap items-center justify-between gap-4 p-4">
          <Button type="button" variant="ghost" onClick={() => setLines((current) => [...current, blank(accounts[0]?.id || "")])}>Add a line</Button>
          <div className="flex gap-6 text-sm">
            <span>Debit <strong className="tabular-nums">{debit.toFixed(3)}</strong></span>
            <span>Credit <strong className="tabular-nums">{credit.toFixed(3)}</strong></span>
            <span className={Math.abs(difference) < 0.001 ? "text-good" : "text-red-800"}>
              Difference <strong className="tabular-nums">{difference.toFixed(3)}</strong>
            </span>
          </div>
        </div>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="ghost" disabled={pending} onClick={() => submit(false)}>Save draft</Button>
        <Button type="submit" disabled={pending || Math.abs(difference) > 0.001}>{pending ? "Posting…" : "Post to the ledger"}</Button>
      </div>
    </form>
  );
}
