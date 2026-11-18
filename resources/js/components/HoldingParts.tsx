import { router } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import Icon from '@/components/Icon';
import Money from '@/components/Money';
import { cleanTyped, hasAmount, toAmount, ymd } from '@/lib/amount';
import { useApp } from '@/lib/app';
import { dayLabel, formatMoney, isNegative, toCents } from '@/lib/format';
import { formatRate, formatUsd, randToUsd, subtractForHint, usdToRand } from '@/shared/money';

export type Position = { id: number; purpose_id: number; purpose: string; value: string; value_usd: string | null };
export type Holding = { id: number; name: string; value: string; value_usd: string | null; last_valuation: { date: string; value: string } | null; positions: Position[] };
export type PositionReturn = { purpose_id: number; net_contributed: string; value: string; gain: string; simple_return: string | null };
export type Returns = { net_contributed: string; value: string; gain: string; simple_return: string | null; time_weighted_return: string | null; positions?: PositionReturn[] };
export type Valuation = { id: number; date: string; value: string; foreign_value: string | null; deletable: boolean };
export type Purpose = { id: number; name: string };
export type Ccy = { usd: boolean; rate: string };

const field = 'h-11 w-full rounded-xl border border-line bg-card px-3 text-[15px] font-bold text-ink outline-none focus:border-mint';
const NEW = -1;

export const pct = (v: string | null) => (v === null ? '—' : `${v.startsWith('-') ? '−' : ''}${v.replace('-', '')}%`);
export const signed = (v: string) => formatMoney(v, { income: !isNegative(v) && toCents(v) !== 0n });

/** An amount field in the account's own currency ($ for a dollar account, which PocFin stores in rand). */
function AmountField({ label, value, onChange, ccy, error, autoFocus, hint }: { label: string; value: string; onChange: (v: string) => void; ccy: Ccy; error?: string; autoFocus?: boolean; hint?: string }) {
    return (
        <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
            {label}
            <span className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[15px] font-bold text-slate">{ccy.usd ? '$' : 'R'}</span>
                <input autoFocus={autoFocus} value={value} onChange={(e) => onChange(cleanTyped(e.target.value))} inputMode="decimal" placeholder="0.00" className={`${field} num pl-7`} />
            </span>
            {hint ? <span className="num font-semibold">{hint}</span> : null}
            {error ? <span className="text-red-ink">{error}</span> : null}
        </label>
    );
}

const toRand = (typed: string, ccy: Ccy) => (ccy.usd ? usdToRand(toAmount(typed), ccy.rate) : toAmount(typed));
const fromRand = (rand: string, ccy: Ccy) => (ccy.usd ? randToUsd(rand, ccy.rate) : rand).replace(/\.00$/, '');

/**
 * Add money (outside money) into, or Withdraw from, one holding and purpose. The holding's worth
 * just before goes with it, filled in from what it's worth now (the app does the same), so the
 * unit price is current. A dollar account types dollars; PocFin stores rand.
 */
export function HoldingMoney({ accountId, kind, holdings, holdingId, purposes, ccy, onDone }: { accountId: number; kind: 'add' | 'expense'; holdings: Holding[]; holdingId?: number; purposes: Purpose[]; ccy: Ccy; onDone: () => void }) {
    const { toast } = useApp();
    const [hid, setHid] = useState(holdingId ?? holdings[0]?.id ?? 0);
    const h = holdings.find((x) => x.id === hid);
    const own = h?.positions ?? [];
    const [pid, setPid] = useState<number>(own[0]?.purpose_id ?? purposes[0]?.id ?? NEW);
    const [newName, setNewName] = useState('');
    const [typed, setTyped] = useState('');
    const [worth, setWorth] = useState(h ? fromRand(h.value, ccy) : '');
    const [day, setDay] = useState(ymd());
    const [note, setNote] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    const choices = kind === 'add' ? purposes : purposes.filter((p) => own.some((o) => o.purpose_id === p.id));
    const held = own.find((o) => o.purpose_id === pid);

    function pickHolding(id: number) {
        setHid(id);
        const next = holdings.find((x) => x.id === id);
        setWorth(next ? fromRand(next.value, ccy) : '');
        setPid(next?.positions[0]?.purpose_id ?? purposes[0]?.id ?? NEW);
    }

    function send(e: FormEvent) {
        e.preventDefault();
        if (!h || !hasAmount(typed) || busy) return;
        setBusy(true);
        router.post(`/investments/${accountId}/money`, {
            type: kind,
            holding_id: h.id,
            purpose_id: pid === NEW ? null : pid,
            new_purpose: pid === NEW ? newName : null,
            amount: toRand(typed, ccy),
            foreign_amount: ccy.usd ? toAmount(typed) : null,
            holding_value: toRand(worth || '0', ccy),
            date: day,
            note: note.trim() || null,
        }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                toast({ text: kind === 'add' ? `✓ Added to ${h.name}` : `✓ Withdrawn from ${h.name}` });
                onDone();
            },
            onError: (er) => setErrors(er as Record<string, string>),
            onFinish: () => setBusy(false),
        });
    }

    if (!holdings.length) return <p className="rounded-2xl bg-canvas p-3.5 text-[14px] text-slate">Add a holding first: money goes into a holding, for a purpose.</p>;

    return (
        <form onSubmit={send} onKeyDown={(e) => e.key === 'Escape' && onDone()} className="flex flex-col gap-3 rounded-2xl bg-canvas p-3.5">
            <p className="text-[13px] font-bold text-slate">{kind === 'add' ? 'Outside money, like a contribution from your salary at work. It never counts as income.' : 'It leaves PocFin, like a sale paid out to your bank.'}</p>
            {holdingId === undefined ? (
                <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                    Holding
                    <select value={hid} onChange={(e) => pickHolding(Number(e.target.value))} className={field}>
                        {holdings.map((x) => (
                            <option key={x.id} value={x.id}>
                                {x.name}
                            </option>
                        ))}
                    </select>
                </label>
            ) : null}
            <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                {kind === 'add' ? 'What it’s for' : 'From'}
                <select value={pid} onChange={(e) => setPid(Number(e.target.value))} className={field}>
                    {choices.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                    {kind === 'add' ? <option value={NEW}>New purpose…</option> : null}
                </select>
                {pid === NEW ? <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={100} placeholder="House deposit" aria-label="New purpose" className={`${field} mt-1`} /> : null}
                {errors.purpose_id ? <span className="text-red-ink">{errors.purpose_id}</span> : null}
            </label>
            <AmountField
                label="Amount"
                value={typed}
                onChange={setTyped}
                ccy={ccy}
                autoFocus={pid !== NEW}
                error={errors.amount || errors.foreign_amount}
                hint={ccy.usd && hasAmount(typed) ? `${formatMoney(toRand(typed, ccy))} at ${formatRate(ccy.rate)}` : kind === 'expense' && held ? `${held.purpose} holds ${ccy.usd ? formatUsd(held.value_usd ?? '0') : formatMoney(held.value)} here` : undefined}
            />
            <AmountField label="What the holding was worth just before" value={worth} onChange={setWorth} ccy={ccy} error={errors.holding_value} hint="From its latest value. Change it if the platform shows something else today." />
            <div className="grid grid-cols-2 gap-2">
                <input type="date" value={day} min={h?.last_valuation?.date} max={ymd()} onChange={(e) => e.target.value && setDay(e.target.value)} aria-label="Date" className={field} />
                <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} placeholder="Note" aria-label="Note" className={`${field} font-semibold`} />
            </div>
            {errors.date ? <span className="text-[13px] font-bold text-red-ink">{errors.date}</span> : null}
            {errors.form ? <span className="text-[13px] font-bold text-red-ink">{errors.form}</span> : null}
            <div className="flex gap-2">
                <button type="submit" disabled={!hasAmount(typed) || busy || (pid === NEW && !newName.trim())} className="h-10 flex-1 rounded-xl bg-mint text-[14.5px] font-extrabold text-on-mint disabled:opacity-60">
                    {busy ? 'Saving…' : kind === 'add' ? 'Add money' : 'Withdraw'}
                </button>
                <button type="button" onClick={onDone} className="h-10 rounded-xl px-3 text-[14.5px] font-bold text-teal">
                    Cancel
                </button>
            </div>
        </form>
    );
}

/** Move value between purposes inside one holding: not a sale, no return changes (the app's rule). */
function MovePurpose({ accountId, h, purposes, ccy, onDone }: { accountId: number; h: Holding; purposes: Purpose[]; ccy: Ccy; onDone: () => void }) {
    const { toast } = useApp();
    const [from, setFrom] = useState(h.positions[0]?.purpose_id ?? 0);
    const others = purposes.filter((p) => p.id !== from);
    const [to, setTo] = useState(others[0]?.id ?? NEW);
    const [newName, setNewName] = useState('');
    const [typed, setTyped] = useState('');
    const [worth, setWorth] = useState(fromRand(h.value, ccy));
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    const held = h.positions.find((p) => p.purpose_id === from);

    function send(e: FormEvent) {
        e.preventDefault();
        if (!hasAmount(typed) || busy) return;
        setBusy(true);
        router.post(`/investments/${accountId}/holdings/${h.id}/move`, {
            from_purpose_id: from,
            to_purpose_id: to === NEW ? null : to,
            new_purpose: to === NEW ? newName : null,
            amount: toRand(typed, ccy),
            holding_value: toRand(worth || '0', ccy),
            date: ymd(),
        }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                toast({ text: '✓ Moved between purposes' });
                onDone();
            },
            onError: (er) => setErrors(er as Record<string, string>),
            onFinish: () => setBusy(false),
        });
    }

    return (
        <form onSubmit={send} onKeyDown={(e) => e.key === 'Escape' && onDone()} className="flex flex-col gap-3 rounded-2xl bg-canvas p-3.5">
            <p className="text-[13px] font-bold text-slate">Not a sale: the units move at today’s price, so no return changes.</p>
            <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                    From
                    <select value={from} onChange={(e) => setFrom(Number(e.target.value))} className={field}>
                        {h.positions.map((p) => (
                            <option key={p.purpose_id} value={p.purpose_id}>
                                {p.purpose}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                    To
                    <select value={to} onChange={(e) => setTo(Number(e.target.value))} className={field}>
                        {others.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                        <option value={NEW}>New purpose…</option>
                    </select>
                </label>
            </div>
            {to === NEW ? <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={100} placeholder="Travel" aria-label="New purpose" className={field} /> : null}
            {errors.to_purpose_id ? <span className="text-[13px] font-bold text-red-ink">{errors.to_purpose_id}</span> : null}
            <AmountField label="How much of its value" value={typed} onChange={setTyped} ccy={ccy} autoFocus={to !== NEW} error={errors.amount} hint={held ? `${held.purpose} holds ${ccy.usd ? formatUsd(held.value_usd ?? '0') : formatMoney(held.value)} here` : undefined} />
            <AmountField label="What the holding is worth now" value={worth} onChange={setWorth} ccy={ccy} error={errors.holding_value} />
            <div className="flex gap-2">
                <button type="submit" disabled={!hasAmount(typed) || busy || (to === NEW && !newName.trim())} className="h-10 flex-1 rounded-xl bg-mint text-[14.5px] font-extrabold text-on-mint disabled:opacity-60">
                    {busy ? 'Moving…' : 'Move'}
                </button>
                <button type="button" onClick={onDone} className="h-10 rounded-xl px-3 text-[14.5px] font-bold text-teal">
                    Cancel
                </button>
            </div>
        </form>
    );
}

/**
 * W12, a holding beside the table: what it's worth, Add money / Withdraw / Move between purposes,
 * each purpose's share with what it put in, values over time with Delete the newest value, and
 * its name and Close holding.
 */
export function HoldingPanel({ accountId, h, ret, values, purposes, ccy, onClose }: { accountId: number; h: Holding; ret?: Returns; values: Valuation[]; purposes: Purpose[]; ccy: Ccy; onClose: () => void }) {
    const { toast } = useApp();
    const [form, setForm] = useState<'add' | 'expense' | 'move' | null>(null);
    const [name, setName] = useState(h.name);
    const [confirm, setConfirm] = useState<'value' | 'close' | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const byPurpose = new Map((ret?.positions ?? []).map((p) => [p.purpose_id, p]));
    const newest = values[0];

    const done = (text: string) => ({
        preserveScroll: true,
        preserveState: true,
        onSuccess: () => {
            toast({ text });
            setConfirm(null);
            setErrors({});
        },
        onError: (er: Record<string, string>) => {
            setConfirm(null);
            setErrors(er);
        },
    });

    return (
        <div className="flex flex-col gap-4 rounded-[24px] bg-card p-5">
            <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold text-slate">Holding</div>
                    <h2 className="truncate text-[19px] font-extrabold">{h.name}</h2>
                </div>
                <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-canvas text-slate hover:text-ink">
                    <Icon name="close" size={16} stroke={2.2} />
                </button>
            </div>
            <div>
                <div className="text-[32px] leading-[38px] font-extrabold tracking-[-0.03em]">
                    <Money amount={h.value} />
                </div>
                <div className="num mt-1 text-[13.5px] text-slate">
                    {ccy.usd && h.value_usd ? `${formatUsd(h.value_usd)} · ` : ''}
                    {h.last_valuation ? `Last valued ${dayLabel(h.last_valuation.date)}` : 'Not valued yet'}
                    {ret ? ` · ${signed(ret.gain)} on ${formatMoney(ret.net_contributed)}` : ''}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
                {([
                    ['add', 'Add money', 'plus'],
                    ['expense', 'Withdraw', 'download'],
                    ['move', 'Move', 'move'],
                ] as const).map(([k, label, icon]) => (
                    <button
                        key={k}
                        type="button"
                        onClick={() => setForm(form === k ? null : k)}
                        aria-expanded={form === k}
                        title={k === 'move' ? 'Move between purposes' : undefined}
                        disabled={k !== 'add' && !h.positions.length}
                        className={`flex h-11 items-center justify-center gap-1.5 rounded-xl text-[14px] font-extrabold transition-transform active:scale-[0.97] disabled:opacity-50 ${k === 'add' ? 'bg-mint text-on-mint' : form === k ? 'bg-ink text-canvas' : 'bg-canvas hover:bg-segment'}`}
                    >
                        <Icon name={icon} size={15} stroke={2.2} />
                        {label}
                    </button>
                ))}
            </div>
            {form === 'add' || form === 'expense' ? <HoldingMoney key={form} accountId={accountId} kind={form} holdings={[h]} holdingId={h.id} purposes={purposes} ccy={ccy} onDone={() => setForm(null)} /> : null}
            {form === 'move' ? <MovePurpose accountId={accountId} h={h} purposes={purposes} ccy={ccy} onDone={() => setForm(null)} /> : null}

            <div className="border-t border-line pt-4">
                <h3 className="mb-1 text-[15px] font-extrabold">By purpose</h3>
                {h.positions.length === 0 ? <p className="text-[14px] text-slate">Nothing in it yet. Add money to give it a purpose.</p> : null}
                {h.positions.map((p, i) => {
                    const r = byPurpose.get(p.purpose_id);
                    return (
                        <div key={p.purpose_id} className={`flex items-center gap-3 py-2.5 ${i ? 'border-t border-line' : ''}`}>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[14.5px] font-bold">{p.purpose}</span>
                                {r ? <span className="num block text-[12.5px] text-slate">Put in {formatMoney(r.net_contributed)} · {pct(r.simple_return)}</span> : null}
                            </span>
                            <span className="text-right">
                                <span className="num block text-[14.5px] font-extrabold">{ccy.usd && p.value_usd ? formatUsd(p.value_usd) : formatMoney(p.value)}</span>
                                {r ? <span className={`num block text-[12.5px] font-bold ${isNegative(r.gain) ? 'text-red' : 'text-teal'}`}>{signed(r.gain)}</span> : null}
                            </span>
                        </div>
                    );
                })}
            </div>

            <div className="border-t border-line pt-4">
                <h3 className="mb-1 text-[15px] font-extrabold">Values over time</h3>
                {values.length === 0 ? <p className="text-[14px] text-slate">No values yet.</p> : null}
                {values.map((v, i) => {
                    const prev = values[i + 1];
                    const diff = prev ? subtractForHint(v.value, prev.value) : null;
                    const change = diff && toCents(diff) !== 0n ? diff : null;
                    return (
                        <div key={v.id} className={`num flex items-center gap-3 py-2 text-[14px] ${i ? 'border-t border-line' : ''}`}>
                            <span className="flex-1 font-bold">{dayLabel(v.date)}</span>
                            <span className="font-extrabold">{ccy.usd && v.foreign_value ? formatUsd(v.foreign_value) : formatMoney(v.value)}</span>
                            <span className={`w-[100px] text-right text-[12.5px] font-bold ${change && isNegative(change) ? 'text-red' : 'text-teal'}`}>{change ? signed(change) : ''}</span>
                        </div>
                    );
                })}
                {newest?.deletable ? (
                    confirm === 'value' ? (
                        <div role="alertdialog" className="mt-2 flex items-center gap-2 rounded-xl bg-red-tint p-2.5 text-[13.5px] font-bold text-red-ink">
                            <span className="flex-1">Delete the value from {dayLabel(newest.date)}?</span>
                            <button type="button" autoFocus onClick={() => router.delete(`/investments/${accountId}/holdings/${h.id}/values/${newest.id}`, done('Value deleted'))} className="h-9 rounded-lg bg-red px-3 text-white">
                                Delete
                            </button>
                            <button type="button" onClick={() => setConfirm(null)} className="h-9 px-2">
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button type="button" onClick={() => setConfirm('value')} className="mt-2 text-[13.5px] font-bold text-red-text hover:underline">
                            Delete the newest value
                        </button>
                    )
                ) : null}
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    if (name.trim() && name.trim() !== h.name) router.patch(`/investments/${accountId}/holdings/${h.id}`, { name: name.trim() }, done('✓ Saved'));
                }}
                className="flex flex-col gap-2.5 border-t border-line pt-4"
            >
                <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                    Name
                    <span className="flex gap-2">
                        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className={field} />
                        <button type="submit" disabled={!name.trim() || name.trim() === h.name} className="h-11 flex-none rounded-xl bg-mint px-3.5 text-[14px] font-extrabold text-on-mint disabled:bg-segment disabled:text-slate">
                            Save
                        </button>
                    </span>
                    {errors.name ? <span className="text-red-ink">{errors.name}</span> : null}
                </label>
                {errors.form || errors.holding ? <p role="alert" className="rounded-xl bg-red-tint px-3 py-2.5 text-[14px] font-bold text-red-ink">{errors.form || errors.holding}</p> : null}
                {confirm === 'close' ? (
                    <div role="alertdialog" className="flex flex-col gap-2 rounded-xl bg-red-tint p-3">
                        <p className="text-[14px] font-bold text-red-ink">Close {h.name}? {toCents(h.value) > 0n ? 'Each purpose’s value goes out as a final withdrawal. ' : ''}This can’t be undone.</p>
                        <div className="flex gap-2">
                            <button type="button" autoFocus onClick={() => router.delete(`/investments/${accountId}/holdings/${h.id}`, { onSuccess: () => toast({ text: `${h.name} closed` }), onError: (er) => { setConfirm(null); setErrors(er); } })} className="h-10 flex-1 rounded-xl bg-red text-[14px] font-extrabold text-white">
                                Close holding
                            </button>
                            <button type="button" onClick={() => setConfirm(null)} className="h-10 rounded-xl bg-card px-3.5 text-[14px] font-bold">
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <button type="button" onClick={() => setConfirm('close')} className="h-10 rounded-xl bg-red-tint text-[14px] font-bold text-red-text">
                        Close holding
                    </button>
                )}
            </form>
        </div>
    );
}
