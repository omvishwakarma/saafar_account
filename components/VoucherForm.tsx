"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actionDeleteVoucher, actionSaveVoucher } from "@/lib/actions";
import { formatMoney, nightsBetween, todayISO, voucherFigures } from "@/lib/money";
import type { CurrencyRow, PartnerRow, VoucherInput } from "@/lib/types";
import { Button, Field, inputClass } from "./ui";

const services = ["HOTEL", "FLIGHT", "TRANSFER", "VISA", "ACTIVITY"];
const payModes = ["Credit", "Bank", "Cash", "Card"];
const meals = ["RO", "BB", "HB", "FB", "AI"];
const hotelServices = ["Room", "Extra bed", "Meal plan", "Transfer", "Other"];
const visaTypes = ["Tourist", "Visit", "Business", "Work", "Transit"];
const cabins = ["Economy", "Premium economy", "Business", "First"];

const emptyDetails = {
  qty: "1",
  transfers: "",
  timeLimit: "",
  hotelService: "Room",
  from: "",
  to: "",
  airline: "",
  flightNo: "",
  pnr: "",
  cabin: "Economy",
  pickup: "",
  dropoff: "",
  vehicle: "",
  country: "",
  nationality: "",
  visaType: "Tourist",
};

export function VoucherForm({
  customers,
  suppliers,
  currencies,
  initial,
}: {
  customers: PartnerRow[];
  suppliers: PartnerRow[];
  currencies: CurrencyRow[];
  initial?: Partial<VoucherInput> & { id?: string };
}) {
  const router = useRouter();
  const today = todayISO();
  const [form, setForm] = useState({
    date: initial?.date || today,
    paxName: initial?.paxName || "",
    supplierId: initial?.supplierId || suppliers[0]?.id || "",
    customerId: initial?.customerId || customers[0]?.id || "",
    service: initial?.service || "HOTEL",
    city: initial?.city || "KUWAIT",
    consultant: initial?.consultant || "",
    payMode: initial?.payMode || "Credit",
    supplierRef: initial?.supplierRef || "",
    customerRef: initial?.customerRef || "",
    checkIn: initial?.checkIn || today,
    checkOut: initial?.checkOut || today,
    nights: initial?.nights || 1,
    adults: initial?.adults || 2,
    children: initial?.children || 0,
    infants: initial?.infants || 0,
    meal: initial?.meal || "BB",
    roomType: initial?.roomType || "",
    roomCategory: initial?.roomCategory || "",
    roomView: initial?.roomView || "",
    details: { ...emptyDetails, ...initial?.details },
    supplierFc: initial?.supplierFc || 0,
    supplierCurrency: initial?.supplierCurrency || "KWD",
    supRoe: initial?.supRoe || 1,
    customerFc: initial?.customerFc || 0,
    customerCurrency: initial?.customerCurrency || "KWD",
    custRoe: initial?.custRoe || 1,
    serviceFee: initial?.serviceFee || 0,
    commPercent: initial?.commPercent || 0,
    isReceived: initial?.isReceived || false,
    remarks: initial?.remarks || "",
  });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const figures = useMemo(
    () =>
      voucherFigures({
        supplierFc: Number(form.supplierFc) || 0,
        supRoe: Number(form.supRoe) || 0,
        customerFc: Number(form.customerFc) || 0,
        custRoe: Number(form.custRoe) || 0,
        serviceFee: Number(form.serviceFee) || 0,
        commPercent: Number(form.commPercent) || 0,
        nights: Number(form.nights) || 1,
      }),
    [form],
  );

  function patch(partial: Partial<typeof form>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  function detail(partial: Partial<typeof emptyDetails>) {
    setForm((current) => ({ ...current, details: { ...current.details, ...partial } }));
  }

  function setCurrency(which: "supplier" | "customer", code: string) {
    const found = currencies.find((item) => item.code === code);
    if (which === "supplier") patch({ supplierCurrency: code, supRoe: found?.rate || 1 });
    else patch({ customerCurrency: code, custRoe: found?.rate || 1 });
  }

  function submit(post: boolean) {
    setError("");
    start(async () => {
      const result = await actionSaveVoucher({ ...form, details: relevantDetails(form.service, form.details), id: initial?.id, post });
      if (!result.ok) setError(result.error);
      else router.push(`/vouchers/${result.id}`);
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit(false);
      }}
      className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]"
    >
      <div className="space-y-4">
        <section className="rounded-2xl border border-line bg-paper p-5">
          <h2 className="font-display text-2xl">General</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Field label="Date"><input className={inputClass} type="date" value={form.date} onChange={(event) => patch({ date: event.target.value })} /></Field>
            <Field label="Guest"><input className={inputClass} value={form.paxName} onChange={(event) => patch({ paxName: event.target.value })} placeholder="Pax name" /></Field>
            <Field label="City"><input className={inputClass} value={form.city} onChange={(event) => patch({ city: event.target.value.toUpperCase() })} /></Field>
            <Field label="Supplier">
              <select className={inputClass} value={form.supplierId} onChange={(event) => patch({ supplierId: event.target.value })}>
                {suppliers.map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
              </select>
            </Field>
            <Field label="Service">
              <select className={inputClass} value={form.service} onChange={(event) => patch({ service: event.target.value })}>
                {services.map((service) => <option key={service}>{service}</option>)}
              </select>
            </Field>
            <Field label="Customer">
              <select className={inputClass} value={form.customerId} onChange={(event) => patch({ customerId: event.target.value })}>
                {customers.map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
              </select>
            </Field>
            <Field label="Pay mode">
              <select className={inputClass} value={form.payMode} onChange={(event) => patch({ payMode: event.target.value })}>
                {payModes.map((mode) => <option key={mode}>{mode}</option>)}
              </select>
            </Field>
            <Field label="Consultant"><input className={inputClass} value={form.consultant} onChange={(event) => patch({ consultant: event.target.value })} /></Field>
            <Field label="Supplier ref"><input className={inputClass} value={form.supplierRef} onChange={(event) => patch({ supplierRef: event.target.value })} /></Field>
            <Field label="Customer ref"><input className={inputClass} value={form.customerRef} onChange={(event) => patch({ customerRef: event.target.value })} /></Field>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-paper p-5">
          <h2 className="font-display text-2xl">Service</h2>
          <p className="mt-1 text-sm text-muted">{serviceHint(form.service)}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {(form.service === "HOTEL" || form.service === "ACTIVITY") && (
              <StayFields form={form} patch={patch} detail={detail} />
            )}
            {form.service === "FLIGHT" && <FlightFields form={form} patch={patch} detail={detail} />}
            {form.service === "TRANSFER" && <TransferFields form={form} patch={patch} detail={detail} />}
            {form.service === "VISA" && <VisaFields form={form} patch={patch} detail={detail} />}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-paper p-5">
          <h2 className="font-display text-2xl">Account</h2>
          <p className="mt-1 text-sm text-muted">Supplier cost and customer sell can be in different currencies. ROE is KWD per 1 unit.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <Field label="Supplier FC">
              <input className={inputClass} type="number" min="0" step="0.001" value={form.supplierFc || ""} onChange={(event) => patch({ supplierFc: Number(event.target.value) })} />
            </Field>
            <Field label="Supplier currency">
              <select className={inputClass} value={form.supplierCurrency} onChange={(event) => setCurrency("supplier", event.target.value)}>
                {currencies.map((item) => <option key={item.code}>{item.code}</option>)}
              </select>
            </Field>
            <Field label="Supplier ROE">
              <input className={inputClass} type="number" min="0" step="0.000001" value={form.supRoe} onChange={(event) => patch({ supRoe: Number(event.target.value) })} />
            </Field>
            {(form.service === "HOTEL" || form.service === "ACTIVITY") && (
              <Field label="Rate / night">
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.nights ? Number((Number(form.supplierFc) / Number(form.nights)).toFixed(3)) : 0}
                  onChange={(event) => patch({ supplierFc: Number(event.target.value) * Number(form.nights || 1) })}
                />
              </Field>
            )}
            <Field label="Customer FC">
              <input className={inputClass} type="number" min="0" step="0.001" value={form.customerFc || ""} onChange={(event) => patch({ customerFc: Number(event.target.value) })} />
            </Field>
            <Field label="Customer currency">
              <select className={inputClass} value={form.customerCurrency} onChange={(event) => setCurrency("customer", event.target.value)}>
                {currencies.map((item) => <option key={item.code}>{item.code}</option>)}
              </select>
            </Field>
            <Field label="Customer ROE">
              <input className={inputClass} type="number" min="0" step="0.000001" value={form.custRoe} onChange={(event) => patch({ custRoe: Number(event.target.value) })} />
            </Field>
            <Field label="Service fee">
              <input className={inputClass} type="number" min="0" step="0.001" value={form.serviceFee || ""} onChange={(event) => patch({ serviceFee: Number(event.target.value) })} />
            </Field>
            <Field label="Commission %">
              <input className={inputClass} type="number" min="0" step="0.01" value={form.commPercent || ""} onChange={(event) => patch({ commPercent: Number(event.target.value) })} />
            </Field>
            <label className="mt-6 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isReceived} onChange={(event) => patch({ isReceived: event.target.checked })} />
              Commission already received
            </label>
          </div>
          {form.service !== "VISA" && (
            <Field label="Remarks">
              <textarea className={`${inputClass} mt-3 min-h-20`} value={form.remarks} onChange={(event) => patch({ remarks: event.target.value })} />
            </Field>
          )}
        </section>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="ghost" disabled={pending}>Save draft</Button>
          <Button type="button" disabled={pending} onClick={() => submit(true)}>{pending ? "Posting…" : "Confirm voucher"}</Button>
          {initial?.id && (
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                start(async () => {
                  const result = await actionDeleteVoucher(initial.id!);
                  if (!result.ok) setError(result.error);
                  else router.push("/vouchers");
                });
              }}
            >
              Delete draft
            </Button>
          )}
        </div>
      </div>

      <aside className="h-fit rounded-2xl bg-pine p-5 text-sand xl:sticky xl:top-20">
        <div className="text-[11px] uppercase tracking-[0.16em] text-sand/50">In Kuwaiti Dinar</div>
        <h2 className="mt-1 font-display text-3xl">Margin</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <Row label="Supplier cost" value={formatMoney(figures.supplierLc)} />
          <Row label="Customer sell" value={formatMoney(figures.customerLc)} />
          <Row label="Service fee" value={formatMoney(figures.serviceFeeLc)} />
          <Row label="Sell value" value={formatMoney(figures.sellValue)} />
          <Row label="Markup" value={formatMoney(figures.markup)} strong />
          <Row label="Commission memo" value={formatMoney(figures.commissionLc)} />
          <Row label="Margin" value={`${figures.margin.toFixed(1)}%`} />
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-sand/60">
          Confirming posts a customer invoice and a supplier bill. Commission is a memo for the consultant and is not posted twice.
        </p>
      </aside>
    </form>
  );
}

type FormState = {
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  infants: number;
  meal: string;
  roomType: string;
  roomCategory: string;
  roomView: string;
  remarks: string;
  details: typeof emptyDetails;
};

function relevantDetails(service: string, details: typeof emptyDetails) {
  const keys =
    service === "FLIGHT"
      ? ["from", "to", "airline", "flightNo", "pnr", "cabin"]
      : service === "TRANSFER"
        ? ["pickup", "dropoff", "vehicle"]
        : service === "VISA"
          ? ["country", "nationality", "visaType"]
          : ["qty", "transfers", "timeLimit", "hotelService"];
  return Object.fromEntries(keys.map((key) => [key, details[key as keyof typeof details]]));
}

function serviceHint(service: string) {
  if (service === "FLIGHT") return "Departure, route, and ticket details.";
  if (service === "TRANSFER") return "Pickup and drop off replace check-in and check-out.";
  if (service === "VISA") return "Country, nationality, and the visa type.";
  if (service === "ACTIVITY") return "Same stay fields as a hotel voucher.";
  return "Stay, room, and meal for the hotel file.";
}

function StayFields({ form, patch, detail }: { form: FormState; patch: (partial: Partial<FormState>) => void; detail: (partial: Partial<typeof emptyDetails>) => void }) {
  return (
    <>
      <Field label="Check in">
        <input className={inputClass} type="date" value={form.checkIn} onChange={(event) => patch({ checkIn: event.target.value, nights: nightsBetween(event.target.value, form.checkOut) })} />
      </Field>
      <Field label="Check out">
        <input className={inputClass} type="date" value={form.checkOut} onChange={(event) => patch({ checkOut: event.target.value, nights: nightsBetween(form.checkIn, event.target.value) })} />
      </Field>
      <Field label="Nights"><input className={inputClass} type="number" min="1" value={form.nights} onChange={(event) => patch({ nights: Number(event.target.value) })} /></Field>
      <Field label="Adults"><input className={inputClass} type="number" min="0" value={form.adults} onChange={(event) => patch({ adults: Number(event.target.value) })} /></Field>
      <Field label="Children"><input className={inputClass} type="number" min="0" value={form.children} onChange={(event) => patch({ children: Number(event.target.value) })} /></Field>
      <Field label="Infants"><input className={inputClass} type="number" min="0" value={form.infants} onChange={(event) => patch({ infants: Number(event.target.value) })} /></Field>
      <Field label="Meal">
        <select className={inputClass} value={form.meal} onChange={(event) => patch({ meal: event.target.value })}>
          {meals.map((meal) => <option key={meal}>{meal}</option>)}
        </select>
      </Field>
      <Field label="Qty"><input className={inputClass} type="number" min="1" value={form.details.qty} onChange={(event) => detail({ qty: event.target.value })} /></Field>
      <Field label="Room type"><input className={inputClass} value={form.roomType} onChange={(event) => patch({ roomType: event.target.value })} /></Field>
      <Field label="Room category"><input className={inputClass} value={form.roomCategory} onChange={(event) => patch({ roomCategory: event.target.value })} /></Field>
      <Field label="Room view"><input className={inputClass} value={form.roomView} onChange={(event) => patch({ roomView: event.target.value })} /></Field>
      <Field label="Transfers"><input className={inputClass} value={form.details.transfers} onChange={(event) => detail({ transfers: event.target.value })} placeholder="Arrival, departure" /></Field>
      <Field label="Time limit"><input className={inputClass} type="date" value={form.details.timeLimit} onChange={(event) => detail({ timeLimit: event.target.value })} /></Field>
      <Field label="Services">
        <select className={inputClass} value={form.details.hotelService} onChange={(event) => detail({ hotelService: event.target.value })}>
          {hotelServices.map((item) => <option key={item}>{item}</option>)}
        </select>
      </Field>
    </>
  );
}

function FlightFields({ form, patch, detail }: { form: FormState; patch: (partial: Partial<FormState>) => void; detail: (partial: Partial<typeof emptyDetails>) => void }) {
  return (
    <>
      <Field label="Departure"><input className={inputClass} type="date" value={form.checkIn} onChange={(event) => patch({ checkIn: event.target.value })} /></Field>
      <Field label="Return"><input className={inputClass} type="date" value={form.checkOut} onChange={(event) => patch({ checkOut: event.target.value })} /></Field>
      <Field label="From"><input className={inputClass} value={form.details.from} onChange={(event) => detail({ from: event.target.value.toUpperCase() })} placeholder="KWI" /></Field>
      <Field label="To"><input className={inputClass} value={form.details.to} onChange={(event) => detail({ to: event.target.value.toUpperCase() })} placeholder="DXB" /></Field>
      <Field label="Airline"><input className={inputClass} value={form.details.airline} onChange={(event) => detail({ airline: event.target.value })} /></Field>
      <Field label="Flight no"><input className={inputClass} value={form.details.flightNo} onChange={(event) => detail({ flightNo: event.target.value.toUpperCase() })} /></Field>
      <Field label="Class">
        <select className={inputClass} value={form.details.cabin} onChange={(event) => detail({ cabin: event.target.value })}>
          {cabins.map((cabin) => <option key={cabin}>{cabin}</option>)}
        </select>
      </Field>
      <Field label="PNR"><input className={inputClass} value={form.details.pnr} onChange={(event) => detail({ pnr: event.target.value.toUpperCase() })} /></Field>
      <Field label="Adults"><input className={inputClass} type="number" min="0" value={form.adults} onChange={(event) => patch({ adults: Number(event.target.value) })} /></Field>
      <Field label="Children"><input className={inputClass} type="number" min="0" value={form.children} onChange={(event) => patch({ children: Number(event.target.value) })} /></Field>
      <Field label="Infants"><input className={inputClass} type="number" min="0" value={form.infants} onChange={(event) => patch({ infants: Number(event.target.value) })} /></Field>
    </>
  );
}

function TransferFields({ form, patch, detail }: { form: FormState; patch: (partial: Partial<FormState>) => void; detail: (partial: Partial<typeof emptyDetails>) => void }) {
  return (
    <>
      <Field label="Pickup"><input className={inputClass} type="date" value={form.checkIn} onChange={(event) => patch({ checkIn: event.target.value })} /></Field>
      <Field label="Drop off"><input className={inputClass} type="date" value={form.checkOut} onChange={(event) => patch({ checkOut: event.target.value })} /></Field>
      <Field label="Pickup point"><input className={inputClass} value={form.details.pickup} onChange={(event) => detail({ pickup: event.target.value })} placeholder="Airport, hotel" /></Field>
      <Field label="Drop off point"><input className={inputClass} value={form.details.dropoff} onChange={(event) => detail({ dropoff: event.target.value })} placeholder="Hotel, airport" /></Field>
      <Field label="Vehicle"><input className={inputClass} value={form.details.vehicle} onChange={(event) => detail({ vehicle: event.target.value })} placeholder="Sedan, van" /></Field>
      <Field label="Adults"><input className={inputClass} type="number" min="0" value={form.adults} onChange={(event) => patch({ adults: Number(event.target.value) })} /></Field>
      <Field label="Children"><input className={inputClass} type="number" min="0" value={form.children} onChange={(event) => patch({ children: Number(event.target.value) })} /></Field>
      <Field label="Infants"><input className={inputClass} type="number" min="0" value={form.infants} onChange={(event) => patch({ infants: Number(event.target.value) })} /></Field>
    </>
  );
}

function VisaFields({ form, patch, detail }: { form: FormState; patch: (partial: Partial<FormState>) => void; detail: (partial: Partial<typeof emptyDetails>) => void }) {
  return (
    <>
      <Field label="Country"><input className={inputClass} value={form.details.country} onChange={(event) => detail({ country: event.target.value })} /></Field>
      <Field label="Nationality"><input className={inputClass} value={form.details.nationality} onChange={(event) => detail({ nationality: event.target.value })} /></Field>
      <Field label="Type of visa">
        <select className={inputClass} value={form.details.visaType} onChange={(event) => detail({ visaType: event.target.value })}>
          {visaTypes.map((type) => <option key={type}>{type}</option>)}
        </select>
      </Field>
      <div className="md:col-span-4">
        <Field label="Remark">
          <textarea className={`${inputClass} min-h-20`} value={form.remarks} onChange={(event) => patch({ remarks: event.target.value })} />
        </Field>
      </div>
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/10 pb-2">
      <dt className="text-sand/60">{label}</dt>
      <dd className={strong ? "font-display text-2xl" : "tabular-nums"}>{value}</dd>
    </div>
  );
}
