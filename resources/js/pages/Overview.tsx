import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import RecentRow from '@/components/RecentRow';
import { useApp } from '@/lib/app';
import Bar from '@/components/Bar';
import Gauge from '@/components/Gauge';
import Icon, { type IconName } from '@/components/Icon';
import Money from '@/components/Money';
import Shell from '@/components/Shell';
import { dayLabel, formatMoney, isNegative, monthName, percent, toCents } from '@/lib/format';
import { fromCents } from '@/shared/money';
import type { Envelope, Expense, Member, Shared } from '@/types';

type Summary = {
    cycle: { start: string; end: string };
    spent: string;
    refunded: string;
    allocated: string;
    left_to_spend: string;
    unallocated: string;
    accounts: { savings: string; holding: string; investments: string; total: string };
    overspent: { envelope_id: number; name: string; amount: string }[];
    top_categories: { envelope_id: number | null; account_id: number | null; name: string; spent: string; balance: string }[];
};
type Account = { id: number; type: string; gain: string | null };
type Streak = { current: number; best: number; this_week_counted: boolean; weeks: { start: string; status: string }[] } | null;
type Goal = { id: number; name: string; status: string; state?: string };
type Ready = { id: number; name: string; amount: string; open_run?: { due_date?: string } | null };

type Props = {
    summary: Summary;
    envelopes: Envelope[];
    accounts: Account[];
    expenses: Expense[];
    streak: Streak;
    left_from: { note: string | null; date: string } | null;
    members: Member[];
    goals: Goal[];
    automatic_ready: Ready[];
    daysLeft: number;
};

type Need = { key: string; icon: IconName; tone: 'teal' | 'red' | 'amber'; title: string; sub: string; action?: { label: string; run: () => void } };

/** A week's square: counted mint, rest amber, this week mint once it counts, the rest grey. */
function weekTone(status: string, thisWeekCounted: boolean): string {
    if (status === 'counted') return 'bg-mint';
    if (status === 'rest') return 'bg-amber-line';
    if (status === 'current') return thisWeekCounted ? 'bg-mint ring-2 ring-ink ring-inset' : 'bg-line ring-2 ring-ink ring-inset';
    return 'bg-line';
}

const TONES = {
    teal: 'bg-tint text-teal',
    red: 'bg-red-tint text-red',
    amber: 'bg-amber-tint text-amber',
};
const WHO = ['bg-navy-tint text-navy-text', 'bg-amber-tint text-amber-ink', 'bg-tint text-teal', 'bg-red-tint text-red-ink'];

function Section({ title, link, children }: { title: string; link?: { href: string; label: string }; children: ReactNode }) {
    const id = `ov-${title.toLowerCase().replace(/\W+/g, '-')}`;
    return (
        <section aria-labelledby={id}>
            <div className="mx-1 mb-3 flex items-baseline justify-between gap-3">
                <h2 id={id} className="text-[19px] font-extrabold">
                    {title}
                </h2>
                {link ? (
                    // Pages already in React swap in place; the rest are still release 1 (a full load).
                    link.href === '/budget' ? (
                        <Link href={link.href} className="text-[14.5px] font-bold text-teal hover:underline">
                            {link.label}
                        </Link>
                    ) : (
                        <a href={link.href} className="text-[14.5px] font-bold text-teal hover:underline">
                            {link.label}
                        </a>
                    )
                ) : null}
            </div>
            {children}
        </section>
    );
}

/** Sends a delete once Undo has passed (or straight away when leaving the page), then refreshes the figures. */
function useDelayedDelete() {
    const pending = useRef(new Map<number, number>());
    const { csrf } = usePage<Shared>().props;
    const send = (id: number, reload: boolean) => {
        fetch(`/money/expenses/${id}`, { method: 'DELETE', keepalive: true, headers: { 'X-CSRF-TOKEN': csrf, Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } }).finally(() => {
            if (reload) router.reload({ only: ['summary', 'envelopes', 'expenses', 'streak'] });
        });
    };
    useEffect(() => {
        const map = pending.current;
        return () => {
            map.forEach((timer, id) => {
                window.clearTimeout(timer);
                send(id, false);
            });
            map.clear();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return {
        later: (id: number, ms: number) => {
            pending.current.set(
                id,
                window.setTimeout(() => {
                    pending.current.delete(id);
                    send(id, true);
                }, ms),
            );
        },
        cancel: (id: number) => {
            window.clearTimeout(pending.current.get(id));
            pending.current.delete(id);
        },
    };
}

export default function Overview(p: Props) {
    const s = p.summary;
    const { openAdd, toast } = useApp();
    const [editing, setEditing] = useState<number | null>(null);
    const [hidden, setHidden] = useState<number[]>([]);
    const deletes = useDelayedDelete();
    const remove = (id: number) => {
        setEditing(null);
        setHidden((h) => [...h, id]);
        deletes.later(id, 6000);
        toast({ text: 'Deleted', ms: 6000, undo: () => {
            deletes.cancel(id);
            setHidden((h) => h.filter((x) => x !== id));
        } });
    };
    const envelopes = new Map(p.envelopes.map((e) => [e.id, e]));
    const live = p.envelopes.filter((e) => !e.archived);
    const members = new Map(p.members.map((m, i) => [m.id, { ...m, tone: WHO[i % WHO.length] }]));
    const shared = p.members.length > 1;
    const fill = toCents(s.allocated) > 0n ? percent(isNegative(s.left_to_spend) ? '0' : s.left_to_spend, s.allocated) : 0;

    // Needs you: only what's waiting (allocate, overspent, an automatic payment to approve).
    const needs: Need[] = [];
    if (toCents(s.unallocated) > 0n) {
        needs.push({
            key: 'ready',
            icon: 'allocate',
            tone: 'teal',
            title: `${formatMoney(s.unallocated)} ready to allocate`,
            sub: p.left_from ? `From ${p.left_from.note || 'income'}, ${dayLabel(p.left_from.date)}` : 'Give it a place in your envelopes',
        });
    }
    for (const o of s.overspent ?? []) {
        needs.push({
            key: `over-${o.envelope_id}`,
            icon: 'warning',
            tone: 'red',
            title: `${o.name} is over by ${formatMoney(o.amount)}`,
            sub: 'Move money to it, or let next month cover it',
            action: { label: 'Move money', run: () => openAdd({ tab: 'move', toEnvelopeId: o.envelope_id, amount: o.amount }) },
        });
    }
    for (const a of p.automatic_ready ?? []) {
        needs.push({ key: `auto-${a.id}`, icon: 'automatic', tone: 'amber', title: `${a.name} is ready to approve`, sub: `Automatic · ${formatMoney(a.amount)}` });
    }

    // Envelopes: the month's top categories with what's left and how much of the plan is used.
    const top = (s.top_categories ?? []).filter((c) => c.envelope_id !== null).slice(0, 5);

    const activeGoals = (p.goals ?? []).filter((g) => g.status === 'active');
    const onTrack = activeGoals.filter((g) => !['waiting', 'needs_look', 'upcoming'].includes(g.state ?? '')).length;
    const gain = p.accounts.reduce((t, a) => (a.type === 'investment' && a.gain ? t + toCents(a.gain) : t), 0n);
    const weeks = (p.streak?.weeks ?? []).slice(-8);

    return (
        <>
            <Head title="Overview" />
            <div className="mx-auto flex w-full max-w-[760px] flex-col gap-9">
                <section aria-label="Left to spend" className="flex items-center gap-3 rounded-[28px] bg-card px-5 py-6 sm:gap-6 sm:px-9 sm:py-8">
                    <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-bold text-slate">Left to spend in {monthName(s.cycle.start)}</div>
                        <div className={`mt-1 text-[42px] leading-[50px] font-extrabold tracking-[-0.04em] sm:text-[68px] sm:leading-[76px] ${isNegative(s.left_to_spend) ? 'text-red' : ''}`}>
                            <Money amount={s.left_to_spend} />
                        </div>
                        <div className="mt-1.5 text-[15px] text-slate">
                            {p.daysLeft} {p.daysLeft === 1 ? 'day' : 'days'} to go · across {live.length} {live.length === 1 ? 'envelope' : 'envelopes'}
                        </div>
                        {p.streak && p.streak.current > 0 ? (
                            <span className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-tint px-3 py-1.5 text-[13.5px] font-bold text-teal">
                                <Icon name="flame" size={14} stroke={2.2} />
                                {p.streak.current} {p.streak.current === 1 ? 'week' : 'weeks'} in a row
                            </span>
                        ) : null}
                    </div>
                    <Gauge percent={fill} className="size-[92px] sm:size-[164px]" />
                </section>

                <Section title="Needs you">
                    <div className="overflow-hidden rounded-[22px] bg-card">
                        {needs.length === 0 ? (
                            <div className="flex items-center gap-3.5 px-5 py-4">
                                <span className="grid size-9 flex-none place-items-center rounded-full bg-tint text-teal">
                                    <Icon name="check" size={18} stroke={2.4} />
                                </span>
                                <span className="text-[15px] font-bold">It all has a place.</span>
                            </div>
                        ) : (
                            needs.map((n, i) => (
                                <div key={n.key} className={`flex items-center gap-3.5 px-5 py-3.5 ${i ? 'border-t border-line' : ''}`}>
                                    <span className={`grid size-9 flex-none place-items-center rounded-full ${TONES[n.tone]}`}>
                                        <Icon name={n.icon} size={18} stroke={2} />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[15px] font-bold">{n.title}</span>
                                        <span className="block text-[13px] text-slate">{n.sub}</span>
                                    </span>
                                    {n.action ? (
                                        <button type="button" onClick={n.action.run} className="h-9 flex-none rounded-xl bg-canvas px-3.5 text-sm font-extrabold transition-transform hover:bg-segment active:scale-[0.97]">
                                            {n.action.label}
                                        </button>
                                    ) : null}
                                </div>
                            ))
                        )}
                    </div>
                </Section>

                <Section title="Envelopes" link={{ href: '/budget', label: `All ${live.length} envelopes` }}>
                    <div className="rounded-[22px] bg-card px-5 py-2">
                        {top.length === 0 ? <p className="py-3 text-[15px] text-slate">Nothing spent yet this month.</p> : null}
                        {top.map((c, i) => {
                            const env = c.envelope_id ? envelopes.get(c.envelope_id) : undefined;
                            const over = isNegative(c.balance);
                            const plan = env?.budgeted_amount ?? '0';
                            return (
                                <div key={c.envelope_id} className={`py-3 ${i ? 'border-t border-line' : ''}`}>
                                    <div className="flex justify-between gap-2 text-[15px] font-bold">
                                        <span>{c.name}</span>
                                        <span className={`num ${over ? 'text-red' : ''}`}>
                                            {over ? `${formatMoney(c.balance.replace('-', ''))} over` : `${formatMoney(c.balance)} left`}
                                        </span>
                                    </div>
                                    <div className="mt-2">
                                        <Bar percent={percent(c.spent, plan)} over={over} delay={0.05 * i} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Section>

                <Section title="Recent" link={{ href: '/history', label: 'All history' }}>
                    <p className="mx-1 -mt-2 mb-2.5 text-[13px] text-slate">Click a row to change it</p>
                    <div className="rounded-[22px] bg-card p-2">
                        {p.expenses.length === 0 ? <p className="px-3 py-3 text-[15px] text-slate">Nothing added yet this month.</p> : null}
                        <AnimatePresence initial={false}>
                            {p.expenses
                                .filter((x) => !hidden.includes(x.id))
                                .map((x) => {
                                    const who = shared && x.created_by ? members.get(x.created_by) : undefined;
                                    return (
                                        <motion.div key={x.id} layout="position" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }} className="overflow-hidden">
                                            <RecentRow x={x} envelopes={p.envelopes} who={who} editing={editing === x.id} onEdit={() => setEditing(x.id)} onClose={() => setEditing(null)} onDelete={() => remove(x.id)} />
                                        </motion.div>
                                    );
                                })}
                        </AnimatePresence>
                    </div>
                </Section>

                <section aria-label="Goals, accounts and streak" className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
                    <div className="rounded-[20px] bg-card px-5 py-[18px]">
                        <div className="text-sm font-bold text-slate">Goals</div>
                        <div className="mt-1 text-[17px] font-extrabold">{activeGoals.length ? `${onTrack} of ${activeGoals.length} on track` : 'None yet'}</div>
                        <div className="mt-3">
                            <Bar percent={activeGoals.length ? Math.round((onTrack / activeGoals.length) * 100) : 0} />
                        </div>
                    </div>
                    <a href="/accounts" className="rounded-[20px] bg-card px-5 py-[18px] transition-transform active:scale-[0.98]">
                        <div className="text-sm font-bold text-slate">Accounts</div>
                        <div className="mt-1 text-[17px] font-extrabold">
                            <Money amount={s.accounts.total} />
                        </div>
                        {gain !== 0n ? <div className={`num mt-2 text-[13px] font-bold ${gain < 0n ? 'text-red' : 'text-teal'}`}>{formatMoney(fromCents(gain), { income: gain > 0n })} gain</div> : null}
                    </a>
                    <div className="rounded-[20px] bg-card px-5 py-[18px]">
                        <div className="text-sm font-bold text-slate">Streak</div>
                        <div className="mt-1 text-[17px] font-extrabold">{p.streak ? `${p.streak.current} ${p.streak.current === 1 ? 'week' : 'weeks'}, best ${p.streak.best}` : '—'}</div>
                        {weeks.length ? (
                            <div aria-hidden="true" className="mt-3 grid grid-cols-8 gap-1">
                                {weeks.map((w) => (
                                    <span key={w.start} className={`h-2 rounded ${weekTone(w.status, p.streak?.this_week_counted ?? false)}`} />
                                ))}
                            </div>
                        ) : null}
                    </div>
                </section>
            </div>
        </>
    );
}

Overview.layout = (page: ReactNode) => (
    <Shell active="overview" title="Overview">
        {page}
    </Shell>
);
