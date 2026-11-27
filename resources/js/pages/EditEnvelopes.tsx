import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import HelpButton from '@/components/HelpButton';
import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Icon from '@/components/Icon';
import Money from '@/components/Money';
import Shell from '@/components/Shell';
import { cleanTyped, toAmount } from '@/lib/amount';
import { useApp } from '@/lib/app';
import { formatMoney, toCents } from '@/lib/format';
import { ARRIVE } from '@/lib/motion';
import { fromCents } from '@/shared/money';
import type { Envelope } from '@/types';
import { homeSymbol } from '@/shared/currency';

type Kind = 'everyday' | 'saving_up';
type Plan = { id: number; name: string; amounts: Record<string, string> };
type Props = { monthly_income: string | null; can_change_income: boolean; envelopes: Envelope[]; plans: Plan[] };
type Row = { key: string; id: number | null; name: string; kind: Kind; amount: string };
type Sort = 'az' | 'high' | 'low';

const field = 'h-10 w-full rounded-xl border border-line bg-card px-3 text-[15px] font-bold text-ink outline-none transition-colors hover:border-line-strong focus:border-mint';
const SORTS: { key: Sort; label: string }[] = [
    { key: 'az', label: 'A to Z' },
    { key: 'high', label: 'Highest first' },
    { key: 'low', label: 'Lowest first' },
];

const rowsFrom = (envelopes: Envelope[]): Row[] => envelopes.map((e) => ({ key: String(e.id), id: e.id, name: e.name, kind: e.kind, amount: e.budgeted_amount }));
const cents = (typed: string) => toCents(toAmount(typed));
const sumOf = (rows: Row[]) => fromCents(rows.reduce((t, r) => t + cents(r.amount), 0n));
let tempSeq = 0;

/**
 * W9 Edit envelopes: "Does my plan fit my income?" Monthly income, budgeted each month and the
 * difference first; then sort, plans, and one table of names and monthly amounts (drag ⠿ or
 * ↑ ↓ to reorder). One Save sends it all, and the API saves all of it or none.
 */
export default function EditEnvelopes(p: Props) {
    const { toast } = useApp();
    const reduced = useReducedMotion();
    const base = useMemo(() => rowsFrom(p.envelopes), [p.envelopes]);
    const baseIncome = p.monthly_income ?? '';
    const [rows, setRows] = useState<Row[]>(base);
    const [income, setIncome] = useState(baseIncome);
    const [sort, setSort] = useState<Sort | null>(null);
    const [loaded, setLoaded] = useState<{ name: string; before: Row[] } | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [plansOpen, setPlansOpen] = useState(false);
    const [drag, setDrag] = useState<{ key: string | null; over: string | null }>({ key: null, over: null });
    const newRef = useRef<string | null>(null);

    // Fresh figures from the server (after Save) become the new starting point.
    useEffect(() => {
        setRows(rowsFrom(p.envelopes));
        setIncome(p.monthly_income ?? '');
    }, [p.envelopes, p.monthly_income]);

    const baseById = new Map(base.map((r) => [r.id, r]));
    const changedOf = (r: Row) => {
        const b = r.id !== null ? baseById.get(r.id) : undefined;
        if (!b) return null;
        const out: Record<string, string> = {};
        if (r.name.trim() !== b.name) out.name = r.name.trim();
        if (cents(r.amount) !== toCents(b.amount)) out.budgeted_amount = toAmount(r.amount);
        return Object.keys(out).length ? out : null;
    };
    const live = rows.filter((r) => r.id !== null || r.name.trim());
    const orderChanged = live.filter((r) => r.id !== null).map((r) => r.id).join(',') !== base.map((r) => r.id).join(',');
    const incomeChanged = p.can_change_income && cents(income) !== cents(baseIncome) ? true : false;
    const changes = rows.filter((r) => r.id === null && r.name.trim()).length + rows.filter((r) => changedOf(r)).length + (orderChanged ? 1 : 0) + (incomeChanged ? 1 : 0);
    const dirty = changes > 0;

    // Leaving with changes asks first (a link in the app, or closing the tab).
    useEffect(() => {
        if (!dirty || saving) return;
        const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener('beforeunload', onUnload);
        const off = router.on('before', (ev) => {
            const v = ev.detail.visit;
            if (v.method === 'get' && v.url.pathname !== '/budget/edit' && !window.confirm('Leave without saving your changes?')) return false;
        });
        return () => {
            window.removeEventListener('beforeunload', onUnload);
            off();
        };
    }, [dirty, saving]);

    const edit = (key: string, patch: Partial<Row>) => {
        setRows((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)));
        setSaved(false);
    };
    const change = (next: Row[]) => {
        setRows(next);
        setSaved(false);
    };

    function sortBy(k: Sort) {
        const sorted = [...rows].sort((a, b) => {
            if (k === 'az') return a.name.localeCompare(b.name);
            const d = cents(a.amount) - cents(b.amount);
            return (k === 'high' ? -1 : 1) * (d < 0n ? -1 : d > 0n ? 1 : 0);
        });
        setSort(k);
        change(sorted);
    }
    function moveBefore(from: string, to: string) {
        if (from === to) return;
        const moving = rows.find((r) => r.key === from);
        if (!moving) return;
        const rest = rows.filter((r) => r.key !== from);
        const at = rest.findIndex((r) => r.key === to) + (rows.findIndex((r) => r.key === from) < rows.findIndex((r) => r.key === to) ? 1 : 0);
        rest.splice(at, 0, moving);
        setSort(null);
        change(rest);
    }
    function nudge(key: string, step: -1 | 1) {
        const i = rows.findIndex((r) => r.key === key);
        const other = rows[i + step];
        if (other) moveBefore(key, other.key);
    }
    function addRow() {
        const key = `t${++tempSeq}`;
        newRef.current = key;
        change([...rows, { key, id: null, name: '', kind: 'everyday', amount: '' }]);
    }

    function loadPlan(plan: Plan) {
        setLoaded({ name: plan.name, before: rows });
        // Envelopes the plan doesn't know start at R0.00; new rows keep what was typed.
        change(rows.map((r) => (r.id === null ? r : { ...r, amount: plan.amounts[String(r.id)] ?? '0.00' })));
        setPlansOpen(false);
    }

    function save() {
        if (!dirty || saving) return;
        // A kept envelope needs its name (a blank new row is simply left out).
        const blank = rows.filter((r) => r.id !== null && !r.name.trim());
        if (blank.length) {
            setErrors(Object.fromEntries(blank.map((r) => [`${r.key}.name`, 'Give it a name.'])));
            return;
        }
        const created = rows.filter((r) => r.id === null && r.name.trim());
        const updated = rows.filter((r) => changedOf(r));
        const createKeys = created.map((r) => r.key);
        const updateKeys = updated.map((r) => r.key);
        const body: Record<string, unknown> = {};
        if (created.length) body.create = created.map((r) => ({ name: r.name.trim(), budgeted_amount: toAmount(r.amount) }));
        if (updated.length) body.update = updated.map((r) => ({ id: r.id, ...changedOf(r) }));
        if (orderChanged || created.length) body.order = live.map((r) => (r.id !== null ? String(r.id) : `new:${createKeys.indexOf(r.key)}`));
        if (incomeChanged) body.monthly_income = income.trim() ? toAmount(income) : null;
        setSaving(true);
        router.post('/budget/edit', body as never, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setErrors({});
                setLoaded(null);
                setSort(null);
                setSaved(true);
            },
            onError: (er) => {
                // "update.1.budgeted_amount" → that row's amount.
                const mapped: Record<string, string> = {};
                for (const [k, v] of Object.entries(er as Record<string, string>)) {
                    const m = /^(create|update)\.(\d+)\.(\w+)$/.exec(k);
                    const key = m ? (m[1] === 'create' ? createKeys : updateKeys)[Number(m[2])] : null;
                    mapped[key ? `${key}.${m![3]}` : k] = v;
                }
                setErrors(mapped);
            },
            onFinish: () => setSaving(false),
        });
    }

    const budgeted = sumOf(rows);
    const hasIncome = cents(income) > 0n;
    const diff = fromCents(cents(income) - toCents(budgeted));
    const fit = !hasIncome
        ? null
        : toCents(diff) < 0n
          ? { label: 'More than comes in', amount: diff.replace('-', ''), tone: 'bg-amber-tint text-amber-ink' }
          : toCents(diff) === 0n
            ? { label: 'It all has a place', amount: '0.00', tone: 'bg-tint text-teal' }
            : { label: 'Not given a place yet', amount: diff, tone: 'bg-tint text-teal' };
    const looseErrors = Object.entries(errors).filter(([k]) => !/^t?\d+\./.test(k) && k !== 'monthly_income');

    return (
        <>
            <Head title="Edit envelopes" />
            <div className="mx-auto flex w-full max-w-[920px] flex-col gap-5 pb-24">
                <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[14px] font-bold text-slate">
                    <Link href="/budget" className="hover:text-ink hover:underline">
                        Budget
                    </Link>
                    <Icon name="chevronRight" size={13} stroke={2.4} />
                    <span className="text-ink">Edit envelopes</span>
                </nav>
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.02em]">Edit envelopes</h1>
                        <HelpButton topic="edit-envelopes" />
                    </div>
                    <p className="mt-0.5 text-[15px] text-slate">Set the order, names and monthly amounts in one place.</p>
                </div>

                <section aria-label="Does it fit" className="grid gap-3 rounded-[24px] bg-card p-5 sm:grid-cols-3 sm:items-end">
                    <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                        Monthly income
                        {p.can_change_income ? (
                            <span className="relative">
                                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[15px] font-bold text-slate">{homeSymbol()}</span>
                                <input value={income} onChange={(e) => { setIncome(cleanTyped(e.target.value)); setSaved(false); }} inputMode="decimal" placeholder="0.00" className={`${field} num h-11 pl-7 text-[17px]`} />
                            </span>
                        ) : (
                            <span className="num flex h-11 items-center text-[17px] font-extrabold text-ink">{hasIncome ? formatMoney(toAmount(income)) : 'Not set'}</span>
                        )}
                        {errors.monthly_income ? <span className="text-red-ink">{errors.monthly_income}</span> : null}
                        {!p.can_change_income ? <span className="font-semibold">Only the budget’s owner changes this.</span> : null}
                    </label>
                    <div className="flex flex-col gap-1 sm:px-2">
                        <span className="text-[13px] font-bold text-slate" title="All the envelopes’ monthly amounts added together">Monthly envelope budget total</span>
                        <span className="flex h-11 items-center text-[22px] font-extrabold">
                            <Money amount={budgeted} />
                        </span>
                    </div>
                    {fit ? (
                        <div className={`flex flex-col gap-0.5 rounded-2xl px-4 py-2.5 ${fit.tone}`}>
                            <span className="text-[13px] font-bold">{fit.label}</span>
                            <span className="text-[20px] font-extrabold">
                                <Money amount={fit.amount} />
                            </span>
                        </div>
                    ) : (
                        <p className="rounded-2xl bg-canvas px-4 py-3 text-[13.5px] text-slate">Add your monthly income to see whether your plan fits it.</p>
                    )}
                </section>

                <AnimatePresence>
                    {loaded ? (
                        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-3 rounded-[18px] bg-tint px-4 py-3 text-[14px] text-tint-sub">
                            <span className="flex-1">
                                Loaded the plan <b className="text-ink">“{loaded.name}”</b>. Envelopes made after this plan was saved aren’t in it, so their monthly amount is set to R0.00. Nothing is saved until you click Save changes.
                            </span>
                            <button type="button" onClick={() => { change(loaded.before); setLoaded(null); }} className="font-extrabold text-teal hover:underline">
                                Undo
                            </button>
                        </motion.div>
                    ) : null}
                </AnimatePresence>

                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[13.5px] font-bold text-slate">Sort</span>
                    <div role="radiogroup" aria-label="Sort" className="flex gap-1 rounded-xl bg-segment p-1">
                        {SORTS.map((s) => (
                            <button key={s.key} type="button" role="radio" aria-checked={sort === s.key} onClick={() => sortBy(s.key)} className={`h-8 rounded-[10px] px-3 text-[13.5px] font-extrabold transition-colors ${sort === s.key ? 'bg-card text-ink' : 'text-slate hover:text-ink'}`}>
                                {s.label}
                            </button>
                        ))}
                    </div>
                    <span className="flex-1" />
                    <div className="relative">
                        <button type="button" onClick={() => setPlansOpen((v) => !v)} aria-expanded={plansOpen} className="flex h-10 items-center gap-2 rounded-xl bg-card px-3.5 text-[14.5px] font-extrabold hover:bg-segment">
                            Plans
                            <Icon name="chevrons" size={14} stroke={2.2} />
                        </button>
                        <AnimatePresence>
                            {plansOpen ? <PlansMenu plans={p.plans} rows={rows} onLoad={loadPlan} onClose={() => setPlansOpen(false)} onSaved={(n) => toast({ text: `Saved the plan “${n}”` })} /> : null}
                        </AnimatePresence>
                    </div>
                </div>

                <div role="table" aria-label="Envelopes" className="@container overflow-hidden rounded-[24px] bg-card">
                    <div role="row" className="grid grid-cols-[minmax(0,1fr)_120px_32px] items-center gap-3 border-b border-line px-4 py-3 text-[12.5px] font-bold text-slate @lg:grid-cols-[22px_minmax(0,1fr)_170px_32px]">
                        <span className="hidden @lg:block" />
                        <span role="columnheader">Name</span>
                        <span role="columnheader">Monthly amount</span>
                        <span />
                    </div>
                    <AnimatePresence initial={false}>
                        {rows.map((r) => {
                            const isOver = drag.over === r.key && drag.key !== null && drag.key !== r.key;
                            const zero = cents(r.amount) === 0n;
                            const err = (f: string) => errors[`${r.key}.${f}`];
                            return (
                                <motion.div
                                    key={r.key}
                                    role="row"
                                    layout={reduced ? false : 'position'}
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0, transition: { duration: 0.18 } }}
                                    transition={{ duration: 0.22, ease: ARRIVE }}
                                    onDragOverCapture={(ev: DragEvent) => {
                                        ev.preventDefault();
                                        if (drag.over !== r.key) setDrag((d) => ({ ...d, over: r.key }));
                                    }}
                                    onDropCapture={(ev: DragEvent) => {
                                        ev.preventDefault();
                                        if (drag.key) moveBefore(drag.key, r.key);
                                        setDrag({ key: null, over: null });
                                    }}
                                    className={`group border-b border-line last:border-b-0 ${r.id === null ? 'bg-tint-soft' : ''} ${drag.key === r.key ? 'opacity-50' : ''}`}
                                    style={{ boxShadow: isOver ? 'inset 0 2px 0 var(--mint)' : undefined }}
                                >
                                    <div className="grid grid-cols-[minmax(0,1fr)_120px_32px] items-start gap-3 px-4 py-2.5 @lg:grid-cols-[22px_minmax(0,1fr)_170px_32px]">
                                        <button
                                            type="button"
                                            draggable
                                            onDragStart={(ev) => {
                                                ev.dataTransfer.effectAllowed = 'move';
                                                setDrag({ key: r.key, over: null });
                                            }}
                                            onDragEnd={() => setDrag({ key: null, over: null })}
                                            onKeyDown={(ev) => {
                                                if (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return;
                                                ev.preventDefault();
                                                nudge(r.key, ev.key === 'ArrowUp' ? -1 : 1);
                                            }}
                                            aria-label={`Move ${r.name || 'new envelope'}: press up or down`}
                                            className="hidden h-10 cursor-grab place-items-center rounded-lg text-muted opacity-40 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing @lg:grid"
                                        >
                                            <Icon name="grip" size={18} stroke={3} />
                                        </button>
                                        <div className="flex min-w-0 flex-col gap-1.5">
                                            <input
                                                autoFocus={newRef.current === r.key}
                                                value={r.name}
                                                onChange={(e) => edit(r.key, { name: e.target.value })}
                                                maxLength={100}
                                                placeholder="New envelope name"
                                                aria-label="Name"
                                                className={field}
                                            />
                                            {err('name') ? <span className="text-[12.5px] font-bold text-red-ink">{err('name')}</span> : null}
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="relative">
                                                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[15px] font-bold text-slate">{homeSymbol()}</span>
                                                <input
                                                    value={r.amount}
                                                    onChange={(e) => edit(r.key, { amount: cleanTyped(e.target.value) })}
                                                    inputMode="decimal"
                                                    placeholder="0.00"
                                                    aria-label={`Monthly amount for ${r.name || 'new envelope'}`}
                                                    className={`${field} num pl-7 text-right ${zero ? 'border-amber-line' : ''}`}
                                                />
                                            </span>
                                            {err('budgeted_amount') ? <span className="text-[12.5px] font-bold text-red-ink">{err('budgeted_amount')}</span> : null}
                                        </div>
                                        {r.id === null ? (
                                            <button type="button" onClick={() => change(rows.filter((x) => x.key !== r.key))} aria-label="Remove this new envelope" className="grid h-10 place-items-center rounded-lg text-slate hover:bg-canvas hover:text-ink">
                                                <Icon name="close" size={14} stroke={2.4} />
                                            </button>
                                        ) : (
                                            <span />
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                    <button type="button" onClick={addRow} className="flex h-12 w-full items-center gap-2 px-4 text-[14.5px] font-bold text-teal hover:bg-canvas">
                        <Icon name="plus" size={16} stroke={2.4} />
                        Add envelope
                    </button>
                </div>
                <p className="px-1 text-[13px] text-slate">Drag ⠿ (or press ↑ ↓ on it) to reorder. Fill my envelopes goes from the top down. To archive or delete one, open it on Budget.</p>
                {looseErrors.length ? (
                    <p role="alert" className="rounded-xl bg-red-tint px-3 py-2.5 text-[14px] font-bold text-red-ink">
                        {looseErrors.map(([, v]) => v).join(' ')}
                    </p>
                ) : null}
            </div>

            <div className="fixed inset-x-0 bottom-0 z-30 min-[860px]:left-[248px]">
                <div className="mx-auto flex max-w-[920px] items-center gap-3 px-4 pb-4">
                    <div className="flex flex-1 items-center gap-3 rounded-[20px] bg-toast px-4 py-3 text-[13.5px] font-bold text-white shadow-lg sm:text-[14.5px]">
                        <span className="flex-1">{saved && !dirty ? 'Saved. Budget shows the new amounts.' : dirty ? `${changes} ${changes === 1 ? 'change' : 'changes'} not saved yet` : 'No changes yet'}</span>
                        <Link href="/budget" className="hidden h-10 rounded-xl px-3 leading-10 text-white/80 hover:text-white sm:block">
                            {dirty ? 'Cancel' : 'Back to Budget'}
                        </Link>
                        <button
                            type="button"
                            onClick={save}
                            disabled={!dirty || saving}
                            className={`h-10 flex-none rounded-xl px-4 font-extrabold transition-transform active:scale-[0.97] ${dirty || saved ? 'bg-mint text-on-mint' : 'bg-white/15 text-white/60'}`}
                        >
                            {saving ? 'Saving…' : saved && !dirty ? '✓ Saved' : 'Save changes'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

/** Load a saved plan, save the current amounts as one, or delete one (the app's envelope plans). */
function PlansMenu({ plans, rows, onLoad, onClose, onSaved }: { plans: Plan[]; rows: Row[]; onLoad: (p: Plan) => void; onClose: () => void; onSaved: (name: string) => void }) {
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && onClose();
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        document.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            window.removeEventListener('keydown', onKey);
        };
    }, [onClose]);

    function savePlan(e: FormEvent) {
        e.preventDefault();
        if (!name.trim() || busy) return;
        const amounts: Record<string, string> = {};
        for (const r of rows) if (r.id !== null) amounts[String(r.id)] = toAmount(r.amount);
        setBusy(true);
        router.post('/budget/plans', { name: name.trim(), amounts }, {
            preserveScroll: true,
            preserveState: true,
            only: ['plans'],
            onSuccess: () => {
                onSaved(name.trim());
                setName('');
                setError(null);
            },
            onError: (er) => setError(Object.values(er)[0] ?? 'That didn’t work.'),
            onFinish: () => setBusy(false),
        });
    }

    const total = (pl: Plan) => fromCents(Object.values(pl.amounts).reduce((t, a) => t + toCents(a), 0n));

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
            className="absolute top-12 right-0 z-40 flex w-[min(340px,90vw)] flex-col gap-2 rounded-[20px] border border-line bg-card p-3 shadow-xl"
        >
            {plans.length === 0 ? <p className="px-1 py-1 text-[13.5px] text-slate">No plans yet. Save these amounts as one to switch back to them later.</p> : null}
            {plans.map((pl) => (
                <div key={pl.id} className="flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-canvas">
                    <button type="button" onClick={() => onLoad(pl)} className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-[14.5px] font-bold">Load “{pl.name}”</span>
                        <span className="num block text-[12.5px] text-slate">{formatMoney(total(pl))} a month</span>
                    </button>
                    <button
                        type="button"
                        aria-label={`Delete the plan ${pl.name}`}
                        onClick={() => {
                            if (window.confirm(`Delete “${pl.name}”? Your envelopes and their amounts stay as they are.`)) router.delete(`/budget/plans/${pl.id}`, { preserveScroll: true, preserveState: true, only: ['plans'] });
                        }}
                        className="grid size-8 place-items-center rounded-lg text-slate hover:bg-segment hover:text-red"
                    >
                        <Icon name="trash" size={15} stroke={2} />
                    </button>
                </div>
            ))}
            <form onSubmit={savePlan} className="flex flex-col gap-1.5 border-t border-line pt-3">
                <span className="text-[12.5px] font-bold text-slate">Save these amounts as a plan</span>
                <div className="flex gap-2">
                    <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Plan name, like December" aria-label="Plan name" className={field} />
                    <button type="submit" disabled={!name.trim() || busy} className="h-10 flex-none rounded-xl bg-mint px-3.5 text-[14px] font-extrabold text-on-mint disabled:opacity-60">
                        Save
                    </button>
                </div>
                {error ? <span className="text-[12.5px] font-bold text-red-ink">{error}</span> : null}
            </form>
        </motion.div>
    );
}

EditEnvelopes.layout = (page: ReactNode) => (
    <Shell active="budget" title="Edit envelopes">
        {page}
    </Shell>
);
