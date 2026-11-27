import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import HelpButton from '@/components/HelpButton';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { HoldingMoney, HoldingPanel, pct, signed, type Holding, type Purpose, type Returns, type Valuation } from '@/components/HoldingParts';
import Icon from '@/components/Icon';
import Money from '@/components/Money';
import Shell from '@/components/Shell';
import SidePanel from '@/components/SidePanel';
import { cleanTyped, toAmount, ymd } from '@/lib/amount';
import { useApp } from '@/lib/app';
import { dayLabel, formatMoney, isNegative, monthName, toCents } from '@/lib/format';
import { ARRIVE } from '@/lib/motion';
import { currencyName, foreignSymbol, homeSymbol } from '@/shared/currency';
import { fromCents, randToUsd, rateLine, usdToRand } from '@/shared/money';

type Account = { id: number; name: string; visibility: string; currency?: string; rate?: string | null; rate_updated_at?: string | null; balance: string; value: string | null; gain: string | null; simple_return?: string | null; value_foreign?: string | null };
type Props = {
    account: Account;
    holdings: Holding[];
    returns: Record<string, Returns>;
    valuations: Record<string, Valuation[]>;
    purposes: Purpose[];
    period: 'cycle' | 'ytd' | 'all';
    month: string | null;
};

/**
 * W12 One investment: "How is it doing?" Worth, gain and simple return first; then holdings with
 * the time-weighted return for this month, year to date or since start. Update values turns every
 * holding's worth into a field and saves them together. A holding opens beside the table. W12b: a
 * foreign account (any currency, design/currencies.md) shows its own figures under the budget's and
 * a rate strip whose Update rate previews the move.
 */
export default function Investment(p: Props) {
    const { toast } = useApp();
    const reduced = useReducedMotion();
    const a = p.account;
    // A rate means the account is in another currency than the budget's.
    const foreign = a.rate ? a.currency : undefined;
    const ccy = { foreign, rate: a.rate ?? '1' };
    const [openId, setOpenId] = useState<number | null>(null);
    const [money, setMoney] = useState<'add' | 'expense' | null>(null);
    const [updating, setUpdating] = useState(false);
    const [drafts, setDrafts] = useState<Record<number, string>>({});
    const [valueDay, setValueDay] = useState(ymd());
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    const [adding, setAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [rateEditing, setRateEditing] = useState(false);
    const [rate, setRate] = useState(a.rate ?? '');

    const open = p.holdings.find((h) => h.id === openId);
    useEffect(() => {
        if (openId !== null && !open) setOpenId(null);
    }, [openId, open]);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !(e.target as HTMLElement)?.closest?.('input, select, textarea') && setOpenId(null);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const value = a.value ?? '0.00';
    const gain = a.gain ?? '0.00';
    const lastValued = p.holdings.map((h) => h.last_valuation?.date).filter(Boolean).sort().pop();
    const inForeign = (amount: string) => formatMoney(amount, { foreign });
    const periods: { key: Props['period']; label: string }[] = [
        { key: 'cycle', label: p.month ? monthName(p.month) : 'This month' },
        { key: 'ytd', label: 'Year to date' },
        { key: 'all', label: 'Since start' },
    ];

    function startUpdate() {
        setOpenId(null);
        setErrors({});
        setDrafts(Object.fromEntries(p.holdings.map((h) => [h.id, (foreign ? randToUsd(h.value, ccy.rate) : h.value).replace(/\.00$/, '')])));
        setValueDay(ymd());
        setUpdating(true);
    }
    const changedValues = p.holdings.filter((h) => drafts[h.id] !== undefined && (foreign ? usdToRand(toAmount(drafts[h.id]), ccy.rate) : toAmount(drafts[h.id])) !== h.value);

    function saveValues(e: FormEvent) {
        e.preventDefault();
        if (!changedValues.length || busy) return;
        const lines = changedValues.map((h) => ({ holding_id: h.id, value: foreign ? usdToRand(toAmount(drafts[h.id]), ccy.rate) : toAmount(drafts[h.id]) }));
        setBusy(true);
        router.post(`/investments/${a.id}/values`, { date: valueDay, values: lines }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                toast({ text: `✓ ${lines.length} ${lines.length === 1 ? 'value' : 'values'} saved, dated ${valueDay === ymd() ? 'today' : dayLabel(valueDay)}` });
                setUpdating(false);
                setErrors({});
            },
            onError: (er) => {
                // "values.1.value" → that holding's field.
                setErrors(Object.fromEntries(Object.entries(er as Record<string, string>).map(([k, v]) => {
                    const m = /^values\.(\d+)\./.exec(k);
                    return [m ? String(lines[Number(m[1])].holding_id) : k, v];
                })));
            },
            onFinish: () => setBusy(false),
        });
    }

    function addHolding(e: FormEvent) {
        e.preventDefault();
        if (!newName.trim()) return;
        router.post(`/investments/${a.id}/holdings`, { name: newName.trim() }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                toast({ text: `✓ ${newName.trim()} added` });
                setNewName('');
                setAdding(false);
            },
            onError: (er) => setErrors(er as Record<string, string>),
        });
    }

    function saveRate(e: FormEvent) {
        e.preventDefault();
        router.put(`/investments/${a.id}/rate`, { rate }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setRateEditing(false);
                setErrors({});
                toast({ text: '✓ Rate saved. Every holding is valued at it, dated today.' });
            },
            onError: (er) => setErrors(er as Record<string, string>),
        });
    }
    const rateMove = (() => {
        const now = Number(ccy.rate);
        const next = Number(rate);
        if (!(next > 0) || !(now > 0)) return null;
        const change = (next / now - 1) * 100;
        return `Every holding moves ${change >= 0 ? '+' : '−'}${Math.abs(change).toFixed(2)}% in ${homeSymbol()}, at the same ${foreign ? foreignSymbol(foreign) : ''} price`;
    })();

    // With a holding open beside the table, Put in and Simple step aside so names keep their room.
    const cols = open
        ? 'grid-cols-[minmax(0,1fr)_110px_100px] @2xl:grid-cols-[minmax(0,1.5fr)_120px_120px_100px]'
        : 'grid-cols-[minmax(0,1fr)_110px_100px] @2xl:grid-cols-[minmax(0,1.5fr)_120px_120px_120px_80px_100px]';
    const extra = open ? 'hidden' : 'hidden @2xl:block';
    const twrCol = 'hidden @2xl:block';

    return (
        <>
            <Head title={a.name} />
            <div className="flex flex-col gap-5">
                <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[14px] font-bold text-slate">
                    <Link href="/accounts" className="hover:text-ink hover:underline">
                        Accounts
                    </Link>
                    <Icon name="chevronRight" size={13} stroke={2.4} />
                    <span className="truncate text-ink">{a.name}</span>
                </nav>
                <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5">
                            <h1 className="min-w-0 truncate text-[28px] leading-tight font-extrabold tracking-[-0.02em]">{a.name}</h1>
                            <HelpButton topic="investmentAccount" />
                        </div>
                        <p className="mt-0.5 text-[15px] text-slate">
                            {foreign ? `Investment · ${currencyName(foreign)}` : 'Investment'} · {a.visibility === 'private' ? 'only me' : 'shared'} · {p.holdings.length} {p.holdings.length === 1 ? 'holding' : 'holdings'}
                            {lastValued ? ` · last valued ${dayLabel(lastValued)}` : ''}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setMoney('add')} aria-haspopup="dialog" className="flex h-11 items-center gap-2 rounded-[14px] bg-mint px-4 text-[15px] font-extrabold text-on-mint transition-transform active:scale-[0.97]">
                            <Icon name="plus" size={16} stroke={2.4} />
                            Add money
                        </button>
                        <button type="button" onClick={() => setMoney('expense')} aria-haspopup="dialog" className="h-11 rounded-[14px] bg-card px-4 text-[15px] font-extrabold hover:bg-segment">
                            Withdraw
                        </button>
                        <button type="button" onClick={startUpdate} aria-haspopup="dialog" disabled={!p.holdings.length} className="h-11 rounded-[14px] bg-card px-4 text-[15px] font-extrabold hover:bg-segment disabled:opacity-50">
                            Update values
                        </button>
                    </div>
                </div>


                {foreign ? (
                    <form onSubmit={saveRate} className="flex flex-wrap items-center gap-3 rounded-[18px] bg-navy-tint px-5 py-3 text-[14.5px] text-navy-text">
                        <span className="font-extrabold">{rateLine(ccy.rate, foreign)}</span>
                        {a.rate_updated_at ? <span>· updated {dayLabel(a.rate_updated_at.slice(0, 10))}</span> : null}
                        <span className="flex-1" />
                        {rateEditing ? (
                            <>
                                <label className="flex items-center gap-2 font-bold">
                                    {homeSymbol()} per {foreignSymbol(foreign)}1
                                    <input autoFocus value={rate} onChange={(e) => setRate(cleanTyped(e.target.value).replace(/(\.\d{4}).*/, '$1'))} inputMode="decimal" className="num h-9 w-[110px] rounded-lg border border-line bg-card px-2.5 font-bold text-ink outline-none focus:border-mint" />
                                </label>
                                {rateMove ? <span className="num text-[13px] font-bold">{rateMove}</span> : null}
                                <button type="submit" className="h-9 rounded-lg bg-mint px-3.5 font-extrabold text-on-mint">
                                    Save rate
                                </button>
                                <button type="button" onClick={() => { setRateEditing(false); setRate(a.rate ?? ''); }} className="h-9 px-2 font-bold">
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <button type="button" onClick={() => setRateEditing(true)} className="h-9 rounded-lg bg-card px-3.5 font-extrabold text-ink hover:bg-segment">
                                Update rate
                            </button>
                        )}
                        {errors.rate ? <span className="w-full font-bold text-red-ink">{errors.rate}</span> : null}
                    </form>
                ) : null}

                <div className="flex items-start gap-5">
                    <div className="flex min-w-0 flex-1 flex-col gap-5">
                        <section aria-label="Worth now" className="rounded-[24px] bg-card px-6 py-6">
                            <div className="text-[15px] font-bold text-slate">Worth now</div>
                            <div className="mt-1 text-[44px] leading-[52px] font-extrabold tracking-[-0.04em]">
                                <Money amount={value} />
                            </div>
                            {foreign ? <div className="num text-[15px] font-bold text-slate">{inForeign(a.value_foreign ?? randToUsd(value, ccy.rate))} at {rateLine(ccy.rate, foreign)}</div> : null}
                            <div className={`num mt-2 text-[15px] font-extrabold ${isNegative(gain) ? 'text-red' : 'text-teal'}`}>
                                {signed(gain)} {isNegative(gain) ? 'loss' : 'gain'}
                                {a.simple_return ? ` · ${pct(a.simple_return)} simple return` : ''}
                            </div>
                            <div className="num mt-0.5 text-[13.5px] text-slate">On {formatMoney(a.balance)} put in, after money taken out</div>
                        </section>

                        <section aria-labelledby="holdings" className="@container overflow-hidden rounded-[24px] bg-card">
                            <div className="flex flex-wrap items-center gap-3 px-5 pt-4 pb-3">
                                <h2 id="holdings" className="text-[17px] font-extrabold">
                                    Holdings
                                </h2>
                                <span className="flex-1" />
                                <span className="text-[13px] font-bold text-slate">Time-weighted return for</span>
                                <div role="radiogroup" aria-label="Period" className="flex gap-1 rounded-xl bg-segment p-1">
                                    {periods.map((x) => (
                                        <button
                                            key={x.key}
                                            type="button"
                                            role="radio"
                                            aria-checked={p.period === x.key}
                                            onClick={() => router.get(`/investments/${a.id}`, { period: x.key }, { preserveState: true, preserveScroll: true, replace: true, only: ['holdings', 'returns', 'period'] })}
                                            className={`h-8 rounded-[10px] px-3 text-[13px] font-extrabold ${p.period === x.key ? 'bg-card text-ink' : 'text-slate hover:text-ink'}`}
                                        >
                                            {x.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div role="row" className={`grid ${cols} items-center gap-3 border-y border-line px-5 py-2.5 text-[12.5px] font-bold text-slate`}>
                                    <span>Holding</span>
                                    <span className="text-right">Worth</span>
                                    <span className={`text-right ${extra}`}>Put in</span>
                                    <span className="text-right">Gain</span>
                                    <span className={`text-right ${extra}`}>Simple</span>
                                    <span className={`text-right ${twrCol}`}>Time-weighted</span>
                                </div>
                                {p.holdings.length === 0 ? <p className="px-5 py-6 text-[15px] text-slate">No holdings yet. Add one for each fund or share you hold here.</p> : null}
                                {p.holdings.map((h) => {
                                    const r = p.returns[String(h.id)];
                                    const sel = h.id === openId;
                                    return (
                                        <div
                                            key={h.id}
                                            role="row"
                                            onClick={() => setOpenId(sel ? null : h.id)}
                                            className={`grid ${cols} items-center gap-3 border-b border-line px-5 py-3 transition-colors cursor-pointer ${sel ? 'bg-navy-tint' : 'hover:bg-canvas'}`}
                                        >
                                            <span className="min-w-0">
                                                <button type="button" onClick={(e) => { e.stopPropagation(); setOpenId(sel ? null : h.id); }} aria-expanded={sel} className="block max-w-full truncate text-left text-[15px] font-bold">
                                                    {h.name}
                                                </button>
                                                <span className="block truncate text-[12.5px] text-slate">{h.positions.map((x) => x.purpose).join(', ') || 'Nothing in it yet'}</span>
                                            </span>
                                            <span className="text-right">
                                                <span className="num block text-[15px] font-extrabold">{formatMoney(h.value)}</span>
                                                {foreign && h.value_foreign ? <span className="num block text-[12.5px] text-slate">{inForeign(h.value_foreign)}</span> : null}
                                            </span>
                                            <span className={`num text-right text-[14.5px] ${extra}`}>{r ? formatMoney(r.net_contributed) : '—'}</span>
                                            <span className={`num text-right text-[14.5px] font-bold ${r && isNegative(r.gain) ? 'text-red' : 'text-teal'}`}>{r ? signed(r.gain) : '—'}</span>
                                            <span className={`num text-right text-[14.5px] ${extra}`}>{r ? pct(r.simple_return) : '—'}</span>
                                            <span className={`num text-right text-[14.5px] font-bold ${twrCol}`}>{r ? pct(r.time_weighted_return) : '—'}</span>
                                        </div>
                                    );
                                })}
                                {p.holdings.length ? (
                                    <div className={`grid ${cols} items-center gap-3 bg-canvas/60 px-5 py-3 text-[14.5px] font-extrabold`}>
                                        <span>Total</span>
                                        <span className="num text-right">{formatMoney(value)}</span>
                                        <span className={`num text-right ${extra}`}>{formatMoney(a.balance)}</span>
                                        <span className={`num text-right ${isNegative(gain) ? 'text-red' : 'text-teal'}`}>{signed(gain)}</span>
                                        <span className={`num text-right ${extra}`}>{pct(a.simple_return ?? null)}</span>
                                        <span className={twrCol} />
                                    </div>
                                ) : null}
                            </div>
                                <div className="flex flex-wrap items-center gap-3 px-5 py-3">
                                    {adding ? (
                                        <form onSubmit={addHolding} onKeyDown={(e) => e.key === 'Escape' && setAdding(false)} className="flex flex-1 flex-wrap items-center gap-2">
                                            <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={100} placeholder="Holding name, like S&P 500 ETF" aria-label="Holding name" className="h-10 min-w-[220px] flex-1 rounded-xl border border-line bg-card px-3 text-[15px] font-bold outline-none focus:border-mint" />
                                            <button type="submit" disabled={!newName.trim()} className="h-10 rounded-xl bg-mint px-4 text-[14.5px] font-extrabold text-on-mint disabled:opacity-60">
                                                Add
                                            </button>
                                            <button type="button" onClick={() => setAdding(false)} className="h-10 px-2 text-[14.5px] font-bold text-teal">
                                                Cancel
                                            </button>
                                            {errors.name ? <span className="w-full text-[13px] font-bold text-red-ink">{errors.name}</span> : null}
                                        </form>
                                    ) : (
                                        <button type="button" onClick={() => setAdding(true)} className="flex h-10 items-center gap-2 text-[14.5px] font-bold text-teal hover:underline">
                                            <Icon name="plus" size={16} stroke={2.4} />
                                            Add holding
                                        </button>
                                    )}
                                    <span className="text-[12.5px] text-slate">Simple return is gain over what you put in. Time-weighted follows the price only, so when you added money doesn’t change it.</span>
                                </div>
                        </section>
                    </div>

                    <AnimatePresence>
                        {open ? (
                            <>
                                <motion.div key="scrim" className="fixed inset-0 z-40 bg-scrim xl:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpenId(null)} />
                                <motion.aside
                                    key="panel"
                                    aria-label={`${open.name} details`}
                                    initial={reduced ? { opacity: 0 } : { opacity: 0, x: 24 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={reduced ? { opacity: 0 } : { opacity: 0, x: 24, transition: { duration: 0.18 } }}
                                    transition={{ duration: 0.28, ease: ARRIVE }}
                                    className="fixed inset-y-0 right-0 z-50 w-[min(420px,100vw)] overflow-y-auto bg-canvas p-3 xl:sticky xl:top-5 xl:z-auto xl:max-h-[calc(100vh-40px)] xl:w-[380px] xl:flex-none xl:rounded-[24px] xl:p-0"
                                >
                                    <HoldingPanel key={open.id} accountId={a.id} h={open} ret={p.returns[String(open.id)]} values={p.valuations[String(open.id)] ?? []} purposes={p.purposes} ccy={ccy} onClose={() => setOpenId(null)} />
                                </motion.aside>
                            </>
                        ) : null}
                    </AnimatePresence>
                </div>
            </div>

            <SidePanel open={money !== null} title={money === 'expense' ? 'Withdraw' : 'Add money'} sub={a.name} onClose={() => setMoney(null)}>
                {money ? <HoldingMoney key={money} plain accountId={a.id} kind={money} holdings={p.holdings} purposes={p.purposes} ccy={ccy} onDone={() => setMoney(null)} /> : null}
            </SidePanel>

            <SidePanel
                open={updating}
                title="Update values"
                sub={a.name}
                onClose={() => { setUpdating(false); setErrors({}); }}
                footer={
                    <form onSubmit={saveValues} className="flex flex-col gap-2">
                        {errors.date || errors.form ? <span className="text-[13px] font-bold text-red-ink">{errors.date || errors.form}</span> : null}
                        <div className="flex gap-2">
                            <button type="submit" disabled={!changedValues.length || busy} className="h-11 flex-1 rounded-xl bg-mint px-4 text-[15px] font-extrabold text-on-mint transition-transform active:scale-[0.98] disabled:opacity-50">
                                {busy ? 'Saving…' : changedValues.length ? `Save ${changedValues.length} ${changedValues.length === 1 ? 'value' : 'values'}` : 'Change a value to save'}
                            </button>
                            <button type="button" onClick={() => { setUpdating(false); setErrors({}); }} className="h-11 rounded-xl bg-canvas px-4 text-[15px] font-bold hover:bg-segment">
                                Cancel
                            </button>
                        </div>
                    </form>
                }
            >
                <ol className="flex flex-col gap-2 rounded-2xl bg-canvas p-4 text-[13.5px] text-slate">
                    <li><b className="text-ink">1.</b> Open your provider’s app or statement.</li>
                    <li><b className="text-ink">2.</b> Type what each holding is worth{foreign ? `, in ${foreignSymbol(foreign)} as the platform shows it` : ''}. Leave the ones that haven’t changed.</li>
                    <li><b className="text-ink">3.</b> Save. No money moves: only the value changes, and gain or loss follows.</li>
                </ol>
                <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                    Valued on
                    <input type="date" value={valueDay} max={ymd()} onChange={(e) => e.target.value && setValueDay(e.target.value)} className="h-11 rounded-xl border border-line bg-card px-3 text-[15px] font-bold text-ink outline-none focus:border-mint" />
                </label>
                <div className="flex flex-col divide-y divide-line">
                    {p.holdings.map((h) => {
                        const now = foreign ? randToUsd(h.value, ccy.rate) : h.value;
                        const typed = drafts[h.id] ?? '';
                        const next = typed === '' ? null : foreign ? usdToRand(toAmount(typed), ccy.rate) : toAmount(typed);
                        const diff = next === null ? 0n : toCents(next) - toCents(h.value);
                        return (
                            <div key={h.id} className="flex flex-col gap-1.5 py-3">
                                <div className="flex items-baseline justify-between gap-3">
                                    <span className="truncate text-[15px] font-extrabold">{h.name}</span>
                                    <span className="num flex-none text-[12.5px] text-slate">
                                        Now {foreign ? inForeign(now) : formatMoney(now)}
                                        {h.last_valuation?.date ? ` · ${dayLabel(h.last_valuation.date)}` : ''}
                                    </span>
                                </div>
                                <span className="relative">
                                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[15px] font-bold text-slate">{foreign ? foreignSymbol(foreign) : homeSymbol()}</span>
                                    <input value={typed} onChange={(e) => setDrafts((d) => ({ ...d, [h.id]: cleanTyped(e.target.value) }))} onFocus={(e) => e.target.select()} inputMode="decimal" aria-label={`What ${h.name} is worth`} className="num h-11 w-full rounded-xl border border-line bg-card pr-3 pl-7 text-right text-[16px] font-extrabold outline-none focus:border-mint" />
                                </span>
                                {diff !== 0n ? (
                                    <span className={`num text-right text-[12.5px] font-bold ${diff < 0n ? 'text-red' : 'text-teal'}`}>
                                        {diff > 0n ? '+' : '−'}
                                        {formatMoney(fromCents(diff < 0n ? -diff : diff))} {diff > 0n ? 'gain' : 'loss'} since its last value
                                    </span>
                                ) : null}
                                {errors[String(h.id)] ? <span className="text-[12.5px] font-bold text-red-ink">{errors[String(h.id)]}</span> : null}
                            </div>
                        );
                    })}
                </div>
            </SidePanel>
        </>
    );
}

Investment.layout = (page: ReactNode) => (
    <Shell active="accounts" title="Investment">
        {page}
    </Shell>
);
