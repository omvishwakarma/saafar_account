export type MoveType = "out_invoice" | "out_refund" | "in_invoice" | "in_refund";

export type MoveLineInput = {
  label: string;
  accountId: string;
  qty: number;
  price: number;
  taxRate: number;
};

export type MoveInput = {
  id?: string;
  moveType: MoveType;
  partnerId: string;
  currency: string;
  rate: number;
  invoiceDate: string;
  accountingDate: string;
  dueDate: string;
  narration: string;
  lines: MoveLineInput[];
  post?: boolean;
};

export type PaymentInput = {
  id?: string;
  paymentType: "receive" | "send";
  partnerId: string;
  currency: string;
  rate: number;
  amount: number;
  accountId: string;
  method: string;
  date: string;
  memo: string;
  allocations: { moveId: string; amount: number }[];
  post?: boolean;
};

export type ReceiptLineInput = {
  accountId: string;
  partnerId?: string;
  remarks: string;
  currency: string;
  rate: number;
  fcAmount: number;
  side: "debit" | "credit";
  chequeNo?: string;
  chequeDate?: string;
  bankName?: string;
};

export type ReceiptInput = {
  id?: string;
  kind: "receipt" | "payment";
  date: string;
  branch: string;
  party: string;
  reference: string;
  remarks: string;
  lines: ReceiptLineInput[];
  post?: boolean;
};

export type VoucherDetails = {
  qty: string;
  transfers: string;
  timeLimit: string;
  hotelService: string;
  from: string;
  to: string;
  airline: string;
  flightNo: string;
  pnr: string;
  cabin: string;
  pickup: string;
  dropoff: string;
  vehicle: string;
  country: string;
  nationality: string;
  visaType: string;
  activityName: string;
  hotelCity: string;
  hotelName: string;
};

export type VoucherInput = {
  id?: string;
  date: string;
  paxName: string;
  supplierId: string;
  customerId: string;
  service: string;
  city: string;
  consultant: string;
  payMode: string;
  supplierRef: string;
  customerRef: string;
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
  details?: Partial<VoucherDetails>;
  supplierFc: number;
  supplierCurrency: string;
  supRoe: number;
  customerFc: number;
  customerCurrency: string;
  custRoe: number;
  serviceFee: number;
  commPercent: number;
  isReceived: boolean;
  remarks: string;
  post?: boolean;
};

export type PartnerInput = {
  name: string;
  role: "customer" | "vendor" | "both";
  email: string;
  phone: string;
  city: string;
  country: string;
  currency: string;
  taxId: string;
  openingAmount?: number;
  openingDate?: string;
};

export type JournalLineInput = {
  accountId: string;
  partnerId?: string;
  label: string;
  currency: string;
  rate: number;
  debit: number;
  credit: number;
};

export type JournalInput = {
  date: string;
  memo: string;
  lines: JournalLineInput[];
};

export type CurrencyRow = { id: string; code: string; name: string; rate: number };
export type AccountRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  subtype: string;
};
export type PartnerRow = {
  id: string;
  name: string;
  role: "customer" | "vendor" | "both";
  email: string;
  phone: string;
  city: string;
  country: string;
  currency: string;
  taxId: string;
};

export type OpenMove = {
  id: string;
  number: string;
  moveType: MoveType;
  partnerId: string;
  currency: string;
  rate: number;
  residual: number;
  residualLc: number;
  dueDate: string;
  total: number;
};
