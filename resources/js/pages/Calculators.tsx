import { Head, router, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { CalcChart, Fact, NumField, Segmented, SplitBar, type Line } from '@/components/CalcParts';
import Icon from '@/components/Icon';
import Shell from '@/components/Shell';
import { useApp } from '@/lib/app';
import { GOAL_PREFILL_KEY, growthGoal, retirementGoal } from '@/lib/calcGoal';
import { dayLabel } from '@/lib/format';
import { Refused, send } from '@/lib/http';
import {
    CAR_LOAN_DEFAULTS,
    GROWTH_DEFAULTS,
    HOME_LOAN_DEFAULTS,
    RETIREMENT_ASSUMPTIONS,
    RETIREMENT_DEFAULTS,
    carLoan,
    duration,
    growth,
    homeLoan,
    rands,
    randsShort,
    repayment,
    retirement,
    withDefaults,
    type CarLoanInputs,
    type GrowthInputs,
    type HomeLoanInputs,
    type RetirementInputs,
} from '@/shared/calculators';
import type { Shared } from '@/types';

type Kind = 'retirement' | 'growth' | 'home_loan' | 'car_loan';
type Saved = { id: number; kind: Kind; name: string; inputs: Record<string, number | string | boolean | null>; author: string | null; updated_by: string | null; updated_at: string };
type Props = { saved: Saved[]; prefill: { investments: { value: number; count: number } | null; spending_now: number | null }; calc: Kind | null; open: number | null };

const KINDS: { key: Kind; label: string; icon: string }[] = [
    { key: 'retirement', label: 'Retirement', icon: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 7v5l3 2' },
    { key: 'growth', label: 'Saving and growth', icon: 'M4 18l5-6 4 3 7-9M15 6h5v5' },
    { key: 'home_loan', label: 'Home loan', icon: 'M4 11l8-7 8 7v9H4zM10 20v-5h4v5' },
    { key: 'car_loan', label: 'Car loan', icon: 'M4 16v-4l2-5h12l2 5v4zM4 16v2h3v-2M17 16v2h3v-2' },
];
const LABEL = Object.fromEntries(KINDS.map((k) => [k.key, k.label])) as Record<Kind, string>;

type All = { retirement: RetirementInputs; growth: GrowthInputs; home_loan: HomeLoanInputs; car_loan: CarLoanInputs };

/** Starting figures are examples to change, so the answer isn't empty (the phone starts blank). */
function starting(p: Props['prefill']): All {
    return {
        retirement: { ...RETIREMENT_DEFAULTS, spending: p.spending_now ?? 20000, saved: p.investments?.value ?? 0, monthly: 2000 },
        growth: { ...GROWTH_DEFAULTS, mode: 'grow', years: 10, monthly: 1000, saved: 0 },
        home_loan: { ...HOME_LOAN_DEFAULTS, loan: 2000000, deposit: 200000 },
        car_loan: { ...CAR_LOAN_DEFAULTS, price: 400000, deposit: 40000 },
    };
}

const DEFAULTS = { retirement: RETIREMENT_DEFAULTS, growth: GROWTH_DEFAULTS, home_loan: HOME_LOAN_DEFAULTS, car_loan: CAR_LOAN_DEFAULTS } as const;

/** What still owed looks like after each year (a loan paid with `extra` on top; stops at nothing owed). */
function owedByYear(principal: number, ratePct: number, payment: number, extra: number, months: number, step = 12): number[] {
    const r = ratePct / 100 / 12;
    const out = [principal];
    let b = principal;
    for (let m = 1; m <= months; m++) {
        b = Math.max(0, b * (1 + r) - payment - extra);
        if (m % step === 0 || m === months) out.push(b);
    }
    return out;
}

/** What a saving ends at, after each year. */
function savedByYear(saved: number, monthly: number, ratePct: number, months: number): number[] {
    const r = ratePct / 100 / 12;
    const out = [saved];
    let b = saved;
    for (let m = 1; m <= months; m++) {
        b = b * (1 + r) + monthly;
        if (m % 12 === 0 || m === months) out.push(b);
    }
    return out;
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <section className={`rounded-[24px] bg-card p-5 ${className}`}>{children}</section>;
}

/** What the answer says up top: a sentence, the figure, one line under it. */
function Answer({ lead, big, sub }: { lead: string; big: string; sub: string }) {
    return (
        <div aria-live="polite">
            <div className="text-[14px] font-bold text-slate">{lead}</div>
            <div className="num mt-1 text-[40px] leading-none font-extrabold tracking-[-0.02em] text-ink">{big}</div>
            <div className="mt-2 text-[14px] text-slate">{sub}</div>
        </div>
    );
}

export default function Calculators(p: Props) {
    const { csrf, budgets, budgetId } = usePage<Shared>().props;
    const { toast } = useApp();
    const budgetName = budgets.find((b) => b.id === budgetId)?.name ?? 'this budget';
    const [kind, setKind] = useState<Kind>(p.calc ?? 'retirement');
    const [all, setAll] = useState<All>(() => starting(p.prefill));
    const [saved, setSaved] = useState<Saved[]>(p.saved);
    const [openId, setOpenId] = useState<number | null>(null);
    const [loaded, setLoaded] = useState('');
    const [naming, setNaming] = useState(false);
    const [name, setName] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    const [rmode, setRmode] = useState<'percent' | 'amount'>('percent');
    const [sure, setSure] = useState<number | null>(null);

    const set = <K extends Kind>(k: K, patch: Partial<All[K]>) => setAll((a) => ({ ...a, [k]: { ...a[k], ...patch } }));

    function load(c: Saved) {
        setKind(c.kind);
        setAll((a) => ({ ...a, [c.kind]: withDefaults(DEFAULTS[c.kind] as never, c.inputs) }));
        setOpenId(c.id);
        setName(c.name);
        setNaming(false);
        setErrors({});
        setLoaded(JSON.stringify(withDefaults(DEFAULTS[c.kind] as never, c.inputs)));
    }

    // Opened from a goal ("Open in Retirement calculator") or from a link to a saved one.
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem('pocfin-calc-prefill');
            sessionStorage.removeItem('pocfin-calc-prefill');
            if (raw) {
                const pre = JSON.parse(raw) as { kind: Kind; inputs: Partial<RetirementInputs> };
                setKind(pre.kind);
                setAll((a) => ({ ...a, retirement: { ...a.retirement, ...pre.inputs } }));
                setRmode(pre.inputs.raise_mode === 'amount' ? 'amount' : 'percent');
                return;
            }
        } catch {
            /* nothing carried over */
        }
        const c = p.open ? p.saved.find((s) => s.id === p.open) : undefined;
        if (c) load(c);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const current = all[kind];
    const dirty = openId !== null && JSON.stringify(current) !== loaded;
    const mine = useMemo(() => saved.filter((s) => s.kind === kind), [saved, kind]);

    function pick(k: Kind) {
        if (k === kind) return;
        setKind(k);
        setOpenId(null);
        setNaming(false);
        setErrors({});
    }

    async function save(asNew: boolean) {
        if (busy) return;
        const text = name.trim();
        if (!text) {
            setNaming(true);
            setErrors({ name: 'Give it a name so you can find it again.' });
            return;
        }
        setBusy(true);
        setErrors({});
        try {
            const inputs = current as unknown as Record<string, unknown>;
            const row = openId && !asNew ? await send<Saved>(csrf, 'PATCH', `/calculators/saved/${openId}`, { name: text, inputs }) : await send<Saved>(csrf, 'POST', '/calculators/saved', { kind, name: text, inputs });
            setSaved((s) => [row, ...s.filter((x) => x.id !== row.id)]);
            setOpenId(row.id);
            setLoaded(JSON.stringify(current));
            setNaming(false);
            toast({ text: `Saved for ${budgetName}` });
        } catch (e) {
            setErrors(e instanceof Refused ? e.errors : { form: 'That didn’t save.' });
        } finally {
            setBusy(false);
        }
    }

    async function remove(id: number) {
        setSure(null);
        try {
            await send(csrf, 'DELETE', `/calculators/saved/${id}`);
            setSaved((s) => s.filter((x) => x.id !== id));
            if (openId === id) {
                setOpenId(null);
                setNaming(false);
            }
            toast({ text: 'Deleted for everyone in this budget' });
        } catch (e) {
            toast({ text: e instanceof Refused ? e.message : 'That didn’t delete.' });
        }
    }

    function goal() {
        const pre = kind === 'retirement' ? retirementGoal(all.retirement) : kind === 'growth' ? growthGoal(all.growth) : null;
        if (!pre) return;
        try {
            sessionStorage.setItem(GOAL_PREFILL_KEY, JSON.stringify(pre));
        } catch {
            /* the form simply starts empty */
        }
        router.visit('/goals?new=1');
    }

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        void save(false);
    };

    // ---- Each calculator's inputs and answer ----
    let inputs: ReactNode;
    let answer: ReactNode;
    let canGoal = false;
    let assumptions: ReactNode = null;
    let how = 'An estimate, not financial advice.';

    if (kind === 'retirement') {
        const i = all.retirement;
        const up = (patch: Partial<RetirementInputs>) => set('retirement', patch);
        const r = retirement(i);
        const have = r.haveThen.expected;
        const reached = have >= r.targetThen;
        const lasts = r.lasts.expected;
        canGoal = true;
        inputs = (
            <>
                <NumField label="Your age" unit="age" value={i.age} onChange={(n) => up({ age: n })} min={18} max={80} narrow />
                <NumField label="Retire at" unit="age" value={i.retire_age} onChange={(n) => up({ retire_age: n })} min={40} max={80} narrow />
                <NumField
                    label="A month of spending then, in today’s money"
                    unit="R"
                    value={i.spending}
                    onChange={(n) => up({ spending: n })}
                    max={150000}
                    step={1000}
                    hint={p.prefill.spending_now ? `Your last few months averaged about ${rands(p.prefill.spending_now)}.` : undefined}
                />
                <NumField
                    label="Saved so far"
                    unit="R"
                    value={i.saved}
                    onChange={(n) => up({ saved: n })}
                    max={10000000}
                    step={10000}
                    hint={p.prefill.investments ? `Your ${p.prefill.investments.count === 1 ? 'investment account is' : 'investment accounts are'} worth ${rands(p.prefill.investments.value)}. Type any amount; the slider is for quick changes.` : 'Type any amount; the slider is for quick changes.'}
                />
                <NumField label="Put in each month" unit="R" value={i.monthly} onChange={(n) => up({ monthly: n })} max={50000} step={250} />
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[13.5px] font-bold text-slate">Raise it each year by</span>
                        <div className="w-[150px]">
                            <Segmented
                                label="Yearly raise as"
                                value={rmode}
                                onChange={(m) => {
                                    setRmode(m);
                                    up({ raise_mode: m });
                                }}
                                options={[
                                    ['percent', '%'],
                                    ['amount', 'R'],
                                ]}
                            />
                        </div>
                    </div>
                    {i.raise_mode === 'amount' ? <NumField label="Each year, add" unit="R" value={i.raise_amount} onChange={(n) => up({ raise_amount: n })} max={5000} step={50} /> : <NumField label="Each year, raise it by" unit="%" value={i.raise} onChange={(n) => up({ raise: n })} max={15} step={0.5} narrow />}
                </div>
            </>
        );
        assumptions = (
            <>
                <Segmented
                    label="What you need"
                    value={i.target}
                    onChange={(t) => up({ target: t })}
                    options={[
                        ['25x', '25× a year’s spending'],
                        ['15x', '15× a year’s spending'],
                    ]}
                />
                <NumField label="Growth a year, before inflation" unit="%" value={i.growth} onChange={(n) => up({ growth: n })} max={20} step={0.5} narrow />
                <NumField label="Ups and downs, either side" unit="%" value={i.spread} onChange={(n) => up({ spread: n })} max={6} step={0.5} narrow />
                <NumField label="Inflation" unit="%" value={i.inflation} onChange={(n) => up({ inflation: n })} max={15} step={0.5} narrow />
                <NumField label="Growth after you retire" unit="%" value={i.growth_after} onChange={(n) => up({ growth_after: n })} max={15} step={0.5} narrow />
                <button type="button" onClick={() => up({ ...RETIREMENT_ASSUMPTIONS, growth_after: RETIREMENT_DEFAULTS.growth_after })} className="self-start text-[13.5px] font-extrabold text-teal underline-offset-2 hover:underline">
                    Reset to the usual guesses
                </button>
            </>
        );
        how = `Growth is before inflation; the shaded band is ${i.spread}% lower or higher. Amounts at ${i.retire_age} are in the rands of that year, because that’s the number your statement will show. Today’s money is there to compare.`;
        const lines: Line[] = [{ points: r.seriesThen.expected, tone: 'navy' }];
        answer = (
            <>
                <Answer lead={`You’d have about this at ${i.retire_age}`} big={randsShort(have)} sub={`About ${randsShort(r.have.expected)} in today’s money`} />
                <div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-segment">
                        <div className={`h-full rounded-full transition-[width] duration-300 ${reached ? 'bg-mint' : 'bg-amber'}`} style={{ width: `${Math.round(r.progress * 100)}%` }} />
                    </div>
                    <div className="mt-2 flex justify-between text-[13px] font-bold text-slate">
                        <span>{Math.round(r.progress * 100)}% of what you need</span>
                        <span className="num">Need {randsShort(r.targetThen)}</span>
                    </div>
                </div>
                <CalcChart
                    lines={lines}
                    band={{ low: r.seriesThen.low, high: r.seriesThen.high }}
                    target={r.targetThen}
                    targetLabel="What you need"
                    xStart={`Age ${i.age}`}
                    xEnd={`Age ${i.age + r.years}`}
                    aria={`Your money growing to age ${i.retire_age} against what you need`}
                    legend={[
                        { text: 'Your money', swatch: 'navy' },
                        { text: 'Normal ups and downs', swatch: 'band' },
                        { text: 'What you need', swatch: 'amber' },
                    ]}
                />
                <div>
                    <Fact k="What you need" v={`${randsShort(r.targetThen)} (${i.target === '15x' ? 15 : 25} × a year’s spending)`} />
                    <Fact k="In today’s money" v={randsShort(r.target)} />
                    <Fact k={`At ${rands(i.spending)} a month, it lasts until`} v={lasts ? `age ${Math.floor(lasts)}` : 'past 100'} tone={lasts && lasts < 90 ? 'amber' : 'ink'} />
                    {reached ? <Fact k="You’re on course" v={`With ${randsShort(have - r.targetThen)} to spare`} tone="teal" /> : <Fact k="To get there, put in more each month" v={r.extraMonthly === null ? 'More than a month can hold' : `${rands(r.extraMonthly)} more`} tone="amber" />}
                    {!reached && r.ageNeeded ? <Fact k="Or retire at" v={`age ${r.ageNeeded}`} /> : null}
                    {!reached && r.raiseNeeded ? <Fact k="Or raise it each year by" v={`${r.raiseNeeded.toFixed(1)}%`} /> : null}
                </div>
            </>
        );
    } else if (kind === 'growth') {
        const i = all.growth;
        const up = (patch: Partial<GrowthInputs>) => set('growth', patch);
        const g = growth(i);
        const months = g.months ?? 1200;
        const series = savedByYear(i.saved, g.monthly, i.growth, months);
        canGoal = growthGoal(i) !== null;
        inputs = (
            <>
                <Segmented
                    label="What to work out"
                    value={i.mode}
                    onChange={(m) => up({ mode: m })}
                    options={[
                        ['grow', 'What I’d have'],
                        ['monthly', 'Monthly needed'],
                        ['howlong', 'How long'],
                    ]}
                />
                <NumField label="Starting with" unit="R" value={i.saved} onChange={(n) => up({ saved: n })} max={2000000} step={1000} />
                {i.mode !== 'monthly' ? <NumField label="Each month" unit="R" value={i.monthly} onChange={(n) => up({ monthly: n })} max={50000} step={100} /> : null}
                {i.mode !== 'howlong' ? <NumField label="For" unit="years" value={i.years} onChange={(n) => up({ years: n })} min={1} max={50} narrow /> : null}
                {i.mode !== 'grow' ? <NumField label="Aiming for" unit="R" value={i.target} onChange={(n) => up({ target: n })} max={10000000} step={10000} /> : null}
                {i.mode !== 'grow' ? (
                    <div className="flex flex-col gap-1.5">
                        <span className="text-[13.5px] font-bold text-slate">That amount is</span>
                        <Segmented
                            label="That amount is"
                            value={i.target_basis}
                            onChange={(b) => up({ target_basis: b })}
                            options={[
                                ['then', 'In the rands of that day'],
                                ['today', 'What it buys today'],
                            ]}
                        />
                    </div>
                ) : null}
                <NumField label="Growth a year" unit="%" value={i.growth} onChange={(n) => up({ growth: n })} max={20} step={0.5} narrow />
            </>
        );
        assumptions = (
            <>
                <NumField label="Inflation" unit="%" value={i.inflation} onChange={(n) => up({ inflation: n })} max={15} step={0.5} narrow />
                <button type="button" onClick={() => up({ inflation: GROWTH_DEFAULTS.inflation })} className="self-start text-[13.5px] font-extrabold text-teal underline-offset-2 hover:underline">
                    Reset to the usual guess
                </button>
            </>
        );
        how = 'Growth is before inflation. Today’s money shows what the amount would buy now.';
        const lead = i.mode === 'grow' ? `In ${duration(months)} you’d have` : i.mode === 'monthly' ? `To reach ${randsShort(g.end)} in ${duration(months)}, put in` : `Putting in ${rands(i.monthly)} a month, you’d reach ${randsShort(g.end)} in`;
        const big = i.mode === 'grow' ? randsShort(g.end) : i.mode === 'monthly' ? `${rands(g.monthly)} a month` : g.months === null ? 'over 100 years' : duration(g.months);
        answer = (
            <>
                <Answer lead={lead} big={big} sub={`${rands(g.putIn + i.saved)} put in, ${rands(Math.max(0, g.growth))} growth, at ${i.growth}% a year`} />
                <SplitBar
                    parts={[
                        ...(i.saved > 0 ? [{ label: 'Started with', value: i.saved, tone: 'soft' as const }] : []),
                        { label: 'Put in', value: g.putIn, tone: 'navy' },
                        { label: 'Growth', value: Math.max(0, g.growth), tone: 'mint' },
                    ]}
                />
                <CalcChart
                    lines={[{ points: series, tone: 'navy' }]}
                    target={i.mode === 'grow' ? undefined : g.end}
                    targetLabel="Aiming for"
                    xStart="Now"
                    xEnd={duration(months)}
                    aria={`Savings growing over ${duration(months)}`}
                    legend={[{ text: 'Your savings', swatch: 'navy' }, ...(i.mode === 'grow' ? [] : [{ text: 'Aiming for', swatch: 'amber' as const }])]}
                />
                <div>
                    <Fact k="Worth about in today’s money" v={randsShort(g.endToday)} />
                    <Fact k="Each month" v={rands(g.monthly)} />
                    <Fact k="Put in altogether" v={rands(g.putIn)} />
                </div>
            </>
        );
    } else if (kind === 'home_loan') {
        const i = all.home_loan;
        const up = (patch: Partial<HomeLoanInputs>) => set('home_loan', patch);
        const r = homeLoan(i);
        const n = Math.max(1, Math.round(i.years * 12));
        const base = owedByYear(r.bond, i.rate, r.payment, 0, n);
        const withX = i.extra > 0 ? owedByYear(r.bond, i.rate, r.payment, i.extra, n) : null;
        const pad = (a: number[], len: number) => [...a, ...Array(Math.max(0, len - a.length)).fill(0)];
        inputs = (
            <>
                <NumField label="Price of the home" unit="R" value={i.loan} onChange={(v) => up({ loan: v })} min={0} max={15000000} step={50000} />
                <NumField label="Deposit" unit="R" value={i.deposit} onChange={(v) => up({ deposit: v })} max={5000000} step={10000} />
                <NumField label="Interest rate" unit="%" value={i.rate} onChange={(v) => up({ rate: v })} min={1} max={20} step={0.25} narrow />
                <NumField label="Over" unit="years" value={i.years} onChange={(v) => up({ years: v })} min={1} max={30} narrow />
                <NumField label="Extra each month" unit="R" value={i.extra} onChange={(v) => up({ extra: v })} max={50000} step={250} />
                <NumField label="Try another rate" unit="%" value={i.testRate} onChange={(v) => up({ testRate: v })} max={20} step={0.25} narrow hint="Leave at 0 to skip." />
            </>
        );
        how = 'A fixed rate for the whole term, paid monthly. Your bank adds fees and its rate moves with prime, so treat this as a guide.';
        answer = (
            <>
                <Answer lead={`Each month, on a ${rands(r.bond)} loan`} big={rands(r.payment)} sub={`Interest over ${i.years} years: ${rands(r.interest)}`} />
                <SplitBar
                    parts={[
                        { label: 'Loan', value: r.bond, tone: 'navy' },
                        { label: 'Interest', value: Math.max(0, r.interest), tone: 'soft' },
                    ]}
                />
                <CalcChart
                    lines={[{ points: base, tone: 'navy' }, ...(withX ? [{ points: pad(withX, base.length), tone: 'mint' as const }] : [])]}
                    xStart="Now"
                    xEnd={`${i.years} years`}
                    aria="What you still owe each year, with and without the extra"
                    legend={[{ text: 'Still owed', swatch: 'navy' }, ...(withX ? [{ text: `With ${rands(i.extra)} extra`, swatch: 'mint' as const }] : [])]}
                />
                <div>
                    {i.extra > 0 ? <Fact k={`Extra ${rands(i.extra)} a month saves`} v={`${rands(r.interestSaved)} interest`} tone="teal" /> : <Fact k="Pay a little extra each month" v="Type an amount to see what it saves" />}
                    {i.extra > 0 ? <Fact k="Paid off" v={r.monthsSooner > 0 ? `${duration(r.monthsSooner)} sooner` : 'No sooner'} tone="teal" /> : null}
                    <Fact k="Altogether you pay" v={rands(r.total)} />
                    {r.test ? <Fact k={`At ${r.test.rate.toFixed(2)}%`} v={`${rands(r.test.payment)} a month (${r.test.difference >= 0 ? '+' : '−'}${rands(Math.abs(r.test.difference)).replace('−', '')})`} tone={r.test.difference > 0 ? 'amber' : 'teal'} /> : null}
                </div>
            </>
        );
    } else {
        const i = all.car_loan;
        const up = (patch: Partial<CarLoanInputs>) => set('car_loan', patch);
        const r = carLoan(i);
        const n = Math.max(1, Math.round(i.months));
        const owed = owedByYear(r.financed, i.rate, r.payment, 0, n, 6);
        inputs = (
            <>
                <NumField label="Price of the car" unit="R" value={i.price} onChange={(v) => up({ price: v })} max={3000000} step={5000} />
                <NumField label="Deposit" unit="R" value={i.deposit} onChange={(v) => up({ deposit: v })} max={1000000} step={5000} />
                <NumField label="Interest rate" unit="%" value={i.rate} onChange={(v) => up({ rate: v })} min={1} max={25} step={0.25} narrow />
                <NumField label="Over" unit="months" value={i.months} onChange={(v) => up({ months: v })} min={6} max={96} step={6} narrow />
                <NumField label="Balloon at the end" unit="%" value={i.balloon} onChange={(v) => up({ balloon: v })} max={40} step={5} narrow hint={`${rands(r.balloonAmount)} owed at the end`} />
                <NumField label="Try another rate" unit="%" value={i.testRate} onChange={(v) => up({ testRate: v })} max={25} step={0.25} narrow hint="Leave at 0 to skip." />
            </>
        );
        how = 'A fixed rate, paid monthly, with the balloon owed in one go at the end.';
        answer = (
            <>
                <Answer lead="Each month" big={rands(r.payment)} sub={`Then ${rands(r.balloonAmount)} due at the end`} />
                <SplitBar
                    parts={[
                        { label: 'Financed', value: r.financed, tone: 'navy' },
                        { label: 'Interest', value: Math.max(0, r.interest), tone: 'soft' },
                    ]}
                />
                <CalcChart
                    lines={[{ points: owed, tone: 'navy' }]}
                    target={r.balloonAmount}
                    targetLabel="Balloon"
                    xStart="Now"
                    xEnd={`${n} months`}
                    aria="What you still owe, down to the balloon"
                    legend={[{ text: 'Still owed', swatch: 'navy' }, ...(r.balloonAmount > 0 ? [{ text: 'Balloon', swatch: 'amber' as const }] : [])]}
                />
                <div>
                    <Fact k="Interest" v={rands(r.interest)} />
                    <Fact k="Altogether you pay" v={rands(r.total)} />
                    {i.balloon > 0 ? <Fact k="Without a balloon" v={`${rands(repayment(r.financed, i.rate, n))} a month`} /> : null}
                    {r.test ? <Fact k={`At ${r.test.rate.toFixed(2)}%`} v={`${rands(r.test.payment)} a month (${r.test.difference >= 0 ? '+' : '−'}${rands(Math.abs(r.test.difference)).replace('−', '')})`} tone={r.test.difference > 0 ? 'amber' : 'teal'} /> : null}
                </div>
            </>
        );
    }

    const when = (s: Saved) => dayLabel(s.updated_at.slice(0, 10));
    const field = 'h-11 w-full rounded-xl border border-line bg-canvas px-3 text-[15px] font-bold text-ink outline-none focus:border-mint';

    return (
        <>
            <Head title="Calculators" />
            <div className="flex flex-col gap-5">
                <div>
                    <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.02em]">Calculators</h1>
                    <p className="mt-0.5 text-[15px] text-slate">Estimates that update as you change things. Nothing here is booked.</p>
                </div>

                <div role="tablist" aria-label="Calculator" className="flex flex-wrap gap-1 rounded-2xl bg-segment p-1 sm:self-start">
                    {KINDS.map((k) => (
                        <button key={k.key} type="button" role="tab" aria-selected={kind === k.key} onClick={() => pick(k.key)} className={`flex h-10 items-center gap-2 rounded-xl px-4 text-[14.5px] font-extrabold transition-colors ${kind === k.key ? 'bg-card text-teal shadow-sm' : 'text-slate hover:text-ink'}`}>
                            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d={k.icon} />
                            </svg>
                            {k.label}
                        </button>
                    ))}
                </div>

                <div className="grid items-start gap-5 lg:grid-cols-[minmax(340px,420px)_minmax(0,1fr)]">
                    <div className="flex flex-col gap-5">
                        <Card className="flex flex-col gap-4">
                            <h2 className="text-[19px] font-extrabold">{LABEL[kind]}</h2>
                            {inputs}
                            {assumptions ? (
                                <details className="group rounded-2xl bg-canvas p-4 open:pb-5">
                                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[14px] font-extrabold">
                                        <span>{kind === 'retirement' ? `Growth ${all.retirement.growth}%, inflation ${all.retirement.inflation}%: change these` : `Inflation ${all.growth.inflation}% for today’s money: change it`}</span>
                                        <span className="text-slate transition-transform group-open:rotate-90">
                                            <Icon name="chevronRight" size={16} />
                                        </span>
                                    </summary>
                                    <div className="mt-4 flex flex-col gap-4">
                                        {assumptions}
                                        <p className="text-[12.5px] leading-snug text-slate">{how}</p>
                                    </div>
                                </details>
                            ) : (
                                <p className="text-[12.5px] leading-snug text-slate">{how}</p>
                            )}
                        </Card>
                    </div>

                    <div className="flex min-w-0 flex-col gap-5">
                        <Card className="flex flex-col gap-5">
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.div key={kind} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex flex-col gap-5">
                                    {answer}
                                </motion.div>
                            </AnimatePresence>

                            <form onSubmit={onSubmit} className="flex flex-col gap-3 border-t border-rule pt-4">
                                {naming || openId ? (
                                    <div className="flex flex-col gap-1.5">
                                        <label htmlFor="calc-name" className="text-[13.5px] font-bold text-slate">
                                            Name
                                        </label>
                                        <input id="calc-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={kind === 'retirement' ? 'Retire at 65' : kind === 'home_loan' ? 'Parkhurst house' : 'A name for this'} className={field} autoFocus={naming && !openId} />
                                        {errors.name ? <span className="text-[13px] font-bold text-red">{errors.name}</span> : null}
                                    </div>
                                ) : null}
                                {errors.form ? <span className="text-[13px] font-bold text-red">{errors.form}</span> : null}
                                {errors.inputs ? <span className="text-[13px] font-bold text-red">{errors.inputs}</span> : null}
                                <div className="flex flex-wrap items-center gap-2">
                                    {openId ? (
                                        <>
                                            <button type="submit" disabled={busy || (!dirty && name.trim() === (saved.find((s) => s.id === openId)?.name ?? ''))} className="h-11 rounded-[14px] bg-mint px-4 text-[15px] font-extrabold text-on-mint transition-transform active:scale-[0.97] disabled:opacity-40">
                                                {dirty || name.trim() !== (saved.find((s) => s.id === openId)?.name ?? '') ? 'Save changes' : '✓ Saved'}
                                            </button>
                                            <button type="button" disabled={busy} onClick={() => void save(true)} className="h-11 rounded-[14px] bg-segment px-4 text-[15px] font-extrabold transition-transform active:scale-[0.97]">
                                                Save as new
                                            </button>
                                        </>
                                    ) : naming ? (
                                        <>
                                            <button type="submit" disabled={busy} className="h-11 rounded-[14px] bg-mint px-4 text-[15px] font-extrabold text-on-mint transition-transform active:scale-[0.97]">
                                                Save for {budgetName}
                                            </button>
                                            <button type="button" onClick={() => setNaming(false)} className="h-11 rounded-[14px] px-3 text-[15px] font-extrabold text-slate">
                                                Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <button type="button" onClick={() => setNaming(true)} className="h-11 rounded-[14px] bg-mint px-4 text-[15px] font-extrabold text-on-mint transition-transform active:scale-[0.97]">
                                            Save
                                        </button>
                                    )}
                                    {canGoal ? (
                                        <button type="button" onClick={goal} className="flex h-11 items-center gap-2 rounded-[14px] bg-segment px-4 text-[15px] font-extrabold transition-transform active:scale-[0.97]">
                                            <Icon name="goals" size={16} />
                                            Make this a goal
                                        </button>
                                    ) : null}
                                </div>
                                <p className="text-[12.5px] text-slate">Saved calculations are shared with everyone in {budgetName}, and open on the phone too. Only your figures are saved, never a result.</p>
                            </form>
                        </Card>

                        {saved.length ? (
                            <Card>
                                <h2 className="text-[17px] font-extrabold">Saved in {budgetName}</h2>
                                <ul className="mt-2 flex flex-col">
                                    {[...mine, ...saved.filter((s) => s.kind !== kind)].map((s) => (
                                        <li key={s.id} className="flex items-center gap-2 border-t border-rule first:border-t-0">
                                            <button type="button" onClick={() => load(s)} aria-current={openId === s.id ? 'true' : undefined} className="flex min-w-0 flex-1 flex-col gap-0.5 py-3 text-left">
                                                <span className={`truncate text-[15px] font-extrabold ${openId === s.id ? 'text-teal' : ''}`}>{s.name}</span>
                                                <span className="truncate text-[13px] text-slate">
                                                    {LABEL[s.kind]} · {s.updated_by ?? s.author ?? 'A former member'} · {when(s)}
                                                </span>
                                            </button>
                                            {sure === s.id ? (
                                                <>
                                                    <button type="button" onClick={() => void remove(s.id)} className="h-9 rounded-xl bg-red-tint px-3 text-[13px] font-extrabold text-red-ink">
                                                        Delete for everyone
                                                    </button>
                                                    <button type="button" onClick={() => setSure(null)} className="h-9 px-2 text-[13px] font-extrabold text-slate">
                                                        Keep
                                                    </button>
                                                </>
                                            ) : (
                                                <button type="button" aria-label={`Delete ${s.name}`} onClick={() => setSure(s.id)} className="flex size-9 items-center justify-center rounded-xl text-slate hover:bg-segment">
                                                    <Icon name="trash" size={17} />
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                        ) : null}
                    </div>
                </div>
            </div>
        </>
    );
}

Calculators.layout = (page: ReactNode) => (
    <Shell active="calculators" title="Calculators">
        {page}
    </Shell>
);
