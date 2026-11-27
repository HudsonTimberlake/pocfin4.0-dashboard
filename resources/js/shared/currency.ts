// Copied from pocfin4.0-app/src/lib/currency.ts (2026-11-27). Keep the two in step, and both in step with the API's config/currencies.php.
// On the web, Shell sets the home currency from the budget the page is for (shared prop `budgets`), before any page renders.
// Budget currencies (design/currencies.md). Same list as the API's config/currencies.php.
//
// Every amount is in the current budget's currency, so its symbol is held here and read by the
// money formatting. Shell sets it on every page.
// An investment account can be in another currency (`foreign`): its figures show that symbol.

export type Currency = {
  code: string;
  name: string;
  symbol: string;
  /** Used when the budget's own symbol is the same one ($ in a dollar budget). */
  long: string;
};

export const CURRENCIES: Currency[] = [
  { code: "ZAR", name: "South African rand", symbol: "R", long: "R" },
  { code: "USD", name: "US dollar", symbol: "$", long: "US$" },
  { code: "EUR", name: "Euro", symbol: "€", long: "€" },
  { code: "GBP", name: "British pound", symbol: "£", long: "£" },
  { code: "AUD", name: "Australian dollar", symbol: "$", long: "A$" },
  { code: "NZD", name: "New Zealand dollar", symbol: "$", long: "NZ$" },
  { code: "CAD", name: "Canadian dollar", symbol: "$", long: "C$" },
  { code: "NAD", name: "Namibian dollar", symbol: "N$", long: "N$" },
  { code: "BWP", name: "Botswana pula", symbol: "P", long: "P" },
];

export const DEFAULT_CURRENCY = "ZAR";

let home = DEFAULT_CURRENCY;

export function currencyOf(code: string | null | undefined): Currency {
  return (
    CURRENCIES.find((c) => c.code === code) ??
    CURRENCIES.find((c) => c.code === DEFAULT_CURRENCY)!
  );
}

/** The current budget's currency code. */
export function homeCurrency(): string {
  return home;
}

export function setHomeCurrency(code: string | null | undefined) {
  home = currencyOf(code).code;
}

/** "R", "€", "$". */
export function homeSymbol(): string {
  return currencyOf(home).symbol;
}

/** An account in another currency: its symbol, or the longer one when it would look like the budget's. */
export function foreignSymbol(code: string | null | undefined): string {
  const c = currencyOf(code);
  return c.symbol === homeSymbol() ? c.long : c.symbol;
}

/** "Euro", "US dollar": what the account form and the switch call it. */
export function currencyName(code: string | null | undefined): string {
  return currencyOf(code).name;
}

