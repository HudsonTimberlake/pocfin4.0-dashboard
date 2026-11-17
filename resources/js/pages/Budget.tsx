import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Bar from '@/components/Bar';
import EnvelopeIcon from '@/components/EnvelopeIcon';
import EnvelopePanel, { type Activity } from '@/components/EnvelopePanel';
import Icon from '@/components/Icon';
import Money from '@/components/Money';
import Shell from '@/components/Shell';
import { cleanTyped, toAmount } from '@/lib/amount';
import { useApp } from '@/lib/app';
import { dayLabel, formatMoney, isNegative, monthName, percent, toCents } from '@/lib/format';
import { ARRIVE } from '@/lib/motion';
import { fromCents } from '@/shared/money';
import type { BudgetEnvelope, Envelope } from '@/types';

type Kind = 'everyday' | 'saving_up';

type Props = {
    summary: { cycle: { start: string; end: string } | null; left_to_spend: string; unallocated: string };
    envelopes: BudgetEnvelope[];
    archived: Envelope[];
    left_from: { note: string | null; date: string } | null;
    open_id: number | null;
    activity: Activity[];
    shared: boolean;
};

const GROUPS: { kind: Kind; label: string; note: string }[] = [
    { kind: 'everyday', label: 'Everyday', note: 'spent through the month' },
    { kind: 'saving_up', label: 'Saving up', note: 'kept for later' },
];

const field = 'h-10 rounded-xl border border-line bg-card px-3 text-[15px] font-bold text-ink outline-none focus:border-mint';

const sum = (xs: string[]) => fromCents(xs.reduce((t, x) => t + toCents(x), 0n));
const firstError = (er: Record<string, string>) => Object.values(er)[0] ?? 'That didn’t work.';

/**
 * W6 Budget, editable: "Where does my money sit, and what's off?" One table (Everyday, then Saving
 * up) with Monthly, Allocated, Spent and Left. Click a monthly amount to change it, drag ⠿ (or
 * press ↑ ↓ on it) to reorder within a group, click a row to open the envelope beside the table
 * (W7), which then drops Allocated and Spent. Saves show at once and roll back if the server says no.
 */
export default function Budget(p: Props) {
    const { toast } = useApp();
    const reduced = useReducedMotion();
    const [order, setOrder] = useState(() => p.envelopes.map((e) => e.id));
    const [monthly, setMonthly] = useState<Record<number, string>>({});
    const [editing, setEditing] = useState<number | null>(null);
    const [draft, setDraft] = useState('');
    const [openId, setOpenId] = useState<number | null>(p.open_id);
    const [adding, setAdding] = useState<Kind | null>(null);
    const [drag, setDrag] = useState<{ id: number | null; over: number | null }>({ id: null, over: null });
    const [showArchived, setShowArchived] = useState(false);
    const [tick, setTick] = useState(false);
    const tickTimer = useRef<number | undefined>(undefined);

    // The server's order wins whenever new figures arrive (after any save).
    const serverOrder = p.envelopes.map((e) => e.id).join(',');
    useEffect(() => setOrder(serverOrder ? serverOrder.split(',').map(Number) : []), [serverOrder]);

    const byId = new Map(p.envelopes.map((e) => [e.id, e]));
    const rows = order.map((id) => byId.get(id)).filter((e): e is BudgetEnvelope => !!e);
    const open = openId !== null ? byId.get(openId) : undefined;
    const monthlyOf = (e: BudgetEnvelope) => monthly[e.id] ?? e.budgeted_amount;

    // A deleted or archived envelope closes its panel.
    useEffect(() => {
        if (openId !== null && !byId.has(openId)) setOpenId(null);
    });

    const saved = () => {
        setTick(true);
        window.clearTimeout(tickTimer.current);
        tickTimer.current = window.setTimeout(() => setTick(false), 1800);
    };

    function openEnvelope(id: number) {
        if (openId === id) return closePanel();
        setOpenId(id);
        setEditing(null);
        router.get('/budget', { envelope: id }, { only: ['open_id', 'activity'], preserveState: true, preserveScroll: true, replace: true });
    }

    function closePanel() {
        setOpenId(null);
        router.replace({ url: '/budget', preserveState: true, preserveScroll: true, props: (old) => ({ ...old, open_id: null, activity: [] }) });
    }

    useEffect(() => {
        if (openId === null) return;
        const onKey = (e: globalThis.KeyboardEvent) => {
            if (e.key !== 'Escape' || (e.target as HTMLElement).closest('input, textarea, select')) return;
            closePanel();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    // Inline monthly amount: shown at once, rolled back if the server refuses.
    function startEdit(e: BudgetEnvelope) {
        setEditing(e.id);
        setDraft(toCents(monthlyOf(e)) > 0n ? monthlyOf(e) : '');
    }
    function saveMonthly(e: BudgetEnvelope) {
        if (editing !== e.id) return;
        setEditing(null);
        const amount = toAmount(draft);
        if (amount === e.budgeted_amount) return;
        setMonthly((m) => ({ ...m, [e.id]: amount }));
        const clear = () => setMonthly(({ [e.id]: _, ...rest }) => rest);
        router.patch(`/envelopes/${e.id}`, { budgeted_amount: amount }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                clear();
                saved();
            },
            onError: (er) => {
                clear();
                toast({ text: firstError(er as Record<string, string>) });
            },
        });
    }

    // Reordering: within a group only; the API takes every id, archived ones too.
    function sendOrder(next: number[]) {
        const before = order;
        setOrder(next);
        router.put('/envelopes/order', { ids: [...next, ...p.archived.map((e) => e.id)] }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: saved,
            onError: (er) => {
                setOrder(before);
                toast({ text: firstError(er as Record<string, string>) });
            },
        });
    }
    function moveBefore(from: number, to: number) {
        const a = byId.get(from);
        const b = byId.get(to);
        if (!a || !b || from === to || a.kind !== b.kind) return;
        const next = order.filter((x) => x !== from);
        const at = next.indexOf(to) + (order.indexOf(from) < order.indexOf(to) ? 1 : 0);
        next.splice(at, 0, from);
        sendOrder(next);
    }
    function nudge(e: BudgetEnvelope, step: -1 | 1) {
        const group = rows.filter((r) => r.kind === e.kind).map((r) => r.id);
        const neighbour = group[group.indexOf(e.id) + step];
        if (neighbour !== undefined) moveBefore(e.id, neighbour);
    }

    function archive(e: BudgetEnvelope) {
        router.patch(`/envelopes/${e.id}`, { archived: true }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setOpenId(null);
                toast({ text: `${e.name} archived`, ms: 6000, undo: () => router.patch(`/envelopes/${e.id}`, { archived: false }, { preserveScroll: true, preserveState: true }) });
            },
            onError: (er) => toast({ text: firstError(er as Record<string, string>) }),
        });
    }

    const restore = (e: Envelope) =>
        router.patch(`/envelopes/${e.id}`, { archived: false }, { preserveScroll: true, preserveState: true, onSuccess: () => toast({ text: `${e.name} is back` }) });

    const short = rows.filter((e) => toCents(e.allocated_this_cycle) < toCents(e.budgeted_amount)).length;
    const ready = toCents(p.summary.unallocated) > 0n;
    const wide = !open;
    // Phone: Envelope, Monthly, Left. Wide table: Allocated and Spent too, unless the panel is open.
    // Sized by the table's own width (a container query), so the side menu and panel are allowed for.
    // A phone-narrow table drops the drag handle and icons so names keep their room.
    const cols = wide
        ? 'grid-cols-[minmax(0,1fr)_88px_84px] @lg:grid-cols-[22px_minmax(0,1fr)_100px_96px] @2xl:grid-cols-[22px_minmax(0,1fr)_118px_112px_112px_118px]'
        : 'grid-cols-[minmax(0,1fr)_88px_84px] @lg:grid-cols-[22px_minmax(0,1fr)_108px_108px]';
    const extra = wide ? 'hidden @2xl:block' : 'hidden';

    return (
        <>
            <Head title="Budget" />
            <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.02em]">Budget</h1>
                        <p className="mt-0.5 text-[15px] text-slate">
                            {p.summary.cycle ? `${monthName(p.summary.cycle.start)} · ` : ''}
                            {rows.length} {rows.length === 1 ? 'envelope' : 'envelopes'} · {formatMoney(p.summary.left_to_spend)} left to spend
                        </p>
                    </div>
                    <button type="button" onClick={() => setAdding('everyday')} className="flex h-11 items-center gap-2 rounded-[14px] bg-card px-4 text-[15px] font-extrabold transition-transform hover:bg-segment active:scale-[0.97]">
                        <Icon name="plus" size={16} stroke={2.4} />
                        New envelope
                    </button>
                </div>

                {ready ? (
                    <div className="flex items-center gap-3.5 rounded-[18px] bg-tint px-5 py-3.5">
                        <span className="grid size-9 flex-none place-items-center rounded-full bg-card text-teal">
                            <Icon name="allocate" size={18} stroke={2} />
                        </span>
                        <p className="text-[14.5px] text-tint-sub">
                            <b className="font-extrabold text-ink">{formatMoney(p.summary.unallocated)} ready to allocate</b>
                            {p.left_from ? ` · from ${p.left_from.note || 'income'}, ${dayLabel(p.left_from.date)}` : ''}
                            {short ? ` · ${short} ${short === 1 ? 'envelope is' : 'envelopes are'} short of their monthly amount` : ''}
                        </p>
                        <span className="flex-1" />
                        <Link href="/allocate" className="flex h-10 flex-none items-center rounded-xl bg-mint px-4 text-[14.5px] font-extrabold text-on-mint transition-transform active:scale-[0.97]">
                            Allocate
                        </Link>
                    </div>
                ) : null}

                <div className="flex items-start gap-5">
                    <div className="min-w-0 flex-1">
                        <div role="table" aria-label="Envelopes" className="@container overflow-hidden rounded-[24px] bg-card">
                            <div role="row" className={`grid ${cols} items-center gap-3 border-b border-line px-4 py-3 text-[12.5px] font-bold text-slate`}>
                                <span role="columnheader" className="hidden @lg:block">
                                    <span className="sr-only">Order</span>
                                </span>
                                <span role="columnheader">Envelope</span>
                                <span role="columnheader" className="text-right">
                                    Monthly
                                </span>
                                <span role="columnheader" className={`text-right ${extra}`}>
                                    Allocated
                                </span>
                                <span role="columnheader" className={`text-right ${extra}`}>
                                    Spent
                                </span>
                                <span role="columnheader" className="text-right">
                                    Left
                                </span>
                            </div>

                            {GROUPS.map((g, gi) => {
                                const list = rows.filter((e) => e.kind === g.kind);
                                return (
                                    <div key={g.kind} role="rowgroup" aria-label={g.label} className={gi ? 'border-t border-line' : ''}>
                                        <div className="px-4 pt-3.5 pb-1.5 text-[13px] font-bold text-slate">
                                            <span className="font-extrabold text-ink">{g.label}</span> · {g.note}
                                        </div>
                                        <AnimatePresence initial={false}>
                                            {list.map((e) => {
                                                const m = monthlyOf(e);
                                                const over = isNegative(e.balance);
                                                const sel = e.id === openId;
                                                const isOver = drag.over === e.id && drag.id !== null && drag.id !== e.id && byId.get(drag.id)?.kind === e.kind;
                                                return (
                                                    <motion.div
                                                        key={e.id}
                                                        role="row"
                                                        layout={reduced ? false : 'position'}
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0, transition: { duration: 0.18 } }}
                                                        transition={{ duration: 0.24, ease: ARRIVE }}
                                                        draggable={editing !== e.id}
                                                        onDragStartCapture={(ev: DragEvent) => {
                                                            ev.dataTransfer.effectAllowed = 'move';
                                                            setDrag({ id: e.id, over: null });
                                                        }}
                                                        onDragOverCapture={(ev: DragEvent) => {
                                                            ev.preventDefault();
                                                            if (drag.over !== e.id) setDrag((d) => ({ ...d, over: e.id }));
                                                        }}
                                                        onDropCapture={(ev: DragEvent) => {
                                                            ev.preventDefault();
                                                            if (drag.id !== null) moveBefore(drag.id, e.id);
                                                            setDrag({ id: null, over: null });
                                                        }}
                                                        onDragEndCapture={() => setDrag({ id: null, over: null })}
                                                        onClick={() => openEnvelope(e.id)}
                                                        className={`group grid ${cols} cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors ${sel ? 'bg-tint' : 'hover:bg-canvas'} ${drag.id === e.id ? 'opacity-50' : ''}`}
                                                        style={{ boxShadow: isOver ? 'inset 0 2px 0 var(--mint)' : undefined }}
                                                    >
                                                        <button
                                                            type="button"
                                                            aria-label={`Move ${e.name}: press up or down`}
                                                            onClick={(ev) => ev.stopPropagation()}
                                                            onKeyDown={(ev: KeyboardEvent) => {
                                                                if (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return;
                                                                ev.preventDefault();
                                                                nudge(e, ev.key === 'ArrowUp' ? -1 : 1);
                                                            }}
                                                            className="hidden h-8 cursor-grab place-items-center @lg:grid rounded-lg text-muted opacity-40 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
                                                        >
                                                            <Icon name="grip" size={18} stroke={3} />
                                                        </button>
                                                        <span role="cell" className="flex min-w-0 items-center gap-3">
                                                            <span className="hidden @sm:block">
                                                                <EnvelopeIcon name={e.name} icon={e.icon} over={over} size={34} bg={sel ? 'bg-card' : 'bg-canvas'} />
                                                            </span>
                                                            <span className="min-w-0 flex-1">
                                                                <button type="button" onClick={(ev) => { ev.stopPropagation(); openEnvelope(e.id); }} aria-expanded={sel} className="block max-w-full truncate text-left text-[15px] font-bold">
                                                                    {e.name}
                                                                </button>
                                                                <span className="mt-1.5 block max-w-[220px]">
                                                                    <Bar percent={percent(over ? '0' : e.balance, m)} over={over} height={4} />
                                                                </span>
                                                            </span>
                                                        </span>
                                                        <span role="cell" className="text-right" onClick={(ev) => ev.stopPropagation()}>
                                                            {editing === e.id ? (
                                                                <input
                                                                    autoFocus
                                                                    aria-label={`Monthly amount for ${e.name}`}
                                                                    value={draft}
                                                                    inputMode="decimal"
                                                                    onFocus={(ev) => ev.target.select()}
                                                                    onChange={(ev) => setDraft(cleanTyped(ev.target.value))}
                                                                    onBlur={() => saveMonthly(e)}
                                                                    onKeyDown={(ev) => {
                                                                        if (ev.key === 'Enter') ev.currentTarget.blur();
                                                                        if (ev.key === 'Escape') setEditing(null);
                                                                    }}
                                                                    className="num h-9 w-full rounded-lg border border-mint bg-card px-2 text-right text-[15px] font-bold outline-none"
                                                                />
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => startEdit(e)}
                                                                    aria-label={`Monthly amount for ${e.name}: ${formatMoney(m)}. Change`}
                                                                    className="num h-9 w-full rounded-lg px-2 text-right text-[15px] font-bold transition-shadow hover:bg-card hover:shadow-[inset_0_0_0_1px_var(--line-strong)]"
                                                                >
                                                                    {formatMoney(m)}
                                                                </button>
                                                            )}
                                                        </span>
                                                        <span role="cell" className={`num text-right text-[15px] font-semibold ${extra} ${toCents(e.allocated_this_cycle) < toCents(m) ? 'text-amber' : ''}`}>
                                                            {formatMoney(e.allocated_this_cycle)}
                                                        </span>
                                                        <span role="cell" className={`num text-right text-[15px] font-semibold ${extra}`}>
                                                            {toCents(e.spent_this_cycle) > 0n ? formatMoney(e.spent_this_cycle) : '—'}
                                                        </span>
                                                        <span role="cell" className={`num text-right text-[15px] font-extrabold ${over ? 'text-red' : ''}`}>
                                                            <Money amount={e.balance} />
                                                        </span>
                                                    </motion.div>
                                                );
                                            })}
                                        </AnimatePresence>
                                        {adding === g.kind ? (
                                            <NewEnvelopeRow kind={g.kind} onClose={() => setAdding(null)} onSaved={saved} />
                                        ) : (
                                            <button type="button" onClick={() => setAdding(g.kind)} className="mx-4 mb-2.5 flex h-10 items-center gap-2 rounded-xl px-1.5 text-[14.5px] font-bold text-teal hover:underline">
                                                <Icon name="plus" size={16} stroke={2.4} />
                                                Add {g.kind === 'saving_up' ? 'a saving up envelope' : 'an envelope'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}

                            <div role="row" className={`grid ${cols} items-center gap-3 border-t border-line bg-canvas/60 px-4 py-3.5 text-[15px] font-extrabold`}>
                                <span className="hidden @lg:block" />
                                <span role="cell">All envelopes</span>
                                <span role="cell" className="num pr-2 text-right">
                                    {formatMoney(sum(rows.map(monthlyOf)))}
                                </span>
                                <span role="cell" className={`num text-right ${extra}`}>
                                    {formatMoney(sum(rows.map((e) => e.allocated_this_cycle)))}
                                </span>
                                <span role="cell" className={`num text-right ${extra}`}>
                                    {formatMoney(sum(rows.map((e) => e.spent_this_cycle)))}
                                </span>
                                <span role="cell" className={`num text-right ${isNegative(p.summary.left_to_spend) ? 'text-red' : ''}`}>
                                    <Money amount={sum(rows.map((e) => e.balance))} />
                                </span>
                            </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[13px] text-slate">
                            <span>Drag ⠿ to reorder</span>
                            <span>Click a monthly amount to change it</span>
                            <span>Click a row for its details</span>
                            <AnimatePresence>
                                {tick ? (
                                    <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="font-bold text-teal">
                                        ✓ Saved
                                    </motion.span>
                                ) : null}
                            </AnimatePresence>
                            <span className="flex-1" />
                            {p.archived.length ? (
                                <button type="button" onClick={() => setShowArchived((v) => !v)} aria-expanded={showArchived} className="font-bold text-teal hover:underline">
                                    Archived ({p.archived.length})
                                </button>
                            ) : null}
                        </div>

                        {showArchived && p.archived.length ? (
                            <div className="mt-3 rounded-[20px] bg-card px-4 py-1.5">
                                {p.archived.map((e, i) => (
                                    <div key={e.id} className={`flex items-center gap-3 py-2.5 ${i ? 'border-t border-line' : ''}`}>
                                        <EnvelopeIcon name={e.name} icon={e.icon} size={32} bg="bg-canvas" />
                                        <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{e.name}</span>
                                        <span className="num text-[14px] text-slate">{formatMoney(e.balance)}</span>
                                        <button type="button" onClick={() => restore(e)} className="h-9 rounded-xl bg-canvas px-3.5 text-[14px] font-bold hover:bg-segment">
                                            Restore
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>

                    <AnimatePresence>
                        {open ? (
                            <>
                                <motion.div key="scrim" className="fixed inset-0 z-40 bg-scrim xl:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closePanel} />
                                <motion.aside
                                    key="panel"
                                    aria-label={`${open.name} details`}
                                    initial={reduced ? { opacity: 0 } : { opacity: 0, x: 24 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={reduced ? { opacity: 0 } : { opacity: 0, x: 24, transition: { duration: 0.18 } }}
                                    transition={{ duration: 0.28, ease: ARRIVE }}
                                    className="fixed inset-y-0 right-0 z-50 w-[min(420px,100vw)] overflow-y-auto bg-canvas p-3 xl:sticky xl:top-5 xl:z-auto xl:max-h-[calc(100vh-40px)] xl:w-[380px] xl:flex-none xl:rounded-[24px] xl:p-0"
                                >
                                    <EnvelopePanel key={open.id} e={open} activity={p.activity} loading={p.open_id !== open.id} shared={p.shared} canAllocate={ready} onClose={closePanel} onArchive={() => archive(open)} />
                                </motion.aside>
                            </>
                        ) : null}
                    </AnimatePresence>
                </div>
            </div>
        </>
    );
}

/** The add row at the foot of a group: name and monthly amount; stays open to add another. */
function NewEnvelopeRow({ kind, onClose, onSaved }: { kind: Kind; onClose: () => void; onSaved: () => void }) {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    const nameRef = useRef<HTMLInputElement>(null);

    function save(ev: FormEvent) {
        ev.preventDefault();
        if (!name.trim() || busy) return;
        setBusy(true);
        router.post('/envelopes', { name: name.trim(), budgeted_amount: toAmount(amount), kind }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setName('');
                setAmount('');
                setErrors({});
                onSaved();
                nameRef.current?.focus();
            },
            onError: (er) => setErrors(er as Record<string, string>),
            onFinish: () => setBusy(false),
        });
    }

    return (
        <motion.form
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: ARRIVE }}
            onSubmit={save}
            onKeyDown={(e) => e.key === 'Escape' && onClose()}
            aria-label={kind === 'saving_up' ? 'New saving up envelope' : 'New envelope'}
            className="mx-3 mb-3 flex flex-col gap-2 rounded-[16px] bg-canvas p-3"
        >
            <div className="flex flex-wrap items-center gap-2">
                <input ref={nameRef} autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="New envelope name" aria-label="Name" className={`${field} min-w-[180px] flex-[2]`} />
                <span className="relative min-w-[130px] flex-1">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[15px] font-bold text-slate">R</span>
                    <input value={amount} onChange={(e) => setAmount(cleanTyped(e.target.value))} inputMode="decimal" placeholder="Monthly, 0.00" aria-label="Monthly amount" className={`${field} num w-full pl-7`} />
                </span>
                <button type="submit" disabled={!name.trim() || busy} className="h-10 rounded-xl bg-mint px-4 text-[14.5px] font-extrabold text-on-mint transition-transform active:scale-[0.97] disabled:opacity-60">
                    {busy ? 'Adding…' : 'Add'}
                </button>
                <button type="button" onClick={onClose} className="h-10 rounded-xl px-3 text-[14.5px] font-bold text-teal">
                    Done
                </button>
            </div>
            {errors.name || errors.budgeted_amount || errors.form ? <p className="text-[13.5px] font-bold text-red-ink">{errors.name || errors.budgeted_amount || errors.form}</p> : null}
            <p className="text-[12.5px] text-slate">Enter adds it · Esc closes · {kind === 'saving_up' ? 'Saving up: money builds up for something later.' : 'Everyday: spent through the month.'}</p>
        </motion.form>
    );
}

Budget.layout = (page: ReactNode) => (
    <Shell active="budget" title="Budget">
        {page}
    </Shell>
);
