import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState, type ReactNode } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import Icon from '@/components/Icon';
import Money from '@/components/Money';
import Shell from '@/components/Shell';
import { useApp } from '@/lib/app';
import { dayLabel, formatMoney, isNegative, monthName, toCents } from '@/lib/format';
import { ARRIVE } from '@/lib/motion';
import { fromCents } from '@/shared/money';
import type { Shared } from '@/types';

type MonthEnvelope = { id: number; name: string; kind: string; budgeted_amount: string; spent: string; usual: string | null; balance: string };
type Month = {
    cycle: { start: string; end: string };
    current: boolean;
    days: { total: number; elapsed: number };
    income: string;
    spent: string;
    refunded: string;
    spent_net: string;
    kept: string;
    kept_percent: number | null;
    moved_to_accounts: string;
    pace: { kept: string; spent: string } | null;
    previous_kept: string | null;
    envelopes: MonthEnvelope[];
    accounts: { id: number; name: string; spent: string }[];
};
type TrendMonth = { start: string; end: string; current: boolean; income: string; spent_net: string; kept: string; kept_percent: number | null; moved_to_accounts: string };
type Rhythm = { months: number; weeks: string[]; week_shares: number[]; weekdays: string[]; busiest_weekday: { day: number; envelope: string | null }; small: { under: string; count: number; amount: string; envelope: string | null } };
type Trends = { ready: boolean; months: TrendMonth[]; average_kept_percent: number | null; months_kept: number; months_counted: number; rhythm: Rhythm | null };
type Card =
    | { kind: 'over_plan'; key: string; envelope_id: number; name: string; budgeted: string; usual: string; suggested: string; months: number }
    | { kind: 'repeat'; key: string; note: string; amount: string; day: number; envelope_id: number | null; account_id: number | null; months: number }
    | { kind: 'idle'; key: string; envelope_id: number; name: string; amount: string; months: number }
    | { kind: 'spare'; key: string; amount: string; planned: string; income: string; months: number };
type Insights = { ready: boolean; months_of_data: number; months_needed: number; cards: Card[] };
type Props = { tab: 'month' | 'trends' | 'insights'; premium_required: boolean; month: Month | null; trends: Trends | null; insights: Insights | null };

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ord = (d: number) => `${d}${[11, 12, 13].includes(d % 100) ? 'th' : d % 10 === 1 ? 'st' : d % 10 === 2 ? 'nd' : d % 10 === 3 ? 'rd' : 'th'}`;
const short = (ymd: string) => monthName(ymd).slice(0, 3);
const rand = (a: string) => formatMoney(a).replace(/\.\d\d$/, '');
const shift = (ymd: string, days: number) => {
    const d = new Date(`${ymd}T00:00:00`);
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const share = (part: string, whole: string) => (toCents(whole) > 0n ? Number((toCents(part) * 1000n) / toCents(whole)) / 10 : 0);

/** "▲ 15% vs usual"; within 10% of usual counts as the same (the app's rule). A running month is compared with usual so far. */
function compare(spent: string, usual: string | null, passed: number): { label: string; tone: string } | null {
    if (usual === null || toCents(usual) <= 0n) return null;
    const expected = Number(toCents(usual)) * passed;
    if (expected <= 0) return null;
    const change = Math.round(((Number(toCents(spent)) - expected) / expected) * 100);
    if (Math.abs(change) < 10) return { label: 'Same as usual', tone: 'text-slate' };
    return change > 0 ? { label: `▲ ${change}% vs usual`, tone: 'text-amber' } : { label: `▼ ${-change}% vs usual`, tone: 'text-teal' };
}

function Grow({ pct, className, delay = 0 }: { pct: number; className: string; delay?: number }) {
    const reduced = useReducedMotion();
    return <motion.div className={className} initial={reduced ? false : { width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, pct))}%` }} transition={{ duration: 0.6, ease: ARRIVE, delay }} />;
}

function MonthView({ m }: { m: Month }) {
    const passed = m.current ? m.days.elapsed / m.days.total : 1;
    const plan = m.envelopes.filter((e) => toCents(e.budgeted_amount) > 0n).sort((a, b) => Number(toCents(b.budgeted_amount) - toCents(a.budgeted_amount)));
    const places = [...m.envelopes.map((e) => ({ key: `e${e.id}`, name: e.name, spent: e.spent, usual: e.usual })), ...m.accounts.map((a) => ({ key: `a${a.id}`, name: a.name, spent: a.spent, usual: null }))]
        .filter((p) => toCents(p.spent) > 0n)
        .sort((a, b) => Number(toCents(b.spent) - toCents(a.spent)));
    const total = places.reduce((t, p) => t + toCents(p.spent), 0n);
    const keptNeg = isNegative(m.kept);

    return (
        <div className="flex flex-col gap-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                <section aria-label="Kept" className="rounded-[24px] bg-card px-6 py-6">
                    <div className="text-[15px] font-bold text-slate">{m.current ? 'Kept so far' : `Kept in ${monthName(m.cycle.start)}`}</div>
                    <div className={`mt-1 text-[44px] leading-[52px] font-extrabold tracking-[-0.04em] ${keptNeg ? 'text-amber' : ''}`}>
                        <Money amount={m.kept} />
                    </div>
                    <div className="num mt-1 text-[14.5px] text-slate">
                        {toCents(m.income) > 0n ? `${m.kept_percent ?? 0}% of ${formatMoney(m.income)} income, after ${formatMoney(m.spent_net)} spent` : `${formatMoney(m.spent_net)} spent, no income yet`}
                    </div>
                    {m.pace ? <div className="num mt-2 text-[14.5px] font-bold text-teal">On pace to keep about {rand(m.pace.kept)} by {dayLabel(m.cycle.end)}</div> : null}
                    {m.previous_kept !== null ? <div className="num mt-1 text-[13px] text-slate">Last month you kept {formatMoney(m.previous_kept)}</div> : null}
                </section>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                    <div className="rounded-[20px] bg-card px-5 py-4">
                        <div className="text-[13.5px] font-bold text-slate">Money back</div>
                        <div className="mt-1 text-[22px] font-extrabold">
                            <Money amount={m.refunded} />
                        </div>
                    </div>
                    <div className="rounded-[20px] bg-card px-5 py-4">
                        <div className="text-[13.5px] font-bold text-slate">Moved to saving</div>
                        <div className="mt-1 text-[22px] font-extrabold">
                            <Money amount={m.moved_to_accounts} />
                        </div>
                    </div>
                </div>
            </div>

            {plan.length ? (
                <section aria-labelledby="plan" className="rounded-[24px] bg-card px-5 py-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 pt-3 pb-1">
                        <h2 id="plan" className="text-[17px] font-extrabold">
                            Your plan and real life
                        </h2>
                        {m.current ? <span className="text-[12.5px] text-slate">The dark line is how far into the month you are</span> : null}
                    </div>
                    {plan.map((e, i) => {
                        const spent = toCents(e.spent);
                        const budgeted = toCents(e.budgeted_amount);
                        const over = spent > budgeted;
                        const chip = over
                            ? toCents(e.balance) >= 0n
                                ? { label: `${formatMoney(fromCents(spent - budgeted))} over plan, covered by savings`, tone: 'bg-navy-tint text-navy-text' }
                                : { label: `${formatMoney(fromCents(spent - budgeted))} over plan`, tone: 'bg-amber-tint text-amber-ink' }
                            : spent <= 0n
                              ? { label: 'Untouched', tone: 'bg-segment text-slate' }
                              : { label: 'Within plan', tone: 'bg-tint text-teal' };
                        return (
                            <div key={e.id} className={`py-3 ${i ? 'border-t border-line' : ''}`}>
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <span className="text-[15px] font-bold">{e.name}</span>
                                    <span className="num text-[13.5px] text-slate">
                                        {formatMoney(e.spent)} of {formatMoney(e.budgeted_amount)}
                                    </span>
                                </div>
                                <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-tint">
                                    <Grow pct={share(e.spent, e.budgeted_amount)} className={`h-full rounded-full ${over ? 'bg-amber' : 'bg-mint'}`} delay={0.03 * i} />
                                    {m.current ? <span className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `${passed * 100}%` }} aria-hidden="true" /> : null}
                                </div>
                                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                    <span className={`rounded-lg px-2 py-0.5 text-[12px] font-bold ${chip.tone}`}>{chip.label}</span>
                                    <span className={`num text-[12.5px] ${m.current && isNegative(e.balance) ? 'text-amber-ink' : 'text-slate'}`}>
                                        {m.current ? (isNegative(e.balance) ? `${formatMoney(e.balance.replace('-', ''))} overspent` : `${formatMoney(e.balance)} left in envelope`) : e.usual && toCents(e.usual) > 0n ? `Usually ${formatMoney(e.usual)}` : ''}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </section>
            ) : null}

            {places.length ? (
                <section aria-labelledby="where" className="rounded-[24px] bg-card px-5 py-2">
                    <div className="pt-3 pb-1">
                        <h2 id="where" className="text-[17px] font-extrabold">
                            Where it went
                        </h2>
                        <p className="text-[12.5px] text-slate">Compared with your usual (the last 3 full months)</p>
                    </div>
                    {places.slice(0, 8).map((p, i) => {
                        const pct = total > 0n ? Number((toCents(p.spent) * 1000n) / total) / 10 : 0;
                        const c = compare(p.spent, p.usual, passed);
                        return (
                            <div key={p.key} className={`grid grid-cols-[minmax(0,1fr)_70px] items-center gap-x-3 gap-y-1 py-2.5 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)_60px_140px] ${i ? 'border-t border-line' : ''}`}>
                                <span className="truncate text-[14.5px] font-bold">{p.name}</span>
                                <span className="order-3 col-span-2 h-1.5 overflow-hidden rounded-full bg-tint sm:order-none sm:col-span-1">
                                    <Grow pct={pct} className="h-full rounded-full bg-navy-line" delay={0.03 * i} />
                                </span>
                                <span className="num text-right text-[14px] font-bold">{Math.round(pct * 10) / 10}%</span>
                                <span className={`num hidden text-right text-[12.5px] font-bold sm:block ${c?.tone ?? 'text-slate'}`}>{c?.label ?? formatMoney(p.spent)}</span>
                            </div>
                        );
                    })}
                </section>
            ) : (
                <p className="rounded-[20px] bg-card px-5 py-5 text-[15px] text-slate">Nothing spent yet this month.</p>
            )}
        </div>
    );
}

function TrendsView({ t }: { t: Trends }) {
    const reduced = useReducedMotion();
    if (!t.ready || !t.months.length) return <Empty title="Trends begin after 2 months" body="Once there are two months with enough in them, you’ll see income against spending here." />;
    const top = Math.max(...t.months.map((m) => Math.max(Number(toCents(m.income)), Number(toCents(m.spent_net)))), 1);
    const saved = Math.max(...t.months.map((m) => Number(toCents(m.moved_to_accounts))), 1);
    const r = t.rhythm;
    const peak = r ? Math.max(...r.week_shares, 0.0001) : 1;
    const first = t.months[0];
    const last = t.months[t.months.length - 1];

    return (
        <div className="flex flex-col gap-5">
            <section aria-labelledby="kept-run" className="rounded-[24px] bg-card px-6 py-5">
                <h2 id="kept-run" className="text-[19px] font-extrabold">
                    {t.months_kept === t.months_counted ? `You’ve kept money ${t.months_kept} ${t.months_kept === 1 ? 'month' : 'months'} running` : `You kept money in ${t.months_kept} of ${t.months_counted} months`}
                </h2>
                <p className="text-[13.5px] text-slate">
                    Income and spending, {monthName(first.start)} to {monthName(last.start)}.{last.current ? ` ${monthName(last.start)} is so far.` : ''}
                    {t.average_kept_percent !== null ? ` On average you kept ${t.average_kept_percent}%.` : ''}
                </p>
                <div className="mt-5 flex h-[180px] items-end gap-3" role="img" aria-label={t.months.map((m) => `${monthName(m.start)}: income ${formatMoney(m.income)}, spent ${formatMoney(m.spent_net)}`).join('; ')}>
                    {t.months.map((m, i) => (
                        <div key={m.start} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                            <span className={`num text-[12px] font-bold ${m.kept_percent !== null && m.kept_percent < 0 ? 'text-amber' : 'text-teal'}`}>{m.kept_percent !== null ? `${m.kept_percent}%` : ''}</span>
                            <div className="flex h-full w-full items-end justify-center gap-1">
                                {[
                                    [m.income, 'bg-tint ring-1 ring-mint ring-inset'],
                                    [m.spent_net, m.current ? 'bg-navy-line' : 'bg-navy'],
                                ].map(([v, tone], k) => (
                                    <motion.div key={k} className={`w-[42%] max-w-[26px] rounded-t-md ${tone}`} style={{ transformOrigin: 'bottom' }} initial={reduced ? false : { scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.6, ease: ARRIVE, delay: 0.04 * i }}>
                                        <div style={{ height: `${(Number(toCents(v)) / top) * 140}px` }} />
                                    </motion.div>
                                ))}
                            </div>
                            <span className="text-[12px] font-bold text-slate">{short(m.start)}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 text-[12.5px] text-slate">
                    <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-tint ring-1 ring-mint ring-inset" />Income</span>
                    <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-navy" />Spent</span>
                    <span>Kept, % of income</span>
                </div>
            </section>

            <section aria-labelledby="saving" className="rounded-[24px] bg-card px-5 py-2">
                <h2 id="saving" className="pt-3 pb-1 text-[17px] font-extrabold">
                    Moved to saving
                </h2>
                {t.months.map((m, i) => (
                    <div key={m.start} className={`grid grid-cols-[40px_minmax(0,1fr)_110px] items-center gap-3 py-2 ${i ? 'border-t border-line' : ''}`}>
                        <span className="text-[13px] font-bold text-slate">{short(m.start)}</span>
                        <span className="h-2 overflow-hidden rounded-full bg-tint">
                            <Grow pct={(Number(toCents(m.moved_to_accounts)) / saved) * 100} className="h-full rounded-full bg-mint" delay={0.03 * i} />
                        </span>
                        <span className="num text-right text-[14px] font-bold">{formatMoney(m.moved_to_accounts)}</span>
                    </div>
                ))}
            </section>

            {r ? (
                <section aria-labelledby="rhythm" className="rounded-[24px] bg-card px-6 py-5">
                    <h2 id="rhythm" className="text-[17px] font-extrabold">
                        Your rhythm
                    </h2>
                    <p className="text-[12.5px] text-slate">Spending by week of the month over {r.months} months, fixed bills left out</p>
                    <div className="mt-4 flex h-[120px] items-end gap-3">
                        {r.week_shares.map((w, i) => (
                            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                                <span className="num text-[12px] font-bold">{Math.round(w * 100)}%</span>
                                <motion.div className={`w-full max-w-[60px] rounded-t-lg ${w === peak ? 'bg-mint' : 'bg-tint'}`} style={{ height: `${(w / peak) * 80}px`, transformOrigin: 'bottom' }} initial={reduced ? false : { scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.6, ease: ARRIVE, delay: 0.05 * i }} />
                                <span className="text-[12px] font-bold text-slate">{r.weeks[i] ?? `Week ${i + 1}`}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-xl bg-canvas px-4 py-3 text-[14px]">
                            <div className="font-bold text-slate">Busiest day</div>
                            <div className="font-extrabold">
                                {DAYS[r.busiest_weekday.day]}
                                {r.busiest_weekday.envelope ? `, mostly ${r.busiest_weekday.envelope}` : ''}
                            </div>
                        </div>
                        <div className="rounded-xl bg-canvas px-4 py-3 text-[14px]">
                            <div className="font-bold text-slate">Small and often</div>
                            <div className="num font-extrabold">
                                {r.small.count} under {rand(r.small.under)} · {formatMoney(r.small.amount)}
                                {r.small.envelope ? `, mostly ${r.small.envelope}` : ''}
                            </div>
                        </div>
                    </div>
                </section>
            ) : null}
        </div>
    );
}

/** "Not now" hides a card for the rest of the month, remembered in this browser (as the phone does on the phone). */
function useDismissed(budgetId: number | null) {
    const key = `pocfin-insights-${budgetId}`;
    const month = new Date().toISOString().slice(0, 7);
    const [keys, setKeys] = useState<string[]>([]);
    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
            setKeys(saved && saved.month === month ? saved.keys : []);
        } catch {
            setKeys([]);
        }
    }, [key, month]);
    return {
        keys,
        add: (k: string) => {
            const next = [...keys, k];
            setKeys(next);
            try {
                localStorage.setItem(key, JSON.stringify({ month, keys: next }));
            } catch {
                /* private window: forgotten on reload, which is fine */
            }
        },
    };
}

function InsightsView({ ins }: { ins: Insights }) {
    const { budgetId } = usePage<Shared>().props;
    const { openAdd, toast } = useApp();
    const dismissed = useDismissed(budgetId);
    if (!ins.ready) return <Empty title="Insights begin after 3 months" body={`They compare a few full months. ${ins.months_of_data} of ${ins.months_needed} so far.`} />;
    const cards = ins.cards.filter((c) => !dismissed.keys.includes(c.key)).slice(0, 3);
    if (!cards.length) return <Empty title="Nothing to change right now" body="It all has a place. Your plan is matching how you spend; we’ll flag anything that changes." />;

    const copy = (c: Card) => {
        switch (c.kind) {
            case 'over_plan':
                return {
                    chip: c.name, tone: 'bg-amber-tint text-amber-ink', icon: 'analytics' as const,
                    title: `Your plan is ${formatMoney(c.budgeted)} but you spend about ${formatMoney(c.usual)}`,
                    body: `It’s been over for ${c.months} months running. Planning for what really happens means fewer surprises.`,
                    action: `Set ${c.name} to ${formatMoney(c.suggested)}`,
                    go: () => router.patch(`/envelopes/${c.envelope_id}`, { budgeted_amount: c.suggested }, { preserveScroll: true, preserveState: true, onSuccess: () => { toast({ text: `✓ ${c.name} is now ${formatMoney(c.suggested)} a month` }); dismissed.add(c.key); } }),
                };
            case 'idle':
                return {
                    chip: c.name, tone: 'bg-tint text-teal', icon: 'move' as const,
                    title: `${formatMoney(c.amount)} has sat unused for ${c.months} months`,
                    body: 'Move some to Saving up, or keep it for a bigger purchase.',
                    action: 'Move money',
                    go: () => openAdd({ tab: 'move', envelopeId: c.envelope_id }),
                };
            case 'repeat':
                return {
                    chip: 'Repeats', tone: 'bg-navy-tint text-navy-text', icon: 'automatic' as const,
                    title: `${c.note} ${formatMoney(c.amount)}, around the ${ord(c.day)}, ${c.months} months running`,
                    body: 'Let PocFin add it for you each month.',
                    action: 'Make it automatic',
                    go: () => {
                        // Filled in on New automatic; kept in this tab only, never in the address.
                        try {
                            sessionStorage.setItem('pocfin-automatic-prefill', JSON.stringify({ name: c.note.slice(0, 40), amount: c.amount, day: Math.min(28, c.day), envelope_id: c.envelope_id, account_id: c.account_id }));
                        } catch {
                            /* opens empty instead */
                        }
                        router.visit('/automatic?new=1');
                    },
                };
            case 'spare':
                return {
                    chip: 'Your plan', tone: 'bg-tint text-teal', icon: 'allocate' as const,
                    title: `Your plan has ${formatMoney(c.amount)} spare`,
                    body: `Planned amounts total ${formatMoney(c.planned)}, but about ${formatMoney(c.income)} comes in each month. Give the spare a place.`,
                    action: 'Allocate it',
                    go: () => router.visit('/allocate'),
                };
        }
    };

    return (
        <div className="flex flex-col gap-3">
            <p className="mx-1 text-[13.5px] text-slate">Up to three ideas from the last 3 months. Each opens the right place filled in; you decide.</p>
            <AnimatePresence initial={false}>
                {cards.map((c) => {
                    const x = copy(c);
                    return (
                        <motion.section key={c.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.24, ease: ARRIVE }} className="flex flex-wrap items-start gap-4 rounded-[24px] bg-card px-5 py-5">
                            <span className={`grid size-10 flex-none place-items-center rounded-full ${x.tone}`}>
                                <Icon name={x.icon} size={19} />
                            </span>
                            <div className="min-w-[220px] flex-1">
                                <span className={`rounded-md px-1.5 py-0.5 text-[11.5px] font-bold ${x.tone}`}>{x.chip}</span>
                                <h3 className="num mt-1.5 text-[16px] font-extrabold">{x.title}</h3>
                                <p className="mt-0.5 text-[14px] text-slate">{x.body}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <button type="button" onClick={x.go} className="h-10 rounded-xl bg-mint px-4 text-[14.5px] font-extrabold text-on-mint transition-transform active:scale-[0.97]">
                                    {x.action}
                                </button>
                                <button type="button" onClick={() => dismissed.add(c.key)} className="h-10 px-2.5 text-[14px] font-bold text-teal hover:underline">
                                    Not now
                                </button>
                            </div>
                        </motion.section>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}

function Empty({ title, body }: { title: string; body: string }) {
    return (
        <div className="rounded-[24px] bg-card px-6 py-7">
            <h2 className="text-[19px] font-extrabold">{title}</h2>
            <p className="mt-1 text-[15px] text-slate">{body}</p>
        </div>
    );
}

/**
 * W15 Analytics: "How did this month go?" Month first (kept so far with the pace, plan against
 * real life with a line for how far into the month you are, where it went compared with usual);
 * Trends (six months of income against spending, moved to saving, your rhythm) and Insights (up
 * to three, each with one action and Not now) are Premium, as in the app.
 */
export default function Analytics(p: Props) {
    const { budgets, budgetId } = usePage<Shared>().props;
    const premium = budgets.find((b) => b.id === budgetId)?.premium ?? false;
    const go = (tab: Props['tab'], date?: string) => router.get('/analytics', { ...(tab !== 'month' ? { tab } : {}), ...(date ? { date } : {}) }, { preserveScroll: true, preserveState: true });
    const m = p.month;

    return (
        <>
            <Head title="Analytics" />
            <div className="mx-auto flex w-full max-w-[980px] flex-col gap-5">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[240px] flex-1">
                        <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.02em]">Analytics</h1>
                        <p className="mt-0.5 text-[15px] text-slate">How your month is going, and what to change</p>
                    </div>
                    <div role="tablist" aria-label="View" className="flex gap-1 rounded-xl bg-segment p-1">
                        {([
                            ['month', 'Month'],
                            ['trends', 'Trends'],
                            ['insights', 'Insights'],
                        ] as const).map(([k, label]) => (
                            <button key={k} type="button" role="tab" aria-selected={p.tab === k} onClick={() => p.tab !== k && go(k)} className={`flex h-9 items-center gap-1.5 rounded-[10px] px-4 text-[14.5px] font-extrabold transition-colors ${p.tab === k ? 'bg-card text-ink' : 'text-slate hover:text-ink'}`}>
                                {label}
                                {k !== 'month' && !premium ? <Icon name="premium" size={13} stroke={2.2} className="text-amber" /> : null}
                            </button>
                        ))}
                    </div>
                </div>

                {p.tab === 'month' && m ? (
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => go('month', shift(m.cycle.start, -1))} aria-label="The month before" className="grid size-9 place-items-center rounded-full bg-card hover:bg-segment">
                            <Icon name="chevronRight" size={16} stroke={2.4} className="rotate-180" />
                        </button>
                        <span className="text-[15px] font-extrabold">
                            {monthName(m.cycle.start)}
                            {m.current ? ` · day ${m.days.elapsed} of ${m.days.total}` : ` · ${dayLabel(m.cycle.start)} to ${dayLabel(m.cycle.end)}`}
                        </span>
                        {!m.current ? (
                            <button type="button" onClick={() => go('month', shift(m.cycle.end, 1))} aria-label="The month after" className="grid size-9 place-items-center rounded-full bg-card hover:bg-segment">
                                <Icon name="chevronRight" size={16} stroke={2.4} />
                            </button>
                        ) : null}
                    </div>
                ) : null}

                {p.premium_required ? (
                    <div className="flex flex-wrap items-center gap-4 rounded-[24px] bg-card px-6 py-6">
                        <span className="grid size-11 place-items-center rounded-full bg-amber-tint text-amber">
                            <Icon name="premium" size={22} />
                        </span>
                        <div className="min-w-[220px] flex-1">
                            <h2 className="text-[19px] font-extrabold">{p.tab === 'trends' ? 'Trends' : 'Insights'} come with Premium</h2>
                            <p className="mt-0.5 text-[14.5px] text-slate">{p.tab === 'trends' ? 'Six months of income against spending, what you moved to saving, and your rhythm.' : 'Up to three ideas a month from how you really spend, each one a tap from done.'} Month stays free.</p>
                        </div>
                        <a href="/premium" className="flex h-11 items-center rounded-[14px] bg-mint px-4 text-[15px] font-extrabold text-on-mint">
                            About Premium
                        </a>
                    </div>
                ) : p.tab === 'month' && m ? (
                    <MonthView m={m} />
                ) : p.tab === 'trends' && p.trends ? (
                    <TrendsView t={p.trends} />
                ) : p.tab === 'insights' && p.insights ? (
                    <InsightsView ins={p.insights} />
                ) : null}
            </div>
        </>
    );
}

Analytics.layout = (page: ReactNode) => (
    <Shell active="analytics" title="Analytics">
        {page}
    </Shell>
);
