import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState, type ReactNode } from 'react';
import { Head, router } from '@inertiajs/react';
import Bar from '@/components/Bar';
import { CHIP_TONES, GoalPanel, NewGoal, type Place } from '@/components/GoalParts';
import Icon from '@/components/Icon';
import Shell from '@/components/Shell';
import { ymd } from '@/lib/amount';
import { formatMoney } from '@/lib/format';
import { ARRIVE } from '@/lib/motion';
import { goalChip, goalLine, goalPercent, monthOf, pastGoals, pastLine, SHAPES, type Goal } from '@/shared/goals';

type Props = {
    goals: Goal[];
    selected: Goal | null;
    accounts: Place[];
    purposes: Place[];
    cycle: { start: string; end: string } | null;
};

/**
 * W13 Goals: "Am I keeping my habits?" "3 of 4 on track this month" first, then goal cards with
 * calm chips. One goal opens beside the list; New goal (W13b) opens there too. Past goals fold
 * away under their own button. Goals are free and in beta, as on the phone.
 */
export default function Goals(p: Props) {
    const reduced = useReducedMotion();
    const today = ymd();
    const [panel, setPanel] = useState<number | 'new' | null>(p.selected?.id ?? null);
    const [showPast, setShowPast] = useState(false);
    useEffect(() => setPanel((cur) => (p.selected ? p.selected.id : cur === 'new' ? cur : null)), [p.selected]);

    const active = p.goals.filter((g) => g.status === 'active');
    const past = pastGoals(p.goals);
    const counted = active.filter((g) => g.state !== 'upcoming');
    // Waiting for this month's money isn't off track; only a goal that's behind is (as on the board).
    const onTrack = counted.filter((g) => g.state !== 'needs_look').length;
    const notes = counted
        .filter((g) => g.state === 'waiting' || g.state === 'needs_look')
        .map((g) => (g.state === 'waiting' ? `${g.name} is waiting for ${monthOf(g.this_cycle?.start ?? today)}.` : `${g.name} is a little behind.`));
    const open = typeof panel === 'number' ? (p.selected?.id === panel ? p.selected : p.goals.find((g) => g.id === panel)) : undefined;

    function openGoal(g: Goal) {
        if (panel === g.id) return close();
        setPanel(g.id);
        router.get('/goals', { goal: g.id }, { only: ['selected'], preserveState: true, preserveScroll: true, replace: true });
    }
    function close() {
        setPanel(null);
        router.replace({ url: '/goals', preserveState: true, preserveScroll: true, props: (old) => ({ ...old, selected: null }) });
    }
    useEffect(() => {
        if (panel === null) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !(e.target as HTMLElement)?.closest?.('input, select, textarea') && close();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    const card = (g: Goal) => {
        const chip = goalChip(g, today);
        const on = panel === g.id;
        return (
            <button key={g.id} type="button" onClick={() => openGoal(g)} aria-expanded={on} className={`flex flex-col gap-2 rounded-[20px] bg-card px-5 py-4 text-left transition-transform active:scale-[0.98] ${on ? 'ring-2 ring-mint ring-inset' : 'hover:ring-1 hover:ring-line-strong hover:ring-inset'}`}>
                <span className="flex items-start gap-2">
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-[16px] font-extrabold">{g.name}</span>
                        <span className="block truncate text-[12.5px] font-bold text-slate">
                            {SHAPES[g.kind]} · {g.link.name ?? 'A purpose'}
                        </span>
                    </span>
                    <span className={`flex-none rounded-lg px-2 py-0.5 text-[12px] font-bold ${CHIP_TONES[chip.tone]}`}>{chip.label}</span>
                </span>
                <Bar percent={goalPercent(g)} />
                <span className="num truncate text-[13px] text-slate">{goalLine(g, formatMoney)}</span>
            </button>
        );
    };

    return (
        <>
            <Head title="Goals" />
            <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-0 flex-1">
                        <h1 className="flex items-center gap-2 text-[28px] leading-tight font-extrabold tracking-[-0.02em]">
                            Goals
                            <span title="We’re still testing goals, so how they work may change. Your money and accounts are never touched." className="rounded-lg bg-navy-tint px-2 py-0.5 text-[12px] font-extrabold tracking-normal text-navy-text">
                                Beta
                            </span>
                        </h1>
                        <p className="mt-0.5 text-[15px] text-slate">Habits for building something up. Checked once a month.</p>
                    </div>
                    {past.length ? (
                        <button type="button" onClick={() => setShowPast((v) => !v)} aria-expanded={showPast} className="h-11 rounded-[14px] px-3 text-[15px] font-bold text-teal hover:underline">
                            Past goals ({past.length})
                        </button>
                    ) : null}
                    <button type="button" onClick={() => setPanel('new')} className="flex h-11 items-center gap-2 rounded-[14px] bg-mint px-4 text-[15px] font-extrabold text-on-mint transition-transform active:scale-[0.97]">
                        <Icon name="plus" size={16} stroke={2.4} />
                        New goal
                    </button>
                </div>

                <div className="flex items-start gap-5">
                    <div className="flex min-w-0 flex-1 flex-col gap-5">
                        {counted.length ? (
                            <section aria-label="This month" className="flex items-center gap-4 rounded-[24px] bg-card px-6 py-5">
                                <span className="grid size-12 flex-none place-items-center rounded-full bg-tint text-teal">
                                    <Icon name="goals" size={24} />
                                </span>
                                <div className="min-w-0">
                                    <div className="text-[22px] font-extrabold tracking-[-0.02em]">
                                        {onTrack} of {counted.length} on track this month
                                    </div>
                                    {notes.length ? <div className="text-[14px] text-slate">{notes.join(' ')}</div> : <div className="text-[14px] text-slate">Every goal has what it needs this month.</div>}
                                </div>
                            </section>
                        ) : null}

                        {active.length === 0 ? (
                            <div className="rounded-[24px] bg-card px-6 py-7">
                                <h2 className="text-[19px] font-extrabold">No goals yet</h2>
                                <p className="mt-1 text-[15px] text-slate">A goal sits on an account or an investment purpose and checks once a month that money went in. Nothing moves without you.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">{active.map(card)}</div>
                        )}

                        <AnimatePresence initial={false}>
                            {showPast && past.length ? (
                                <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22, ease: ARRIVE }} aria-labelledby="past" className="overflow-hidden">
                                    <div className="rounded-[24px] bg-card px-5 py-2">
                                        <h2 id="past" className="pt-3 pb-1 text-[15px] font-extrabold">
                                            Past goals
                                        </h2>
                                        {past.map((g, i) => (
                                            <button key={g.id} type="button" onClick={() => openGoal(g)} className={`flex w-full items-center gap-3 py-3 text-left ${i ? 'border-t border-line' : ''}`}>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-[15px] font-bold">{g.name}</span>
                                                    <span className="num block truncate text-[13px] text-slate">{pastLine(g, formatMoney)}</span>
                                                </span>
                                                <span className={`rounded-lg px-2 py-0.5 text-[12px] font-bold ${CHIP_TONES[goalChip(g, today).tone]}`}>{goalChip(g, today).label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </motion.section>
                            ) : null}
                        </AnimatePresence>
                    </div>

                    <AnimatePresence>
                        {panel !== null && (panel === 'new' || open) ? (
                            <>
                                <motion.div key="scrim" className="fixed inset-0 z-40 bg-scrim xl:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
                                <motion.aside
                                    key="panel"
                                    aria-label={panel === 'new' ? 'New goal' : `${open?.name} details`}
                                    initial={reduced ? { opacity: 0 } : { opacity: 0, x: 24 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={reduced ? { opacity: 0 } : { opacity: 0, x: 24, transition: { duration: 0.18 } }}
                                    transition={{ duration: 0.28, ease: ARRIVE }}
                                    className="fixed inset-y-0 right-0 z-50 w-[min(420px,100vw)] overflow-y-auto bg-canvas p-3 xl:sticky xl:top-5 xl:z-auto xl:max-h-[calc(100vh-40px)] xl:w-[380px] xl:flex-none xl:rounded-[24px] xl:p-0"
                                >
                                    {panel === 'new' ? (
                                        <NewGoal
                                            accounts={p.accounts}
                                            purposes={p.purposes}
                                            takenAccounts={active.map((g) => g.account_id).filter((x): x is number => x !== null)}
                                            takenPurposes={active.map((g) => g.purpose_id).filter((x): x is number => x !== null)}
                                            cycleStart={p.cycle?.start ?? `${today.slice(0, 7)}-01`}
                                            onClose={close}
                                        />
                                    ) : open ? (
                                        <GoalPanel key={`${open.id}-${open.cycles ? 'full' : 'list'}`} goal={open} today={today} onClose={close} />
                                    ) : null}
                                </motion.aside>
                            </>
                        ) : null}
                    </AnimatePresence>
                </div>
            </div>
        </>
    );
}

Goals.layout = (page: ReactNode) => (
    <Shell active="goals" title="Goals">
        {page}
    </Shell>
);
