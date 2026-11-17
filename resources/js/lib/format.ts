import { moneyParts, formatMoney, toCents, ratio } from '@/shared/money';

export { moneyParts, formatMoney, toCents, ratio };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT = MONTHS.map((m) => m.slice(0, 3));

/** "2026-11-01" → "November": months are named by the month they start in (never "cycle"). */
export function monthName(ymd: string): string {
    return MONTHS[Number(ymd.slice(5, 7)) - 1] ?? '';
}

function ymdToday(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "Today", "Yesterday", "8 Nov", or "8 Nov 2025" outside this year. */
export function dayLabel(ymd: string): string {
    const today = ymdToday();
    if (ymd === today) return 'Today';
    const y = new Date(today + 'T00:00:00');
    y.setDate(y.getDate() - 1);
    const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
    if (ymd === yesterday) return 'Yesterday';
    const [yy, mm, dd] = ymd.split('-').map(Number);
    return `${dd} ${SHORT[mm - 1]}${String(yy) !== today.slice(0, 4) ? ' ' + yy : ''}`;
}

/** 0–100 for a bar or gauge, from decimal strings (display only, like the app's rule 9). */
export function percent(part: string, whole: string): number {
    if (toCents(whole) <= 0n) return 0;
    return Math.max(0, Math.min(100, Math.round(ratio(part, whole) * 100)));
}

export function isNegative(amount: string): boolean {
    return toCents(amount) < 0n;
}

/** "Thandi Mokoena" → "T". */
export function initial(name: string | undefined): string {
    return (name ?? '?').trim().charAt(0).toUpperCase() || '?';
}
