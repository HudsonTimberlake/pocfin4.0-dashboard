// What every version 2 page gets from HandleInertiaRequests.
export type Budget = { id: number; name: string; currency: string; initials: string; role: string; premium: boolean; paused: boolean };

export type Shared = {
    me: { name: string; email: string; isAdmin: boolean } | null;
    budgets: Budget[];
    budgetId: number | null;
    appearance: Appearance;
    idleMinutes: number;
    csrf: string;
    status: string | null;
};

export type Appearance = 'system' | 'light' | 'dark';

/** API shapes the pages use (amounts are always decimal strings). */
export type Envelope = { id: number; name: string; icon: string | null; budgeted_amount: string; kind: 'everyday' | 'saving_up'; balance: string; archived: boolean; /** What it got this month from any income (the envelope list). */ allocated_this_cycle?: string };
export type Member = { id: number; name: string; email?: string; role: string };
export type Expense = { id: number; envelope_id: number | null; account_id?: number | null; amount: string; refund: boolean; date: string; note: string | null; has_receipt?: boolean; created_by: number | null };
/** An envelope on the Budget page, with this month's figures (dashboard Budget endpoint). */
export type BudgetEnvelope = Envelope & { sort_order: number; allocated_this_cycle: string; spent_this_cycle: string; refunded_this_cycle: string };
