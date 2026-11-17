import { commaToPoint, keypadToAmount, subtractForHint, toCents } from '@/shared/money';

/**
 * What someone types in an amount box, kept to digits and one point with two decimals at most.
 * Commas are thousands separators unless they're the only separator ("12,50" → "12.50").
 */
export function cleanTyped(text: string): string {
    const t = commaToPoint(text.replace(/[^\d.,]/g, ''));
    const [whole, ...rest] = t.split('.');
    return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
}

/** The API's amount string for what was typed ("0.00" when empty). */
export const toAmount = (typed: string) => keypadToAmount(cleanTyped(typed));

export const hasAmount = (typed: string) => toCents(toAmount(typed)) > 0n;

/** a − b, display only (the live "left after this" hint). */
export const minus = subtractForHint;

/** Today and yesterday as Y-m-d, in this browser's time zone. */
export function ymd(offsetDays = 0): string {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
