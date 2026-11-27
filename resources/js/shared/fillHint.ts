// Copied from pocfin4.0-app/src/lib/fillHint.ts (2026-11-17, Add-this-month rule 2026-11-27). Keep the two in step.
import { addForWidth, toCents, fromCents } from "./money";
export type FillMode = "add" | "top_up";

/**
 * What the button beside an envelope will add, for its label only (rule 9), as the server works it out:
 * add is the monthly amount less what the envelope already got this month (`given`), top up is the
 * shortfall on its balance; both less what is already staged for it, capped at what is left.
 */
export function budgetedHint(
  mode: FillMode,
  budgeted: string,
  balance: string,
  left: string,
  given = "0.00",
  staged = "0.00",
): string {
  const already = toCents(mode === "add" ? given : balance) + toCents(staged);
  let want = toCents(budgeted) - already;
  if (want < 0n) want = 0n;
  const cap = toCents(left);
  return fromCents(want < cap ? want : cap);
}

export { addForWidth };
