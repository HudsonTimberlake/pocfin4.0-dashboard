import { Link, router } from '@inertiajs/react';
import { motion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import Bar from '@/components/Bar';
import EnvelopeIcon from '@/components/EnvelopeIcon';
import Icon, { type IconName } from '@/components/Icon';
import IconPicker from '@/components/IconPicker';
import Money from '@/components/Money';
import { cleanTyped, toAmount } from '@/lib/amount';
import { useApp, type AddTab } from '@/lib/app';
import { dayLabel, formatMoney, isNegative, percent, toCents } from '@/lib/format';
import { ENVELOPE_ICONS, iconKeyFor } from '@/shared/envelopeIcons';
import type { BudgetEnvelope } from '@/types';

export type Activity = { key: string; kind: 'spent' | 'refund' | 'allocated'; note: string | null; date: string; amount: string; by: string | null };

const field = 'h-11 w-full rounded-xl border border-line bg-card px-3 text-[15px] font-bold text-ink outline-none focus:border-mint';

const KIND_NOTE = {
    everyday: 'Everyday: spent through the month. What’s left can be moved where it’s needed.',
    saving_up: 'Saving up: money builds up month to month for something later. It’s never suggested for moving.',
};

/**
 * W7, the envelope beside the table: Left first, then Spend / Move / Refund, then name, icon, monthly
 * amount and kind, this month's activity, then Save changes, Archive and Delete (the app's rules:
 * delete only at R0.00, and it can't be undone).
 */
export default function EnvelopePanel({ e, activity, loading, shared, canAllocate, onClose, onArchive }: {
    e: BudgetEnvelope;
    activity: Activity[];
    loading: boolean;
    shared: boolean;
    canAllocate: boolean;
    onClose: () => void;
    onArchive: () => void;
}) {
    const { openAdd, toast } = useApp();
    const [name, setName] = useState(e.name);
    const [icon, setIcon] = useState<string | null>(e.icon);
    const [monthly, setMonthly] = useState(toCents(e.budgeted_amount) > 0n ? e.budgeted_amount : '');
    const [kind, setKind] = useState(e.kind);
    const [icons, setIcons] = useState(false);
    const [confirm, setConfirm] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
    const [saved, setSaved] = useState(false);

    const over = isNegative(e.balance);
    const atZero = toCents(e.balance) === 0n;
    const dirty = name.trim() !== e.name || icon !== e.icon || toAmount(monthly) !== e.budgeted_amount || kind !== e.kind;
    const Current = ENVELOPE_ICONS[icon && icon in ENVELOPE_ICONS ? (icon as keyof typeof ENVELOPE_ICONS) : iconKeyFor(name || e.name)].Icon;

    function save(ev: FormEvent) {
        ev.preventDefault();
        if (!dirty || busy) return;
        setBusy('save');
        router.patch(`/envelopes/${e.id}`, { name: name.trim(), icon, budgeted_amount: toAmount(monthly), kind }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setErrors({});
                setIcons(false);
                setSaved(true);
                window.setTimeout(() => setSaved(false), 1600);
            },
            onError: (er) => setErrors(er as Record<string, string>),
            onFinish: () => setBusy(null),
        });
    }

    function destroy() {
        setBusy('delete');
        router.delete(`/envelopes/${e.id}`, {
            preserveScroll: true,
            onSuccess: () => toast({ text: `${e.name} deleted` }),
            onError: (er) => {
                setConfirm(false);
                setErrors(er as Record<string, string>);
            },
            onFinish: () => setBusy(null),
        });
    }

    const add = (tab: AddTab) => openAdd({ tab, envelopeId: e.id });
    const actions: { label: string; icon: IconName; run: () => void; primary?: boolean }[] = [
        { label: 'Spend', icon: 'plus', run: () => add('spent'), primary: true },
        { label: 'Move', icon: 'move', run: () => add('move') },
        { label: 'Refund', icon: 'refund', run: () => add('refund') },
        // With money ready: Allocate opens with this envelope's amount box open.
        ...(canAllocate ? [{ label: 'Allocate', icon: 'allocate' as IconName, run: () => router.visit(`/allocate?envelope=${e.id}`) }] : []),
    ];

    return (
        <form onSubmit={save} aria-label={e.name} className="flex flex-col gap-5 rounded-[24px] bg-card p-5">
            <div className="flex items-center gap-3">
                <EnvelopeIcon name={name || e.name} icon={icon} over={over} size={40} bg="bg-tint" />
                <h2 className="min-w-0 flex-1 truncate text-[19px] font-extrabold">{e.name}</h2>
                <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-canvas text-slate hover:text-ink">
                    <Icon name="close" size={16} stroke={2.2} />
                </button>
            </div>

            <div>
                <div className="text-[13.5px] font-bold text-slate">Left</div>
                <div className={`text-[36px] leading-[42px] font-extrabold tracking-[-0.03em] ${over ? 'text-red' : ''}`}>
                    <Money amount={e.balance} />
                </div>
                <div className="mt-2.5">
                    <Bar percent={percent(over ? '0' : e.balance, e.budgeted_amount)} over={over} />
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-[13px]">
                    {[
                        ['Allocated', e.allocated_this_cycle],
                        ['Spent', e.spent_this_cycle],
                        ['Money back', e.refunded_this_cycle],
                    ].map(([label, amount]) => (
                        <div key={label} className="rounded-xl bg-canvas px-3 py-2">
                            <dt className="font-bold text-slate">{label}</dt>
                            <dd className="num font-extrabold">{formatMoney(amount)}</dd>
                        </div>
                    ))}
                </dl>
            </div>

            <div className={`grid gap-2 ${actions.length === 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {actions.map((a) => (
                    <button
                        key={a.label}
                        type="button"
                        onClick={a.run}
                        className={`flex h-11 items-center justify-center gap-1.5 rounded-xl text-[14.5px] font-extrabold transition-transform active:scale-[0.97] ${a.primary ? 'bg-mint text-on-mint' : 'bg-canvas hover:bg-segment'}`}
                    >
                        <Icon name={a.icon} size={16} stroke={2.2} />
                        {a.label}
                    </button>
                ))}
            </div>

            <div className="flex flex-col gap-3.5 border-t border-line pt-5">
                <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                    Name
                    <input value={name} onChange={(ev) => setName(ev.target.value)} maxLength={100} className={field} />
                    {errors.name ? <span className="text-red-ink">{errors.name}</span> : null}
                </label>
                <div className="flex flex-col gap-1.5 text-[13px] font-bold text-slate">
                    Icon
                    <button type="button" onClick={() => setIcons((v) => !v)} aria-expanded={icons} className="flex h-11 items-center gap-2.5 rounded-xl border border-line bg-card px-3 text-[15px] font-bold text-ink hover:border-line-strong">
                        <Current size={20} />
                        <span className="flex-1 text-left">{icon ? ENVELOPE_ICONS[icon as keyof typeof ENVELOPE_ICONS]?.label ?? 'Chosen' : 'From the name'}</span>
                        <span className="text-[13.5px] text-teal">{icons ? 'Done' : 'Change'}</span>
                    </button>
                    {icons ? <IconPicker value={icon} suggested={iconKeyFor(name || e.name)} onPick={setIcon} /> : null}
                    {errors.icon ? <span className="text-red-ink">{errors.icon}</span> : null}
                </div>
                <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                    Monthly amount
                    <span className="relative">
                        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[15px] font-bold text-slate">R</span>
                        <input value={monthly} onChange={(ev) => setMonthly(cleanTyped(ev.target.value))} inputMode="decimal" placeholder="0.00" className={`${field} num pl-7`} />
                    </span>
                    {errors.budgeted_amount ? <span className="text-red-ink">{errors.budgeted_amount}</span> : null}
                </label>
                <div className="flex flex-col gap-1.5 text-[13px] font-bold text-slate">
                    Kind
                    <div role="radiogroup" aria-label="Kind" className="grid grid-cols-2 gap-1 rounded-xl bg-segment p-1">
                        {(['everyday', 'saving_up'] as const).map((k) => (
                            <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={`h-9 rounded-[10px] text-[14px] font-extrabold transition-colors ${kind === k ? 'bg-card text-ink' : 'text-slate'}`}>
                                {k === 'everyday' ? 'Everyday' : 'Saving up'}
                            </button>
                        ))}
                    </div>
                    <span className="font-semibold">{KIND_NOTE[kind]}</span>
                </div>
            </div>

            <div className="border-t border-line pt-5">
                <div className="mb-2 flex items-baseline justify-between">
                    <h3 className="text-[15px] font-extrabold">This month</h3>
                    <Link href="/history" className="text-[13.5px] font-bold text-teal hover:underline">
                        In History
                    </Link>
                </div>
                {loading ? (
                    <div aria-label="Loading" className="flex flex-col gap-2">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="h-10 animate-pulse rounded-xl bg-canvas" />
                        ))}
                    </div>
                ) : activity.length === 0 ? (
                    <p className="text-[14px] text-slate">Nothing in or out yet.</p>
                ) : (
                    <ul className="flex flex-col">
                        {activity.map((x, i) => {
                            const into = x.kind !== 'spent';
                            const sub = [shared && x.by ? x.by : null, x.kind === 'refund' ? 'Refund' : x.kind === 'allocated' ? 'Allocated' : null, dayLabel(x.date)].filter(Boolean).join(' · ');
                            return (
                                <li key={x.key} className={`flex items-center gap-3 py-2.5 ${i ? 'border-t border-line' : ''}`}>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[14.5px] font-bold">{x.kind === 'allocated' ? `From ${x.note || 'income'}` : x.note || (x.kind === 'refund' ? 'Refund' : 'Spent')}</span>
                                        <span className="block text-[12.5px] text-slate">{sub}</span>
                                    </span>
                                    <span className={`num text-[14.5px] font-extrabold ${into ? 'text-teal' : ''}`}>{formatMoney(x.amount, { income: into })}</span>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {errors.envelope || errors.form ? <p role="alert" className="rounded-xl bg-red-tint px-3 py-2.5 text-[14px] font-bold text-red-ink">{errors.envelope || errors.form}</p> : null}

            <div className="flex flex-col gap-2.5 border-t border-line pt-5">
                <motion.button
                    type="submit"
                    disabled={!dirty || busy !== null}
                    layout
                    className={`h-11 rounded-xl text-[15px] font-extrabold transition-colors active:scale-[0.98] ${dirty || saved ? 'bg-mint text-on-mint' : 'bg-segment text-slate'}`}
                >
                    {busy === 'save' ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
                </motion.button>
                {confirm ? (
                    <div role="alertdialog" aria-label={`Delete ${e.name}?`} className="flex flex-col gap-2 rounded-xl bg-red-tint p-3">
                        <p className="text-[14px] font-bold text-red-ink">Delete {e.name}? This can’t be undone.</p>
                        <div className="flex gap-2">
                            <button type="button" autoFocus onClick={destroy} disabled={busy !== null} className="h-10 flex-1 rounded-xl bg-red px-3 text-[14px] font-extrabold text-white">
                                {busy === 'delete' ? 'Deleting…' : 'Delete envelope'}
                            </button>
                            <button type="button" onClick={() => setConfirm(false)} className="h-10 rounded-xl bg-card px-3.5 text-[14px] font-bold">
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={onArchive} className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-canvas text-[14px] font-bold hover:bg-segment">
                            <Icon name="archive" size={16} stroke={2} />
                            Archive
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirm(true)}
                            disabled={!atZero}
                            className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-red-tint text-[14px] font-bold text-red-text disabled:opacity-50"
                        >
                            <Icon name="trash" size={16} stroke={2} />
                            Delete
                        </button>
                    </div>
                )}
                {!atZero ? <p className="text-[12.5px] text-slate">It holds {formatMoney(e.balance)}. Move it elsewhere to delete this envelope, or archive it to hide it.</p> : null}
            </div>
        </form>
    );
}
