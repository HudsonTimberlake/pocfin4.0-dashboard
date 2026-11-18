import { router } from '@inertiajs/react';
import { motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import EnvelopeIcon from '@/components/EnvelopeIcon';
import Icon, { type IconName } from '@/components/Icon';
import type { AddOpen } from '@/lib/app';
import { formatMoney, isNegative, toCents } from '@/lib/format';
import { ARRIVE } from '@/lib/motion';

type Index = {
    envelopes: { id: number; name: string; icon: string | null; balance: string }[];
    accounts: { id: number; name: string; type: 'savings' | 'holding' | 'investment'; balance: string }[];
    goals: { id: number; name: string }[];
    unallocated: string;
};

type Entry = { group: string; label: string; meta?: string; over?: boolean; kbd?: string; icon: ReactNode; run: () => void };

/** The pages a G then a letter jumps to, as the board's rows show. */
export const GO_KEYS: Record<string, string> = { o: '/', b: '/budget', h: '/history', a: '/accounts', g: '/goals' };
const KBD: Record<string, string> = { '/': 'G O', '/budget': 'G B', '/history': 'G H', '/accounts': 'G A', '/goals': 'G G' };

const PAGES: { label: string; href: string; icon: IconName; full?: boolean }[] = [
    { label: 'Overview', href: '/', icon: 'overview' },
    { label: 'Budget', href: '/budget', icon: 'budget' },
    { label: 'History', href: '/history', icon: 'history' },
    { label: 'Accounts', href: '/accounts', icon: 'accounts' },
    { label: 'Goals', href: '/goals', icon: 'goals' },
    { label: 'Automatic', href: '/automatic', icon: 'automatic' },
    { label: 'Analytics', href: '/analytics', icon: 'analytics' },
    { label: 'Calculators', href: '/calculators', icon: 'calculators' },
    { label: 'Notes', href: '/notes', icon: 'notes' },
    { label: 'Members', href: '/members', icon: 'members' },
    { label: 'Budget settings', href: '/settings', icon: 'settings' },
    { label: 'Help', href: '/help', icon: 'support' },
    { label: 'Recaps', href: '/recaps', icon: 'recaps', full: true },
];
const CALCS: [string, string][] = [
    ['retirement', 'Retirement'],
    ['growth', 'Saving and growth'],
    ['home_loan', 'Home loan'],
    ['car_loan', 'Car loan'],
];

const chip = (icon: ReactNode, tone: 'act' | 'navy' | 'plain' = 'plain') => (
    <span className={`grid size-9 flex-none place-items-center rounded-full ${tone === 'act' ? 'bg-mint text-on-mint' : tone === 'navy' ? 'bg-navy-tint text-navy-text' : 'bg-canvas text-ink'}`}>{icon}</span>
);

/**
 * W4 Search and jump (⌘K): one box for actions, pages, envelopes, accounts, goals and calculators.
 * What's typed never leaves the browser: the names are fetched when the box opens and matched here.
 */
export default function SearchPalette({ onClose, openAdd }: { onClose: () => void; openAdd: (o?: AddOpen) => void }) {
    const [q, setQ] = useState('');
    const [at, setAt] = useState(0);
    const [index, setIndex] = useState<Index | null>(null);
    const listRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
        let live = true;
        fetch('/search-index', { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => (r.ok ? (r.json() as Promise<Index>) : null))
            .then((d) => live && d && setIndex(d))
            .catch(() => {});
        return () => {
            live = false;
        };
    }, []);

    const entries = useMemo<Entry[]>(() => {
        const go = (href: string, full = false) => () => {
            onClose();
            if (full) window.location.href = href;
            else router.visit(href);
        };
        const act = (label: string, tab: NonNullable<AddOpen['tab']>, kbd?: string): Entry => ({ group: 'Actions', label, kbd, icon: chip(<Icon name={tab === 'move' ? 'move' : 'plus'} size={17} stroke={2.2} />, 'act'), run: () => { onClose(); openAdd({ tab }); } });
        const left = index?.unallocated ?? '0.00';
        const ready = !isNegative(left) && toCents(left) > 0n;
        return [
            act('Add an expense', 'spent', 'N'),
            act('Add income', 'income'),
            act('Move money', 'move'),
            { group: 'Actions', label: 'Allocate', meta: ready ? `${formatMoney(left)} ready` : undefined, icon: chip(<Icon name="allocate" size={17} stroke={2.2} />, 'act'), run: go('/allocate') },
            ...PAGES.map((p): Entry => ({ group: 'Pages', label: p.label, kbd: KBD[p.href], icon: chip(<Icon name={p.icon} size={17} />), run: go(p.href, p.full) })),
            ...(index?.envelopes ?? []).map((e): Entry => ({ group: 'Envelopes', label: e.name, meta: isNegative(e.balance) ? formatMoney(e.balance) : `${formatMoney(e.balance)} left`, over: isNegative(e.balance), icon: <EnvelopeIcon name={e.name} icon={e.icon} over={isNegative(e.balance)} size={36} bg="bg-canvas" />, run: go(`/budget?envelope=${e.id}`) })),
            ...(index?.accounts ?? []).map((a): Entry => ({ group: 'Accounts', label: a.name, meta: formatMoney(a.balance), icon: chip(<Icon name="accounts" size={17} />, 'navy'), run: go(a.type === 'investment' ? `/investments/${a.id}` : `/accounts?account=${a.id}`) })),
            ...(index?.goals ?? []).map((g): Entry => ({ group: 'Goals', label: g.name, icon: chip(<Icon name="goals" size={17} />), run: go(`/goals?goal=${g.id}`) })),
            ...CALCS.map(([k, label]): Entry => ({ group: 'Calculators', label, icon: chip(<Icon name="calculators" size={17} />), run: go(`/calculators?calc=${k}`) })),
        ];
    }, [index, onClose, openAdd]);

    const needle = q.trim().toLowerCase();
    const hits = useMemo(() => {
        if (!needle) return entries.filter((e) => e.group === 'Actions' || e.group === 'Pages');
        const words = needle.split(/\s+/);
        return entries.filter((e) => words.every((w) => `${e.label} ${e.group}`.toLowerCase().includes(w)));
    }, [entries, needle]);
    const cur = Math.min(at, Math.max(0, hits.length - 1));
    const groups = [...new Set(hits.map((h) => h.group))];

    useEffect(() => {
        listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
    }, [cur, hits]);

    function onKey(e: React.KeyboardEvent) {
        if (e.key === 'ArrowDown') (e.preventDefault(), setAt(Math.min(cur + 1, hits.length - 1)));
        else if (e.key === 'ArrowUp') (e.preventDefault(), setAt(Math.max(cur - 1, 0)));
        else if (e.key === 'Enter' && hits[cur]) (e.preventDefault(), hits[cur].run());
        else if (e.key === 'Escape') (e.preventDefault(), onClose());
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]">
            <div className="absolute inset-0 bg-scrim" onClick={onClose} />
            <motion.div role="dialog" aria-modal="true" aria-label="Search and jump" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: ARRIVE }} className="relative flex max-h-[70vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[24px] bg-card shadow-xl">
                <div className="flex items-center gap-3 border-b border-rule px-4">
                    <span className="text-slate">
                        <Icon name="search" size={20} />
                    </span>
                    <input
                        autoFocus
                        role="combobox"
                        aria-expanded="true"
                        aria-controls="search-list"
                        aria-activedescendant={hits[cur] ? `opt-${cur}` : undefined}
                        aria-label="Search envelopes, accounts, goals and pages"
                        value={q}
                        onChange={(e) => {
                            setQ(e.target.value);
                            setAt(0);
                        }}
                        onKeyDown={onKey}
                        placeholder="Search or jump to…"
                        className="h-14 min-w-0 flex-1 bg-transparent text-[16px] font-bold text-ink outline-none placeholder:text-muted"
                    />
                    <kbd className="rounded-lg bg-segment px-2 py-0.5 font-sans text-xs font-extrabold text-slate">Esc</kbd>
                </div>
                <ul id="search-list" ref={listRef} role="listbox" className="flex-1 overflow-y-auto p-2">
                    {hits.length === 0 ? <li className="px-3 py-6 text-center text-[15px] text-slate">Nothing called “{q.trim()}”. Try an envelope, an account or a page.</li> : null}
                    {groups.map((g) => (
                        <li key={g} role="presentation">
                            <div className="px-3 pt-2 pb-1 text-[12px] font-extrabold tracking-wide text-slate uppercase">{g}</div>
                            <ul role="group" aria-label={g}>
                                {hits.map((h, i) =>
                                    h.group !== g ? null : (
                                        <li key={`${g}-${h.label}`} id={`opt-${i}`} role="option" aria-selected={i === cur} onMouseMove={() => i !== cur && setAt(i)} onClick={h.run} className={`flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 ${i === cur ? 'bg-tint' : ''}`}>
                                            {h.icon}
                                            <span className="min-w-0 flex-1 truncate text-[15px] font-extrabold">{h.label}</span>
                                            {h.meta ? <span className={`num text-[13.5px] font-bold ${h.over ? 'text-red' : 'text-slate'}`}>{h.meta}</span> : null}
                                            {h.kbd ? <kbd className="rounded-lg bg-segment px-2 py-0.5 font-sans text-xs font-extrabold text-slate">{h.kbd}</kbd> : null}
                                        </li>
                                    ),
                                )}
                            </ul>
                        </li>
                    ))}
                </ul>
                <div className="flex gap-4 border-t border-rule px-4 py-2.5 text-[12.5px] text-slate">
                    <span>↑ ↓ to move</span>
                    <span>Enter to open</span>
                    <span className="ml-auto">N adds from anywhere</span>
                </div>
            </motion.div>
        </div>
    );
}
