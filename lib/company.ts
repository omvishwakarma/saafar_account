export const company = {
  name: "Saafar",
  short: "Saafar",
  city: "Kuwait",
  base: "KWD",
  product: "Safar Books",
};

export const MOVE_META = {
  out_invoice: {
    title: "Customer invoices",
    singular: "Customer invoice",
    party: "Customer",
    partyRole: "customer" as const,
    prefix: "SAH",
    income: true,
  },
  out_refund: {
    title: "Credit notes",
    singular: "Credit note",
    party: "Customer",
    partyRole: "customer" as const,
    prefix: "CN",
    income: true,
  },
  in_invoice: {
    title: "Vendor bills",
    singular: "Vendor bill",
    party: "Vendor",
    partyRole: "vendor" as const,
    prefix: "BILL",
    income: false,
  },
  in_refund: {
    title: "Debit notes",
    singular: "Debit note",
    party: "Vendor",
    partyRole: "vendor" as const,
    prefix: "DN",
    income: false,
  },
};
