import { formatDate } from "./money";

function shownDate(value: unknown) {
  if (!value) return "";
  const text = formatDate(value as string | Date);
  return text === "—" ? "" : text;
}

function parts(...values: unknown[]) {
  return values.map((value) => String(value || "").trim()).filter(Boolean).join(" · ");
}

export function voucherServiceDetail(voucher: {
  service?: string;
  checkIn?: Date | string | null;
  checkOut?: Date | string | null;
  details?: Record<string, unknown> | null;
}) {
  const details = voucher.details || {};
  const service = String(voucher.service || "HOTEL").trim().toUpperCase();
  if (service === "FLIGHT") {
    const flight = [details.airline, details.flightNo].map((value) => String(value || "").trim()).filter(Boolean).join(" ");
    const from = String(details.from || "").trim();
    const to = String(details.to || "").trim();
    const route = from && to ? `${from} → ${to}` : from || to;
    return parts(flight, route);
  }
  if (service === "ACTIVITY") return parts(details.activityName, shownDate(voucher.checkIn));
  if (service === "TRANSFER") {
    const pickup = String(details.pickup || "").trim();
    const dropoff = String(details.dropoff || "").trim();
    const route = pickup && dropoff ? `${pickup} → ${dropoff}` : pickup || dropoff || String(details.vehicle || "").trim();
    return parts(route, shownDate(voucher.checkIn));
  }
  if (service === "VISA") return parts(details.country, details.visaType);
  const checkIn = shownDate(voucher.checkIn);
  const checkOut = shownDate(voucher.checkOut);
  const stay = checkIn && checkOut ? `${checkIn} – ${checkOut}` : checkIn || checkOut;
  return parts(details.hotelName, stay);
}

export function voucherFileLabel(voucher: {
  paxName?: string;
  service?: string;
  city?: string;
  checkIn?: Date | string | null;
  checkOut?: Date | string | null;
  details?: Record<string, unknown> | null;
}) {
  const label = parts(voucher.paxName, voucherServiceDetail(voucher));
  if (label) return label;
  return `${voucher.service || "HOTEL"} ${voucher.city || ""}`.trim();
}
