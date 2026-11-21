import { decimals, round, toBase } from "./money";

export type SettlementRow = {
  amount: number;
  bookedLc: number;
};

export type Settlement = {
  ok: boolean;
  error?: string;
  bankLc: number;
  clearedLc: number;
  unappliedFc: number;
  unappliedLc: number;
  fxGain: number;
  rows: SettlementRow[];
  mixed: boolean;
};

type Alloc = {
  currency: string;
  residual: number;
  residualLc: number;
  amount: number;
};

function bookedPortion(residual: number, residualLc: number, currency: string, amount: number) {
  const dp = decimals(currency);
  const eps = 10 ** (-dp) / 2;
  if (amount <= 0) return 0;
  if (amount >= residual - eps) return round(residualLc, 3);
  if (residual <= 0) return 0;
  return round(residualLc * (amount / residual), 3);
}

export function settle(input: {
  paymentType: "receive" | "send";
  currency: string;
  rate: number;
  amount: number;
  allocations: Alloc[];
}): Settlement {
  const fail = (error: string): Settlement => ({
    ok: false,
    error,
    bankLc: 0,
    clearedLc: 0,
    unappliedFc: 0,
    unappliedLc: 0,
    fxGain: 0,
    rows: [],
    mixed: false,
  });

  if (!(input.rate > 0)) return fail("Exchange rate must be greater than zero");
  if (!(input.amount > 0)) return fail("Payment amount must be greater than zero");
  if (!input.allocations.length) return fail("Allocate the payment to at least one open document");

  const dp = decimals(input.currency);
  const rows: SettlementRow[] = [];
  let clearedLc = 0;
  let allocatedSame = 0;
  let mixed = false;

  for (const alloc of input.allocations) {
    if (!(alloc.amount > 0)) return fail("Allocation amounts must be greater than zero");
    const eps = 10 ** (-decimals(alloc.currency)) / 2;
    if (alloc.amount - alloc.residual > eps) {
      return fail("An allocation is larger than the open balance");
    }
    if (alloc.currency !== input.currency) mixed = true;
    const bookedLc = bookedPortion(alloc.residual, alloc.residualLc, alloc.currency, alloc.amount);
    rows.push({ amount: alloc.amount, bookedLc });
    clearedLc = round(clearedLc + bookedLc, 3);
    if (alloc.currency === input.currency) allocatedSame = round(allocatedSame + alloc.amount, dp);
  }

  const bankLc = toBase(input.amount, input.rate);
  let unappliedFc = 0;
  let unappliedLc = 0;
  let actualAllocatedLc = bankLc;

  if (!mixed) {
    unappliedFc = round(input.amount - allocatedSame, dp);
    if (unappliedFc < -(10 ** -dp)) return fail("Allocations add up to more than the payment");
    if (unappliedFc < 0) unappliedFc = 0;
    unappliedLc = toBase(unappliedFc, input.rate);
    actualAllocatedLc = round(bankLc - unappliedLc, 3);
  }

  const fxGain =
    input.paymentType === "receive"
      ? round(actualAllocatedLc - clearedLc, 3)
      : round(clearedLc - actualAllocatedLc, 3);

  const fxAbs = Math.abs(fxGain);
  if (fxAbs > 1 && bankLc > 0 && fxAbs > bankLc * 0.25) {
    return fail(
      `Exchange difference is ${fxAbs.toFixed(3)} KWD, which is large against this payment. Check the rate, amount, and allocations.`,
    );
  }

  return {
    ok: true,
    bankLc,
    clearedLc,
    unappliedFc,
    unappliedLc,
    fxGain,
    rows,
    mixed,
  };
}
