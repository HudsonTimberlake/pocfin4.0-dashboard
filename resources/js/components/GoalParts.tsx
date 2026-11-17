import { Link, router } from '@inertiajs/react';
import { motion, useReducedMotion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import Bar from '@/components/Bar';
import Icon from '@/components/Icon';
import Money from '@/components/Money';
import { cleanTyped, toAmount, ymd } from '@/lib/amount';
import { useApp } from '@/lib/app';
import { formatMoney, toCents } from '@/lib/format';
import { ARRIVE } from '@/lib/motion';
import { randsShort } from '@/shared/calculators';
import { nextReviewMonth, planNow, planSeries, targetInTodaysMoney } from '@/shared/goalPlan';
import { goalChip, goalPercent, monthLabel, monthLetter, monthsFrom, perCycleHint, planOf, SHAPES, type Chip, type Goal, type GoalKind } from '@/shared/goals';

export type Place = { id: number; name: string; type?: string };

const field = 'h-11 w-full rounded-xl border border-line bg-card px-3 text-[15px] font-bold text-ink outline-none focus:border-mint';
export const CHIP_TONES: Record<Chip['tone'], string> = { ok: 'bg-tint text-teal', wait: 'bg-navy-tint text-navy-text', behind: 'bg-amber-tint text-amber-ink' };
const DISCLAIMER = 'An estimate from your own guesses, not financial advice.';

/** The months as squares: put in, a rest month, this month, and still to come. */
function Squares({ goal }: { goal: Goal }) {
    const done = (goal.cycles ?? []).slice(-12);
    const todo = goal.kind === 'target' || goal.kind === 'yearly' ? Math.max(0, Math.min(12 - done.length, (goal.kind === 'yearly' ? goal.year?.cycles_left ?? 0 : goal.cycles_left ?? 0) - 1)) : 0;
    const tone = (s: string) => (s === 'on' || s === 'extra' ? 'bg-mint' : s === 'rest' ? 'bg-amber-line' : s === 'waiting' ? 'bg-canvas ring-2 ring-ink ring-inset' : 'bg-canvas ring-1 ring-line ring-inset');
    if (!done.length) return null;
    const label = goal.kind === 'yearly' && goal.year ? `${monthLabel(goal.year.start.slice(0, 7))} to ${monthLabel(goal.year.end.slice(0, 7))}` : done.length >= 12 ? 'The last 12 months' : `Since it started in ${monthLabel(goal.starts_on.slice(0, 7)).split(' ')[0]}`;
    return (
        <div>
            <div className="mb-2 text-[13px] font-bold text-slate">{label}</div>
            <div className="grid grid-cols-12 gap-1" role="img" aria-label={`${goal.counts.on_track} months put in, ${goal.counts.rest} rest ${goal.counts.rest === 1 ? 'month' : 'months'}`}>
                {done.map((c) => (
                    <span key={c.start} className="flex flex-col items-center gap-1">
                        <span className={`aspect-square w-full rounded-md ${tone(c.status)}`} />
                        <span className="text-[10.5px] font-bold text-slate">{monthLetter(c.start)}</span>
                    </span>
                ))}
                {Array.from({ length: todo }, (_, i) => (
                    <span key={`t${i}`} className="flex flex-col items-center gap-1">
                        <span className={`aspect-square w-full rounded-md ${tone('todo')}`} />
                        <span className="text-[10.5px] text-muted">·</span>
                    </span>
                ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 text-[12px] text-slate">
                <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-mint" />Put in</span>
                <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-amber-line" />Rest month</span>
                <span className="flex items-center gap-1"><span className="size-2 rounded-full ring-1 ring-line-strong" />Still to come</span>
            </div>
        </div>
    );
}

/** Grow to a value: the planned path with the normal ups and downs shaded, and where it is now. */
function PlanChart({ goal, today }: { goal: Goal; today: string }) {
    const reduced = useReducedMotion();
    const p = planOf(goal);
    const s = planSeries(p);
    const W = 320;
    const H = 150;
    const max = Math.max(...s.high, p.target) * 1.05 || 1;
    const x = (i: number) => (i / Math.max(1, s.years)) * W;
    const y = (v: number) => H - (v / max) * H;
    const line = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const band = `${line(s.high)} ${s.low.map((v, i) => `L${x(s.low.length - 1 - i).toFixed(1)},${y(s.low[s.low.length - 1 - i]).toFixed(1)}`).join(' ')} Z`;
    const nowYears = Math.max(0, monthsFrom(goal.plan_from, today) / 12);
    const value = Number(goal.value ?? '0');
    return (
        <figure>
            <svg viewBox={`-6 -10 ${W + 12} ${H + 22}`} className="w-full" role="img" aria-label={`Plan to ${randsShort(p.target)} by ${goal.target_month ? monthLabel(goal.target_month) : 'the end'}, now ${randsShort(value)}`}>
                <path d={band} fill="var(--tint)" />
                <motion.path d={line(s.expected)} fill="none" stroke="var(--mint)" strokeWidth={2.5} strokeLinecap="round" initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: ARRIVE }} />
                <circle cx={x(nowYears)} cy={y(value)} r={5} fill="var(--ink)" />
                <text x={x(nowYears) + 8} y={y(value) - 6} fontSize={11} fontWeight={700} fill="var(--ink)">
                    You
                </text>
                <text x={W} y={y(p.target) - 4} fontSize={11} fontWeight={700} fill="var(--slate)" textAnchor="end">
                    {randsShort(p.target)}
                    {goal.target_month ? ` by ${monthLabel(goal.target_month)}` : ''}
                </text>
            </svg>
            <figcaption className="mt-1 text-[12px] text-slate">Shaded: normal ups and downs, if growth is {goal.spread_pct ? Number(goal.spread_pct) : 2}% lower or higher than your guess.</figcaption>
        </figure>
    );
}

/** The goal's own figures, as a few plain lines. */
function facts(goal: Goal, today: string): [string, string][] {
    const t = goal.this_cycle;
    switch (goal.kind) {
        case 'habit':
            return [
                ['Each month', formatMoney(goal.amount_per_cycle ?? '0')],
                ...(t ? [['This month', `${formatMoney(t.in)} of ${formatMoney(t.needed)} so far`] as [string, string]] : []),
                ['Months on track', `${goal.counts.on_track} of ${goal.counts.of}`],
            ];
        case 'target':
            return [
                ['Pace now', `${formatMoney(goal.pace ?? t?.needed ?? '0')} a month`],
                ...(goal.behind ? [['When you started', `${formatMoney(goal.behind.was)} a month`] as [string, string]] : []),
                ['Still to go', formatMoney(goal.to_go ?? '0')],
                ['Months left', String(goal.cycles_left ?? 0)],
            ];
        case 'yearly':
            return [
                ...(goal.year ? [['Year', `${monthLabel(goal.year.start.slice(0, 7))} to ${monthLabel(goal.year.end.slice(0, 7))}`] as [string, string]] : []),
                ...(t ? [['Guide to finish', `${formatMoney(t.needed)} a month`] as [string, string]] : []),
                ['Months left', String(goal.year?.cycles_left ?? 0)],
            ];
        case 'value':
            return [
                ...(t ? [['Your part this month', `${formatMoney(t.in)} of ${formatMoney(t.needed)}`] as [string, string]] : []),
                ...(goal.growth_so_far ? [['Growth so far vs your guess', `${goal.growth_so_far.time_weighted_return}% vs ${Number(goal.growth_pct ?? '10').toFixed(2)}%`] as [string, string]] : []),
                ...(goal.review_month ? [['Next review', monthLabel(nextReviewMonth(goal.review_month, goal.starts_on, today))]] as [string, string][] : []),
            ];
    }
}

/**
 * W13, one goal beside the list: the amount, the month squares (or the plan chart for a value
 * goal), the facts, and one action. Behind: Keep the date, Move the date or Decide later, in place.
 */
export function GoalPanel({ goal, today, onClose }: { goal: Goal; today: string; onClose: () => void }) {
    const { toast } = useApp();
    const [editing, setEditing] = useState(false);
    const [confirm, setConfirm] = useState<'finish' | 'delete' | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const chip = goalChip(goal, today);
    const finished = goal.status === 'finished';
    const p = goal.kind === 'value' ? planOf(goal) : null;
    const onPlan = p ? planNow(p, today).expected : 0;

    const opts = (text: string) => ({
        preserveScroll: true,
        preserveState: true,
        onSuccess: () => {
            toast({ text });
            setErrors({});
            setConfirm(null);
            setEditing(false);
        },
        onError: (er: Record<string, string>) => {
            setErrors(er);
            setConfirm(null);
        },
    });

    const big =
        goal.kind === 'value'
            ? { amount: goal.value ?? '0.00', sub: `Plan for now: ${formatMoney(Math.round(onPlan).toFixed(2))} · goal ${randsShort(Number(goal.target_amount ?? '0'))}${goal.target_month ? ` by ${monthLabel(goal.target_month)}` : ''}, about ${randsShort(targetInTodaysMoney(p!))} in today’s money` }
            : goal.kind === 'yearly' && goal.year
              ? { amount: goal.year.total, sub: `of ${formatMoney(goal.target_amount ?? '0')} this year · ${goalPercent(goal)}%` }
              : goal.kind === 'habit'
                ? { amount: goal.total, sub: `put away so far · ${formatMoney(goal.amount_per_cycle ?? '0')} a month` }
                : { amount: goal.total, sub: `put in of ${formatMoney(goal.target_amount ?? '0')}${goal.target_month ? ` by ${monthLabel(goal.target_month)}` : ''} · ${goalPercent(goal)}%` };
    const savingsAccount = goal.link.type === 'account' && goal.link.account_type !== 'investment';
    const left = goal.this_cycle && toCents(goal.this_cycle.left) > 0n ? goal.this_cycle.left : null;

    return (
        <div className="flex flex-col gap-4 rounded-[24px] bg-card p-5">
            <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[19px] font-extrabold">{goal.name}</h2>
                    <div className="text-[13px] font-bold text-slate">
                        {SHAPES[goal.kind]} · {goal.link.name ?? (goal.link.type === 'purpose' ? 'A purpose' : 'An account')}
                    </div>
                    <span className={`mt-1.5 inline-block rounded-lg px-2 py-0.5 text-[12.5px] font-bold ${CHIP_TONES[chip.tone]}`}>{chip.label}</span>
                </div>
                <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 flex-none place-items-center rounded-full bg-canvas text-slate hover:text-ink">
                    <Icon name="close" size={16} stroke={2.2} />
                </button>
            </div>

            <div>
                <div className="text-[32px] leading-[38px] font-extrabold tracking-[-0.03em]">
                    <Money amount={big.amount} />
                </div>
                <div className="num mt-1 text-[13.5px] text-slate">{big.sub}</div>
                {goal.kind !== 'value' ? (
                    <div className="mt-3">
                        <Bar percent={goalPercent(goal)} />
                    </div>
                ) : null}
            </div>

            {goal.kind === 'value' && !finished ? <PlanChart goal={goal} today={today} /> : <Squares goal={goal} />}

            {!finished ? (
                <dl className="flex flex-col">
                    {facts(goal, today).map(([k, v], i) => (
                        <div key={k} className={`flex justify-between gap-3 py-2 text-[14px] ${i ? 'border-t border-line' : ''}`}>
                            <dt className="text-slate">{k}</dt>
                            <dd className="num text-right font-bold">{v}</dd>
                        </div>
                    ))}
                </dl>
            ) : null}

            {goal.behind?.asks && !finished ? (
                <div className="flex flex-col gap-2 rounded-2xl bg-amber-tint p-3.5">
                    <p className="text-[14px] font-extrabold text-amber-ink">
                        {goal.behind.cycles_worth} {goal.behind.cycles_worth === 1 ? 'month’s' : 'months’'} worth behind. What would suit you?
                    </p>
                    {[
                        { label: 'Keep the date', sub: `${formatMoney(goal.behind.now)} a month until ${goal.target_month ? monthLabel(goal.target_month) : 'then'}`, run: () => router.put(`/goals/${goal.id}`, { target_month: goal.target_month }, opts('✓ Kept the date')) },
                        { label: 'Move the date', sub: `${formatMoney(goal.behind.was)} a month until ${monthLabel(goal.behind.move_to)}`, run: () => router.put(`/goals/${goal.id}`, { target_month: goal.behind!.move_to }, opts(`✓ Moved to ${monthLabel(goal.behind!.move_to)}`)) },
                        { label: 'Decide later', sub: 'Nothing changes. We’ll ask again next month.', run: () => router.post(`/goals/${goal.id}/snooze`, {}, opts('We’ll ask again next month')) },
                    ].map((c) => (
                        <button key={c.label} type="button" onClick={c.run} className="rounded-xl bg-card/70 px-3.5 py-2.5 text-left transition-colors hover:bg-card">
                            <span className="block text-[14.5px] font-extrabold">{c.label}</span>
                            <span className="num block text-[13px] text-slate">{c.sub}</span>
                        </button>
                    ))}
                </div>
            ) : null}

            {goal.review_due && !finished ? (
                <div className="flex items-center gap-3 rounded-2xl bg-navy-tint p-3.5 text-[14px] text-navy-text">
                    <span className="flex-1 font-bold">Time for the yearly look at this plan.</span>
                    <button type="button" onClick={() => router.post(`/goals/${goal.id}/reviewed`, {}, opts('✓ Reviewed'))} className="h-9 rounded-lg bg-card px-3 font-extrabold text-ink">
                        Done
                    </button>
                </div>
            ) : null}

            {errors.form || errors.target_month ? <p role="alert" className="rounded-xl bg-red-tint px-3 py-2.5 text-[14px] font-bold text-red-ink">{errors.form || errors.target_month}</p> : null}

            {!finished ? (
                <div className="flex flex-col gap-2 border-t border-line pt-4">
                    {left && savingsAccount ? (
                        <Link href="/allocate" className="flex h-11 items-center justify-center rounded-xl bg-mint text-[15px] font-extrabold text-on-mint">
                            Allocate {formatMoney(left)}
                        </Link>
                    ) : null}
                    {editing ? (
                        <EditGoal goal={goal} onDone={() => setEditing(false)} />
                    ) : (
                        <button type="button" onClick={() => setEditing(true)} className="h-10 rounded-xl bg-canvas text-[14.5px] font-bold hover:bg-segment">
                            Edit goal
                        </button>
                    )}
                    {confirm === 'finish' ? (
                        <div role="alertdialog" className="flex flex-col gap-2 rounded-xl bg-canvas p-3">
                            <p className="text-[14px] font-bold">Finish {goal.name}? Nothing moves; it goes to past goals with what you put away.</p>
                            <div className="flex gap-2">
                                <button type="button" autoFocus onClick={() => router.post(`/goals/${goal.id}/finish`, goal.kind === 'value' ? { reached: Number(goal.value ?? 0) >= Number(goal.target_amount ?? 0) } : {}, opts(`${goal.name} finished`))} className="h-10 flex-1 rounded-xl bg-mint text-[14px] font-extrabold text-on-mint">
                                    Finish goal
                                </button>
                                <button type="button" onClick={() => setConfirm(null)} className="h-10 rounded-xl px-3 text-[14px] font-bold">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button type="button" onClick={() => setConfirm('finish')} className="h-10 text-[14px] font-bold text-teal hover:underline">
                            Finish this goal
                        </button>
                    )}
                </div>
            ) : null}

            {confirm === 'delete' ? (
                <div role="alertdialog" className="flex flex-col gap-2 rounded-xl bg-red-tint p-3">
                    <p className="text-[14px] font-bold text-red-ink">Delete {goal.name}? {finished ? 'A past goal is deleted for good.' : 'Your money stays where it is.'}</p>
                    <div className="flex gap-2">
                        <button type="button" autoFocus onClick={() => router.delete(`/goals/${goal.id}`, { onSuccess: () => toast({ text: `${goal.name} deleted` }) })} className="h-10 flex-1 rounded-xl bg-red text-[14px] font-extrabold text-white">
                            Delete goal
                        </button>
                        <button type="button" onClick={() => setConfirm(null)} className="h-10 rounded-xl bg-card px-3 text-[14px] font-bold">
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <button type="button" onClick={() => setConfirm('delete')} className="text-[13.5px] font-bold text-red-text hover:underline">
                    Delete goal
                </button>
            )}
            {goal.kind === 'value' ? <p className="text-[12px] text-slate">{DISCLAIMER}</p> : null}
        </div>
    );
}

/** Edit goal, in place: name, the amount, the date, the payday reminder. A save plans again from today. */
function EditGoal({ goal, onDone }: { goal: Goal; onDone: () => void }) {
    const [name, setName] = useState(goal.name);
    const [target, setTarget] = useState(goal.target_amount ?? '');
    const [each, setEach] = useState(goal.amount_per_cycle ?? '');
    const [by, setBy] = useState(goal.target_month ?? '');
    const [remind, setRemind] = useState(goal.remind_on_payday);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const usesTarget = goal.kind !== 'habit';
    const usesEach = goal.kind === 'habit' || goal.kind === 'value';
    const usesBy = goal.kind === 'target' || goal.kind === 'value';

    function save(e: FormEvent) {
        e.preventDefault();
        router.put(`/goals/${goal.id}`, {
            name: name.trim(),
            ...(usesTarget ? { target_amount: toAmount(target) } : {}),
            ...(usesEach ? { amount_per_cycle: toAmount(each) } : {}),
            ...(usesBy ? { target_month: by } : {}),
            remind_on_payday: remind,
        }, { preserveScroll: true, preserveState: true, onSuccess: onDone, onError: (er) => setErrors(er as Record<string, string>) });
    }

    return (
        <form onSubmit={save} onKeyDown={(e) => e.key === 'Escape' && onDone()} className="flex flex-col gap-2.5 rounded-2xl bg-canvas p-3.5">
            <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                Name
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className={field} />
                {errors.name ? <span className="text-red-ink">{errors.name}</span> : null}
            </label>
            {usesTarget ? <Amount label={goal.kind === 'yearly' ? 'Amount a year' : goal.kind === 'value' ? 'Grow to' : 'Amount'} value={target} set={setTarget} error={errors.target_amount} /> : null}
            {usesEach ? <Amount label="Each month" value={each} set={setEach} error={errors.amount_per_cycle} /> : null}
            {usesBy ? <MonthPick label="By" value={by} set={setBy} from={ymd()} error={errors.target_month} /> : null}
            <label className="flex items-center gap-2 text-[14px] font-bold">
                <input type="checkbox" checked={remind} onChange={(e) => setRemind(e.target.checked)} className="size-4 accent-[var(--mint)]" />
                Remind me on payday
            </label>
            <p className="text-[12.5px] text-slate">Saving plans again from today. Months already done keep their result.</p>
            <div className="flex gap-2">
                <button type="submit" className="h-10 flex-1 rounded-xl bg-mint text-[14.5px] font-extrabold text-on-mint">
                    Save
                </button>
                <button type="button" onClick={onDone} className="h-10 rounded-xl px-3 text-[14.5px] font-bold text-teal">
                    Cancel
                </button>
            </div>
        </form>
    );
}

function Amount({ label, value, set, error }: { label: string; value: string; set: (v: string) => void; error?: string }) {
    return (
        <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
            {label}
            <span className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[15px] font-bold text-slate">R</span>
                <input value={value} onChange={(e) => set(cleanTyped(e.target.value))} inputMode="decimal" placeholder="0.00" className={`${field} num pl-7`} />
            </span>
            {error ? <span className="text-red-ink">{error}</span> : null}
        </label>
    );
}

/** Months as a list: from the month after `from`, about 5 years ahead (value goals go further). */
function MonthPick({ label, value, set, from, error, years = 5 }: { label: string; value: string; set: (v: string) => void; from: string; error?: string; years?: number }) {
    const start = new Date(`${from.slice(0, 7)}-01T00:00:00`);
    const months = Array.from({ length: years * 12 }, (_, i) => {
        const d = new Date(start.getFullYear(), start.getMonth() + i + 1, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    if (value && !months.includes(value)) months.unshift(value);
    return (
        <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
            {label}
            <select value={value} onChange={(e) => set(e.target.value)} className={field}>
                <option value="" disabled>
                    Choose a month
                </option>
                {months.map((m) => (
                    <option key={m} value={m}>
                        {monthLabel(m)}
                    </option>
                ))}
            </select>
            {error ? <span className="text-red-ink">{error}</span> : null}
        </label>
    );
}

const KINDS: { kind: GoalKind; label: string; sub: string }[] = [
    { kind: 'target', label: 'Reach an amount by a date', sub: 'R30,000 deposit by December 2027. PocFin works out each month.' },
    { kind: 'habit', label: 'Put away the same each month', sub: 'R2,000 a month into a unit trust, no end date.' },
    { kind: 'yearly', label: 'A yearly amount', sub: 'R46,000 over 12 months, however it comes in.' },
    { kind: 'value', label: 'Grow to a value', sub: 'For investments, growth included. PocFin plans with 10% growth, 5% inflation and a 6% yearly raise.' },
];

/**
 * W13b New goal, beside the list: what kind, then the name, where it's kept, the amount and date and
 * when it starts, with the monthly pace worked out as you type. Nothing moves; PocFin suggests it
 * on payday.
 */
export function NewGoal({ accounts, purposes, takenAccounts, takenPurposes, cycleStart, onClose }: { accounts: Place[]; purposes: Place[]; takenAccounts: number[]; takenPurposes: number[]; cycleStart: string; onClose: () => void }) {
    const [step, setStep] = useState<1 | 2>(1);
    const [kind, setKind] = useState<GoalKind>('target');
    const [name, setName] = useState('');
    const [place, setPlace] = useState('');
    const [target, setTarget] = useState('');
    const [each, setEach] = useState('');
    const [by, setBy] = useState('');
    const [starts, setStarts] = useState(0);
    const [remind, setRemind] = useState(true);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);

    // A value goal grows: investment accounts and purposes only. One active goal per account or purpose.
    const places = [
        ...accounts.filter((a) => (kind !== 'value' || a.type === 'investment') && !takenAccounts.includes(a.id)).map((a) => ({ value: `a:${a.id}`, label: `${a.type === 'savings' ? 'Savings' : a.type === 'holding' ? 'Holding' : 'Investment'} · ${a.name}` })),
        ...purposes.filter((p) => !takenPurposes.includes(p.id)).map((p) => ({ value: `p:${p.id}`, label: `Investment purpose · ${p.name}` })),
    ];
    const startMonth = (n: number) => {
        const d = new Date(`${cycleStart}T00:00:00`);
        d.setMonth(d.getMonth() + n);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const months = by ? monthsFrom(startMonth(starts), `${by}-01`) + 1 : 0;
    const plan =
        kind === 'target'
            ? toCents(toAmount(target)) > 0n && months > 0
                ? `${formatMoney(perCycleHint(toAmount(target), months))} a month for ${months} ${months === 1 ? 'month' : 'months'}. Put in more and next month asks for less.`
                : 'Type an amount and a month to see the monthly pace.'
            : kind === 'yearly'
              ? toCents(toAmount(target)) > 0n
                  ? `About ${formatMoney(perCycleHint(toAmount(target), 12))} a month, however it comes in.`
                  : 'Type the amount for a year.'
              : kind === 'habit'
                ? toCents(toAmount(each)) > 0n
                    ? `${formatMoney(toAmount(each))} each month, no end date.`
                    : 'Type the amount for each month.'
                : 'Worked out like the Retirement calculator: estimates from your own guesses, not financial advice.';

    function create(e: FormEvent) {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        router.post('/goals', {
            kind,
            name: name.trim(),
            ...(place.startsWith('a:') ? { account_id: Number(place.slice(2)) } : place.startsWith('p:') ? { purpose_id: Number(place.slice(2)) } : {}),
            ...(kind !== 'habit' ? { target_amount: toAmount(target) } : {}),
            ...(kind === 'habit' || kind === 'value' ? { amount_per_cycle: toAmount(each) } : {}),
            ...(kind === 'target' || kind === 'value' ? { target_month: by } : {}),
            ...(starts > 0 ? { starts_on: startMonth(starts) } : {}),
            remind_on_payday: remind,
        }, { preserveScroll: true, onError: (er) => setErrors(er as Record<string, string>), onFinish: () => setBusy(false) });
    }

    return (
        <form onSubmit={create} onKeyDown={(e) => e.key === 'Escape' && onClose()} className="flex flex-col gap-4 rounded-[24px] bg-card p-5">
            <div className="flex items-center gap-3">
                <div className="flex-1">
                    <h2 className="text-[19px] font-extrabold">New goal</h2>
                    <div className="text-[13px] font-bold text-slate">Step {step} of 2</div>
                </div>
                <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-canvas text-slate hover:text-ink">
                    <Icon name="close" size={16} stroke={2.2} />
                </button>
            </div>
            {step === 1 ? (
                <>
                    <div role="radiogroup" aria-label="What kind" className="flex flex-col gap-2">
                        {KINDS.map((k) => (
                            <button key={k.kind} type="button" role="radio" aria-checked={kind === k.kind} onClick={() => setKind(k.kind)} className={`rounded-2xl px-4 py-3 text-left transition-colors ${kind === k.kind ? 'bg-tint ring-2 ring-mint ring-inset' : 'bg-canvas hover:bg-segment'}`}>
                                <span className="block text-[15px] font-extrabold">{k.label}</span>
                                <span className="block text-[13px] text-slate">{k.sub}</span>
                            </button>
                        ))}
                    </div>
                    <button type="button" autoFocus onClick={() => { setStep(2); setPlace(''); }} className="h-11 rounded-xl bg-mint text-[15px] font-extrabold text-on-mint">
                        Next
                    </button>
                </>
            ) : (
                <>
                    <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                        Name
                        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder={kind === 'value' ? 'Retire at 65' : 'Car deposit'} className={field} />
                        {errors.name ? <span className="text-red-ink">{errors.name}</span> : null}
                    </label>
                    <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                        Kept in
                        <select value={place} onChange={(e) => setPlace(e.target.value)} className={field}>
                            <option value="" disabled>
                                Choose an account or purpose
                            </option>
                            {places.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                        {places.length === 0 ? <span className="font-semibold">{kind === 'value' ? 'A value goal needs an investment account or purpose without a goal.' : 'Every account already has a goal. Make an account first.'}</span> : null}
                        {errors.account_id || errors.purpose_id ? <span className="text-red-ink">{errors.account_id || errors.purpose_id}</span> : null}
                    </label>
                    {kind !== 'habit' ? <Amount label={kind === 'yearly' ? 'Amount a year' : kind === 'value' ? 'Grow to (in the rands of that day)' : 'Amount'} value={target} set={setTarget} error={errors.target_amount} /> : null}
                    {kind === 'habit' || kind === 'value' ? <Amount label="Each month" value={each} set={setEach} error={errors.amount_per_cycle} /> : null}
                    {kind === 'target' || kind === 'value' ? <MonthPick label="By" value={by} set={setBy} from={startMonth(starts)} years={kind === 'value' ? 45 : 5} error={errors.target_month} /> : null}
                    <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                        Starts
                        <select value={starts} onChange={(e) => setStarts(Number(e.target.value))} className={field}>
                            {Array.from({ length: 13 }, (_, n) => (
                                <option key={n} value={n}>
                                    {monthLabel(startMonth(n).slice(0, 7)).split(' ')[0]}
                                    {n === 0 ? ' (this month)' : ` ${startMonth(n).slice(0, 4)}`}
                                </option>
                            ))}
                        </select>
                        {errors.starts_on ? <span className="text-red-ink">{errors.starts_on}</span> : null}
                    </label>
                    <p className="num rounded-xl bg-tint px-3.5 py-2.5 text-[13.5px] font-bold text-tint-sub">{plan} PocFin suggests it on payday; nothing moves without you.</p>
                    <label className="flex items-center gap-2 text-[14px] font-bold">
                        <input type="checkbox" checked={remind} onChange={(e) => setRemind(e.target.checked)} className="size-4 accent-[var(--mint)]" />
                        Remind me on payday
                    </label>
                    {errors.form || errors.kind ? <p role="alert" className="rounded-xl bg-red-tint px-3 py-2.5 text-[14px] font-bold text-red-ink">{errors.form || errors.kind}</p> : null}
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setStep(1)} className="h-11 rounded-xl bg-canvas px-4 text-[15px] font-bold">
                            Back
                        </button>
                        <button type="submit" disabled={!name.trim() || !place || busy} className="h-11 flex-1 rounded-xl bg-mint text-[15px] font-extrabold text-on-mint disabled:opacity-60">
                            {busy ? 'Making…' : 'Make this goal'}
                        </button>
                    </div>
                </>
            )}
        </form>
    );
}
