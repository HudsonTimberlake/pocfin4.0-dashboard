import { router } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import Bar from '@/components/Bar';
import Icon, { type IconName } from '@/components/Icon';
import Money from '@/components/Money';
import { cleanTyped, hasAmount, toAmount, ymd } from '@/lib/amount';
import { useApp } from '@/lib/app';
import { dayLabel, formatMoney, monthName, percent } from '@/lib/format';
import { ARRIVE } from '@/lib/motion';
import { homeSymbol } from '@/shared/currency';

export type Account = { id: number; name: string; type: 'savings' | 'holding' | 'investment'; visibility: 'shared' | 'private'; currency?: string; balance: string; value: string | null; gain: string | null; mine: boolean };
export type Goal = { id: number; name: string; account_id: number; kind: string; state: string | null; target_amount: string | null; total: string | null; this_cycle: { needed: string; in: string; left: string; status: string } | null };
export type Move = { key: string; what: string; kind: string; date: string; amount: string; in: boolean; by: string | null };

const field = 'h-11 w-full rounded-xl border border-line bg-card px-3 text-[15px] font-bold text-ink outline-none focus:border-mint';

/** The calm chip for a goal (goals.md): never "missed". */
export function goalChip(g: Goal): string {
    switch (g.state) {
        case 'waiting':
            return `Waiting for ${monthName(new Date().toISOString().slice(0, 10))}`;
        case 'needs_look':
            return 'A little behind';
        case 'reached':
            return 'Reached';
        case 'upcoming':
            return 'Starts later';
        case 'finished':
            return 'Finished';
        default:
            return 'On its way';
    }
}

export const kindLabel = (a: Account) => `${a.type === 'savings' ? 'Savings' : a.type === 'holding' ? 'Holding' : 'Investment'} · ${a.visibility === 'private' ? 'only me' : 'shared'}`;

/**
 * W11, a savings or holding account beside the tiles: what it holds, its goal, Add money (outside
 * money, never income), Move (the Add panel), Withdraw (it leaves PocFin), money in and out, and
 * its settings with Close account.
 */
export default function AccountPanel({ a, goal, moves, budgetName, shared, onClose }: { a: Account; goal?: Goal; moves: Move[]; budgetName: string; shared: boolean; onClose: () => void }) {
    const { openAdd, toast } = useApp();
    const [form, setForm] = useState<'add' | 'expense' | null>(null);
    const [typed, setTyped] = useState('');
    const [day, setDay] = useState(ymd());
    const [note, setNote] = useState('');
    const [name, setName] = useState(a.name);
    const [visibility, setVisibility] = useState(a.visibility);
    const [closing, setClosing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);

    const actions: { key: 'add' | 'move' | 'expense'; label: string; icon: IconName; tip: string }[] = [
        { key: 'add', label: 'Add money', icon: 'plus', tip: 'Outside money, like interest' },
        { key: 'move', label: 'Move', icon: 'move', tip: 'To an envelope or account' },
        { key: 'expense', label: 'Withdraw', icon: 'download', tip: 'It leaves PocFin' },
    ];

    function act(key: 'add' | 'move' | 'expense') {
        if (key === 'move') return openAdd({ tab: 'move', fromAccountId: a.id });
        setForm(form === key ? null : key);
        setTyped('');
        setNote('');
        setDay(ymd());
        setErrors({});
    }

    function sendMoney(e: FormEvent) {
        e.preventDefault();
        if (!form || !hasAmount(typed) || busy) return;
        setBusy(true);
        router.post(`/accounts/${a.id}/transactions`, { type: form, amount: toAmount(typed), date: day, note: note.trim() || null }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                toast({ text: form === 'add' ? `✓ Added to ${a.name}` : `✓ Withdrawn from ${a.name}` });
                setForm(null);
                setErrors({});
            },
            onError: (er) => setErrors(er as Record<string, string>),
            onFinish: () => setBusy(false),
        });
    }

    function saveSettings(e: FormEvent) {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        router.patch(`/accounts/${a.id}`, { name: name.trim(), visibility }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setErrors({});
                toast({ text: '✓ Saved' });
            },
            onError: (er) => setErrors(er as Record<string, string>),
            onFinish: () => setBusy(false),
        });
    }

    function close() {
        setBusy(true);
        router.delete(`/accounts/${a.id}`, {
            onSuccess: () => toast({ text: `${a.name} closed` }),
            onError: (er) => {
                setClosing(false);
                setErrors(er as Record<string, string>);
            },
            onFinish: () => setBusy(false),
        });
    }

    const settingsDirty = name.trim() !== a.name || visibility !== a.visibility;
    const goalShare = goal?.target_amount && goal.total ? percent(goal.total, goal.target_amount) : goal?.this_cycle ? percent(goal.this_cycle.in, goal.this_cycle.needed) : 0;

    return (
        <div className="flex flex-col gap-5 rounded-[24px] bg-card p-5">
            <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold text-slate">{kindLabel(a)}</div>
                    <h2 className="truncate text-[19px] font-extrabold">{a.name}</h2>
                </div>
                <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-canvas text-slate hover:text-ink">
                    <Icon name="close" size={16} stroke={2.2} />
                </button>
            </div>

            <div className="text-[36px] leading-[42px] font-extrabold tracking-[-0.03em]">
                <Money amount={a.balance} />
            </div>

            {goal ? (
                <div className="rounded-2xl bg-canvas px-4 py-3">
                    <div className="flex items-center justify-between gap-2 text-[14px] font-bold">
                        <span className="truncate">{goal.name === a.name ? 'Goal' : `${goal.name} goal`}</span>
                        <span className="flex-none rounded-lg bg-navy-tint px-2 py-0.5 text-[12.5px] text-navy-text">{goalChip(goal)}</span>
                    </div>
                    <div className="mt-2">
                        <Bar percent={goalShare} tone="navy" />
                    </div>
                    {goal.this_cycle ? (
                        <div className="num mt-1.5 text-[12.5px] text-slate">
                            {formatMoney(goal.this_cycle.needed)} a month · {formatMoney(goal.this_cycle.in)} in so far
                        </div>
                    ) : null}
                </div>
            ) : null}

            <div className="grid grid-cols-3 gap-2">
                {actions.map((x) => (
                    <button
                        key={x.key}
                        type="button"
                        title={x.tip}
                        onClick={() => act(x.key)}
                        aria-expanded={x.key !== 'move' ? form === x.key : undefined}
                        className={`flex h-11 items-center justify-center gap-1.5 rounded-xl text-[14px] font-extrabold transition-transform active:scale-[0.97] ${x.key === 'add' ? 'bg-mint text-on-mint' : form === x.key ? 'bg-ink text-canvas' : 'bg-canvas hover:bg-segment'}`}
                    >
                        <Icon name={x.icon} size={15} stroke={2.2} />
                        {x.label}
                    </button>
                ))}
            </div>
            <AnimatePresence initial={false}>
                {form ? (
                    <motion.form key={form} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2, ease: ARRIVE }} onSubmit={sendMoney} onKeyDown={(e) => e.key === 'Escape' && setForm(null)} className="overflow-hidden">
                        <div className="flex flex-col gap-2.5 rounded-2xl bg-canvas p-3.5">
                            <p className="text-[13px] font-bold text-slate">{form === 'add' ? 'Outside money (interest, a gift). It never counts as income.' : 'It leaves PocFin, like spending.'}</p>
                            <div className="grid grid-cols-2 gap-2">
                                <span className="relative">
                                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[15px] font-bold text-slate">{homeSymbol()}</span>
                                    <input autoFocus value={typed} onChange={(e) => setTyped(cleanTyped(e.target.value))} inputMode="decimal" placeholder="0.00" aria-label="Amount" className={`${field} num pl-7`} />
                                </span>
                                <input type="date" value={day} max={ymd()} onChange={(e) => e.target.value && setDay(e.target.value)} aria-label="Date" className={field} />
                            </div>
                            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} placeholder={form === 'add' ? 'Interest' : 'Note (optional)'} aria-label="Note" className={`${field} font-semibold`} />
                            {errors.amount || errors.date ? <span className="text-[13px] font-bold text-red-ink">{errors.amount || errors.date}</span> : null}
                            <button type="submit" disabled={!hasAmount(typed) || busy} className="h-10 rounded-xl bg-mint text-[14.5px] font-extrabold text-on-mint disabled:opacity-60">
                                {busy ? 'Saving…' : form === 'add' ? `Add${hasAmount(typed) ? ` ${formatMoney(toAmount(typed))}` : ''}` : `Withdraw${hasAmount(typed) ? ` ${formatMoney(toAmount(typed))}` : ''}`}
                            </button>
                        </div>
                    </motion.form>
                ) : null}
            </AnimatePresence>

            <div className="border-t border-line pt-4">
                <h3 className="mb-1.5 text-[15px] font-extrabold">Money in and out</h3>
                {moves.length === 0 ? <p className="text-[14px] text-slate">Nothing in or out yet.</p> : null}
                <ul>
                    {moves.map((m, i) => (
                        <li key={m.key} className={`flex items-center gap-3 py-2.5 ${i ? 'border-t border-line' : ''}`}>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[14.5px] font-bold">{m.what}</span>
                                <span className="block text-[12.5px] text-slate">{[m.kind, dayLabel(m.date), shared ? m.by : null].filter(Boolean).join(' · ')}</span>
                            </span>
                            <span className={`num text-[14.5px] font-extrabold ${m.in ? 'text-teal' : ''}`}>{formatMoney(m.amount, { income: m.in })}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <form onSubmit={saveSettings} className="flex flex-col gap-3 border-t border-line pt-4">
                <h3 className="text-[15px] font-extrabold">Account settings</h3>
                <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                    Name
                    <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className={field} />
                    {errors.name ? <span className="text-red-ink">{errors.name}</span> : null}
                </label>
                {a.mine ? (
                    <div className="flex flex-col gap-1.5 text-[13px] font-bold text-slate">
                        Who sees it
                        <div role="radiogroup" aria-label="Who sees it" className="grid grid-cols-2 gap-1 rounded-xl bg-segment p-1">
                            {(['shared', 'private'] as const).map((v) => (
                                <button key={v} type="button" role="radio" aria-checked={visibility === v} onClick={() => setVisibility(v)} className={`h-9 truncate rounded-[10px] px-2 text-[13.5px] font-extrabold ${visibility === v ? 'bg-card text-ink' : 'text-slate'}`}>
                                    {v === 'shared' ? `Shared with ${budgetName}` : 'Only me'}
                                </button>
                            ))}
                        </div>
                        {errors.visibility ? <span className="text-red-ink">{errors.visibility}</span> : null}
                    </div>
                ) : null}
                {errors.form || errors.account ? <p role="alert" className="rounded-xl bg-red-tint px-3 py-2.5 text-[14px] font-bold text-red-ink">{errors.form || errors.account}</p> : null}
                {closing ? (
                    <div role="alertdialog" aria-label={`Close ${a.name}?`} className="flex flex-col gap-2 rounded-xl bg-red-tint p-3">
                        <p className="text-[14px] font-bold text-red-ink">
                            Close {a.name}? {a.balance !== '0.00' ? `${formatMoney(a.balance)} goes out as a final withdrawal today. ` : ''}Envelopes don’t change.
                        </p>
                        <div className="flex gap-2">
                            <button type="button" autoFocus onClick={close} disabled={busy} className="h-10 flex-1 rounded-xl bg-red px-3 text-[14px] font-extrabold text-white">
                                {busy ? 'Closing…' : 'Close account'}
                            </button>
                            <button type="button" onClick={() => setClosing(false)} className="h-10 rounded-xl bg-card px-3.5 text-[14px] font-bold">
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <button type="submit" disabled={!settingsDirty || busy} className={`h-10 flex-1 rounded-xl text-[14.5px] font-extrabold ${settingsDirty ? 'bg-mint text-on-mint' : 'bg-segment text-slate'}`}>
                            Save
                        </button>
                        <button type="button" onClick={() => setClosing(true)} className="h-10 rounded-xl bg-red-tint px-3.5 text-[14px] font-bold text-red-text">
                            Close account
                        </button>
                    </div>
                )}
                <p className="text-[12.5px] text-slate">Closing takes what’s left out as a final withdrawal today. Envelopes don’t change.</p>
            </form>
        </div>
    );
}
