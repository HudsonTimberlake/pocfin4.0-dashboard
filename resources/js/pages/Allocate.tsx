import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import HelpButton from '@/components/HelpButton';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import EnvelopeIcon from '@/components/EnvelopeIcon';
import Icon from '@/components/Icon';
import Money from '@/components/Money';
import Shell from '@/components/Shell';
import { cleanTyped, toAmount } from '@/lib/amount';
import { useApp } from '@/lib/app';
import { dayLabel, formatMoney, isNegative, toCents } from '@/lib/format';
import { ARRIVE } from '@/lib/motion';
import { budgetedHint, type FillMode } from '@/shared/fillHint';
import { fromCents, subtractForHint } from '@/shared/money';
import type { Envelope, Shared } from '@/types';

type Deposit = { id: number; amount: string; allocated: string; unallocated: string; date: string; note: string | null };
type Account = { id: number; name: string; type: string; balance: string };
type Goal = { id: number; name: string; account_id: number | null; purpose_id: number | null; left: string };

type Props = {
    deposit: Deposit | null;
    waiting: Deposit[];
    unallocated: string;
    envelopes: Envelope[];
    accounts: Account[];
    goals: Goal[];
    fill_mode: FillMode;
    envelope: number | null;
};

type Line = { key: string; kind: 'envelope' | 'account'; id: number; name: string; amount: string };

// Staged lines per income, kept while the dashboard is open (as the phone keeps them in memory),
// so leaving Allocate and coming back finds them still there. Nothing is sent until Allocate.
const drafts = new Map<number, Line[]>();

const keyOf = (kind: Line['kind'], id: number) => `${kind[0]}${id}`;
const total = (lines: Line[]) => fromCents(lines.reduce((t, l) => t + toCents(l.amount), 0n));
const min = (a: string, b: string) => (toCents(a) < toCents(b) ? a : b);
const positive = (a: string) => toCents(a) > 0n;
const incomeName = (d: Deposit) => d.note || 'Income';

const MODES: { value: FillMode; label: string; note: string }[] = [
    { value: 'top_up', label: 'Top up', note: 'Top up adds only what’s missing to reach each envelope’s monthly amount, in Budget order.' },
    { value: 'add', label: 'Add monthly amount', note: 'Adds each envelope’s monthly amount, even if it already holds money, in Budget order.' },
];

/**
 * W8 Allocate: "Where should this money go?" Left to allocate first, then Fill my envelopes (Top up
 * or Add monthly amount), envelopes short of their monthly amount with a + for the gap or Other, a
 * waiting goal, then full envelopes and accounts folded away. A "Ready to send" list with Undo and
 * Undo all; one Allocate sends it all (all or nothing), then the Allocated card (W8b).
 */
export default function Allocate(p: Props) {
    const { openAdd } = useApp();
    const { csrf } = usePage<Shared>().props;
    const reduced = useReducedMotion();
    const depositId = p.deposit?.id ?? 0;
    const [lines, setLinesState] = useState<Line[]>(() => drafts.get(depositId) ?? []);
    const [mode, setModeState] = useState<FillMode>(p.fill_mode);
    const [custom, setCustom] = useState<string | null>(null);
    const [typed, setTyped] = useState('');
    const [folded, setFolded] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<{ line: number | null; text: string } | null>(null);
    const [result, setResult] = useState<{ lines: Line[]; total: string; income: string } | null>(null);
    const opened = useRef(false);

    const setLines = (next: Line[]) => {
        drafts.set(depositId, next);
        setLinesState(next);
        setError(null);
    };
    // Another income: its own staged lines.
    useEffect(() => setLinesState(drafts.get(depositId) ?? []), [depositId]);

    const left = p.deposit?.unallocated ?? '0.00';
    const staged = total(lines);
    const after = subtractForHint(left, staged);
    const stagedOf = (key: string) => lines.find((l) => l.key === key)?.amount ?? '0.00';
    const gapOf = (e: Envelope) => {
        const g = subtractForHint(e.budgeted_amount, e.balance);
        return positive(g) ? g : '0.00';
    };
    const short = p.envelopes.filter((e) => positive(gapOf(e)));
    const full = p.envelopes.filter((e) => !positive(gapOf(e)));
    const byAccount = new Map(p.accounts.map((a) => [a.id, a]));

    /** Adds to what's staged for that place, never past what's left. */
    function stage(kind: Line['kind'], id: number, name: string, amount: string) {
        const amt = min(amount, after);
        if (!positive(amt)) return;
        const key = keyOf(kind, id);
        const found = lines.find((l) => l.key === key);
        setLines(found ? lines.map((l) => (l.key === key ? { ...l, amount: fromCents(toCents(l.amount) + toCents(amt)) } : l)) : [...lines, { key, kind, id, name, amount: amt }]);
    }
    const unstage = (key: string) => setLines(lines.filter((l) => l.key !== key));

    /** Every envelope top to bottom until the income runs out (the app's Fill, staged first). */
    function fill() {
        let remaining = after;
        const next = [...lines];
        for (const e of p.envelopes) {
            const key = keyOf('envelope', e.id);
            const i = next.findIndex((l) => l.key === key);
            // Top up counts what's already staged; Add monthly amount leaves a staged envelope alone.
            if (mode === 'add' && i >= 0) continue;
            const balance = i >= 0 ? fromCents(toCents(e.balance) + toCents(next[i].amount)) : e.balance;
            const gets = budgetedHint(mode, e.budgeted_amount, balance, remaining);
            if (!positive(gets)) continue;
            if (i >= 0) next[i] = { ...next[i], amount: fromCents(toCents(next[i].amount) + toCents(gets)) };
            else next.push({ key, kind: 'envelope', id: e.id, name: e.name, amount: gets });
            remaining = subtractForHint(remaining, gets);
        }
        setLines(next);
    }

    function setMode(m: FillMode) {
        setModeState(m);
        // Remembered per person, like the app: the next Allocate starts in the same mode.
        fetch('/allocate/mode', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrf, 'X-Requested-With': 'XMLHttpRequest' },
            body: JSON.stringify({ fill_mode: m }),
        }).catch(() => {});
    }

    function openCustom(key: string) {
        setCustom(custom === key ? null : key);
        setTyped('');
    }
    function stageCustom(ev: FormEvent, kind: Line['kind'], id: number, name: string) {
        ev.preventDefault();
        if (!positive(toAmount(typed))) return;
        stage(kind, id, name, toAmount(typed));
        setCustom(null);
    }

    // From an envelope's Allocate (Budget panel): its amount box open, and in view.
    useEffect(() => {
        if (opened.current || !p.envelope) return;
        opened.current = true;
        if (full.some((e) => e.id === p.envelope)) setFolded(false);
        setCustom(keyOf('envelope', p.envelope));
        window.setTimeout(() => document.getElementById(`row-e${p.envelope}`)?.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }), 80);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function send() {
        if (!p.deposit || !lines.length || sending) return;
        // Envelopes first, then accounts, as the app's Allocated screen lists them.
        const sent = { lines: [...lines.filter((l) => l.kind === 'envelope'), ...lines.filter((l) => l.kind === 'account')], total: staged, income: incomeName(p.deposit) };
        setSending(true);
        router.post(`/allocate/${p.deposit.id}`, { items: lines.map((l) => ({ [l.kind === 'envelope' ? 'envelope_id' : 'account_id']: l.id, amount: l.amount })) }, {
            preserveScroll: true,
            onSuccess: () => {
                setLines([]);
                setResult(sent);
            },
            onError: (er) => {
                const [field, text] = Object.entries(er as Record<string, string>)[0] ?? ['form', 'That didn’t work.'];
                const m = /^items\.(\d+)\./.exec(field);
                setError({ line: m ? Number(m[1]) : null, text });
            },
            onFinish: () => setSending(false),
        });
    }

    if (!p.deposit) {
        return (
            <>
                <Head title="Allocate" />
                <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5">
                    <Crumbs />
                    <div className="flex flex-col items-start gap-3 rounded-[24px] bg-card px-6 py-7">
                        <span className="grid size-11 place-items-center rounded-full bg-tint text-teal">
                            <Icon name="check" size={22} stroke={2.4} />
                        </span>
                        <h1 className="text-[22px] font-extrabold">It all has a place.</h1>
                        <p className="text-[15px] text-slate">Nothing is waiting to be allocated. When income comes in, add it and share it out here.</p>
                        <button type="button" onClick={() => openAdd({ tab: 'income' })} className="mt-1 h-11 rounded-[14px] bg-mint px-4 text-[15px] font-extrabold text-on-mint transition-transform active:scale-[0.97]">
                            Add income
                        </button>
                    </div>
                </div>
                <AllocatedCard result={result} deposit={null} onContinue={() => setResult(null)} />
            </>
        );
    }

    const d = p.deposit;
    const doneShare = toCents(d.amount) > 0n ? Number((toCents(d.allocated) * 10000n) / toCents(d.amount)) / 100 : 0;
    const stagedShare = toCents(d.amount) > 0n ? Number((toCents(staged) * 10000n) / toCents(d.amount)) / 100 : 0;
    const none = lines.length === 0;
    const errorFor = (l: Line) => (error && error.line !== null && lines[error.line]?.key === l.key ? error.text : null);

    const ready = (
        <section aria-labelledby="ready" className="flex flex-col gap-3 rounded-[24px] bg-card p-5">
            <div className="flex items-baseline justify-between">
                <h2 id="ready" className="text-[17px] font-extrabold">
                    Ready to send
                </h2>
                <button type="button" onClick={() => setLines([])} disabled={none} className="text-[14px] font-bold text-teal hover:underline disabled:text-muted disabled:no-underline">
                    Undo all
                </button>
            </div>
            {none ? <p className="text-[14px] text-slate">Nothing yet. Use Fill my envelopes or the + buttons.</p> : null}
            <ul className="flex flex-col">
                <AnimatePresence initial={false}>
                    {lines.map((l) => (
                        <motion.li
                            key={l.key}
                            layout={reduced ? false : 'position'}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0, transition: { duration: 0.18 } }}
                            className="overflow-hidden"
                        >
                            <div className="flex items-center gap-2 border-b border-line py-2.5">
                                <span className="min-w-0 flex-1 truncate text-[14.5px] font-bold">{l.name}</span>
                                <span className="num text-[14.5px] font-extrabold text-teal">+{formatMoney(l.amount)}</span>
                                <button type="button" onClick={() => unstage(l.key)} aria-label={`Undo ${l.name}`} className="grid size-7 place-items-center rounded-full text-slate hover:bg-canvas hover:text-ink">
                                    <Icon name="close" size={13} stroke={2.4} />
                                </button>
                            </div>
                            {errorFor(l) ? <p className="pb-2 text-[13px] font-bold text-red-ink">{errorFor(l)}</p> : null}
                        </motion.li>
                    ))}
                </AnimatePresence>
            </ul>
            {!none ? (
                <div className="flex justify-between text-[15px] font-extrabold">
                    <span>Total</span>
                    <span className="num">
                        <Money amount={staged} />
                    </span>
                </div>
            ) : null}
            {error && (error.line === null || !lines[error.line]) ? <p role="alert" className="rounded-xl bg-red-tint px-3 py-2.5 text-[14px] font-bold text-red-ink">{error.text}</p> : null}
            <button
                type="button"
                onClick={send}
                disabled={none || sending}
                className={`h-12 rounded-[14px] text-[15.5px] font-extrabold transition-transform active:scale-[0.98] ${none ? 'bg-segment text-muted' : 'bg-mint text-on-mint'}`}
            >
                {sending ? 'Allocating…' : none ? 'Allocate' : `Allocate ${formatMoney(staged)}`}
            </button>
            <p className="text-[12.5px] text-slate">Nothing is sent until you press Allocate. Once sent, an allocation can’t be taken back, only moved.</p>
        </section>
    );

    const amountBox = (kind: Line['kind'], id: number, name: string) => (
        <motion.form
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: ARRIVE }}
            onSubmit={(ev) => stageCustom(ev, kind, id, name)}
            onKeyDown={(ev) => ev.key === 'Escape' && setCustom(null)}
            className="flex flex-wrap items-center gap-2 pb-3 sm:pl-[50px]"
        >
            <span className="relative w-[160px]">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[15px] font-bold text-slate">R</span>
                <input autoFocus value={typed} onChange={(e) => setTyped(cleanTyped(e.target.value))} inputMode="decimal" placeholder="0.00" aria-label={`Amount for ${name}`} className="num h-10 w-full rounded-xl border border-line bg-card pr-3 pl-7 text-[15px] font-bold outline-none focus:border-mint" />
            </span>
            <button type="submit" disabled={!positive(toAmount(typed))} className="h-10 rounded-xl bg-mint px-3.5 text-[14px] font-extrabold text-on-mint disabled:opacity-60">
                Add
            </button>
            <span className="text-[12.5px] text-slate">Up to {formatMoney(after)}</span>
        </motion.form>
    );

    const plusButton = (label: string, onClick: () => void) => (
        <button
            type="button"
            onClick={onClick}
            disabled={!positive(after)}
            className="num flex h-9 items-center gap-1 rounded-xl bg-tint px-3 text-[14px] font-extrabold text-teal transition-transform active:scale-[0.97] disabled:bg-canvas disabled:text-muted"
        >
            <Icon name="plus" size={14} stroke={2.6} />
            {label}
        </button>
    );

    const stagedChip = (key: string) => (
        <span className="num flex h-9 items-center gap-1.5 rounded-xl bg-mint pr-1.5 pl-3 text-[14px] font-extrabold text-on-mint">
            +{formatMoney(stagedOf(key))}
            <button type="button" onClick={() => unstage(key)} aria-label="Undo" className="grid size-6 place-items-center rounded-full hover:bg-black/10">
                <Icon name="close" size={12} stroke={2.6} />
            </button>
        </span>
    );

    return (
        <>
            <Head title="Allocate" />
            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="flex min-w-0 flex-col gap-5">
                    <Crumbs />
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.02em]">Allocate income</h1>
                                <HelpButton topic="allocate" />
                            </div>
                            <p className="mt-0.5 text-[15px] text-slate">
                                {incomeName(d)} · {dayLabel(d.date)} · {formatMoney(d.amount)}
                            </p>
                        </div>
                        {p.waiting.length > 1 ? (
                            <label className="flex items-center gap-2 text-[13.5px] font-bold text-slate">
                                Income
                                <select
                                    value={d.id}
                                    onChange={(e) => router.get('/allocate', { deposit: e.target.value }, { preserveScroll: true })}
                                    className="h-10 rounded-xl border border-line bg-card px-3 text-[14.5px] font-bold text-ink outline-none focus:border-mint"
                                >
                                    {p.waiting.some((w) => w.id === d.id) ? null : <option value={d.id}>{incomeName(d)}, {dayLabel(d.date)}</option>}
                                    {p.waiting.map((w) => (
                                        <option key={w.id} value={w.id}>
                                            {incomeName(w)}, {dayLabel(w.date)} · {formatMoney(w.unallocated)} left
                                        </option>
                                    ))}
                                </select>
                            </label>
                        ) : null}
                    </div>

                    <section aria-label="Left to allocate" className="rounded-[24px] bg-card px-6 py-6">
                        <div className="text-[15px] font-bold text-slate">{none ? 'Left to allocate' : 'Left after this'}</div>
                        <div className={`mt-1 text-[44px] leading-[52px] font-extrabold tracking-[-0.04em] ${isNegative(after) ? 'text-red' : ''}`}>
                            <Money amount={after} />
                        </div>
                        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-tint" aria-hidden="true">
                            <motion.div className="h-full bg-navy-line" initial={reduced ? false : { width: 0 }} animate={{ width: `${doneShare}%` }} transition={{ duration: 0.5, ease: ARRIVE }} />
                            <motion.div className="h-full bg-mint" animate={{ width: `${stagedShare}%` }} transition={{ duration: 0.4, ease: ARRIVE }} />
                        </div>
                        <p className={`mt-2.5 text-[14px] ${none ? 'text-slate' : 'font-bold text-teal'}`}>
                            {none ? `${formatMoney(d.allocated)} of ${formatMoney(d.amount)} from ${incomeName(d)} already has a place` : `${formatMoney(staged)} ready to send · ${formatMoney(after)} will be left`}
                        </p>
                    </section>

                    <div className="xl:hidden">{ready}</div>

                    <section aria-labelledby="fill" className="flex flex-col gap-3 rounded-[24px] bg-card p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 id="fill" className="text-[17px] font-extrabold">
                                Fill my envelopes
                            </h2>
                            <div role="radiogroup" aria-label="How to fill" className="grid grid-cols-2 gap-1 rounded-xl bg-segment p-1">
                                {MODES.map((m) => (
                                    <button key={m.value} type="button" role="radio" aria-checked={mode === m.value} onClick={() => setMode(m.value)} className={`h-8 rounded-[10px] px-3 text-[13.5px] font-extrabold transition-colors ${mode === m.value ? 'bg-card text-ink' : 'text-slate'}`}>
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <p className="text-[13.5px] text-slate">{MODES.find((m) => m.value === mode)?.note}</p>
                        <button type="button" onClick={fill} disabled={!positive(after)} className="h-11 rounded-[14px] bg-canvas text-[15px] font-extrabold transition-transform hover:bg-segment active:scale-[0.98] disabled:text-muted">
                            Fill my envelopes
                        </button>
                    </section>

                    <section aria-labelledby="short" className="rounded-[24px] bg-card px-5 py-2">
                        <h2 id="short" className="pt-3 pb-1 text-[15px] font-extrabold">
                            Short of their monthly amount
                        </h2>
                        {short.length === 0 ? <p className="pb-3 text-[14px] text-slate">Every envelope has its monthly amount.</p> : null}
                        {short.map((e, i) => {
                            const key = keyOf('envelope', e.id);
                            const over = isNegative(e.balance);
                            const gap = subtractForHint(gapOf(e), stagedOf(key));
                            return (
                                <div key={e.id} id={`row-e${e.id}`} className={i ? 'border-t border-line' : ''}>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                                        <EnvelopeIcon name={e.name} icon={e.icon} over={over} size={38} bg="bg-canvas" />
                                        <span className="min-w-[150px] flex-1">
                                            <span className="flex items-center gap-2 text-[15px] font-bold">
                                                <span className="truncate">{e.name}</span>
                                                {e.kind === 'saving_up' ? <span className="rounded-md bg-navy-tint px-1.5 py-0.5 text-[11.5px] font-bold text-navy-text">Saving up</span> : null}
                                            </span>
                                            <span className={`block text-[13px] ${over ? 'text-red' : 'text-slate'}`}>
                                                {over ? `Over by ${formatMoney(e.balance.replace('-', ''))}` : `Has ${formatMoney(e.balance)}`} · {formatMoney(gapOf(e))} short of {formatMoney(e.budgeted_amount)}
                                            </span>
                                        </span>
                                        <span className="ml-auto flex items-center gap-2">
                                            {positive(stagedOf(key)) ? stagedChip(key) : null}
                                            <button type="button" onClick={() => openCustom(key)} aria-expanded={custom === key} className="h-9 rounded-xl px-2.5 text-[14px] font-bold text-teal hover:bg-canvas">
                                                Other
                                            </button>
                                            {positive(gap) ? plusButton(formatMoney(min(gap, positive(after) ? after : gap)), () => stage('envelope', e.id, e.name, gap)) : null}
                                        </span>
                                    </div>
                                    {custom === key ? amountBox('envelope', e.id, e.name) : null}
                                </div>
                            );
                        })}
                    </section>

                    {p.goals.length ? (
                        <section aria-label="Goals waiting" className="rounded-[24px] bg-card px-5 py-1">
                            {p.goals.map((g, i) => {
                                const acc = g.account_id ? byAccount.get(g.account_id) : undefined;
                                const key = acc ? keyOf('account', acc.id) : '';
                                return (
                                    <div key={g.id} className={`flex flex-wrap items-center gap-x-3 gap-y-2 py-3.5 ${i ? 'border-t border-line' : ''}`}>
                                        <span className="grid size-[38px] flex-none place-items-center rounded-full bg-navy-tint text-navy-text">
                                            <Icon name="goals" size={19} />
                                        </span>
                                        <span className="min-w-[150px] flex-1">
                                            <span className="block text-[15px] font-bold">{g.name} is waiting</span>
                                            <span className="block text-[13px] text-slate">
                                                Goal · {formatMoney(g.left)} {acc ? `into ${acc.name}` : 'into an investment, from the app for now'} this month
                                            </span>
                                        </span>
                                        {acc ? <span className="ml-auto">{positive(stagedOf(key)) ? stagedChip(key) : plusButton(formatMoney(g.left), () => stage('account', acc.id, acc.name === g.name ? acc.name : `${acc.name} · ${g.name}`, g.left))}</span> : null}
                                    </div>
                                );
                            })}
                        </section>
                    ) : null}

                    <section aria-label="Full envelopes and accounts" className="rounded-[24px] bg-card px-5">
                        <button type="button" onClick={() => setFolded((f) => !f)} aria-expanded={!folded} className="flex w-full items-center gap-2 py-4 text-left text-[14.5px] font-bold">
                            <span className="flex-1">
                                {full.length ? `${full.length} ${full.length === 1 ? 'envelope already has its' : 'envelopes already have their'} monthly amount` : 'Every envelope is short'}
                                {p.accounts.length ? ', and your accounts' : ''}
                            </span>
                            <motion.span animate={{ rotate: folded ? 0 : 90 }} className="text-slate">
                                <Icon name="chevronRight" size={16} stroke={2.4} />
                            </motion.span>
                        </button>
                        <AnimatePresence initial={false}>
                            {!folded ? (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: ARRIVE }} className="overflow-hidden">
                                    {[...full.map((e) => ({ kind: 'envelope' as const, id: e.id, name: e.name, sub: `Has ${formatMoney(e.balance)}`, icon: <EnvelopeIcon name={e.name} icon={e.icon} size={34} bg="bg-canvas" /> })),
                                      ...p.accounts.map((a) => ({ kind: 'account' as const, id: a.id, name: a.name, sub: `${a.type === 'savings' ? 'Savings' : 'Holding'} · ${formatMoney(a.balance)}`, icon: (
                                          <span className="grid size-[34px] flex-none place-items-center rounded-full bg-navy-tint text-navy-text">
                                              <Icon name="accounts" size={17} />
                                          </span>
                                      ) }))].map((r) => {
                                        const key = keyOf(r.kind, r.id);
                                        return (
                                            <div key={key} id={`row-${key}`} className="border-t border-line">
                                                <div className="flex items-center gap-3 py-2.5">
                                                    {r.icon}
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-[14.5px] font-bold">{r.name}</span>
                                                        <span className="block text-[12.5px] text-slate">{r.sub}</span>
                                                    </span>
                                                    {positive(stagedOf(key)) ? stagedChip(key) : null}
                                                    <button type="button" onClick={() => openCustom(key)} aria-expanded={custom === key} disabled={!positive(after)} className="h-9 rounded-xl px-2.5 text-[14px] font-bold text-teal hover:bg-canvas disabled:text-muted">
                                                        Choose an amount
                                                    </button>
                                                </div>
                                                {custom === key ? amountBox(r.kind, r.id, r.name) : null}
                                            </div>
                                        );
                                    })}
                                    <p className="border-t border-line py-3 text-[12.5px] text-slate">Investment accounts need a holding and its value, so they’re allocated from the app for now.</p>
                                </motion.div>
                            ) : null}
                        </AnimatePresence>
                    </section>
                </div>

                <aside className="sticky top-5 hidden xl:block">{ready}</aside>
            </div>
            <AllocatedCard result={result} deposit={d} onContinue={() => setResult(null)} />
        </>
    );
}

function Crumbs() {
    return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[14px] font-bold text-slate">
            <Link href="/budget" className="hover:text-ink hover:underline">
                Budget
            </Link>
            <Icon name="chevronRight" size={13} stroke={2.4} />
            <span className="text-ink">Allocate</span>
        </nav>
    );
}

/** W8b (the app's B7): a card over the page saying what went where and what's still ready. */
function AllocatedCard({ result, deposit, onContinue }: { result: { lines: Line[]; total: string; income: string } | null; deposit: Deposit | null; onContinue: () => void }) {
    const reduced = useReducedMotion();
    const more = deposit && toCents(deposit.unallocated) > 0n;
    useEffect(() => {
        if (!result) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onContinue();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [result, onContinue]);

    return (
        <AnimatePresence>
            {result ? (
                <motion.div key="allocated" className="fixed inset-0 z-50 grid place-items-center bg-scrim p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="allocated-title"
                        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.15 } }}
                        transition={{ duration: 0.32, ease: ARRIVE }}
                        className="flex w-full max-w-[420px] flex-col gap-4 rounded-[28px] bg-card p-6"
                    >
                        <span className="grid size-14 place-items-center self-center rounded-full bg-tint text-teal">
                            <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
                                <motion.path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.15 }} />
                            </svg>
                        </span>
                        <div className="text-center">
                            <h2 id="allocated-title" className="text-[24px] font-extrabold tracking-[-0.02em]">
                                {formatMoney(result.total)} allocated
                            </h2>
                            {!more ? <p className="mt-0.5 text-[15px] text-slate">It all has a place.</p> : null}
                        </div>
                        <ul className="flex max-h-[40vh] flex-col overflow-y-auto">
                            {result.lines.map((l, i) => (
                                <li key={l.key} className={`flex justify-between gap-3 py-2 text-[14.5px] ${i ? 'border-t border-line' : ''}`}>
                                    <span className="truncate font-bold">{l.name}</span>
                                    <span className="num font-extrabold text-teal">+{formatMoney(l.amount)}</span>
                                </li>
                            ))}
                        </ul>
                        {more && deposit ? (
                            <p className="rounded-xl bg-tint px-3.5 py-2.5 text-[14px] font-bold text-tint-sub">
                                {formatMoney(deposit.unallocated)} from {result.income} is still ready to allocate
                            </p>
                        ) : null}
                        <div className="flex gap-2">
                            {more ? (
                                <button type="button" autoFocus onClick={onContinue} className="h-11 flex-1 rounded-[14px] bg-mint text-[15px] font-extrabold text-on-mint transition-transform active:scale-[0.98]">
                                    Continue allocating
                                </button>
                            ) : null}
                            <button
                                type="button"
                                autoFocus={!more}
                                onClick={() => router.visit('/budget')}
                                className={`h-11 flex-1 rounded-[14px] text-[15px] font-extrabold transition-transform active:scale-[0.98] ${more ? 'bg-canvas' : 'bg-mint text-on-mint'}`}
                            >
                                Done
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}

Allocate.layout = (page: ReactNode) => (
    <Shell active="budget" title="Allocate">
        {page}
    </Shell>
);
