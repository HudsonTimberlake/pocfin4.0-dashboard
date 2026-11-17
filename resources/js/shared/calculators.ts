// Copied from pocfin4.0-app/src/lib/calculators.ts (2026-11-17). Keep the two in step.
// The calculators' maths (K3–K8). These are estimates that are never booked, so unlike the rest of
// the app they use JS numbers and run on the phone (owner's decision, 2026-11-07). Results are
// rounded to whole rands for display. Growth compounds monthly; monthly amounts are paid at the end
// of each month. "Today's money" divides by inflation compounded yearly over the same years.

export type Scenario = "expected" | "low" | "high";

/** A yearly raise to the monthly amount: a percentage or a rand amount (design/goals.md). */
export type RaiseMode = "percent" | "amount";

export type RetirementInputs = {
  age: number;
  retire_age: number;
  /** A month of spending in retirement, in today's money. */
  spending: number;
  target: "25x" | "15x";
  saved: number;
  monthly: number;
  /** % a year the monthly amount goes up (raise_mode percent). */
  raise: number;
  /** How the monthly amount goes up each year: by `raise` % or by `raise_amount` rands. */
  raise_mode: RaiseMode;
  /** Rands added to the monthly amount each year (raise_mode amount). */
  raise_amount: number;
  /** % a year, before inflation. */
  growth: number;
  /** ± % a year around growth, for the tough and good lines. */
  spread: number;
  inflation: number;
  /** % a year on what's left once you retire, before inflation. */
  growth_after: number;
};

export const RETIREMENT_DEFAULTS: RetirementInputs = {
  age: 35,
  retire_age: 65,
  spending: 0,
  target: "25x",
  saved: 0,
  monthly: 0,
  raise: 6,
  // Saved calculations from before 2026-11-10 have neither, so they open as a percentage, unchanged.
  raise_mode: "percent",
  raise_amount: 500,
  growth: 10,
  spread: 2,
  inflation: 5,
  growth_after: 7,
};

/** The assumptions Reset puts back (K4). */
export const RETIREMENT_ASSUMPTIONS = {
  growth: RETIREMENT_DEFAULTS.growth,
  spread: RETIREMENT_DEFAULTS.spread,
  inflation: RETIREMENT_DEFAULTS.inflation,
} as const;

/** Never past this age, for "how long it lasts" and the later retirement age. */
export const MAX_AGE = 100;

const pct = (n: number) => n / 100;

/**
 * Saved + monthly amounts over `years`, the monthly amount raised once a year: by `raise` % or, with
 * `raiseMode` "amount", by `raise` rands. Nominal rands.
 */
export function grow(
  saved: number,
  monthly: number,
  years: number,
  growth: number,
  raise = 0,
  raiseMode: RaiseMode = "percent",
): number {
  const r = pct(growth) / 12;
  let balance = saved;
  let m = monthly;
  for (let y = 0; y < years; y++) {
    for (let mo = 0; mo < 12; mo++) balance = balance * (1 + r) + m;
    m = raiseMode === "amount" ? m + raise : m * (1 + pct(raise));
  }
  return balance;
}

/** The yearly raise a retirement calculation uses, as grow() takes it. */
export function raiseOf(
  i: Pick<RetirementInputs, "raise" | "raise_mode" | "raise_amount">,
): [number, RaiseMode] {
  return i.raise_mode === "amount"
    ? [i.raise_amount, "amount"]
    : [i.raise, "percent"];
}

/** Rands in `years` turned back into what they buy today. */
export function toToday(
  amount: number,
  years: number,
  inflation: number,
): number {
  return amount / Math.pow(1 + pct(inflation), years);
}

/** What today's rands will cost in `years`. */
export function toFuture(
  amount: number,
  years: number,
  inflation: number,
): number {
  return amount * Math.pow(1 + pct(inflation), years);
}

/** Binary search for the smallest x in [lo, hi] where ok(x) holds. Null if not even hi does. */
function smallest(
  lo: number,
  hi: number,
  ok: (x: number) => boolean,
  steps = 50,
): number | null {
  if (!ok(hi)) return null;
  for (let i = 0; i < steps; i++) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

/**
 * The age the money runs out, spending `spending` (today's money) a month from `fromAge`, with what's
 * left growing at `growthAfter`. Worked in today's money, so spending stays the same each month.
 * Null when it lasts past MAX_AGE.
 */
export function lastsUntil(
  pot: number,
  spending: number,
  fromAge: number,
  growthAfter: number,
  inflation: number,
): number | null {
  if (spending <= 0) return null;
  const real = (1 + pct(growthAfter)) / (1 + pct(inflation)) - 1;
  const r = Math.pow(1 + real, 1 / 12) - 1;
  let balance = pot;
  for (let month = 1; month <= (MAX_AGE - fromAge) * 12; month++) {
    balance = balance * (1 + r) - spending;
    if (balance <= 0) return fromAge + month / 12;
  }
  return null;
}

export type RetirementResult = {
  years: number;
  /** 25× and 15× a year's spending, today's money. */
  need25: number;
  need15: number;
  target: number;
  /** A month's spending in the year you retire, in that year's rands. */
  spendingThen: number;
  /** What prices multiply by between now and retirement. */
  factor: number;
  /** The numbers you actually chase: the targets above in the year you retire's rands (2026-11-11). */
  targetThen: number;
  need25Then: number;
  need15Then: number;
  gapThen: number;
  /** `series` in that year's rands. */
  seriesThen: Record<Scenario, number[]>;
  retireYear: number;
  /** At retirement, today's money. */
  have: Record<Scenario, number>;
  /** At retirement, in that year's rands. */
  haveThen: Record<Scenario, number>;
  /** One point a year from now to retirement, today's money. */
  series: Record<Scenario, number[]>;
  /** Target minus expected, never below zero. */
  gap: number;
  /** have.expected ÷ target, 0–1. */
  progress: number;
  /** Ways to reach the target. Null when already there, or when that way can't get there. */
  extraMonthly: number | null;
  raiseNeeded: number | null;
  ageNeeded: number | null;
  /** Age the money runs out, or null for past 100. */
  lasts: Record<Scenario, number | null>;
};

/** Everything K3 to K5 show. Ages are whole years; years to retirement is at least 1. */
export function retirement(
  i: RetirementInputs,
  thisYear = new Date().getFullYear(),
): RetirementResult {
  const years = Math.max(1, Math.round(i.retire_age - i.age));
  const yearSpend = i.spending * 12;
  const need25 = yearSpend * 25;
  const need15 = yearSpend * 15;
  const target = i.target === "15x" ? need15 : need25;
  const rates: Record<Scenario, number> = {
    expected: i.growth,
    low: Math.max(-50, i.growth - i.spread),
    high: i.growth + i.spread,
  };

  const [raiseBy, raiseMode] = raiseOf(i);
  const at = (
    rate: number,
    n = years,
    monthly = i.monthly,
    raise = raiseBy,
    mode = raiseMode,
  ) => toToday(grow(i.saved, monthly, n, rate, raise, mode), n, i.inflation);

  const have = {} as Record<Scenario, number>;
  const haveThen = {} as Record<Scenario, number>;
  const series = {} as Record<Scenario, number[]>;
  const lasts = {} as Record<Scenario, number | null>;
  for (const s of ["expected", "low", "high"] as const) {
    have[s] = at(rates[s]);
    haveThen[s] = grow(i.saved, i.monthly, years, rates[s], raiseBy, raiseMode);
    series[s] = Array.from({ length: years + 1 }, (_, y) => at(rates[s], y));
    lasts[s] = lastsUntil(
      have[s],
      i.spending,
      i.age + years,
      i.growth_after,
      i.inflation,
    );
  }

  const factor = toFuture(1, years, i.inflation);
  const seriesThen = {} as Record<Scenario, number[]>;
  for (const s of ["expected", "low", "high"] as const)
    seriesThen[s] = series[s].map((v, y) => toFuture(v, y, i.inflation));

  const reached = target <= 0 || have.expected >= target;
  const gap = Math.max(0, target - have.expected);

  return {
    years,
    need25,
    need15,
    target,
    spendingThen: toFuture(i.spending, years, i.inflation),
    factor,
    targetThen: target * factor,
    need25Then: need25 * factor,
    need15Then: need15 * factor,
    gapThen: gap * factor,
    seriesThen,
    retireYear: thisYear + years,
    have,
    haveThen,
    series,
    gap,
    progress: target > 0 ? Math.min(1, have.expected / target) : 1,
    extraMonthly: reached
      ? null
      : smallest(
          0,
          Math.max(1_000_000, target),
          (x) => at(rates.expected, years, i.monthly + x) >= target,
        ),
    // "Raise it by x% a year" is a percentage way, so it only shows when the raise is a percentage.
    raiseNeeded:
      reached || i.monthly <= 0 || raiseMode === "amount"
        ? null
        : smallest(
            i.raise,
            30,
            (x) => at(rates.expected, years, i.monthly, x, "percent") >= target,
          ),
    ageNeeded: reached ? null : firstAge(i, years, target, rates.expected),
    lasts,
  };
}

function firstAge(
  i: RetirementInputs,
  years: number,
  target: number,
  rate: number,
): number | null {
  for (let n = years + 1; i.age + n <= 80; n++) {
    if (
      toToday(
        grow(i.saved, i.monthly, n, rate, ...raiseOf(i)),
        n,
        i.inflation,
      ) >= target
    )
      return i.age + n;
  }
  return null;
}

export type GrowthMode = "grow" | "monthly" | "howlong";

export type GrowthInputs = {
  mode: GrowthMode;
  /** Grow to and How long. */
  target: number;
  /** Grows to and Each month. */
  years: number;
  saved: number;
  /** Grows to and How long. */
  monthly: number;
  growth: number;
  inflation: number;
  /** What "I want to have" means: that amount in the rands of the day you reach it (then), or the
   * amount as it buys today, so the goal is raised by inflation to get there (today). 2026-11-11. */
  target_basis: "then" | "today";
};

export const GROWTH_DEFAULTS: GrowthInputs = {
  mode: "monthly",
  target: 0,
  years: 3,
  saved: 0,
  monthly: 0,
  growth: 8,
  inflation: 5,
  target_basis: "then",
};

export type GrowthResult = {
  /** Each month: what to put away. */
  monthly: number;
  /** Months it takes. Null when it never gets there within 100 years. */
  months: number | null;
  /** What it ends at, in that year's rands. */
  end: number;
  saved: number;
  putIn: number;
  growth: number;
  /** What `end` buys today. */
  endToday: number;
};

/** K7. Every mode returns the full split, so the bar and the three lines always show. */
export function growth(i: GrowthInputs): GrowthResult {
  const r = pct(i.growth) / 12;
  const fv = (months: number, monthly: number) => {
    let b = i.saved;
    for (let m = 0; m < months; m++) b = b * (1 + r) + monthly;
    return b;
  };
  // The goal at a point `months` from now: as typed, or raised by inflation to keep its buying power.
  const goalAt = (months: number) =>
    i.target_basis === "today" ? toFuture(i.target, months / 12, i.inflation) : i.target;
  const split = (months: number, monthly: number): GrowthResult => {
    const end = fv(months, monthly);
    const putIn = monthly * months;
    return {
      monthly,
      months,
      end,
      saved: i.saved,
      putIn,
      growth: end - i.saved - putIn,
      endToday: toToday(end, months / 12, i.inflation),
    };
  };

  if (i.mode === "grow") return split(Math.round(i.years * 12), i.monthly);

  if (i.mode === "monthly") {
    const n = Math.max(1, Math.round(i.years * 12));
    const grown = i.saved * Math.pow(1 + r, n);
    const goal = goalAt(n);
    const need = goal - grown;
    const monthly =
      need <= 0
        ? 0
        : r === 0
          ? need / n
          : (need * r) / (Math.pow(1 + r, n) - 1);
    return {
      ...split(n, monthly),
      end: Math.max(goal, grown),
      endToday: toToday(Math.max(goal, grown), n / 12, i.inflation),
    };
  }

  // How long: month by month, up to 100 years.
  let b = i.saved;
  for (let m = 0; m <= 1200; m++) {
    if (b >= goalAt(m)) return split(m, i.monthly);
    b = b * (1 + r) + i.monthly;
  }
  return { ...split(1200, i.monthly), months: null };
}

/**
 * The fixed monthly repayment on `principal` over `months` at `ratePct` a year, leaving `balloon`
 * still owed at the end (0 pays it off in full).
 */
export function repayment(principal: number, ratePct: number, months: number, balloon = 0): number {
  const n = Math.max(1, Math.round(months));
  const r = pct(ratePct) / 12;
  if (r === 0) return Math.max(0, principal - balloon) / n;
  const grown = Math.pow(1 + r, n);
  return ((principal - balloon / grown) * r * grown) / (grown - 1);
}

export type HomeLoanInputs = {
  /** The home's price. Named `loan` from before deposits (2026-11-17): older saves have deposit 0, so price = loan. */
  loan: number;
  deposit: number;
  /** % a year. */
  rate: number;
  years: number;
  extra: number;
  /** A rate to compare against, % a year; 0 = not tried. */
  testRate: number;
};

export const HOME_LOAN_DEFAULTS: HomeLoanInputs = {
  loan: 0,
  deposit: 0,
  rate: 10.5,
  years: 20,
  extra: 0,
  testRate: 0,
};

export type RateTest = {
  rate: number;
  payment: number;
  /** More (or less, when negative) each month than at today's rate. */
  difference: number;
  /** Over the whole term. */
  totalDifference: number;
};

export type HomeLoanResult = {
  /** What's borrowed: the price less the deposit. */
  bond: number;
  payment: number;
  interest: number;
  total: number;
  /** With the extra each month. */
  extraInterest: number;
  extraMonths: number;
  interestSaved: number;
  monthsSooner: number;
  /** Null until a test rate is typed. */
  test: RateTest | null;
};

function rateTest(principal: number, months: number, payment: number, testRate: number, balloon = 0): RateTest | null {
  if (!(testRate > 0) || principal <= 0) return null;
  const at = repayment(principal, testRate, months, balloon);
  const n = Math.max(1, Math.round(months));
  return { rate: testRate, payment: at, difference: at - payment, totalDifference: (at - payment) * n };
}

/**
 * K8. The repayment on a fixed rate on the price less the deposit, what paying `extra` more each
 * month saves, and the repayment at `testRate` beside today's.
 */
export function homeLoan(i: HomeLoanInputs): HomeLoanResult {
  const bond = Math.max(0, i.loan - Math.max(0, i.deposit));
  const n = Math.max(1, Math.round(i.years * 12));
  const r = pct(i.rate) / 12;
  const payment = repayment(bond, i.rate, n);
  const interest = payment * n - bond;

  let balance = bond;
  let paid = 0;
  let months = 0;
  while (balance > 0.005 && months < n) {
    const due = balance * r;
    paid += due;
    balance = balance + due - (payment + Math.max(0, i.extra));
    months++;
  }
  return {
    bond,
    payment,
    interest,
    total: payment * n,
    extraInterest: paid,
    extraMonths: months,
    interestSaved: Math.max(0, interest - paid),
    monthsSooner: n - months,
    test: rateTest(bond, n, payment, i.testRate),
  };
}

export type CarLoanInputs = {
  price: number;
  deposit: number;
  /** % a year. */
  rate: number;
  months: number;
  /** Balloon (residual) as % of the price, owed in one go at the end. */
  balloon: number;
  /** A rate to compare against, % a year; 0 = not tried. */
  testRate: number;
};

export const CAR_LOAN_DEFAULTS: CarLoanInputs = {
  price: 0,
  deposit: 0,
  rate: 12.5,
  months: 72,
  balloon: 0,
  testRate: 0,
};

export type CarLoanResult = {
  /** What's borrowed: the price less the deposit. */
  financed: number;
  payment: number;
  /** Owed at the end, on top of the last repayment. */
  balloonAmount: number;
  interest: number;
  /** Every repayment plus the balloon. */
  total: number;
  test: RateTest | null;
};

/** Car loan: the repayment on vehicle finance, with an optional balloon at the end. */
export function carLoan(i: CarLoanInputs): CarLoanResult {
  const financed = Math.max(0, i.price - Math.max(0, i.deposit));
  const n = Math.max(1, Math.round(i.months));
  // A balloon can't be more than what's borrowed.
  const balloonAmount = Math.min(financed, (i.price * Math.max(0, i.balloon)) / 100);
  const payment = repayment(financed, i.rate, n, balloonAmount);
  const total = payment * n + balloonAmount;
  return {
    financed,
    payment,
    balloonAmount,
    interest: total - financed,
    total,
    test: rateTest(financed, n, payment, i.testRate, balloonAmount),
  };
}

/** A saved calculation's inputs over the calculator's defaults: only known keys of the right type. */
export function withDefaults<T extends Record<string, unknown>>(
  defaults: T,
  saved: Record<string, unknown>,
): T {
  const out = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const v = saved[key as string];
    if (v !== undefined && v !== null && typeof v === typeof defaults[key])
      out[key] = v as T[keyof T];
  }
  return out;
}

// ----- Display -----

const group = (whole: string) => whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** Whole rands: R1,580. Negative as −R1,580. */
export function rands(n: number): string {
  const v = Math.round(n);
  return `${v < 0 ? "−" : ""}R${group(String(Math.abs(v)))}`;
}

/** Big amounts short: R6.05m, R12.4m, R950,000 under a million. */
export function randsShort(n: number): string {
  const v = Math.abs(n);
  if (v < 1_000_000) return rands(n);
  const m = v / 1_000_000;
  const text = m >= 10 ? m.toFixed(1) : m.toFixed(2);
  return `${n < 0 ? "−" : ""}R${text.replace(/\.?0+$/, "")}m`;
}

/** 41 months → "3 years 5 months"; 0 → "0 months". */
export function duration(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  const part = (k: number, w: string) => `${k} ${w}${k === 1 ? "" : "s"}`;
  if (!y) return part(m, "month");
  return m ? `${part(y, "year")} ${part(m, "month")}` : part(y, "year");
}

/** A typed field value, digits and one point only, as a number (0 when empty). */
export function fieldNumber(text: string): number {
  const n = Number(text.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
