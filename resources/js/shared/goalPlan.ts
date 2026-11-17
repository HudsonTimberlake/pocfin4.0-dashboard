// Copied from pocfin4.0-app/src/lib/goalPlan.ts (2026-11-17). Keep the two in step.
// The plan behind a "grow to a value" goal (L5, L6, L11). Like the Retirement calculator it works on
// the phone with JS numbers and the calculator's own toToday, so a goal and the calculator never
// disagree. These are estimates for display; the server keeps the goal and its cycle checks.
//
// The plan starts when it was last set (`plan_from`, from what it was worth then: `opening`), puts
// the amount in at the end of each month, raises it each year in the goal's start month, and
// grows at the guess ± the spread. Everything is in the rands of the day (2026-11-11): the target is
// the number you chase, and "in today's money" (the rands of the goal's start, starts_on) is only a
// reference line next to it.

import { toToday, type RaiseMode } from "./calculators";

export type PlanInputs = {
  /** What it was worth when the plan was last set, rands. */
  opening: number;
  /** The amount each cycle when the plan was last set, rands. */
  monthly: number;
  /** Y-m-d */
  planFrom: string;
  /** Y-m-d */
  startsOn: string;
  /** Y-m */
  targetMonth: string;
  /** The number to reach by the target month, in that month's rands. */
  target: number;
  growth: number;
  spread: number;
  inflation: number;
  raise: number;
  raiseMode: RaiseMode;
};

export type PlanStatus = "on" | "slow" | "behind";

const monthNo = (s: string) =>
  Number(s.slice(0, 4)) * 12 + Number(s.slice(5, 7)) - 1;

/** Whole months from one Y-m(-d) to another. */
export const monthsBetween = (from: string, to: string) =>
  monthNo(to) - monthNo(from);

/** Nominal value after `months` from `start`, the amount raised in the start month each year. */
function run(
  p: PlanInputs,
  start: number,
  monthly: number,
  months: number,
  growth: number,
  fromMonth: string,
): number {
  const r = growth / 100 / 12;
  const raiseMonth = Number(p.startsOn.slice(5, 7)) - 1;
  const first = monthNo(fromMonth);
  let balance = start;
  let m = monthly;
  for (let k = 0; k < months; k++) {
    if (k > 0 && (first + k) % 12 === raiseMonth)
      m = p.raiseMode === "amount" ? m + p.raise : m * (1 + p.raise / 100);
    balance = balance * (1 + r) + m;
  }
  return balance;
}

const rates = (p: PlanInputs) => ({
  expected: p.growth,
  low: Math.max(-50, p.growth - p.spread),
  high: p.growth + p.spread,
});

/** Money on a date turned into the goal's today's money. */
export function inTodaysMoney(
  p: PlanInputs,
  amount: number,
  onDate: string,
): number {
  return toToday(
    amount,
    Math.max(0, monthsBetween(p.startsOn, onDate)) / 12,
    p.inflation,
  );
}

/** The planned path, a point a year from the plan's start to the target month. */
export function planSeries(p: PlanInputs): {
  expected: number[];
  low: number[];
  high: number[];
  years: number;
} {
  const months = Math.max(12, monthsBetween(p.planFrom, `${p.targetMonth}-01`));
  const years = Math.ceil(months / 12);
  const at = (rate: number) =>
    Array.from({ length: years + 1 }, (_, y) => {
      const n = Math.min(months, y * 12);
      return run(p, p.opening, p.monthly, n, rate, p.planFrom);
    });
  const r = rates(p);
  return { expected: at(r.expected), low: at(r.low), high: at(r.high), years };
}

/** Where the plan says it should be by `today`, at each rate. */
export function planNow(
  p: PlanInputs,
  today: string,
): { expected: number; low: number; high: number } {
  const n = Math.max(0, monthsBetween(p.planFrom, today));
  const r = rates(p);
  const v = (rate: number) => run(p, p.opening, p.monthly, n, rate, p.planFrom);
  return { expected: v(r.expected), low: v(r.low), high: v(r.high) };
}

/**
 * Is the plan on track? At or above the expected line: on. Between it and the tough-market line:
 * on track, markets slow. Below: behind (only then, and only at the review, is a change suggested).
 */
export function planStatus(
  p: PlanInputs,
  valueNow: number,
  today: string,
): PlanStatus {
  if (monthsBetween(p.planFrom, today) <= 0) return "on";
  const now = planNow(p, today);
  const v = valueNow;
  // A rand under the line isn't "slow".
  if (v >= now.expected - 1) return "on";
  return v >= now.low ? "slow" : "behind";
}

/** With what it's worth now and `monthly` from now on, what it reaches by the target month. */
export function projection(
  p: PlanInputs,
  valueNow: number,
  monthly: number,
  today: string,
  growth = p.growth,
): number {
  const n = Math.max(0, monthsBetween(today, `${p.targetMonth}-01`));
  return run(p, valueNow, monthly, n, growth, today);
}

/** The target turned into the rands of the goal's start: the small "worth about" line. */
export function targetInTodaysMoney(p: PlanInputs): number {
  return inTodaysMoney(p, p.target, `${p.targetMonth}-01`);
}

/** The yearly review: the amount each cycle that still reaches the target from what it's worth now. */
export function neededMonthly(
  p: PlanInputs,
  valueNow: number,
  today: string,
): number {
  if (projection(p, valueNow, 0, today) >= p.target) return 0;
  let lo = 0;
  let hi = Math.max(1000, p.target);
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (projection(p, valueNow, mid, today) >= p.target) hi = mid;
    else lo = mid;
  }
  // Whole tens, like the calculator's "put away R1,580 more".
  return Math.ceil(hi / 10) * 10;
}

/** The holdings' time-weighted return as a yearly rate, once there's a year of it. Null before. */
export function growthAYear(
  twrPercent: number,
  since: string,
  today: string,
): number | null {
  const years = monthsBetween(since, today) / 12;
  if (years < 1) return null;
  return (Math.pow(1 + twrPercent / 100, 1 / years) - 1) * 100;
}

/**
 * The next yearly review (Y-m) after `today`: the next 1st of the review month that falls at least
 * 6 months after the goal's start, so a November goal reviewed in December is first reviewed the
 * December after, not a month in. Mirrors the server's `lastReview`.
 */
export function nextReviewMonth(
  reviewMonth: number,
  startsOn: string,
  today: string,
): string {
  const earliest = monthNo(startsOn) + 6;
  let year = Number(today.slice(0, 4));
  const at = (y: number) => y * 12 + reviewMonth - 1;
  // The first review month after today, then pushed out to the first one far enough from the start.
  while (at(year) <= monthNo(today) || at(year) < earliest) year += 1;
  return `${year}-${String(reviewMonth).padStart(2, "0")}`;
}

/**
 * Cycles from a goal's first one to the one starting in `ym` (Y-m), counting both. A cycle is named
 * by the month it starts in; the first cycle is the month the goal starts in, never an earlier one.
 */
export function cyclesFrom(start: string, ym: string): number {
  return Math.max(0, monthsBetween(start, ym) + 1);
}
