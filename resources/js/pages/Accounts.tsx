import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import HelpButton from '@/components/HelpButton';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AccountPanel, { goalChip, kindLabel, type Account, type Goal, type Move } from '@/components/AccountPanel';
import Icon from '@/components/Icon';
import Money from '@/components/Money';
import Shell from '@/components/Shell';
import { cleanTyped } from '@/lib/amount';
import { formatMoney, isNegative, toCents } from '@/lib/format';
import { ARRIVE } from '@/lib/motion';
import { fromCents } from '@/shared/money';

type Purpose = { id: number; name: string; value: string; gain: string };
type Props = {
    accounts: Account[];
    totals: { savings: string; holding: string; investments: string; total: string };
    purposes: Purpose[];
    goals: Goal[];
    open_id: number | null;
    moves: Move[];
    shared: boolean;
    budget_name: string;
};

const share = (part: string, whole: string) => (toCents(whole) > 0n ? Number((toCents(part) * 1000n) / toCents(whole)) / 10 : 0);

/**
 * W11 Accounts: "What's everything worth?" The navy total first, with the investment gain and a
 * split bar; account tiles (a savings or holding one opens beside them; an investment has its own
 * page); what the investments are for. New account opens beside the tiles too.
 */
export default function Accounts(p: Props) {
    const reduced = useReducedMotion();
    const [panel, setPanel] = useState<number | 'new' | null>(p.open_id);
    // The server's choice wins (a new account opens once it's made); New account stays open until then.
    useEffect(() => setPanel((cur) => (p.open_id !== null ? p.open_id : cur === 'new' ? cur : null)), [p.open_id]);

    const invest = p.accounts.filter((a) => a.type === 'investment');
    const putIn = fromCents(invest.reduce((t, a) => t + toCents(a.balance), 0n));
    const gain = fromCents(invest.reduce((t, a) => t + toCents(a.gain ?? '0'), 0n));
    const parts = [
        { label: 'Investments', amount: p.totals.investments, tone: 'bg-mint' },
        { label: 'Savings', amount: p.totals.savings, tone: 'bg-white' },
        // Holding is a warm sun yellow: navy (the card) and white (savings) can't tell it apart.
        { label: 'Holding', amount: p.totals.holding, tone: 'bg-[#F5BE4F]' },
    ].filter((x) => toCents(x.amount) > 0n);
    const goalOf = (id: number) => p.goals.find((g) => g.account_id === id);
    const open = typeof panel === 'number' ? p.accounts.find((a) => a.id === panel) : undefined;

    function openAccount(a: Account) {
        if (panel === a.id) return closePanel();
        setPanel(a.id);
        router.get('/accounts', { account: a.id }, { only: ['open_id', 'moves'], preserveState: true, preserveScroll: true, replace: true });
    }
    function closePanel() {
        setPanel(null);
        router.replace({ url: '/accounts', preserveState: true, preserveScroll: true, props: (old) => ({ ...old, open_id: null, moves: [] }) });
    }
    useEffect(() => {
        if (panel === null) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !(e.target as HTMLElement)?.closest?.('input, select, textarea') && closePanel();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    return (
        <>
            <Head title="Accounts" />
            <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.02em]">Accounts</h1>
                            <HelpButton topic="accounts" />
                        </div>
                        <p className="mt-0.5 text-[15px] text-slate">Money kept outside your envelopes</p>
                    </div>
                    <button type="button" onClick={() => setPanel('new')} className="flex h-11 items-center gap-2 rounded-[14px] bg-card px-4 text-[15px] font-extrabold transition-transform hover:bg-segment active:scale-[0.97]">
                        <Icon name="plus" size={16} stroke={2.4} />
                        New account
                    </button>
                </div>

                <div className="flex items-start gap-5">
                    <div className="flex min-w-0 flex-1 flex-col gap-5">
                        <section aria-label="Everything in your accounts" className="rounded-[24px] bg-navy px-6 py-6 text-white">
                            <div className="text-[15px] font-bold text-white/75">Everything in your accounts</div>
                            <div className="mt-1 text-[44px] leading-[52px] font-extrabold tracking-[-0.04em]">
                                <Money amount={p.totals.total} />
                            </div>
                            {invest.length ? (
                                <div className="num mt-1 text-[14.5px] font-bold text-white/80">
                                    <span className={isNegative(gain) ? 'text-red-tint' : 'text-mint-light'}>{formatMoney(gain, { income: !isNegative(gain) })}</span> investment {isNegative(gain) ? 'loss' : 'gain'} on {formatMoney(putIn)} put in
                                </div>
                            ) : null}
                            {parts.length ? (
                                <>
                                    <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
                                        {parts.map((x, i) => (
                                            <motion.div key={x.label} className={`h-full ${x.tone}`} initial={reduced ? false : { width: 0 }} animate={{ width: `${share(x.amount, p.totals.total)}%` }} transition={{ duration: 0.6, ease: ARRIVE, delay: 0.05 * i }} />
                                        ))}
                                    </div>
                                    <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-bold text-white/80">
                                        {parts.map((x) => (
                                            <span key={x.label} className="flex items-center gap-1.5">
                                                <span className={`size-2 rounded-full ${x.tone}`} />
                                                {x.label} {Math.round(share(x.amount, p.totals.total))}%
                                            </span>
                                        ))}
                                    </div>
                                </>
                            ) : null}
                        </section>

                        {p.accounts.length === 0 ? (
                            <div className="rounded-[24px] bg-card px-6 py-7">
                                <h2 className="text-[19px] font-extrabold">No accounts yet</h2>
                                <p className="mt-1 text-[15px] text-slate">Savings, money held for a known bill, or investments. They sit outside your envelopes.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
                                {p.accounts.map((a) => {
                                    const g = goalOf(a.id);
                                    const on = panel === a.id;
                                    const meta =
                                        a.type === 'investment'
                                            ? `${a.gain ? `${formatMoney(a.gain, { income: !isNegative(a.gain) })} ${isNegative(a.gain) ? 'loss' : 'gain'} · ` : ''}${a.currency === 'USD' ? 'US dollar · ' : ''}Holdings ›`
                                            : g
                                              ? `${g.name === a.name ? 'Goal' : `${g.name} goal`} · ${goalChip(g)}`
                                              : a.visibility === 'private'
                                                ? 'Only you can see this'
                                                : '';
                                    const tile = (
                                        <>
                                            <span className="text-[12.5px] font-bold text-slate">{kindLabel(a)}</span>
                                            <span className="truncate text-[16px] font-extrabold">{a.name}</span>
                                            <span className="text-[22px] font-extrabold tracking-[-0.02em]">
                                                <Money amount={a.value ?? a.balance} />
                                            </span>
                                            <span className={`num truncate text-[13px] font-bold ${a.type === 'investment' && a.gain && !isNegative(a.gain) ? 'text-teal' : 'text-slate'}`}>{meta || ' '}</span>
                                        </>
                                    );
                                    const cls = `flex flex-col gap-0.5 rounded-[20px] px-5 py-4 text-left transition-transform active:scale-[0.98] ${on ? 'bg-card ring-2 ring-navy ring-inset' : 'bg-navy-tint hover:ring-1 hover:ring-navy-line hover:ring-inset'}`;
                                    return a.type === 'investment' ? (
                                        <Link key={a.id} href={`/investments/${a.id}`} className={cls}>
                                            {tile}
                                        </Link>
                                    ) : (
                                        <button key={a.id} type="button" onClick={() => openAccount(a)} aria-expanded={on} className={cls}>
                                            {tile}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {p.purposes.length ? (
                            <section aria-labelledby="purposes" className="rounded-[24px] bg-card px-5 py-2">
                                <h2 id="purposes" className="pt-3 pb-1 text-[15px] font-extrabold">
                                    What your investments are for
                                </h2>
                                {p.purposes.map((x, i) => (
                                    <div key={x.id} className={`flex items-center gap-3 py-3 ${i ? 'border-t border-line' : ''}`}>
                                        <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{x.name}</span>
                                        <span className="num text-[15px] font-extrabold">{formatMoney(x.value)}</span>
                                        <span className={`num w-[110px] text-right text-[13.5px] font-bold ${isNegative(x.gain) ? 'text-red' : 'text-teal'}`}>{formatMoney(x.gain, { income: !isNegative(x.gain) })}</span>
                                    </div>
                                ))}
                            </section>
                        ) : null}
                    </div>

                    <AnimatePresence>
                        {panel !== null && (panel === 'new' || open) ? (
                            <>
                                <motion.div key="scrim" className="fixed inset-0 z-40 bg-scrim xl:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closePanel} />
                                <motion.aside
                                    key="panel"
                                    aria-label={panel === 'new' ? 'New account' : `${open?.name} details`}
                                    initial={reduced ? { opacity: 0 } : { opacity: 0, x: 24 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={reduced ? { opacity: 0 } : { opacity: 0, x: 24, transition: { duration: 0.18 } }}
                                    transition={{ duration: 0.28, ease: ARRIVE }}
                                    className="fixed inset-y-0 right-0 z-50 w-[min(420px,100vw)] overflow-y-auto bg-canvas p-3 xl:sticky xl:top-5 xl:z-auto xl:max-h-[calc(100vh-40px)] xl:w-[380px] xl:flex-none xl:rounded-[24px] xl:p-0"
                                >
                                    {panel === 'new' ? (
                                        <NewAccount budgetName={p.budget_name} onClose={closePanel} />
                                    ) : open ? (
                                        <AccountPanel key={open.id} a={open} goal={goalOf(open.id)} moves={p.open_id === open.id ? p.moves : []} budgetName={p.budget_name} shared={p.shared} onClose={closePanel} />
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

const TYPES = [
    { key: 'savings', label: 'Savings', sub: 'Money put aside, like an emergency fund' },
    { key: 'holding', label: 'Holding', sub: 'Kept for a known bill, like the car licence' },
    { key: 'investment', label: 'Investment', sub: 'Holdings with a value, split by purpose' },
] as const;

/** New account: name, Savings / Holding / Investment, Rand or US dollar with the rate, shared or only me. */
function NewAccount({ budgetName, onClose }: { budgetName: string; onClose: () => void }) {
    const [name, setName] = useState('');
    const [type, setType] = useState<(typeof TYPES)[number]['key']>('savings');
    const [usd, setUsd] = useState(false);
    const [rate, setRate] = useState('');
    const [priv, setPriv] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    const dollars = type === 'investment' && usd;

    function create(e: FormEvent) {
        e.preventDefault();
        if (!name.trim() || busy) return;
        setBusy(true);
        router.post('/accounts', { name: name.trim(), type, visibility: priv ? 'private' : 'shared', ...(dollars ? { currency: 'USD', usd_rate: rate } : {}) }, {
            preserveScroll: true,
            onError: (er) => setErrors(er as Record<string, string>),
            onFinish: () => setBusy(false),
        });
    }

    const choice = (on: boolean) => (on ? 'bg-tint ring-2 ring-mint ring-inset' : 'bg-canvas hover:bg-segment');

    return (
        <form onSubmit={create} onKeyDown={(e) => e.key === 'Escape' && onClose()} className="flex flex-col gap-4 rounded-[24px] bg-card p-5">
            <div className="flex items-center gap-3">
                <h2 className="flex-1 text-[19px] font-extrabold">New account</h2>
                <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-canvas text-slate hover:text-ink">
                    <Icon name="close" size={16} stroke={2.2} />
                </button>
            </div>
            <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                Name
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="Emergency fund" className="h-11 rounded-xl border border-line bg-card px-3 text-[15px] font-bold text-ink outline-none focus:border-mint" />
                {errors.name ? <span className="text-red-ink">{errors.name}</span> : null}
            </label>
            <div role="radiogroup" aria-label="Kind" className="flex flex-col gap-2">
                {TYPES.map((t) => (
                    <button key={t.key} type="button" role="radio" aria-checked={type === t.key} onClick={() => setType(t.key)} className={`rounded-2xl px-4 py-3 text-left transition-colors ${choice(type === t.key)}`}>
                        <span className="block text-[15px] font-extrabold">{t.label}</span>
                        <span className="block text-[13px] text-slate">{t.sub}</span>
                    </button>
                ))}
                {errors.type ? <span className="text-[13px] font-bold text-red-ink">{errors.type}</span> : null}
            </div>
            {type === 'investment' ? (
                <div className="flex flex-col gap-2 text-[13px] font-bold text-slate">
                    Currency the platform shows
                    <div role="radiogroup" aria-label="Currency" className="grid grid-cols-2 gap-1 rounded-xl bg-segment p-1">
                        {[false, true].map((v) => (
                            <button key={String(v)} type="button" role="radio" aria-checked={usd === v} onClick={() => setUsd(v)} className={`h-9 rounded-[10px] text-[14px] font-extrabold ${usd === v ? 'bg-card text-ink' : 'text-slate'}`}>
                                {v ? 'US dollar' : 'Rand'}
                            </button>
                        ))}
                    </div>
                    {usd ? (
                        <label className="flex flex-col gap-1">
                            Rand for $1
                            <input value={rate} onChange={(e) => setRate(cleanTyped(e.target.value).replace(/(\.\d{4}).*/, '$1'))} inputMode="decimal" placeholder="18.25" className="num h-11 rounded-xl border border-line bg-card px-3 text-[15px] font-bold text-ink outline-none focus:border-mint" />
                            <span className="font-semibold">You’ll type dollars, as the platform shows them. PocFin keeps rand. Set once; you can update the rate later.</span>
                            {errors.usd_rate || errors.currency ? <span className="text-red-ink">{errors.usd_rate || errors.currency}</span> : null}
                        </label>
                    ) : null}
                </div>
            ) : null}
            <div className="flex flex-col gap-1.5 text-[13px] font-bold text-slate">
                Who sees it
                <div role="radiogroup" aria-label="Who sees it" className="grid grid-cols-2 gap-1 rounded-xl bg-segment p-1">
                    {[false, true].map((v) => (
                        <button key={String(v)} type="button" role="radio" aria-checked={priv === v} onClick={() => setPriv(v)} className={`h-9 truncate rounded-[10px] px-2 text-[13.5px] font-extrabold ${priv === v ? 'bg-card text-ink' : 'text-slate'}`}>
                            {v ? 'Only me' : `Shared with ${budgetName}`}
                        </button>
                    ))}
                </div>
                <span className="font-semibold">{priv ? 'Only you see it, its balance and its history. Others see “private account” on shared envelope moves.' : `Everyone in ${budgetName} can see it and use it.`}</span>
            </div>
            {errors.form ? <p role="alert" className="rounded-xl bg-red-tint px-3 py-2.5 text-[14px] font-bold text-red-ink">{errors.form}</p> : null}
            <button type="submit" disabled={!name.trim() || busy || (dollars && !rate)} className="h-11 rounded-xl bg-mint text-[15px] font-extrabold text-on-mint transition-transform active:scale-[0.98] disabled:opacity-60">
                {busy ? 'Creating…' : 'Create account'}
            </button>
        </form>
    );
}

Accounts.layout = (page: ReactNode) => (
    <Shell active="accounts" title="Accounts">
        {page}
    </Shell>
);
