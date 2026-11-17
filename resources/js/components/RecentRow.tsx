import { router } from '@inertiajs/react';
import { motion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import Icon from '@/components/Icon';
import { cleanTyped, toAmount } from '@/lib/amount';
import { useApp } from '@/lib/app';
import { dayLabel, formatMoney, initial } from '@/lib/format';
import { ARRIVE } from '@/lib/motion';
import type { Envelope, Expense } from '@/types';

const field = 'h-11 w-full rounded-xl border border-line bg-card px-3 text-[15px] font-bold text-ink outline-none focus:border-mint';

/**
 * A recent row on Overview: click to change it in place (W2). Save sends the change; Delete hides
 * it with Undo for 6 seconds before anything is sent (W5 · 4).
 */
export default function RecentRow({ x, envelopes, who, editing, onEdit, onClose, onDelete }: {
    x: Expense;
    envelopes: Envelope[];
    who?: { name: string; tone: string };
    editing: boolean;
    onEdit: () => void;
    onClose: () => void;
    onDelete: () => void;
}) {
    const { toast } = useApp();
    const env = envelopes.find((e) => e.id === x.envelope_id);
    const [typed, setTyped] = useState(x.amount);
    const [envelopeId, setEnvelopeId] = useState(x.envelope_id ?? 0);
    const [date, setDate] = useState(x.date);
    const [note, setNote] = useState(x.note ?? '');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    const editable = x.envelope_id !== null;

    function save(e: FormEvent) {
        e.preventDefault();
        setBusy(true);
        router.patch(`/money/expenses/${x.id}`, { amount: toAmount(typed), envelope_id: envelopeId, date, note: note.trim() || null }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                onClose();
                toast({ text: '✓ Saved' });
            },
            onError: (er) => setErrors(er as Record<string, string>),
            onFinish: () => setBusy(false),
        });
    }

    if (editing && editable) {
        return (
            <motion.form
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: ARRIVE }}
                onSubmit={save}
                onKeyDown={(e) => e.key === 'Escape' && onClose()}
                aria-label={`Change ${x.note || env?.name || 'this row'}`}
                className="m-1 flex flex-col gap-3 rounded-[18px] bg-canvas p-4"
            >
                <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
                    <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                        Amount
                        <input autoFocus value={typed} onChange={(e) => setTyped(cleanTyped(e.target.value))} inputMode="decimal" className={`${field} num font-extrabold`} />
                        {errors.amount ? <span className="text-red-ink">{errors.amount}</span> : null}
                    </label>
                    <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                        {x.refund ? 'Back into' : 'Envelope'}
                        <select value={envelopeId} onChange={(e) => setEnvelopeId(Number(e.target.value))} className={field}>
                            {envelopes
                                .filter((e) => !e.archived || e.id === x.envelope_id)
                                .map((e) => (
                                    <option key={e.id} value={e.id}>
                                        {e.name}
                                    </option>
                                ))}
                        </select>
                        {errors.envelope_id ? <span className="text-red-ink">{errors.envelope_id}</span> : null}
                    </label>
                    <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                        Date
                        <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className={field} />
                        {errors.date ? <span className="text-red-ink">{errors.date}</span> : null}
                    </label>
                </div>
                <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                    Note
                    <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} className={`${field} font-semibold`} />
                </label>
                {errors.form ? <p className="text-sm font-bold text-red-ink">{errors.form}</p> : null}
                <div className="flex flex-wrap items-center gap-2">
                    <button type="submit" disabled={busy} className="h-10 rounded-xl bg-mint px-[18px] text-[14.5px] font-extrabold text-on-mint transition-transform active:scale-[0.97] disabled:opacity-70">
                        {busy ? 'Saving…' : 'Save'}
                    </button>
                    <button type="button" onClick={onClose} className="h-10 rounded-xl px-3.5 text-[14.5px] font-bold text-teal">
                        Cancel
                    </button>
                    <span className="flex-1" />
                    <button type="button" onClick={onDelete} className="h-10 rounded-xl bg-red-tint px-3.5 text-[14.5px] font-bold text-red-text">
                        Delete
                    </button>
                </div>
                <div className="text-[12.5px] text-slate">Enter saves · Esc cancels{who ? ` · Recorded by ${who.name}` : ''}</div>
            </motion.form>
        );
    }

    const body = (
        <>
            {who ? (
                <span aria-label={who.name} title={who.name} className={`grid size-8 flex-none place-items-center rounded-full text-[13px] font-extrabold ${who.tone}`}>
                    {initial(who.name)}
                </span>
            ) : null}
            <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold">{x.note || env?.name || 'Spent'}</span>
                <span className="block text-[13px] text-slate">
                    {env?.name ?? 'Account'}
                    {x.refund ? ' · refund' : ''} · {dayLabel(x.date)}
                </span>
            </span>
            <span className={`num text-[15px] font-extrabold ${x.refund ? 'text-teal' : ''}`}>{formatMoney(x.amount, { income: x.refund })}</span>
        </>
    );

    return editable ? (
        <button type="button" onClick={onEdit} aria-label={`Change ${x.note || env?.name}, ${formatMoney(x.amount)}`} className="group flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition-colors hover:bg-canvas">
            {body}
            <span className="text-slate opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <Icon name="pen" size={16} stroke={2} />
            </span>
        </button>
    ) : (
        <div className="flex items-center gap-3 rounded-[14px] px-3 py-2.5">{body}</div>
    );
}
