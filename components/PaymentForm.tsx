"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actionSavePayment } from "@/lib/actions";
import { formatMoney, todayISO } from "@/lib/money";
import { settle } from "@/lib/payment-math";
import type { AccountRow, CurrencyRow, OpenMove, PartnerRow } from "@/lib/types";
import { Button, Field, inputClass } from "./ui";

export function PaymentForm({
  partners,
  currencies,
  banks,
  open,
  preset,
}: {
  partners: PartnerRow[];
  currencies: CurrencyRow[];
  banks: AccountRow[];
  open: OpenMove[];
  preset?: { paymentType?: "receive" | "send"; partnerId?: string; moveId?: string };
}) {
  const router = useRouter();
  const presetMove = open.find((row) => row.id === preset?.moveId);
  const [paymentType, setPaymentType] = useState<"receive" | "send">(preset?.paymentType || "receive");
  const role = paymentType === "receive" ? "customer" : "vendor";
  const people = partners.filter((partner) => partner.role === role || partner.role === "both");
  const [partnerId, setPartnerId] = useState(preset?.partnerId || presetMove?.partnerId || people[0]?.id || "");
  const [currency, setCurrency] = useState(presetMove?.currency || "KWD");
  const [rate, setRate] = useState(presetMove?.rate || 1);
  const [amount, setAmount] = useState(presetMove?.residual || 0);
  const [accountId, setAccountId] = useState(banks[0]?.id || "");
  const [method, setMethod] = useState("Bank transfer");
  const [date, setDate] = useState(todayISO());
  const [memo, setMemo] = useState("");
  const [alloc, setAlloc] = useState<Record<string, number>>(() => {
    if (!preset?.moveId) return {};
    const move = open.find((row) => row.id === preset.moveId);
    return move ? { [move.id]: move.residual } : {};
  });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const documents = open.filter((row) => {
    if (row.partnerId !== partnerId) return false;
    return paymentType === "receive" ? row.moveType === "out_invoice" : row.moveType === "in_invoice";
  });

  const allocations = documents
    .filter((row) => (alloc[row.id] || 0) > 0)
    .map((row) => ({
      moveId: row.id,
      currency: row.currency,
      residual: row.residual,
      residualLc: row.residualLc,
      amount: alloc[row.id],
    }));

  const preview = useMemo(() => {
    if (!allocations.length || !(amount > 0) || !(rate > 0)) return null;
    return settle({ paymentType, currency, rate: Number(rate), amount: Number(amount), allocations });
  }, [allocations, amount, currency, paymentType, rate]);

  function choosePartner(next: string) {
    setPartnerId(next);
    setAlloc({});
  }

  function submit(post: boolean) {
    setError("");
    start(async () => {
      const result = await actionSavePayment({
        paymentType,
        partnerId,
        currency,
        rate: Number(rate),
        amount: Number(amount),
        accountId,
        method,
        date,
        memo,
        allocations: allocations.map((row) => ({ moveId: row.moveId, amount: row.amount })),
        post,
      });
      if (!result.ok) setError(result.error);
      else router.push(`/payments/${result.id}`);
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit(true);
      }}
      className="space-y-5"
    >
      <div className="grid gap-4 rounded-2xl border border-line bg-paper p-5 md:grid-cols-4">
        <Field label="Payment type">
          <div className="flex h-[42px] items-center gap-4 text-sm">
            {(["receive", "send"] as const).map((type) => (
              <label key={type} className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={paymentType === type}
                  onChange={() => {
                    setPaymentType(type);
                    const nextPeople = partners.filter((partner) => partner.role === (type === "receive" ? "customer" : "vendor") || partner.role === "both");
                    setPartnerId(nextPeople[0]?.id || "");
                    setAlloc({});
                  }}
                />
                {type === "receive" ? "Receive" : "Send"}
              </label>
            ))}
          </div>
        </Field>
        <Field label={role === "customer" ? "Customer" : "Vendor"}>
          <select className={inputClass} value={partnerId} onChange={(event) => choosePartner(event.target.value)}>
            {people.map((partner) => (
              <option key={partner.id} value={partner.id}>{partner.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Amount">
          <input className={inputClass} type="number" min="0" step="0.001" value={amount || ""} onChange={(event) => setAmount(Number(event.target.value))} />
        </Field>
        <Field label="Currency">
          <select
            className={inputClass}
            value={currency}
            onChange={(event) => {
              const next = event.target.value;
              setCurrency(next);
              const found = currencies.find((item) => item.code === next);
              if (found) setRate(found.rate);
            }}
          >
            {currencies.map((item) => (
              <option key={item.code} value={item.code}>{item.code}</option>
            ))}
          </select>
        </Field>
        <Field label="Rate to KWD">
          <input className={inputClass} type="number" min="0" step="0.000001" value={rate} onChange={(event) => setRate(Number(event.target.value))} />
        </Field>
        <Field label="Bank or cash">
          <select className={inputClass} value={accountId} onChange={(event) => setAccountId(event.target.value)}>
            {banks.map((bank) => (
              <option key={bank.id} value={bank.id}>{bank.code} · {bank.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Method">
          <select className={inputClass} value={method} onChange={(event) => setMethod(event.target.value)}>
            {["Bank transfer", "Cash", "Cheque", "Manual"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input className={inputClass} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </Field>
        <div className="md:col-span-4">
          <Field label="Memo">
            <input className={inputClass} value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="Receipt reference" />
          </Field>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
        <div className="px-5 pt-5">
          <h2 className="font-display text-2xl">Open documents</h2>
          <p className="text-sm text-muted">Enter how much of each document this payment clears, in that document’s currency.</p>
        </div>
        {documents.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted">Nothing open for this partner.</p>
        ) : (
          <table className="books mt-2 min-w-[680px]">
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
                      value={alloc[row.id] ?? ""}
                      onChange={(event) => setAlloc((current) => ({ ...current, [row.id]: Number(event.target.value) }))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {preview && (
        <div className="grid gap-3 rounded-2xl border border-line bg-pine p-5 text-sand sm:grid-cols-3">
          <Preview label="Cash in KWD" value={formatMoney(preview.bankLc)} />
          <Preview label="Clears documents" value={formatMoney(preview.clearedLc)} />
          <Preview
            label={preview.fxGain >= 0 ? "Exchange gain" : "Exchange loss"}
            value={formatMoney(Math.abs(preview.fxGain))}
          />
          {preview.unappliedLc > 0 && <Preview label="Left on account" value={formatMoney(preview.unappliedLc)} />}
          {!preview.ok && <p className="text-sm text-amber-200 sm:col-span-3">{preview.error}</p>}
        </div>
      )}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="ghost" disabled={pending} onClick={() => submit(false)}>Save draft</Button>
        <Button type="submit" disabled={pending}>{pending ? "Posting…" : "Confirm payment"}</Button>
      </div>
    </form>
  );
}

function Preview({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-sand/50">{label}</div>
      <div className="mt-1 font-display text-2xl">{value}</div>
    </div>
  );
}
