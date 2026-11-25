import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { VoucherDelete } from "@/components/VoucherActions";
import { VoucherForm } from "@/components/VoucherForm";
import { Button, Money, PageHeader, Panel, Status, When } from "@/components/ui";
import { getVoucher, masters } from "@/lib/queries";

export default async function VoucherPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const voucher = await getVoucher(id);
  if (!voucher) notFound();
  if (voucher.status === "draft") {
    const data = await masters();
    return (
      <div>
        <PageHeader eyebrow={voucher.number} title="Draft voucher" />
        <VoucherForm
          customers={data.partners.filter((partner) => partner.role === "customer" || partner.role === "both")}
          suppliers={data.partners.filter((partner) => partner.role === "vendor" || partner.role === "both")}
          currencies={data.currencies}
          initial={{
            id: voucher.id,
            date: voucher.date,
            paxName: voucher.paxName,
            supplierId: voucher.supplier.id,
            customerId: voucher.customer.id,
            service: voucher.service,
            city: voucher.city,
            consultant: voucher.consultant,
            payMode: voucher.payMode,
            supplierRef: voucher.supplierRef,
            customerRef: voucher.customerRef,
            checkIn: voucher.checkIn,
            checkOut: voucher.checkOut,
            nights: voucher.nights,
            adults: voucher.adults,
            children: voucher.children,
            infants: voucher.infants,
            meal: voucher.meal,
            roomType: voucher.roomType,
            roomCategory: voucher.roomCategory,
            roomView: voucher.roomView,
            details: voucher.details,
            supplierFc: voucher.supplierFc,
            supplierCurrency: voucher.supplierCurrency,
            supRoe: voucher.supRoe,
            customerFc: voucher.customerFc,
            customerCurrency: voucher.customerCurrency,
            custRoe: voucher.custRoe,
            serviceFee: voucher.serviceFee,
            commPercent: voucher.commPercent,
            isReceived: voucher.isReceived,
            remarks: voucher.remarks,
          }}
        />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Travel voucher"
        title={voucher.number}
        sub={`${voucher.service} · ${voucher.city}`}
        action={
          <>
            <Button href={`/vouchers/${voucher.id}/edit`}>Edit</Button>
            <VoucherDelete id={voucher.id} number={voucher.number} />
            <PrintButton />
          </>
        }
      />
      <Panel className="p-6 md:p-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-muted">Guest</div>
            <div className="font-display text-4xl">{voucher.paxName || "—"}</div>
          </div>
          <Status value={voucher.status} />
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <Block title="Customer" name={voucher.customer.name} lines={[voucher.customer.city, voucher.customerRef, `Pay ${voucher.payMode}`]} />
          <Block title="Supplier" name={voucher.supplier.name} lines={[voucher.supplier.city, voucher.supplierRef, voucher.consultant]} />
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Mini label="Date" value={<When value={voucher.date} />} />
          {serviceFacts(voucher).map((fact) => <Mini key={fact.label} label={fact.label} value={fact.value} />)}
        </dl>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-sand p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted">Supplier</div>
            <div className="mt-1 text-xl font-semibold"><Money amount={voucher.supplierFc} currency={voucher.supplierCurrency} /></div>
            <div className="text-sm text-muted">ROE {voucher.supRoe} → <Money amount={voucher.supplierLc} /></div>
          </div>
          <div className="rounded-xl bg-sand p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted">Customer</div>
            <div className="mt-1 text-xl font-semibold"><Money amount={voucher.customerFc} currency={voucher.customerCurrency} /></div>
            <div className="text-sm text-muted">Fee {voucher.serviceFee} {voucher.customerCurrency} · ROE {voucher.custRoe}</div>
          </div>
        </div>
        <dl className="mt-4 space-y-1 text-sm">
          <Line label="Sell value" value={<Money amount={voucher.sellValue} />} />
          <Line label="Markup" value={<Money amount={voucher.markup} />} />
          <Line label={`Commission memo ${voucher.commPercent}%`} value={<Money amount={voucher.commissionLc} />} />
        </dl>
        {voucher.remarks && <p className="mt-4 text-sm text-muted">{voucher.remarks}</p>}
        <div className="mt-6 flex gap-4 text-sm font-semibold">
          {voucher.invoiceId && <Link className="text-brass" href={`/moves/${voucher.invoiceId}`}>Customer invoice</Link>}
          {voucher.billId && <Link className="text-brass" href={`/moves/${voucher.billId}`}>Supplier bill</Link>}
        </div>
      </Panel>
    </div>
  );
}

function serviceFacts(voucher: {
  service: string;
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
  details: Record<string, string>;
}) {
  const guests = `${voucher.adults} adl · ${voucher.children} chd · ${voucher.infants} inf`;
  const details = voucher.details || {};
  if (voucher.service === "FLIGHT") {
    return [
      { label: "Route", value: `${details.from || "—"} → ${details.to || "—"}` },
      { label: "Departure", value: voucher.checkIn || "—" },
      { label: "Return", value: voucher.checkOut || "—" },
      { label: "Flight", value: [details.airline, details.flightNo].filter(Boolean).join(" ") || "—" },
      { label: "Class", value: details.cabin || "—" },
      { label: "PNR", value: details.pnr || "—" },
      { label: "Guests", value: guests },
    ];
  }
  if (voucher.service === "TRANSFER") {
    return [
      { label: "Pickup", value: `${voucher.checkIn || "—"} · ${details.pickup || "—"}` },
      { label: "Drop off", value: `${voucher.checkOut || "—"} · ${details.dropoff || "—"}` },
      { label: "Vehicle", value: details.vehicle || "—" },
      { label: "Guests", value: guests },
    ];
  }
  if (voucher.service === "ACTIVITY") {
    return [
      { label: "Activity date", value: voucher.checkIn || "—" },
      { label: "Name", value: details.activityName || "—" },
      { label: "Guests", value: guests },
      { label: "Meal", value: voucher.meal || "—" },
      { label: "Qty", value: details.qty || "—" },
    ];
  }
  if (voucher.service === "VISA") {
    return [
      { label: "Country", value: details.country || "—" },
      { label: "Nationality", value: details.nationality || "—" },
      { label: "Visa", value: details.visaType || "—" },
    ];
  }
  return [
    { label: "City", value: details.hotelCity || "—" },
    { label: "Hotel", value: details.hotelName || "—" },
    { label: "Stay", value: `${voucher.checkIn || "—"} → ${voucher.checkOut || "—"}` },
    { label: "Nights", value: String(voucher.nights) },
    { label: "Guests", value: guests },
    { label: "Room", value: [voucher.roomType, voucher.roomCategory, voucher.roomView].filter(Boolean).join(" · ") || "—" },
    { label: "Meal", value: voucher.meal || "—" },
    { label: "Service", value: details.hotelService || "—" },
  ];
}

function Block({ title, name, lines }: { title: string; name: string; lines: string[] }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.14em] text-muted">{title}</div>
      <div className="font-semibold">{name}</div>
      {lines.filter(Boolean).map((line) => <div key={line} className="text-sm text-muted">{line}</div>)}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><dt className="text-muted">{label}</dt><dd className="font-medium">{value}</dd></div>;
}

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between"><dt className="text-muted">{label}</dt><dd>{value}</dd></div>;
}
