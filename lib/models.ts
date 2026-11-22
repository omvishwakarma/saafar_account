import mongoose, { Schema, type InferSchemaType } from "mongoose";

const CurrencySchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    rate: { type: Number, required: true },
  },
  { timestamps: true },
);

const AccountSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, enum: ["asset", "liability", "equity", "income", "expense"], required: true },
    subtype: { type: String, required: true },
  },
  { timestamps: true },
);

const PartnerSchema = new Schema(
  {
    name: { type: String, required: true },
    role: { type: String, enum: ["customer", "vendor", "both"], required: true },
    email: String,
    phone: String,
    city: String,
    country: { type: String, default: "Kuwait" },
    currency: { type: String, default: "KWD" },
    taxId: String,
  },
  { timestamps: true },
);

const MoveLineSchema = new Schema(
  {
    label: { type: String, default: "" },
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    qty: { type: Number, default: 1 },
    price: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
  },
  { _id: false },
);

const MoveSchema = new Schema(
  {
    number: { type: String, required: true, unique: true },
    moveType: {
      type: String,
      enum: ["out_invoice", "out_refund", "in_invoice", "in_refund"],
      required: true,
    },
    partnerId: { type: Schema.Types.ObjectId, ref: "Partner", required: true },
    currency: { type: String, required: true },
    rate: { type: Number, required: true },
    invoiceDate: { type: Date, required: true },
    accountingDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    narration: { type: String, default: "" },
    origin: { type: String, default: "" },
    lines: { type: [MoveLineSchema], default: [] },
    amountUntaxed: { type: Number, default: 0 },
    amountTax: { type: Number, default: 0 },
    amountTotal: { type: Number, default: 0 },
    amountTotalLc: { type: Number, default: 0 },
    residual: { type: Number, default: 0 },
    residualLc: { type: Number, default: 0 },
    status: { type: String, enum: ["draft", "posted", "partial", "paid"], default: "draft" },
    journalEntryId: { type: Schema.Types.ObjectId, ref: "JournalEntry" },
  },
  { timestamps: true },
);

const AllocationSchema = new Schema(
  {
    moveId: { type: Schema.Types.ObjectId, ref: "Move", required: true },
    amount: { type: Number, required: true },
    amountLc: { type: Number, required: true },
  },
  { _id: false },
);

const PaymentSchema = new Schema(
  {
    number: { type: String, required: true, unique: true },
    paymentType: { type: String, enum: ["receive", "send"], required: true },
    partnerId: { type: Schema.Types.ObjectId, ref: "Partner", required: true },
    currency: { type: String, required: true },
    rate: { type: Number, required: true },
    amount: { type: Number, required: true },
    amountLc: { type: Number, default: 0 },
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    method: { type: String, default: "Bank transfer" },
    date: { type: Date, required: true },
    memo: { type: String, default: "" },
    allocations: { type: [AllocationSchema], default: [] },
    fxGain: { type: Number, default: 0 },
    status: { type: String, enum: ["draft", "posted"], default: "draft" },
    journalEntryId: { type: Schema.Types.ObjectId, ref: "JournalEntry" },
  },
  { timestamps: true },
);

const JournalLineSchema = new Schema(
  {
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    partnerId: { type: Schema.Types.ObjectId, ref: "Partner" },
    label: { type: String, default: "" },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    currency: { type: String, default: "KWD" },
    amountCurrency: { type: Number, default: 0 },
    rate: { type: Number, default: 1 },
  },
  { _id: false },
);

const JournalSchema = new Schema(
  {
    date: { type: Date, required: true },
    ref: { type: String, required: true },
    memo: { type: String, default: "" },
    source: { type: String, enum: ["opening", "invoice", "payment", "receipt", "voucher"], required: true },
    sourceId: Schema.Types.ObjectId,
    state: { type: String, enum: ["posted"], default: "posted" },
    lines: { type: [JournalLineSchema], default: [] },
  },
  { timestamps: true },
);

const VoucherSchema = new Schema(
  {
    number: { type: String, required: true, unique: true },
    date: { type: Date, required: true },
    paxName: { type: String, default: "" },
    supplierId: { type: Schema.Types.ObjectId, ref: "Partner", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Partner", required: true },
    service: { type: String, default: "HOTEL" },
    city: { type: String, default: "KUWAIT" },
    consultant: { type: String, default: "" },
    payMode: { type: String, default: "Credit" },
    supplierRef: { type: String, default: "" },
    customerRef: { type: String, default: "" },
    checkIn: Date,
    checkOut: Date,
    nights: { type: Number, default: 1 },
    adults: { type: Number, default: 1 },
    children: { type: Number, default: 0 },
    infants: { type: Number, default: 0 },
    meal: { type: String, default: "" },
    roomType: { type: String, default: "" },
    roomCategory: { type: String, default: "" },
    roomView: { type: String, default: "" },
    details: { type: Schema.Types.Mixed, default: {} },
    supplierFc: { type: Number, default: 0 },
    supplierCurrency: { type: String, default: "KWD" },
    supRoe: { type: Number, default: 1 },
    customerFc: { type: Number, default: 0 },
    customerCurrency: { type: String, default: "KWD" },
    custRoe: { type: Number, default: 1 },
    serviceFee: { type: Number, default: 0 },
    commPercent: { type: Number, default: 0 },
    isReceived: { type: Boolean, default: false },
    remarks: { type: String, default: "" },
    supplierLc: { type: Number, default: 0 },
    sellValue: { type: Number, default: 0 },
    markup: { type: Number, default: 0 },
    commissionLc: { type: Number, default: 0 },
    status: { type: String, enum: ["draft", "confirmed"], default: "draft" },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Move" },
    billId: { type: Schema.Types.ObjectId, ref: "Move" },
  },
  { timestamps: true },
);

const ReceiptLineSchema = new Schema(
  {
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    partnerId: { type: Schema.Types.ObjectId, ref: "Partner" },
    remarks: { type: String, default: "" },
    currency: { type: String, default: "KWD" },
    rate: { type: Number, default: 1 },
    fcAmount: { type: Number, default: 0 },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    chequeNo: { type: String, default: "" },
    chequeDate: Date,
    bankName: { type: String, default: "" },
  },
  { _id: false },
);

const ReceiptSchema = new Schema(
  {
    number: { type: String, required: true, unique: true },
    kind: { type: String, enum: ["receipt", "payment"], required: true },
    date: { type: Date, required: true },
    branch: { type: String, default: "AlOmma" },
    party: { type: String, default: "" },
    reference: { type: String, default: "" },
    remarks: { type: String, default: "" },
    lines: { type: [ReceiptLineSchema], default: [] },
    allocations: { type: [AllocationSchema], default: [] },
    totalDebit: { type: Number, default: 0 },
    totalCredit: { type: Number, default: 0 },
    status: { type: String, enum: ["draft", "posted"], default: "draft" },
    journalEntryId: { type: Schema.Types.ObjectId, ref: "JournalEntry" },
  },
  { timestamps: true },
);

const CounterSchema = new Schema({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

const MetaSchema = new Schema({
  key: { type: String, required: true, unique: true },
  value: String,
});

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    role: { type: String, enum: ["admin", "consultant"], required: true },
    passwordHash: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const HotelNameSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
  },
  { timestamps: true },
);

const AuditSchema = new Schema({
  at: { type: Date, required: true, index: true },
  username: { type: String, required: true },
  name: { type: String, default: "" },
  action: { type: String, required: true },
  summary: { type: String, required: true },
  target: { type: String, default: "" },
});

export type MoveDoc = InferSchemaType<typeof MoveSchema> & { _id: mongoose.Types.ObjectId };

function model<T>(name: string, schema: Schema) {
  if (process.env.NODE_ENV !== "production" && mongoose.models[name]) {
    mongoose.deleteModel(name);
  }
  return (mongoose.models[name] as mongoose.Model<T>) || mongoose.model<T>(name, schema);
}

export const Currency = model("Currency", CurrencySchema);
export const Account = model("Account", AccountSchema);
export const Partner = model("Partner", PartnerSchema);
export const Move = model("Move", MoveSchema);
export const Payment = model("Payment", PaymentSchema);
export const JournalEntry = model("JournalEntry", JournalSchema);
export const Voucher = model("Voucher", VoucherSchema);
export const Receipt = model("Receipt", ReceiptSchema);
export const Counter = model("Counter", CounterSchema);
export const Meta = model("Meta", MetaSchema);
export const User = model("User", UserSchema);
export const AuditLog = model("AuditLog", AuditSchema);
export const HotelName = model("HotelName", HotelNameSchema);

export async function nextNumber(prefix: string) {
  const year = new Date().getFullYear();
  const key = `${prefix}-${year}`;
  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return `${prefix}-${year}-${String(doc.seq).padStart(4, "0")}`;
}
