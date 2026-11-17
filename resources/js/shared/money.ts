// Copied from pocfin4.0-app/src/lib/money.ts (2026-11-17). Keep the two in step: the web shows the phone's figures.
// Money display. Amounts stay decimal strings from the API ("1234.50").
//
// The cents helper (toCents / fromCents / ratio) is display only (decisions §4 rule 9):
// live hints while typing and bar / gauge widths. It never decides anything,
// and the server's figures replace its results after saving.

const MINUS = "−"; // −, not a hyphen

const DECIMAL = /^(-)?(\d+)(?:\.(\d{1,2}))?$/;

/** "1234.5" → 123450n. Throws on anything that isn't a plain decimal string. */
export function toCents(amount: string): bigint {
  const m = DECIMAL.exec(amount.trim());
  if (!m) throw new Error(`Not a decimal amount: ${amount}`);
  const [, neg, whole, frac = ""] = m;
  const cents = BigInt(whole) * 100n + BigInt(frac.padEnd(2, "0"));
  return neg ? -cents : cents;
}

/** 123450n → "1234.50", the form the API takes. */
export function fromCents(cents: bigint): string {
  const neg = cents < 0n;
  const abs = neg ? -cents : cents;
  const whole = abs / 100n;
  const frac = (abs % 100n).toString().padStart(2, "0");
  return `${neg ? "-" : ""}${whole}.${frac}`;
}

/** part ÷ whole clamped to 0–1, for bar and gauge widths only. */
export function ratio(part: string, whole: string): number {
  const p = toCents(part);
  const w = toCents(whole);
  if (w <= 0n || p <= 0n) return 0;
  if (p >= w) return 1;
  // 4 decimal places of precision is plenty for a width.
  return Number((p * 10000n) / w) / 10000;
}

/** a + b as a decimal string, for bar and gauge widths only (never shown as a figure). */
export function addForWidth(a: string, b: string): string {
  return fromCents(toCents(a) + toCents(b));
}

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export type MoneyParts = { sign: string; whole: string; cents: string };

/**
 * Splits an amount for display: sign, "R8,736", ".40".
 * `income` adds a plus; only income gets one. Negatives use the minus sign.
 */
export function moneyParts(
  amount: string,
  opts: { income?: boolean } = {},
): MoneyParts {
  const c = toCents(amount);
  const neg = c < 0n;
  const [whole, frac] = fromCents(neg ? -c : c).split(".");
  const sign = neg ? MINUS : opts.income && c > 0n ? "+" : "";
  return { sign, whole: `R${groupThousands(whole)}`, cents: `.${frac}` };
}

/** "8736.4" → "R8,736.40", "-320" → "−R320.00", income "32000" → "+R32,000.00". */
export function formatMoney(
  amount: string,
  opts: { income?: boolean } = {},
): string {
  const { sign, whole, cents } = moneyParts(amount, opts);
  return `${sign}${whole}${cents}`;
}

/**
 * Turns keypad input into an API amount string.
 * Keeps at most two decimals and drops leading zeros; returns "0.00" for empty input.
 */
export function keypadToAmount(typed: string): string {
  if (typed === "" || typed === ".") return "0.00";
  const [whole = "0", frac = ""] = typed.split(".");
  return fromCents(toCents(`${whole || "0"}.${frac.slice(0, 2) || "0"}`));
}

// The API caps amounts at 10 digits before the point.
const MAX_WHOLE = 10;

/** One keypad press on the typed amount: one point, two decimals, ten whole digits at most. */
export function keypadPress(typed: string, key: string): string {
  if (key === "del") return typed.slice(0, -1);
  const [whole, frac] = typed.split(".");
  if (key === ".") return typed.includes(".") ? typed : (typed || "0") + ".";
  if (frac !== undefined) return frac.length >= 2 ? typed : typed + key;
  if (whole.length >= MAX_WHOLE) return typed;
  if (whole === "0") return key;
  return typed + key;
}

/** a − b as a decimal string. A typing hint only ("Groceries will have R2,069.50 left"). */
export function subtractForHint(a: string, b: string): string {
  return fromCents(toCents(a) - toCents(b));
}

/** "R47,000.00 put in, R5,400.00 gain" or "…, R1,200.00 loss". No signs: the word says which. */
export function putInAndGain(
  putIn: string,
  gain: string,
  usd?: boolean,
): string {
  const loss = gain.startsWith("-");
  const f = usd ? formatUsd : formatMoney;
  return `${f(putIn)} put in, ${f(gain.replace(/^-/, ""))} ${loss ? "loss" : "gain"}`;
}

// Dollar accounts (2026-11-15). The user types dollars as their provider shows them; the phone
// turns them into rand at the account's rate, and the server stores the rand. Display-only
// arithmetic in BigInt, like the rest of this file: the server's figures replace it after saving.

/** "18.2" → 182000n (rate in 1/10000ths). */
function rateUnits(rate: string): bigint {
  const [whole = "0", frac = ""] = rate.split(".");
  return (
    BigInt(whole || "0") * 10000n + BigInt(frac.padEnd(4, "0").slice(0, 4))
  );
}

/** $ → R at a rate: "100.00" at "18.2000" → "1820.00", rounded half-up to the cent. */
export function usdToRand(usd: string, rate: string): string {
  const r = rateUnits(rate);
  if (r <= 0n) return "0.00";
  return fromCents((toCents(usd || "0") * r + 5000n) / 10000n);
}

/** R → $ at a rate, rounded half-up to the cent. */
export function randToUsd(rand: string, rate: string): string {
  const r = rateUnits(rate);
  if (r <= 0n) return "0.00";
  return fromCents((toCents(rand || "0") * 10000n + r / 2n) / r);
}

/** "$1,234.50". */
export function formatUsd(usd: string): string {
  return formatMoney(usd).replace("R", "$");
}

/** "R18.20": a rate for display, at least two decimals, more only when it has them. */
export function formatRate(rate: string): string {
  const [whole = "0", frac = ""] = rate.split(".");
  const trimmed = frac.replace(/0+$/, "").padEnd(2, "0");
  return `R${whole}.${trimmed}`;
}

/** A rand amount as the keypad would have typed it: "1820.00" → "1820", "1820.50" → "1820.50". */
export function randToTyped(rand: string): string {
  return rand === "0.00" ? "" : rand.replace(/\.00$/, "");
}

/**
 * Typed text with a decimal comma made a point: many iPhone keypads only have a comma.
 * "16,71" → "16.71". With both ("1,234.50") the commas are thousands separators and go.
 */
export function commaToPoint(text: string): string {
  return text.includes(".") ? text.replace(/,/g, "") : text.replace(/,/g, ".");
}
