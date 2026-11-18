import { growth, rands, retirement, type GrowthInputs, type RetirementInputs } from '@/shared/calculators';

/**
 * "Make this a goal": what a Retirement or Saving and growth answer hands to New goal on Goals
 * (kept in this browser tab, never the address). The numbers are the app's own (goalFromCalc.ts):
 * the amount chased is in the rands of the day it's reached, and a value goal's plan comes with it.
 */
export type GoalPrefill = {
    name: string;
    /** Whole rands, the rands of the day it's reached. */
    target: string;
    each: string;
    /** Y-m, when the goal is reached. */
    by: string;
    plan: { raise_mode: 'percent' | 'amount'; raise_value: string; growth_pct: string; spread_pct: string; inflation_pct: string; age?: number; retire_age?: number };
};

export const GOAL_PREFILL_KEY = 'pocfin-goal-prefill';

const two = (n: number) => n.toFixed(2);

function monthsAhead(months: number): string {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + Math.round(months));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const label = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

export function retirementGoal(i: RetirementInputs): GoalPrefill {
    const r = retirement(i);
    return {
        name: `Retire at ${i.age + r.years}`,
        target: String(Math.round(r.targetThen)),
        each: String(Math.round(i.monthly)),
        by: monthsAhead(r.years * 12),
        plan: {
            raise_mode: i.raise_mode,
            raise_value: two(i.raise_mode === 'amount' ? i.raise_amount : i.raise),
            growth_pct: two(i.growth),
            spread_pct: two(i.spread),
            inflation_pct: two(i.inflation),
            age: Math.round(i.age),
            retire_age: Math.round(i.age + r.years),
        },
    };
}

/** Null until the calculation is complete enough to make a goal from. */
export function growthGoal(i: GrowthInputs): GoalPrefill | null {
    const g = growth(i);
    const months = i.mode === 'howlong' ? g.months : Math.round(i.years * 12);
    const ready = i.mode === 'grow' ? i.years > 0 && (i.saved > 0 || i.monthly > 0) : i.mode === 'monthly' ? i.target > 0 && i.years > 0 : i.target > 0 && (i.saved > 0 || i.monthly > 0);
    if (!ready || !months) return null;
    const by = monthsAhead(months);
    return {
        name: i.mode === 'monthly' ? `${rands(i.target_basis === 'today' ? g.end : i.target)} by ${label(by)}` : `Grow to ${rands(g.end)}`,
        target: String(Math.round(g.end)),
        each: String(Math.round(i.mode === 'monthly' ? g.monthly : i.monthly)),
        by,
        plan: { raise_mode: 'percent', raise_value: '0.00', growth_pct: two(i.growth), spread_pct: '2.00', inflation_pct: two(i.inflation) },
    };
}
