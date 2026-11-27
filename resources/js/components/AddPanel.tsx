import { router, usePage } from '@inertiajs/react';
import { MOD } from '@/lib/keys';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import EnvelopeIcon from '@/components/EnvelopeIcon';
import Icon from '@/components/Icon';
import { cleanTyped, hasAmount, minus, toAmount, ymd } from '@/lib/amount';
import type { AddOpen, AddTab } from '@/lib/app';
import { formatMoney, isNegative } from '@/lib/format';
import { ARRIVE } from '@/lib/motion';
import type { Envelope, Shared } from '@/types';
import { homeSymbol } from '@/shared/currency';

type Account = { id: number; name: string; type: string; balance: string };
type Options = { envelopes: Envelope[]; accounts: Account[]; envelope_use: { envelope_id: number; uses: number }[] };
type Place = `e:${number}` | `a:${number}` | '';

const TABS: { key: AddTab; label: string }[] = [
    { key: 'spent', label: 'Spent' },
    { key: 'income', label: 'Income' },
    { key: 'move', label: 'Move' },
    { key: 'refund', label: 'Refund' },
];

const field = 'h-11 w-full rounded-xl border border-line bg-card px-3 text-[15px] font-semibold text-ink outline-none focus:border-mint';

/**
 * W3 Add panel: amount first, where it goes, date, note, then Save (or Save and add another).
 * Slides in from the right (a sheet from the bottom on a phone). Enter saves, ⌘/Ctrl Enter saves
 * and keeps it open, Esc closes. The server's rules decide; its errors show under the fields.
 */
export default function AddPanel({ open, start, onClose }: { open: boolean; start: AddOpen; onClose: () => void }) {
    const reduced = useReducedMotion();
    const [phone, setPhone] = useState(false);
    const [options, setOptions] = useState<Options | null>(null);
    const [failed, setFailed] = useState(false);
    const [tab, setTab] = useState<AddTab>('spent');
    const [typed, setTyped] = useState('');
    const [place, setPlace] = useState<Place>('');
    const [from, setFrom] = useState<Place>('');
    const [to, setTo] = useState<Place>('');
    const [day, setDay] = useState(ymd());
    const [note, setNote] = useState('');
    const [showAll, setShowAll] = useState(false);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [added, setAdded] = useState<{ key: number; text: string; amount: string }[]>([]);
    const [receipt, setReceipt] = useState<File | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const { budgets, budgetId } = usePage<Shared>().props;
    // Receipt photos are Premium (the server checks again); free budgets see a quiet line instead.
    const premium = budgets.find((b) => b.id === budgetId)?.premium ?? false;
    const amountRef = useRef<HTMLInputElement>(null);
    const opener = useRef<Element | null>(null);

    // Each opening starts fresh with what the caller asked for, and fetches today's balances.
    useEffect(() => {
        if (!open) return;
        opener.current = document.activeElement;
        setPhone(window.matchMedia('(max-width: 639px)').matches);
        setTab(start.tab ?? 'spent');
        setTyped(start.amount ?? '');
        setPlace(start.envelopeId ? `e:${start.envelopeId}` : '');
        setFrom(start.fromAccountId ? `a:${start.fromAccountId}` : start.tab === 'move' && start.envelopeId ? `e:${start.envelopeId}` : '');
        setTo(start.toEnvelopeId ? `e:${start.toEnvelopeId}` : '');
        setDay(ymd());
        setNote('');
        setErrors({});
        setAdded([]);
        setReceipt(null);
        setDone(false);
        setShowAll(false);
        setFailed(false);
        fetch('/add/options', { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => (r.ok ? r.json() : Promise.reject(r)))
            .then((o: Options) => setOptions(o))
            .catch(() => setFailed(true));
        window.setTimeout(() => amountRef.current?.focus(), 60);
    }, [open, start]);

    useEffect(() => {
        if (!open) (opener.current as HTMLElement | null)?.focus?.();
    }, [open]);

    const envelopes = useMemo(() => {
        if (!options) return [];
        const uses = new Map(options.envelope_use.map((u) => [u.envelope_id, u.uses]));
        return options.envelopes.filter((e) => !e.archived).sort((a, b) => (uses.get(b.id) ?? 0) - (uses.get(a.id) ?? 0));
    }, [options]);
    const accounts = options?.accounts ?? [];

    // Most used envelope first, when nothing was asked for.
    useEffect(() => {
        if (open && options && !place && (tab === 'spent' || tab === 'refund') && envelopes[0]) setPlace(`e:${envelopes[0].id}`);
    }, [open, options, tab, place, envelopes]);

    const balanceOf = (p: Place): { name: string; balance: string } | null => {
        if (!p) return null;
        const id = Number(p.slice(2));
        if (p.startsWith('e:')) {
            const e = envelopes.find((x) => x.id === id);
            return e ? { name: e.name, balance: e.balance } : null;
        }
        const a = accounts.find((x) => x.id === id);
        return a ? { name: a.name, balance: a.balance } : null;
    };

    const amount = toAmount(typed);
    const chosen = balanceOf(place);
    const hint = (() => {
        if (tab === 'spent' && chosen) {
            if (!hasAmount(typed)) return { text: `${formatMoney(chosen.balance)} in ${chosen.name}`, warn: false };
            const after = minus(chosen.balance, amount);
            return isNegative(after) ? { text: `${chosen.name} will be ${formatMoney(after)} (overspent). You can still save it.`, warn: true } : { text: `${formatMoney(after)} left in ${chosen.name} after this`, warn: false };
        }
        if (tab === 'refund' && chosen && hasAmount(typed)) return { text: `${chosen.name} goes up to ${formatMoney(minus(chosen.balance, '-' + amount))}`, warn: false };
        if (tab === 'move') {
            const f = balanceOf(from);
            const t = balanceOf(to);
            if (f && t && hasAmount(typed)) return { text: `${t.name} to ${formatMoney(minus(t.balance, '-' + amount))}, ${f.name} left with ${formatMoney(minus(f.balance, amount))}`, warn: isNegative(minus(f.balance, amount)) };
        }
        if (tab === 'income') return { text: 'It lands in Ready to allocate, so you can give it a place.', warn: false };
        return null;
    })();

    function send(another: boolean) {
        if (busy) return;
        let url = '';
        let data: Record<string, unknown> = { amount, date: day, note: note.trim() || null };
        if (tab === 'spent' || tab === 'refund') {
            if (place.startsWith('a:')) url = `/money/accounts/${place.slice(2)}/expenses`;
            else {
                url = '/money/expenses';
                data = { ...data, envelope_id: Number(place.slice(2)) || null, refund: tab === 'refund', ...(receipt ? { receipt } : {}) };
            }
        } else if (tab === 'income') url = '/money/income';
        else {
            url = '/money/moves';
            const side = (p: Place, k: 'from' | 'to') => (p.startsWith('e:') ? { [`${k}_envelope_id`]: Number(p.slice(2)) } : p.startsWith('a:') ? { [`${k}_account_id`]: Number(p.slice(2)) } : {});
            data = { ...data, ...side(from, 'from'), ...side(to, 'to') };
        }
        setBusy(true);
        setErrors({});
        router.post(url, data as never, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                const where = tab === 'income' ? 'Income' : tab === 'move' ? `${balanceOf(from)?.name ?? ''} → ${balanceOf(to)?.name ?? ''}` : (chosen?.name ?? '');
                if (another) {
                    setAdded((a) => [{ key: Date.now(), text: `${where} · ${day === ymd() ? 'Today' : day}`, amount }, ...a].slice(0, 5));
                    setTyped('');
                    setNote('');
                    setReceipt(null);
                    amountRef.current?.focus();
                    // Fresh balances for the next one.
                    fetch('/add/options', { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } }).then((r) => r.json()).then(setOptions).catch(() => {});
                } else {
                    setDone(true);
                    window.setTimeout(onClose, 650);
                }
            },
            onError: (e) => setErrors(e as Record<string, string>),
            onFinish: () => setBusy(false),
        });
    }

    function submit(e: FormEvent) {
        e.preventDefault();
        send(false);
    }

    function onKey(e: KeyboardEvent) {
        if (e.key === 'Escape') onClose();
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            send(true);
        }
    }

    const err = (k: string) => (errors[k] ? <p className="mt-1 text-[13px] font-bold text-red-ink">{errors[k]}</p> : null);
    const tiles = showAll ? envelopes : envelopes.slice(0, 8);
    const placeOptions = [...envelopes.map((e) => ({ value: `e:${e.id}` as Place, label: `${e.name} · ${formatMoney(e.balance)}` })), ...accounts.map((a) => ({ value: `a:${a.id}` as Place, label: `${a.name} · ${formatMoney(a.balance)}` }))];

    return (
        <AnimatePresence>
            {open ? (
                <>
                    <motion.div key="scrim" className="fixed inset-0 z-50 bg-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }} onClick={onClose} />
                    <motion.form
                        key="panel"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="add-title"
                        onSubmit={submit}
                        onKeyDown={onKey}
                        className={
                            phone
                                ? 'fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col overflow-hidden rounded-t-[28px] bg-card'
                                : 'fixed top-3 right-3 bottom-3 z-50 flex w-[min(500px,calc(100vw-24px))] flex-col overflow-hidden rounded-[28px] bg-card'
                        }
                        initial={reduced ? { opacity: 0 } : phone ? { y: '100%' } : { x: 48, opacity: 0 }}
                        animate={reduced ? { opacity: 1 } : phone ? { y: 0 } : { x: 0, opacity: 1 }}
                        exit={reduced ? { opacity: 0 } : phone ? { y: '100%', transition: { duration: 0.2 } } : { x: 48, opacity: 0, transition: { duration: 0.2 } }}
                        transition={{ duration: 0.28, ease: ARRIVE }}
                    >
                        <div className="flex items-center gap-3 px-6 pt-5">
                            <h2 id="add-title" className="flex-1 text-2xl font-extrabold tracking-[-0.02em]">
                                Add
                            </h2>
                            <button type="button" onClick={onClose} aria-label="Close (Esc)" title="Close (Esc)" className="grid size-10 place-items-center rounded-full bg-canvas">
                                <Icon name="close" size={18} stroke={2.2} />
                            </button>
                        </div>

                        <div role="tablist" aria-label="What to add" className="mx-6 mt-4 grid grid-cols-4 gap-0.5 rounded-[14px] bg-segment p-[3px]">
                            {TABS.map((t) => (
                                <button
                                    key={t.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === t.key}
                                    onClick={() => {
                                        setTab(t.key);
                                        setErrors({});
                                    }}
                                    className={`h-[38px] rounded-[11px] text-[14.5px] font-extrabold transition-colors ${tab === t.key ? 'bg-card text-ink' : 'text-slate hover:text-ink'}`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 pt-5 pb-5">
                            <label className="block">
                                <span className="block text-[13.5px] font-bold text-slate">Amount</span>
                                <span className={`mt-1 flex items-baseline gap-1.5 border-b-2 pb-1.5 transition-colors ${hasAmount(typed) ? 'border-mint' : 'border-line'}`}>
                                    <span className={`text-[40px] font-extrabold ${hasAmount(typed) ? 'text-ink' : 'text-muted'}`}>{homeSymbol()}</span>
                                    <input
                                        ref={amountRef}
                                        value={typed}
                                        onChange={(e) => setTyped(cleanTyped(e.target.value))}
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        aria-label="Amount"
                                        className="num min-w-0 flex-1 bg-transparent p-0 text-[48px] leading-[56px] font-extrabold tracking-[-0.03em] text-ink outline-none placeholder:text-muted"
                                    />
                                </span>
                                {err('amount')}
                            </label>

                            {failed ? <p className="rounded-xl bg-red-tint px-3.5 py-2.5 text-sm font-bold text-red-text">Couldn’t load your envelopes. Close and try again.</p> : null}

                            {tab === 'spent' || tab === 'refund' ? (
                                <div className="flex flex-col gap-2.5">
                                    <div className="text-[13.5px] font-bold text-slate">{tab === 'refund' ? 'Back into' : 'From'}</div>
                                    {!options && !failed ? <div className="h-[180px] animate-pulse rounded-2xl bg-canvas" /> : null}
                                    <div className="grid grid-cols-4 gap-2">
                                        {tiles.map((e) => {
                                            const on = place === `e:${e.id}`;
                                            const over = isNegative(e.balance);
                                            return (
                                                <button
                                                    key={e.id}
                                                    type="button"
                                                    aria-pressed={on}
                                                    onClick={() => setPlace(`e:${e.id}`)}
                                                    className={`flex flex-col items-center gap-1.5 rounded-2xl px-1 pt-3 pb-2.5 transition-[background-color,box-shadow,transform] active:scale-[0.97] ${on ? 'bg-tint shadow-[inset_0_0_0_2px_var(--mint)]' : 'bg-canvas hover:bg-segment'}`}
                                                >
                                                    <EnvelopeIcon name={e.name} icon={e.icon} over={over} />
                                                    <span className="line-clamp-2 text-center text-[12.5px] leading-[15px] font-bold">{e.name}</span>
                                                    {tab === 'spent' ? <span className={`num text-[11.5px] font-bold ${over ? 'text-red' : 'text-slate'}`}>{formatMoney(e.balance)}</span> : null}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {envelopes.length > 8 ? (
                                        <button type="button" onClick={() => setShowAll(!showAll)} className="self-start text-[13.5px] font-bold text-teal hover:underline">
                                            {showAll ? 'Fewer envelopes' : `All ${envelopes.length} envelopes`}
                                        </button>
                                    ) : null}
                                    {tab === 'spent' && accounts.length ? (
                                        <>
                                            <div className="flex items-center gap-2.5 text-[12.5px] font-bold text-slate">
                                                <span className="h-px flex-1 bg-line" />
                                                or from an account
                                                <span className="h-px flex-1 bg-line" />
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {accounts.map((a) => {
                                                    const on = place === `a:${a.id}`;
                                                    return (
                                                        <button key={a.id} type="button" aria-pressed={on} onClick={() => setPlace(`a:${a.id}`)} className={`num h-10 rounded-xl px-3.5 text-[13.5px] font-bold text-navy-text transition-shadow ${on ? 'bg-navy-tint shadow-[inset_0_0_0_2px_var(--navy-line)]' : 'bg-navy-tint'}`}>
                                                            {a.name} · {formatMoney(a.balance)}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    ) : null}
                                    {err('envelope_id')}
                                </div>
                            ) : null}

                            {tab === 'move' ? (
                                <div className="grid grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)] items-end gap-2">
                                    <label className="flex flex-col gap-1 text-[13.5px] font-bold text-slate">
                                        From
                                        <select value={from} onChange={(e) => setFrom(e.target.value as Place)} className={field}>
                                            <option value="">Choose…</option>
                                            {placeOptions.map((o) => (
                                                <option key={o.value} value={o.value}>
                                                    {o.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <button
                                        type="button"
                                        aria-label="Swap from and to"
                                        onClick={() => {
                                            setFrom(to);
                                            setTo(from);
                                        }}
                                        className="grid h-11 place-items-center rounded-xl bg-canvas"
                                    >
                                        <Icon name="move" size={18} />
                                    </button>
                                    <label className="flex flex-col gap-1 text-[13.5px] font-bold text-slate">
                                        To
                                        <select value={to} onChange={(e) => setTo(e.target.value as Place)} className={field}>
                                            <option value="">Choose…</option>
                                            {placeOptions.map((o) => (
                                                <option key={o.value} value={o.value}>
                                                    {o.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <div className="col-span-3">
                                        {err('from_envelope_id') ?? err('from_account_id') ?? err('to_envelope_id') ?? err('to_account_id')}
                                        <p className="mt-1 text-[13px] text-slate">Moving isn’t spending or income. It shows under Moved in History.</p>
                                    </div>
                                </div>
                            ) : null}

                            {hint ? <div role="status" className={`num rounded-xl px-3.5 py-2.5 text-sm font-bold ${hint.warn ? 'bg-red-tint text-red-text' : 'bg-tint text-teal'}`}>{hint.text}</div> : null}

                            <div className="flex flex-col gap-1.5">
                                <div className="text-[13.5px] font-bold text-slate">Date</div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {[
                                        { label: 'Today', value: ymd() },
                                        { label: 'Yesterday', value: ymd(-1) },
                                    ].map((d) => (
                                        <button key={d.label} type="button" aria-pressed={day === d.value} onClick={() => setDay(d.value)} className={`h-[38px] rounded-xl px-3.5 text-sm font-bold transition-colors ${day === d.value ? 'bg-ink text-canvas' : 'bg-canvas text-ink hover:bg-segment'}`}>
                                            {d.label}
                                        </button>
                                    ))}
                                    <input type="date" value={day} max={ymd()} onChange={(e) => e.target.value && setDay(e.target.value)} aria-label="Pick a date" className="h-[38px] rounded-xl border border-line bg-card px-2.5 text-sm font-bold text-ink" />
                                </div>
                                {err('date')}
                            </div>

                            <label className="flex flex-col gap-1 text-[13.5px] font-bold text-slate">
                                {tab === 'income' ? 'From' : 'Note'}
                                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={tab === 'income' ? 'Salary' : 'Optional'} maxLength={255} className={field} />
                                {err('note')}
                            </label>
                            {(tab === 'spent' || tab === 'refund') && place.startsWith('e:') ? (
                                premium ? (
                                    <div className="flex flex-col gap-1">
                                        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="hidden" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />
                                        {receipt ? (
                                            <div className="flex items-center gap-2 rounded-xl bg-canvas px-3 py-2 text-sm font-bold">
                                                <Icon name="receipt" size={16} stroke={2} />
                                                <span className="min-w-0 flex-1 truncate">{receipt.name}</span>
                                                <button type="button" onClick={() => { setReceipt(null); if (fileRef.current) fileRef.current.value = ''; }} className="text-teal hover:underline">
                                                    Remove
                                                </button>
                                            </div>
                                        ) : (
                                            <button type="button" onClick={() => fileRef.current?.click()} className="flex h-10 items-center gap-2 self-start rounded-xl px-1 text-sm font-bold text-teal hover:underline">
                                                <Icon name="receipt" size={16} stroke={2} />
                                                Add a receipt photo
                                            </button>
                                        )}
                                        {err('receipt')}
                                    </div>
                                ) : (
                                    <p className="text-[13px] text-slate">Receipt photos come with Premium.</p>
                                )
                            ) : null}
                            {err('form')}

                            {added.length ? (
                                <div className="border-t border-line pt-3">
                                    <div className="text-[13px] font-bold text-slate">Added while this was open</div>
                                    <AnimatePresence initial={false}>
                                        {added.map((a) => (
                                            <motion.div key={a.key} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex justify-between overflow-hidden py-2 text-sm font-bold">
                                                <span>{a.text}</span>
                                                <span className="num">{formatMoney(a.amount)}</span>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            ) : null}
                        </div>

                        <div className="flex flex-col gap-2 border-t border-line px-6 pt-3.5 pb-[18px]">
                            <div className="flex gap-2.5">
                                <button type="button" onClick={() => send(true)} disabled={busy} className="h-[50px] flex-1 rounded-2xl bg-tint text-[15px] font-extrabold text-teal transition-transform active:scale-[0.97] disabled:opacity-60">
                                    Save and add another
                                </button>
                                <button type="submit" disabled={busy} className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl bg-mint text-base font-extrabold text-on-mint transition-transform active:scale-[0.97] disabled:opacity-80">
                                    {done ? (
                                        <motion.svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" initial={{ scale: 0.6 }} animate={{ scale: 1 }}>
                                            <motion.path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3 }} />
                                        </motion.svg>
                                    ) : null}
                                    {done ? 'Saved' : busy ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                            <div className="hidden text-center text-[12.5px] text-slate sm:block">Enter saves · {MOD} Enter saves and adds another · Esc closes</div>
                        </div>
                    </motion.form>
                </>
            ) : null}
        </AnimatePresence>
    );
}
