// Goal types and display helpers, from pocfin4.0-app/src/lib/goalsApi.ts (2026-11-17) without the
// API calls. Keep in step with the app: every figure comes from the server; these only word it.
import { randsShort } from './calculators';
import { planNow, planStatus, type PlanInputs } from './goalPlan';
import { fromCents, toCents } from './money';

export type GoalKind = 'target' | 'habit' | 'yearly' | 'value';
export type CycleStatus = 'on' | 'extra' | 'rest' | 'waiting' | 'upcoming';
export type GoalState = 'on_track' | 'waiting' | 'needs_look' | 'reached' | 'finished' | 'upcoming';
export type GoalCycle = { start: string; end: string; needed: string; in: string; status: CycleStatus };

export type Goal = {
    id: number;
    kind: GoalKind;
    name: string;
    account_id: number | null;
    purpose_id: number | null;
    link: { type: 'account' | 'purpose'; name: string | null; account_type: 'savings' | 'holding' | 'investment' | null };
    target_amount: string | null;
    amount_per_cycle: string | null;
    target_month: string | null;
    opening_amount: string;
    plan_from: string;
    starts_on: string;
    upcoming?: boolean;
    review_month: number | null;
    remind_on_payday: boolean;
    raise_mode: 'percent' | 'amount' | null;
    raise_value: string | null;
    growth_pct: string | null;
    spread_pct: string | null;
    inflation_pct: string | null;
    age?: number | null;
    retire_age?: number | null;
    status: 'active' | 'finished';
    finished_at: string | null;
    outcome: 'reached' | 'ended' | null;
    this_cycle: (GoalCycle & { left: string }) | null;
    counts: { on_track: number; extra: number; rest: number; of: number };
    total: string;
    to_go: string | null;
    cycles_left: number | null;
    pace: string | null;
    reached: boolean;
    behind: { cycles_worth: number; asks: boolean; was: string; now: string; move_to: string } | null;
    needs_look: boolean;
    year: { start: string; end: string; total: string; cycles_left: number } | null;
    value: string | null;
    growth_so_far: { since: string; time_weighted_return: string } | null;
    review_due: boolean;
    state: GoalState;
    cycles?: GoalCycle[];
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "2027-12" → "Dec 2027". */
export function monthLabel(ym: string): string {
    const [y, m] = ym.split('-').map(Number);
    return `${MONTHS[m - 1]} ${y}`;
}
export const monthOf = (ymd: string) => MONTHS_LONG[Number(ymd.slice(5, 7)) - 1];
export const monthLetter = (ymd: string) => MONTHS[Number(ymd.slice(5, 7)) - 1][0];

/** Whole months from one Y-m(-d) to another, like the server counts cycles. */
export function monthsFrom(from: string, to: string): number {
    const n = (s: string) => Number(s.slice(0, 4)) * 12 + Number(s.slice(5, 7));
    return n(to) - n(from);
}

/** Display only: amount ÷ n, rounded up to the cent, as the server does. */
export function perCycleHint(amount: string, n: number): string {
    if (n <= 0) return amount;
    const c = toCents(amount);
    if (c <= 0n) return '0.00';
    const big = BigInt(n);
    return fromCents((c + big - 1n) / big);
}

export function percentOf(part: string, whole: string | null): number {
    if (!whole) return 0;
    const w = toCents(whole);
    if (w <= 0n) return 0;
    const p = toCents(part);
    if (p <= 0n) return 0;
    return Math.min(100, Number((p * 100n) / w));
}

/** A value goal's plan, for goalPlan.ts. Whole-rand estimates, like the calculators. */
export function planOf(g: Goal): PlanInputs {
    const r = (a: string | null) => Number(a ?? '0');
    return {
        opening: r(g.opening_amount),
        monthly: r(g.amount_per_cycle),
        planFrom: g.plan_from,
        startsOn: g.starts_on,
        targetMonth: g.target_month ?? g.starts_on.slice(0, 7),
        target: r(g.target_amount),
        growth: r(g.growth_pct ?? '10'),
        spread: r(g.spread_pct ?? '2'),
        inflation: r(g.inflation_pct ?? '5'),
        raise: r(g.raise_value),
        raiseMode: g.raise_mode ?? 'percent',
    };
}

export const wasReached = (g: Goal) => g.status === 'finished' && (g.outcome ?? (g.reached ? 'reached' : 'ended')) === 'reached';

export const pastGoals = (goals: Goal[]) =>
    goals.filter((g) => g.status === 'finished').sort((a, b) => (b.finished_at ?? '').localeCompare(a.finished_at ?? '') || b.id - a.id);

export function pastLine(goal: Goal, money: (a: string) => string): string {
    const when = goal.finished_at ? monthLabel(goal.finished_at.slice(0, 7)) : '';
    const done = when ? ` · finished ${when}` : '';
    if (goal.kind === 'habit') {
        const n = goal.counts.of;
        return `${n} ${n === 1 ? 'month' : 'months'} · ${money(goal.total)} put away${done}`;
    }
    if (wasReached(goal) && goal.target_amount) return `${money(goal.target_amount)} reached${done}`;
    return `${money(goal.total)} put away${done}`;
}

/** The line under a goal card. */
export function goalLine(goal: Goal, money: (a: string) => string): string {
    if (goal.kind === 'habit') {
        const each = `${money(goal.amount_per_cycle ?? '0')} a month`;
        if (goal.counts.of === 0) return `${each} · first month`;
        return `${each} · ${goal.counts.on_track} of ${goal.counts.of} months on track`;
    }
    if (goal.kind === 'value') {
        return `${randsShort(Number(goal.value ?? '0'))} of ${randsShort(Number(goal.target_amount ?? '0'))}${goal.target_month ? ` · by ${monthLabel(goal.target_month)}` : ''}`;
    }
    if (goal.kind === 'yearly' && goal.year) {
        return `${money(goal.year.total)} of ${money(goal.target_amount ?? '0')} · ${monthLabel(goal.year.start.slice(0, 7)).split(' ')[0]} to ${monthLabel(goal.year.end.slice(0, 7)).split(' ')[0]}`;
    }
    return `${money(goal.total)} of ${money(goal.target_amount ?? '0')}${goal.target_month ? ` by ${monthLabel(goal.target_month)}` : ''}`;
}

/** Bar width: a habit is this month's bar; the rest is progress to the target. */
export function goalPercent(goal: Goal): number {
    if (goal.kind === 'value') {
        const target = Number(goal.target_amount ?? '0');
        return target > 0 ? Math.min(100, Math.max(1, Math.floor((Number(goal.value ?? '0') / target) * 100))) : 0;
    }
    if (goal.kind === 'habit') return goal.this_cycle ? percentOf(goal.this_cycle.in, goal.this_cycle.needed) : 100;
    if (goal.kind === 'yearly' && goal.year) return percentOf(goal.year.total, goal.target_amount);
    return percentOf(goal.total, goal.target_amount);
}

export type Chip = { label: string; tone: 'ok' | 'wait' | 'behind' };

/**
 * The web's calm chips (W13, approved): Waiting for November, On its way, Ahead of plan, A little
 * behind. Never red and never "missed".
 */
export function goalChip(goal: Goal, today: string): Chip {
    switch (goal.state) {
        case 'finished':
            return { label: wasReached(goal) ? 'Reached' : 'Finished', tone: 'ok' };
        case 'reached':
            return { label: 'Reached', tone: 'ok' };
        case 'needs_look':
            return { label: 'A little behind', tone: 'behind' };
        case 'waiting':
            return { label: `Waiting for ${monthOf(goal.this_cycle?.start ?? today)}`, tone: 'wait' };
        case 'upcoming':
            return { label: `Starts in ${monthOf(goal.this_cycle?.start ?? goal.starts_on)}`, tone: 'wait' };
        default:
            if (goal.kind === 'value' && goal.value) {
                const p = planOf(goal);
                const status = planStatus(p, Number(goal.value), today);
                if (status !== 'on') return { label: 'On its way · markets slow', tone: 'behind' };
                return Number(goal.value) > planNow(p, today).expected + 1 ? { label: 'Ahead of plan', tone: 'ok' } : { label: 'On its way', tone: 'ok' };
            }
            return goal.this_cycle?.status === 'extra' ? { label: 'Ahead of plan', tone: 'ok' } : { label: 'On its way', tone: 'ok' };
    }
}

export const SHAPES: Record<GoalKind, string> = {
    target: 'An amount by a date',
    habit: 'Same each month',
    yearly: 'A yearly amount',
    value: 'Grow to a value',
};
