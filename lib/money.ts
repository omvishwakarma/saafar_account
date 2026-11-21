const THREE = new Set(["KWD", "BHD", "OMR", "JOD"]);
const ZERO = new Set(["JPY", "KRW"]);

export function decimals(currency: string) {
  if (THREE.has(currency)) return 3;
  if (ZERO.has(currency)) return 0;
  return 2;
}

export function round(n: number, dp = 3) {
  if (!Number.isFinite(n)) return 0;
  const p = 10 ** dp;
  return Math.round((n + Number.EPSILON) * p) / p;
}

export function toBase(amount: number, rate: number) {
  return round(amount * rate, 3);
}

export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuwait" }).format(new Date());
}

export function addDays(iso: string, days: number) {
  const d = new Date(iso + "T12:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatMoney(amount: number, currency = "KWD") {
  const dp = decimals(currency);
  const n = Number.isFinite(amount) ? amount : 0;
  const body = n.toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
  return `${body} ${currency}`;
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function isoDate(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Use a valid date");
  return new Date(`${value}T12:00:00.000Z`);
}

export function num(value: unknown, label = "Amount") {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) throw new Error(`${label} is not a number`);
  return n;
}

export function nightsBetween(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 1;
  const ms = new Date(checkOut + "T12:00:00Z").getTime() - new Date(checkIn + "T12:00:00Z").getTime();
  const n = Math.round(ms / 86400000);
  return n > 0 ? n : 1;
}

export function voucherFigures(input: {
  supplierFc: number;
  supRoe: number;
  customerFc: number;
  custRoe: number;
  serviceFee: number;
  commPercent: number;
  nights: number;
}) {
  const supplierLc = toBase(input.supplierFc, input.supRoe);
  const customerLc = toBase(input.customerFc, input.custRoe);
  const serviceFeeLc = toBase(input.serviceFee, input.custRoe);
  const sellValue = round(customerLc + serviceFeeLc, 3);
  const markup = round(sellValue - supplierLc, 3);
  const commissionLc = round(sellValue * (input.commPercent || 0) / 100, 3);
  const finalIncome = markup;
  const ratePerNight = input.nights > 0 ? round(input.supplierFc / input.nights, decimals("KWD")) : 0;
  const margin = sellValue > 0 ? round((finalIncome / sellValue) * 100, 1) : 0;
  return { supplierLc, customerLc, serviceFeeLc, sellValue, markup, commissionLc, finalIncome, ratePerNight, margin };
}
