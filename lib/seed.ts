import { booksBalance, saveMove, savePayment, saveReceipt, saveVoucher } from "./accounting";
import { db } from "./db";
import { Account, Currency, JournalEntry, Meta, Partner } from "./models";

const RATES: { code: string; name: string; rate: number }[] = [
  { code: "KWD", name: "Kuwaiti Dinar", rate: 1 },
  { code: "USD", name: "US Dollar", rate: 0.3068 },
  { code: "EUR", name: "Euro", rate: 0.334 },
  { code: "GBP", name: "British Pound", rate: 0.395 },
  { code: "AED", name: "UAE Dirham", rate: 0.08355 },
  { code: "SAR", name: "Saudi Riyal", rate: 0.0818 },
  { code: "QAR", name: "Qatari Riyal", rate: 0.08425 },
  { code: "OMR", name: "Omani Rial", rate: 0.7975 },
  { code: "BHD", name: "Bahraini Dinar", rate: 0.814 },
  { code: "INR", name: "Indian Rupee", rate: 0.00364 },
  { code: "JOD", name: "Jordanian Dinar", rate: 0.4327 },
  { code: "EGP", name: "Egyptian Pound", rate: 0.0062 },
  { code: "JPY", name: "Japanese Yen", rate: 0.00205 },
  { code: "AUD", name: "Australian Dollar", rate: 0.198 },
  { code: "CAD", name: "Canadian Dollar", rate: 0.218 },
];

const ACCOUNTS: { code: string; name: string; type: string; subtype: string }[] = [
  { code: "10018", name: "Petty Cash", type: "asset", subtype: "cash" },
  { code: "10111", name: "111 · Commercial Bank of Kuwait", type: "asset", subtype: "bank" },
  { code: "10222", name: "CBK Bank USD", type: "asset", subtype: "bank" },
  { code: "11000", name: "Accounts Receivable", type: "asset", subtype: "receivable" },
  { code: "12000", name: "Prepayments", type: "asset", subtype: "prepayment" },
  { code: "15000", name: "Office Equipment", type: "asset", subtype: "fixed_asset" },
  { code: "20000", name: "Accounts Payable", type: "liability", subtype: "payable" },
  { code: "21000", name: "Customer Advances", type: "liability", subtype: "current_liability" },
  { code: "22000", name: "Tax Payable", type: "liability", subtype: "tax" },
  { code: "30000", name: "Owner Capital", type: "equity", subtype: "equity" },
  { code: "39000", name: "Retained Earnings", type: "equity", subtype: "equity" },
  { code: "40000", name: "Hotel Revenue", type: "income", subtype: "income" },
  { code: "41000", name: "Flight Revenue", type: "income", subtype: "income" },
  { code: "42000", name: "Service Fee Income", type: "income", subtype: "income" },
  { code: "43000", name: "Commission Income", type: "income", subtype: "income" },
  { code: "44000", name: "Foreign Exchange Gain", type: "income", subtype: "income" },
  { code: "50000", name: "Hotel Cost", type: "expense", subtype: "expense" },
  { code: "51000", name: "Flight Cost", type: "expense", subtype: "expense" },
  { code: "52000", name: "Commission Expense", type: "expense", subtype: "expense" },
  { code: "53000", name: "Bank Charges", type: "expense", subtype: "expense" },
  { code: "54000", name: "Foreign Exchange Loss", type: "expense", subtype: "expense" },
  { code: "55000", name: "Office Expense", type: "expense", subtype: "expense" },
];

let pending: Promise<void> | null = null;
let ready = false;

export async function ensureSeed() {
  await db();
  if (ready) return;
  if (!pending) {
    pending = runSeed().finally(() => {
      pending = null;
    });
  }
  await pending;
}

async function runSeed() {
  const meta = await Meta.findOne({ key: "seeded" });
  if (meta) {
    ready = true;
    return;
  }
  if ((await Account.countDocuments()) > 0) {
    await Meta.updateOne({ key: "seeded" }, { $set: { value: "1" } }, { upsert: true });
    ready = true;
    return;
  }

  await Currency.insertMany(RATES);
  await Account.insertMany(ACCOUNTS);
  const accounts = await Account.find();
  const accountId = (code: string) => String(accounts.find((row) => row.code === code)!._id);

  const people = await Partner.insertMany([
    { name: "Burhan United Travel And Tourism", role: "customer", city: "Kuwait", country: "Kuwait", currency: "KWD", email: "accounts@burhanunited.example", phone: "+965 2200 1101" },
    { name: "Khozema Travel", role: "customer", city: "Kuwait", country: "Kuwait", currency: "KWD", email: "finance@khozema.example", phone: "+965 2200 1102" },
    { name: "On Hold Alomma Holidays", role: "customer", city: "Kuwait", country: "Kuwait", currency: "KWD", email: "hold@alomma.example", phone: "+965 2200 1103" },
    { name: "Gulf Wings", role: "customer", city: "Doha", country: "Qatar", currency: "QAR", email: "accounts@gulfwings.example", phone: "+974 4400 2201" },
    { name: "Marina Travel", role: "customer", city: "Dubai", country: "UAE", currency: "AED", email: "accounts@marinatravel.example", phone: "+971 4 300 2202" },
    { name: "Desert Rose Tours", role: "customer", city: "Kuwait", country: "Kuwait", currency: "KWD", email: "hello@desertrose.example", phone: "+965 2200 1106" },
    { name: "Kuwait Airways Staff Club", role: "customer", city: "Kuwait", country: "Kuwait", currency: "KWD", email: "club@kuwaitairways.example", phone: "+965 2200 1107" },
    { name: "Sakina Corporate", role: "customer", city: "Kuwait", country: "Kuwait", currency: "USD", email: "travel@sakinacorp.example", phone: "+965 2200 1108" },
    { name: "Saafar", role: "vendor", city: "Kuwait", country: "Kuwait", currency: "KWD", email: "vendor-bills@saafar.example", phone: "+965 1800 3001" },
    { name: "Air India", role: "vendor", city: "Delhi", country: "India", currency: "USD", email: "trade@airindia.example", phone: "+91 11 4000 1001" },
    { name: "Alomma Farwaniya", role: "vendor", city: "Kuwait", country: "Kuwait", currency: "KWD", email: "farwaniya@alomma.example", phone: "+965 1800 3003" },
    { name: "Hilton Kuwait", role: "vendor", city: "Kuwait", country: "Kuwait", currency: "KWD", email: "ar@hiltonkuwait.example", phone: "+965 1800 3004" },
    { name: "Qatar Airways", role: "vendor", city: "Doha", country: "Qatar", currency: "USD", email: "trade@qatarairways.example", phone: "+974 4000 2005" },
    { name: "Jumeirah Dubai", role: "vendor", city: "Dubai", country: "UAE", currency: "AED", email: "finance@jumeirah.example", phone: "+971 4 300 2006" },
    { name: "Avis Car Rental", role: "vendor", city: "Kuwait", country: "Kuwait", currency: "KWD", email: "billing@avis.example", phone: "+965 1800 3007" },
    { name: "Akash International", role: "vendor", city: "Kuwait", country: "Kuwait", currency: "KWD", email: "accounts@akash.example", phone: "+965 1800 3008" },
  ]);
  const partnerId = (name: string) => String(people.find((row) => row.name === name)!._id);
  const rate = (code: string) => RATES.find((row) => row.code === code)!.rate;

  await JournalEntry.create({
    date: new Date("2026-01-01T12:00:00.000Z"),
    ref: "OPEN-2026",
    memo: "Opening balances",
    source: "opening",
    lines: [
      { accountId: accountId("10111"), label: "Opening CBK", debit: 420000, credit: 0, currency: "KWD", amountCurrency: 420000, rate: 1 },
      { accountId: accountId("10018"), label: "Opening petty cash", debit: 8500, credit: 0, currency: "KWD", amountCurrency: 8500, rate: 1 },
      { accountId: accountId("10222"), label: "Opening USD bank", debit: 7670, credit: 0, currency: "USD", amountCurrency: 25000, rate: 0.3068 },
      { accountId: accountId("12000"), label: "Opening prepayments", debit: 7660, credit: 0, currency: "KWD", amountCurrency: 7660, rate: 1 },
      { accountId: accountId("15000"), label: "Opening equipment", debit: 10195, credit: 0, currency: "KWD", amountCurrency: 10195, rate: 1 },
      { accountId: accountId("30000"), label: "Owner capital", debit: 0, credit: 454025, currency: "KWD", amountCurrency: 454025, rate: 1 },
    ],
  });

  const line = (label: string, code: string, price: number) => ({
    label,
    accountId: accountId(code),
    qty: 1,
    price,
    taxRate: 0,
  });

  const burhanHotel = await saveMove({
    moveType: "out_invoice",
    partnerId: partnerId("Burhan United Travel And Tourism"),
    currency: "KWD",
    rate: 1,
    invoiceDate: "2026-11-05",
    accountingDate: "2026-11-05",
    dueDate: "2026-11-08",
    narration: "November hotel series",
    lines: [line("Kuwait & Dubai hotels · group", "40000", 230440)],
    post: true,
  });
  await saveMove({
    moveType: "out_invoice",
    partnerId: partnerId("Burhan United Travel And Tourism"),
    currency: "KWD",
    rate: 1,
    invoiceDate: "2026-11-10",
    accountingDate: "2026-11-10",
    dueDate: "2026-11-12",
    narration: "Makkah group balance",
    lines: [line("Hotel rooms · Makkah group", "40000", 204520)],
    post: true,
  });
  await saveMove({
    moveType: "out_invoice",
    partnerId: partnerId("Khozema Travel"),
    currency: "KWD",
    rate: 1,
    invoiceDate: "2026-11-12",
    accountingDate: "2026-11-12",
    dueDate: "2026-11-18",
    narration: "FIT hotels",
    lines: [line("FIT hotel bookings", "40000", 58080)],
    post: true,
  });
  const alomma = await saveMove({
    moveType: "out_invoice",
    partnerId: partnerId("On Hold Alomma Holidays"),
    currency: "KWD",
    rate: 1,
    invoiceDate: "2026-11-14",
    accountingDate: "2026-11-14",
    dueDate: "2026-11-28",
    narration: "Branch recharge",
    lines: [line("Holiday packages on hold", "40000", 75000)],
    post: true,
  });
  const gulf = await saveMove({
    moveType: "out_invoice",
    partnerId: partnerId("Gulf Wings"),
    currency: "QAR",
    rate: rate("QAR"),
    invoiceDate: "2026-11-11",
    accountingDate: "2026-11-11",
    dueDate: "2026-11-30",
    narration: "DOH sectors",
    lines: [line("Group flights DOH", "41000", 18500)],
    post: true,
  });
  await saveMove({
    moveType: "out_invoice",
    partnerId: partnerId("Marina Travel"),
    currency: "AED",
    rate: rate("AED"),
    invoiceDate: "2026-11-02",
    accountingDate: "2026-11-02",
    dueDate: "2026-11-10",
    narration: "Dubai stay",
    lines: [line("Dubai hotel net", "40000", 4200)],
    post: true,
  });
  const desert = await saveMove({
    moveType: "out_invoice",
    partnerId: partnerId("Desert Rose Tours"),
    currency: "KWD",
    rate: 1,
    invoiceDate: "2026-11-01",
    accountingDate: "2026-11-01",
    dueDate: "2026-11-05",
    narration: "Weekend package",
    lines: [line("Weekend Kuwait city hotel", "40000", 890.5)],
    post: true,
  });
  await saveMove({
    moveType: "out_invoice",
    partnerId: partnerId("Kuwait Airways Staff Club"),
    currency: "KWD",
    rate: 1,
    invoiceDate: "2026-11-19",
    accountingDate: "2026-11-19",
    dueDate: "2026-12-05",
    narration: "Staff leisure",
    lines: [line("Staff leisure fares", "41000", 12400)],
    post: true,
  });
  const sakina = await saveMove({
    moveType: "out_invoice",
    partnerId: partnerId("Sakina Corporate"),
    currency: "USD",
    rate: rate("USD"),
    invoiceDate: "2026-11-16",
    accountingDate: "2026-11-16",
    dueDate: "2026-11-18",
    narration: "Corporate ticket",
    lines: [line("Corporate tickets", "41000", 1500)],
    post: true,
  });
  await saveMove({
    moveType: "out_refund",
    partnerId: partnerId("Khozema Travel"),
    currency: "KWD",
    rate: 1,
    invoiceDate: "2026-11-20",
    accountingDate: "2026-11-20",
    dueDate: "2026-11-20",
    narration: "Room not used",
    lines: [line("Unused room credit", "40000", 150)],
    post: true,
  });
  await saveMove({
    moveType: "out_invoice",
    partnerId: partnerId("Gulf Wings"),
    currency: "QAR",
    rate: rate("QAR"),
    invoiceDate: "2026-11-21",
    accountingDate: "2026-11-21",
    dueDate: "2026-11-28",
    narration: "Draft until names are confirmed",
    lines: [line("Doha stopover, names pending", "41000", 640)],
    post: false,
  });

  await saveMove({
    moveType: "in_invoice",
    partnerId: partnerId("Saafar"),
    currency: "KWD",
    rate: 1,
    invoiceDate: "2026-11-06",
    accountingDate: "2026-11-06",
    dueDate: "2026-11-20",
    narration: "Saafar hotel file",
    lines: [line("Hotel file November", "50000", 120000)],
    post: true,
  });
  await saveMove({
    moveType: "in_invoice",
    partnerId: partnerId("Hilton Kuwait"),
    currency: "KWD",
    rate: 1,
    invoiceDate: "2026-11-15",
    accountingDate: "2026-11-15",
    dueDate: "2026-11-25",
    narration: "Hilton allotment",
    lines: [line("Hilton allotment", "50000", 42500)],
    post: true,
  });
  await saveMove({
    moveType: "in_invoice",
    partnerId: partnerId("Qatar Airways"),
    currency: "USD",
    rate: rate("USD"),
    invoiceDate: "2026-11-08",
    accountingDate: "2026-11-08",
    dueDate: "2026-12-01",
    narration: "QR BSP",
    lines: [line("BSP Qatar Airways", "51000", 8200)],
    post: true,
  });
  const airIndia = await saveMove({
    moveType: "in_invoice",
    partnerId: partnerId("Air India"),
    currency: "KWD",
    rate: 1,
    invoiceDate: "2026-11-04",
    accountingDate: "2026-11-04",
    dueDate: "2026-11-15",
    narration: "AI ADM",
    lines: [line("Air India ADM", "51000", 3100)],
    post: true,
  });
  await saveMove({
    moveType: "in_invoice",
    partnerId: partnerId("Jumeirah Dubai"),
    currency: "AED",
    rate: rate("AED"),
    invoiceDate: "2026-11-16",
    accountingDate: "2026-11-16",
    dueDate: "2026-11-22",
    narration: "Jumeirah FIT",
    lines: [line("Jumeirah FIT rooms", "50000", 15750)],
    post: true,
  });
  await saveMove({
    moveType: "in_refund",
    partnerId: partnerId("Hilton Kuwait"),
    currency: "KWD",
    rate: 1,
    invoiceDate: "2026-11-19",
    accountingDate: "2026-11-19",
    dueDate: "2026-11-19",
    narration: "Early checkout",
    lines: [line("Early checkout allowance", "50000", 200)],
    post: true,
  });

  await savePayment({
    paymentType: "receive",
    partnerId: partnerId("Desert Rose Tours"),
    currency: "KWD",
    rate: 1,
    amount: 890.5,
    accountId: accountId("10111"),
    method: "Bank transfer",
    date: "2026-11-06",
    memo: "Desert Rose weekend package",
    allocations: [{ moveId: desert, amount: 890.5 }],
    post: true,
  });
  await savePayment({
    paymentType: "receive",
    partnerId: partnerId("On Hold Alomma Holidays"),
    currency: "KWD",
    rate: 1,
    amount: 20000,
    accountId: accountId("10111"),
    method: "Bank transfer",
    date: "2026-11-18",
    memo: "Part receipt on hold file",
    allocations: [{ moveId: alomma, amount: 20000 }],
    post: true,
  });
  await savePayment({
    paymentType: "receive",
    partnerId: partnerId("Sakina Corporate"),
    currency: "USD",
    rate: 0.308,
    amount: 1500,
    accountId: accountId("10222"),
    method: "Bank transfer",
    date: "2026-11-19",
    memo: "USD receipt, rate moved",
    allocations: [{ moveId: sakina, amount: 1500 }],
    post: true,
  });
  await savePayment({
    paymentType: "send",
    partnerId: partnerId("Air India"),
    currency: "KWD",
    rate: 1,
    amount: 3100,
    accountId: accountId("10111"),
    method: "Bank transfer",
    date: "2026-11-16",
    memo: "Air India ADM settled",
    allocations: [{ moveId: airIndia, amount: 3100 }],
    post: true,
  });

  await saveReceipt({
    kind: "payment",
    date: "2026-11-17",
    branch: "AlOmma",
    party: "CBK charges",
    reference: "CHG-118",
    remarks: "November bank charges",
    lines: [
      { accountId: accountId("53000"), remarks: "Bank charges", currency: "KWD", rate: 1, fcAmount: 4.5, side: "debit" },
      { accountId: accountId("10111"), remarks: "CBK", currency: "KWD", rate: 1, fcAmount: 4.5, side: "credit" },
    ],
    post: true,
  });
  await saveReceipt({
    kind: "payment",
    date: "2026-11-09",
    branch: "AlOmma",
    party: "Office",
    reference: "PC-22",
    remarks: "Petty cash office expense",
    lines: [
      { accountId: accountId("55000"), remarks: "Office supplies", currency: "KWD", rate: 1, fcAmount: 25, side: "debit" },
      { accountId: accountId("10018"), remarks: "Petty cash", currency: "KWD", rate: 1, fcAmount: 25, side: "credit" },
    ],
    post: true,
  });

  await saveVoucher({
    date: "2026-11-18",
    paxName: "Fatima Al Sabah",
    supplierId: partnerId("Saafar"),
    customerId: partnerId("Desert Rose Tours"),
    service: "HOTEL",
    city: "KUWAIT",
    consultant: "Sakina Bhaisab",
    payMode: "Credit",
    supplierRef: "SFR-441",
    customerRef: "DR-19",
    checkIn: "2026-11-21",
    checkOut: "2026-11-24",
    nights: 3,
    adults: 2,
    children: 0,
    infants: 0,
    meal: "BB",
    roomType: "Deluxe",
    roomCategory: "Sea",
    roomView: "City",
    supplierFc: 180,
    supplierCurrency: "KWD",
    supRoe: 1,
    customerFc: 240,
    customerCurrency: "KWD",
    custRoe: 1,
    serviceFee: 5,
    commPercent: 10,
    isReceived: false,
    remarks: "Three nights, breakfast included.",
    post: true,
  });
  await saveVoucher({
    date: "2026-11-21",
    paxName: "Omar Nasser",
    supplierId: partnerId("Hilton Kuwait"),
    customerId: partnerId("Burhan United Travel And Tourism"),
    service: "HOTEL",
    city: "KUWAIT",
    consultant: "Murtuza Bhaisab",
    payMode: "Bank",
    supplierRef: "",
    customerRef: "",
    checkIn: "2026-11-21",
    checkOut: "2026-11-23",
    nights: 2,
    adults: 1,
    children: 1,
    infants: 0,
    meal: "RO",
    roomType: "Twin",
    roomCategory: "Standard",
    roomView: "City",
    supplierFc: 320,
    supplierCurrency: "USD",
    supRoe: rate("USD"),
    customerFc: 120,
    customerCurrency: "KWD",
    custRoe: 1,
    serviceFee: 0,
    commPercent: 8,
    isReceived: false,
    remarks: "Waiting for the guest names.",
    post: false,
  });

  void burhanHotel;
  void gulf;

  const balance = await booksBalance();
  if (Math.abs(balance.diff) > 0.05) {
    console.error("Safar Books is out of balance after seed", balance);
  }
  await Meta.create({ key: "seeded", value: "1" });
  ready = true;
}
