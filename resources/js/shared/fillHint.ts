// Copied from pocfin4.0-app/src/lib/fillHint.ts (2026-11-17). Keep the two in step.
import { addForWidth, subtractForHint, toCents, fromCents } from "./money";
export type FillMode = "add" | "top_up";

/**
 * What the button beside an envelope will add, for its label only (rule 9). The server
 * works out the real amount: the budgeted amount (add) or the shortfall (top up), capped at what is left.
 */
export function budgetedHint(mode: FillMode, budgeted: string, balance: string, left: string): string {
  let want = toCents(budgeted);
  if (mode === "top_up") {
    const gap = toCents(subtractForHint(budgeted, balance));
    want = gap > 0n ? gap : 0n;
  }
  const cap = toCents(left);
  return fromCents(want < cap ? want : cap);
}

export { addForWidth };
