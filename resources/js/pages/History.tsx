import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import HelpButton from '@/components/HelpButton';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import HistoryPanel, { isInvestment, type HistoryRow, type Named, type Tab } from '@/components/HistoryPanel';
import Icon from '@/components/Icon';
import Shell from '@/components/Shell';
import { useApp } from '@/lib/app';
import { dayLabel, formatMoney, initial, toCents } from '@/lib/format';
import { Refused, send } from '@/lib/http';
import { ARRIVE } from '@/lib/motion';
import { fromCents } from '@/shared/money';
import type { Shared } from '@/types';

type Filters = { q?: string; from?: string; to?: string; envelope_id?: number; order: 'newest' | 'oldest' };
type List = { data: HistoryRow[]; page: number; last_page: number; total: number; unallocated: string | null };
type Props = {
    tab: Tab;
    filters: Filters;
    list: List;
    envelopes: Named[];
    accounts: Named[];
    members: Named[];
    cycle_start_day: number;
    premium: boolean;
};

const TABS: { key: Tab; label: string }[] = [
    { key: 'spent', label: 'Spent' },
    { key: 'income', label: 'Income' },
    { key: 'moved', label: 'Moved' },
];
const WHO = ['bg-navy-tint text-navy-text', 'bg-amber-tint text-amber-ink', 'bg-tint text-teal', 'bg-red-tint text-red-ink'];
const control = 'h-10 rounded-xl border border-line bg-card px-3 text-[14.5px] font-bold text-ink outline-none focus:border-mint';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Month ranges that follow the budget's month start (a month that starts on the 25th runs 25th to 24th). */
function presets(startDay: number) {
    const today = new Date();
    const startOf = (monthsBack: number) => {
        const d = new Date(today.getFullYear(), today.getMonth(), startDay);
        if (today.getDate() < startDay) d.setMonth(d.getMonth() - 1);
        d.setMonth(d.getMonth() - monthsBack);
        return d;
    };
    const endOf = (start: Date) => {
        const d = new Date(start);
        d.setMonth(d.getMonth() + 1);
        d.setDate(d.getDate() - 1);
        return d;
    };
    const name = (d: Date) => d.toLocaleString('en-ZA', { month: 'long' });
    return [
        { key: 'this', label: `This month (${name(startOf(0))})`, from: iso(startOf(0)), to: iso(endOf(startOf(0))) },
        { key: 'last', label: name(startOf(1)), from: iso(startOf(1)), to: iso(endOf(startOf(1))) },
        { key: 'three', label: 'Last 3 months', from: iso(startOf(2)), to: iso(endOf(startOf(0))) },
        { key: 'year', label: 'This year', from: `${today.getFullYear()}-01-01`, to: `${today.getFullYear()}-12-31` },
    ];
}

/** Rows deleted with Undo: sent after 6 seconds (all of one tab together), or at once when leaving. */
function useDelayedDelete(csrf: string, onFail: (text: string, ids: number[]) => void) {
    const pending = useRef(new Map<number, { timer: number; tab: Tab; ids: number[] }>());
    const go = (key: number, keepalive: boolean) => {
        const p = pending.current.get(key);
        if (!p) return;
        pending.current.delete(key);
        window.clearTimeout(p.timer);
        send(csrf, 'POST', `/history/${p.tab}/delete`, { ids: p.ids }, keepalive).catch((e) => onFail(e instanceof Refused ? e.message : 'That didn’t delete.', p.ids));
    };
    useEffect(() => {
        const map = pending.current;
        const flush = () => [...map.keys()].forEach((k) => go(k, true));
        window.addEventListener('pagehide', flush);
        const off = router.on('before', flush);
        return () => {
            window.removeEventListener('pagehide', flush);
            off();
            flush();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return {
        later: (tab: Tab, ids: number[]) => {
            const key = Date.now() + Math.random();
            pending.current.set(key, { tab, ids, timer: window.setTimeout(() => go(key, false), 6000) });
            return () => {
                const p = pending.current.get(key);
                if (p) window.clearTimeout(p.timer);
                pending.current.delete(key);
            };
        },
    };
}

/**
 * W10 History: "What happened, and can I find it?" Spent / Income / Moved, search as you type,
 * dates and envelope filters, newest or oldest first, rows grouped by day, 50 more as you scroll.
 * Tick rows to change their envelope or delete several (with Undo); click a row to change it
 * beside the table. Download CSV takes every row that matches.
 */
export default function History(p: Props) {
    const { csrf } = usePage<Shared>().props;
    const { toast } = useApp();
    const reduced = useReducedMotion();
    const [rows, setRows] = useState<HistoryRow[]>(p.list.data);
    const [page, setPage] = useState(p.list.page);
    const [total, setTotal] = useState(p.list.total);
    const [more, setMore] = useState(false);
    const [q, setQ] = useState(p.filters.q ?? '');
    const [picking, setPicking] = useState(false);
    const [selected, setSelected] = useState<number[]>([]);
    const [hidden, setHidden] = useState<number[]>([]);
    const [openId, setOpenId] = useState<number | null>(null);
    const sentinel = useRef<HTMLDivElement>(null);

    // New figures from the server (another tab, other filters): start again from the first 50.
    useEffect(() => {
        setRows(p.list.data);
        setPage(p.list.page);
        setTotal(p.list.total);
        setSelected([]);
        setOpenId(null);
    }, [p.list]);

    const restore = (ids: number[]) => setHidden((h) => h.filter((x) => !ids.includes(x)));
    const deletes = useDelayedDelete(csrf, (text, ids) => {
        restore(ids);
        setTotal((t) => t + ids.length);
        toast({ text });
    });

    const filter = (next: Partial<Filters> & { clear?: boolean }) =>
        router.post('/history', { ...p.filters, q, ...next, tab: p.tab }, { preserveState: true, preserveScroll: true, replace: true });

    // Search as you type (posted, never in the address).
    useEffect(() => {
        if (q === (p.filters.q ?? '')) return;
        const t = window.setTimeout(() => filter({ q }), 350);
        return () => window.clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q]);

    // 50 more as the bottom comes into view.
    useEffect(() => {
        const el = sentinel.current;
        if (!el || page >= p.list.last_page) return;
        const io = new IntersectionObserver(async ([entry]) => {
            if (!entry.isIntersecting || more) return;
            setMore(true);
            try {
                const next = await send<List>(csrf, 'GET', `/history/rows?tab=${p.tab}&page=${page + 1}`);
                setRows((r) => [...r, ...next.data.filter((x) => !r.some((y) => y.id === x.id))]);
                setPage(next.page);
            } catch {
                toast({ text: 'Couldn’t load more. Scroll again to retry.' });
            } finally {
                setMore(false);
            }
        }, { rootMargin: '400px' });
        io.observe(el);
        return () => io.disconnect();
    }, [page, p.list.last_page, p.tab, csrf, more, toast]);

    const envName = new Map(p.envelopes.map((e) => [e.id, e.name]));
    const accName = new Map(p.accounts.map((a) => [a.id, a.name]));
    const members = new Map(p.members.map((m, i) => [m.id, { name: m.name, tone: WHO[i % WHO.length] }]));
    const shared = p.members.length > 1;
    const visible = rows.filter((r) => !hidden.includes(r.id));
    const open = openId !== null ? visible.find((r) => r.id === openId) : undefined;
    const side = (r: HistoryRow, s: 'from' | 'to') =>
        r[`${s}_envelope_id`] ? envName.get(r[`${s}_envelope_id`]!) : r[`${s}_account_id`] ? accName.get(r[`${s}_account_id`]!) : r[`${s}_private_account`] ? 'Private account' : '—';
    const placeOf = (r: HistoryRow) =>
        p.tab === 'spent'
            ? `${envName.get(r.envelope_id ?? 0) ?? 'Envelope'}${r.refund ? ' · refund' : ''}`
            : p.tab === 'income'
              ? r.unallocated && toCents(r.unallocated) > 0n
                  ? `${formatMoney(r.unallocated)} still to allocate`
                  : 'All given a place'
              : `${side(r, 'from')} → ${side(r, 'to')}`;
    const into = (r: HistoryRow) => (p.tab === 'spent' ? !!r.refund : p.tab === 'income');

    // Rows grouped by day, in the order the server gave them.
    const days = useMemo(() => {
        const out: { date: string; rows: HistoryRow[] }[] = [];
        for (const r of visible) {
            const last = out[out.length - 1];
            if (last && last.date === r.date) last.rows.push(r);
            else out.push({ date: r.date, rows: [r] });
        }
        return out;
    }, [visible]);

    const picked = visible.filter((r) => selected.includes(r.id));
    const pickedSum = fromCents(picked.reduce((t, r) => t + toCents(r.amount), 0n));
    const allOn = visible.length > 0 && visible.every((r) => selected.includes(r.id));

    function remove(ids: number[]) {
        setHidden((h) => [...h, ...ids]);
        setSelected([]);
        setOpenId(null);
        setTotal((t) => t - ids.length);
        const cancel = deletes.later(p.tab, ids);
        toast({
            text: ids.length === 1 ? 'Deleted 1 row' : `Deleted ${ids.length} rows`,
            ms: 6000,
            undo: () => {
                cancel();
                restore(ids);
                setTotal((t) => t + ids.length);
            },
        });
    }

    async function moveTo(envelopeId: number) {
        const ids = picked.map((r) => r.id);
        const before = rows;
        setRows((list) => list.map((r) => (ids.includes(r.id) ? { ...r, envelope_id: envelopeId } : r)));
        setSelected([]);
        try {
            await send(csrf, 'POST', '/history/spent/envelope', { ids, envelope_id: envelopeId });
            toast({ text: `✓ Moved ${ids.length} to ${envName.get(envelopeId)}` });
        } catch (e) {
            setRows(before);
            toast({ text: e instanceof Refused ? e.message : 'That didn’t work.' });
        }
    }

    const range = presets(p.cycle_start_day);
    const rangeKey = !p.filters.from && !p.filters.to ? 'any' : (range.find((r) => r.from === p.filters.from && r.to === p.filters.to)?.key ?? 'pick');
    const anyFilter = !!(p.filters.q || p.filters.from || p.filters.to || p.filters.envelope_id);
    const summary =
        p.tab === 'moved'
            ? `${total} ${total === 1 ? 'move' : 'moves'} · moving is never income or spending`
            : `${total} ${total === 1 ? 'row' : 'rows'}${rangeKey !== 'any' && rangeKey !== 'pick' ? ` · ${range.find((r) => r.key === rangeKey)?.label.replace(/^This month \((.*)\)$/, '$1')}` : ''}`;
    const placeHead = p.tab === 'spent' ? 'Envelope' : p.tab === 'income' ? 'Where it went' : 'From → to';
    const cols = shared ? 'grid-cols-[28px_minmax(0,1fr)_auto] @2xl:grid-cols-[28px_minmax(0,1.3fr)_minmax(0,1fr)_40px_130px]' : 'grid-cols-[28px_minmax(0,1fr)_auto] @2xl:grid-cols-[28px_minmax(0,1.3fr)_minmax(0,1fr)_130px]';

    return (
        <>
            <Head title="History" />
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.02em]">History</h1>
                            <HelpButton topic="budget-history" />
                        </div>
                        <p className="mt-0.5 text-[15px] text-slate">{summary}</p>
                    </div>
                    <a href={`/history/export?tab=${p.tab}`} className="flex h-11 items-center gap-2 rounded-[14px] bg-card px-4 text-[15px] font-extrabold hover:bg-segment">
                        <Icon name="download" size={16} stroke={2.2} />
                        Download CSV
                    </a>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <div role="tablist" aria-label="Kind" className="flex gap-1 rounded-xl bg-segment p-1">
                        {TABS.map((t) => (
                            <button key={t.key} type="button" role="tab" aria-selected={p.tab === t.key} onClick={() => p.tab !== t.key && router.get('/history', { tab: t.key }, { preserveScroll: false })} className={`h-9 rounded-[10px] px-4 text-[14.5px] font-extrabold transition-colors ${p.tab === t.key ? 'bg-card text-ink' : 'text-slate hover:text-ink'}`}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                    <label className="flex h-10 min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-line bg-card px-3 text-slate focus-within:border-mint">
                        <Icon name="search" size={16} stroke={2} />
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes, envelopes or amounts" aria-label="Search" maxLength={100} className="min-w-0 flex-1 bg-transparent text-[14.5px] font-semibold text-ink outline-none placeholder:text-muted" />
                        {q ? (
                            <button type="button" onClick={() => setQ('')} aria-label="Clear search" className="text-slate hover:text-ink">
                                <Icon name="close" size={14} stroke={2.4} />
                            </button>
                        ) : null}
                    </label>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <select
                        aria-label="Dates"
                        value={picking ? 'pick' : rangeKey}
                        onChange={(e) => {
                            const v = e.target.value;
                            if (v === 'pick') return setPicking(true);
                            setPicking(false);
                            const r = range.find((x) => x.key === v);
                            filter({ from: r?.from, to: r?.to });
                        }}
                        className={control}
                    >
                        <option value="any">Any time</option>
                        {range.map((r) => (
                            <option key={r.key} value={r.key}>
                                {r.label}
                            </option>
                        ))}
                        <option value="pick">Pick dates…</option>
                    </select>
                    {picking || rangeKey === 'pick' ? (
                        <span className="flex items-center gap-1.5">
                            <input type="date" aria-label="From" defaultValue={p.filters.from} onChange={(e) => e.target.value && filter({ from: e.target.value })} className={control} />
                            <span className="text-slate">to</span>
                            <input type="date" aria-label="To" defaultValue={p.filters.to} onChange={(e) => e.target.value && filter({ to: e.target.value })} className={control} />
                        </span>
                    ) : null}
                    <button type="button" onClick={() => filter({ order: p.filters.order === 'oldest' ? 'newest' : 'oldest' })} className={`${control} hover:bg-segment`}>
                        {p.filters.order === 'oldest' ? 'Oldest first ↑' : 'Newest first ↓'}
                    </button>
                    {p.tab === 'spent' ? (
                        <select aria-label="Envelope" value={p.filters.envelope_id ?? ''} onChange={(e) => filter({ envelope_id: e.target.value ? Number(e.target.value) : undefined })} className={control}>
                            <option value="">Any envelope</option>
                            {p.envelopes.map((e) => (
                                <option key={e.id} value={e.id}>
                                    {e.name}
                                    {e.archived ? ' (archived)' : ''}
                                </option>
                            ))}
                        </select>
                    ) : null}
                    {anyFilter ? (
                        <button type="button" onClick={() => { setQ(''); setPicking(false); filter({ clear: true }); }} className="h-10 px-2 text-[14px] font-bold text-teal hover:underline">
                            Clear filters
                        </button>
                    ) : null}
                </div>

                <AnimatePresence>
                    {picked.length ? (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="sticky top-2 z-20 flex flex-wrap items-center gap-2.5 rounded-[18px] bg-toast px-4 py-2.5 text-[14.5px] font-bold text-white">
                            <span className="num flex-1">
                                {picked.length} selected · {formatMoney(pickedSum)}
                            </span>
                            {p.tab === 'spent' ? (
                                <select aria-label="Change envelope to" value="" onChange={(e) => e.target.value && moveTo(Number(e.target.value))} className="h-9 rounded-xl bg-white/15 px-2.5 text-[14px] font-bold text-white outline-none">
                                    <option value="">Change envelope to…</option>
                                    {p.envelopes
                                        .filter((e) => !e.archived)
                                        .map((e) => (
                                            <option key={e.id} value={e.id} className="text-ink">
                                                {e.name}
                                            </option>
                                        ))}
                                </select>
                            ) : null}
                            <button type="button" onClick={() => remove(picked.map((r) => r.id))} className="h-9 rounded-xl bg-red px-3.5 font-extrabold text-white">
                                Delete
                            </button>
                            <button type="button" onClick={() => setSelected([])} className="h-9 px-2 text-white/80 hover:text-white">
                                Clear
                            </button>
                        </motion.div>
                    ) : null}
                </AnimatePresence>

                <div className="flex items-start gap-5">
                    <div className="min-w-0 flex-1">
                        <div role="table" aria-label={TABS.find((t) => t.key === p.tab)?.label} className="@container overflow-hidden rounded-[24px] bg-card">
                            <div role="row" className={`grid ${cols} items-center gap-3 border-b border-line px-4 py-3 text-[12.5px] font-bold text-slate`}>
                                <span>
                                    <input type="checkbox" checked={allOn} onChange={() => setSelected(allOn ? [] : visible.map((r) => r.id))} aria-label="Select all shown" className="size-4 accent-[var(--mint)]" />
                                </span>
                                <span role="columnheader">What</span>
                                <span role="columnheader" className="hidden @2xl:block">
                                    {placeHead}
                                </span>
                                {shared ? (
                                    <span role="columnheader" className="hidden @2xl:block">
                                        Who
                                    </span>
                                ) : null}
                                <span role="columnheader" className="text-right">
                                    Amount
                                </span>
                            </div>

                            {visible.length === 0 ? (
                                <p className="px-5 py-8 text-center text-[15px] text-slate">{anyFilter ? (p.filters.q ? `Nothing matches “${p.filters.q}”.` : 'Nothing matches these filters.') : 'Nothing here yet.'}</p>
                            ) : null}

                            {days.map((d) => (
                                <div key={d.date} role="rowgroup" aria-label={dayLabel(d.date)}>
                                    <div className="bg-canvas/60 px-4 py-1.5 text-[12.5px] font-bold text-slate">{dayLabel(d.date)}</div>
                                    <AnimatePresence initial={false}>
                                        {d.rows.map((r) => {
                                            const sel = r.id === openId;
                                            const checked = selected.includes(r.id);
                                            const who = r.created_by ? members.get(r.created_by) : undefined;
                                            return (
                                                <motion.div
                                                    key={r.id}
                                                    role="row"
                                                    layout={reduced ? false : 'position'}
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0, transition: { duration: 0.18 } }}
                                                    transition={{ duration: 0.22, ease: ARRIVE }}
                                                    onClick={() => setOpenId(sel ? null : r.id)}
                                                    className={`grid ${cols} cursor-pointer items-center gap-3 border-t border-line px-4 py-2.5 transition-colors ${sel ? 'bg-tint' : checked ? 'bg-tint-soft' : 'hover:bg-canvas'}`}
                                                >
                                                    <span onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => setSelected((s) => (checked ? s.filter((x) => x !== r.id) : [...s, r.id]))}
                                                            aria-label={`Select ${r.note || placeOf(r)}`}
                                                            className="size-4 accent-[var(--mint)]"
                                                        />
                                                    </span>
                                                    <span className="min-w-0">
                                                        <button type="button" onClick={(e) => { e.stopPropagation(); setOpenId(sel ? null : r.id); }} aria-expanded={sel} className="flex max-w-full items-center gap-2 text-left text-[15px] font-bold">
                                                            <span className="truncate">{r.note || (p.tab === 'income' ? 'Income' : placeOf(r))}</span>
                                                            {r.has_receipt ? <Icon name="receipt" size={14} stroke={2} className="flex-none text-slate" /> : null}
                                                            {p.tab === 'moved' && isInvestment(r) ? <span className="flex-none rounded-md bg-navy-tint px-1.5 py-0.5 text-[11px] font-bold text-navy-text">Investment</span> : null}
                                                            {r.automatic ? <span className="flex-none rounded-md bg-segment px-1.5 py-0.5 text-[11px] font-bold text-slate">Automatic</span> : null}
                                                        </button>
                                                        <span className="block truncate text-[13px] text-slate @2xl:hidden">
                                                            {placeOf(r)}
                                                            {shared && who ? ` · ${who.name}` : ''}
                                                        </span>
                                                    </span>
                                                    <span className="hidden truncate text-[14px] text-slate @2xl:block">{placeOf(r)}</span>
                                                    {shared ? (
                                                        <span className="hidden @2xl:block">
                                                            {who ? (
                                                                <span title={who.name} aria-label={who.name} className={`grid size-7 place-items-center rounded-full text-[12px] font-extrabold ${who.tone}`}>
                                                                    {initial(who.name)}
                                                                </span>
                                                            ) : null}
                                                        </span>
                                                    ) : null}
                                                    <span className={`num text-right text-[15px] font-extrabold ${into(r) ? 'text-teal' : ''}`}>{formatMoney(r.amount, { income: into(r) })}</span>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </div>
                        <div ref={sentinel} className="py-4 text-center text-[13px] text-slate">
                            {page < p.list.last_page ? (more ? 'Loading more…' : 'More loads as you scroll, 50 at a time.') : visible.length ? 'That’s everything.' : ''}
                        </div>
                    </div>

                    <AnimatePresence>
                        {open ? (
                            <>
                                <motion.div key="scrim" className="fixed inset-0 z-40 bg-scrim xl:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpenId(null)} />
                                <motion.aside
                                    key="panel"
                                    aria-label="Change a row"
                                    initial={reduced ? { opacity: 0 } : { opacity: 0, x: 24 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={reduced ? { opacity: 0 } : { opacity: 0, x: 24, transition: { duration: 0.18 } }}
                                    transition={{ duration: 0.28, ease: ARRIVE }}
                                    className="fixed inset-y-0 right-0 z-50 w-[min(420px,100vw)] overflow-y-auto bg-canvas p-3 xl:sticky xl:top-5 xl:z-auto xl:max-h-[calc(100vh-40px)] xl:w-[380px] xl:flex-none xl:rounded-[24px] xl:p-0"
                                >
                                    <HistoryPanel
                                        key={`${p.tab}-${open.id}`}
                                        tab={p.tab}
                                        row={open}
                                        envelopes={p.envelopes}
                                        accounts={p.accounts}
                                        who={open.created_by ? (members.get(open.created_by)?.name ?? null) : null}
                                        premium={p.premium}
                                        onSaved={(fresh) => setRows((list) => list.map((r) => (r.id === fresh.id ? { ...r, ...fresh } : r)))}
                                        onDelete={() => remove([open.id])}
                                        onClose={() => setOpenId(null)}
                                    />
                                </motion.aside>
                            </>
                        ) : null}
                    </AnimatePresence>
                </div>
            </div>
        </>
    );
}

History.layout = (page: ReactNode) => (
    <Shell active="history" title="History">
        {page}
    </Shell>
);
