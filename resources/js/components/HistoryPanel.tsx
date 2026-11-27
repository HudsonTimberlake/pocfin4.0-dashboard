import { usePage } from '@inertiajs/react';
import { useRef, useState, type FormEvent } from 'react';
import Icon from '@/components/Icon';
import { cleanTyped, toAmount } from '@/lib/amount';
import { useApp } from '@/lib/app';
import { dayLabel, formatMoney, toCents } from '@/lib/format';
import { Refused, send } from '@/lib/http';
import type { Shared } from '@/types';
import { homeSymbol } from '@/shared/currency';

export type Tab = 'spent' | 'income' | 'moved';
export type Named = { id: number; name: string; archived?: boolean; type?: string };
// The API's rows, as each list answers them.
export type HistoryRow = {
    id: number;
    amount: string;
    date: string;
    note: string | null;
    created_by: number | null;
    automatic?: boolean;
    // Spent
    envelope_id?: number | null;
    refund?: boolean;
    has_receipt?: boolean;
    receipt_version?: string | null;
    // Income
    allocated?: string;
    unallocated?: string;
    // Moved
    from_envelope_id?: number | null;
    from_account_id?: number | null;
    from_private_account?: boolean;
    from_holding_id?: number | null;
    to_envelope_id?: number | null;
    to_account_id?: number | null;
    to_private_account?: boolean;
    to_holding_id?: number | null;
};

const field = 'h-11 w-full rounded-xl border border-line bg-card px-3 text-[15px] font-bold text-ink outline-none focus:border-mint disabled:bg-canvas disabled:text-slate';

const placeOf = (r: HistoryRow, side: 'from' | 'to') => (r[`${side}_envelope_id`] ? `e:${r[`${side}_envelope_id`]}` : r[`${side}_account_id`] ? `a:${r[`${side}_account_id`]}` : '');
export const isInvestment = (r: HistoryRow) => !!(r.from_holding_id || r.to_holding_id);
export const isHidden = (r: HistoryRow) => !!(r.from_private_account || r.to_private_account);

/**
 * W10's side panel: one row to change. Spent: amount, envelope, date, note and the receipt photo.
 * Income: amount, date and note. Moved: amount, from, to, date and note; money into or out of an
 * investment only takes a note (the app's rule). Save sends only what changed.
 */
export default function HistoryPanel({ tab, row, envelopes, accounts, who, premium, onSaved, onDelete, onClose }: {
    tab: Tab;
    row: HistoryRow;
    envelopes: Named[];
    accounts: Named[];
    who: string | null;
    premium: boolean;
    onSaved: (r: HistoryRow) => void;
    onDelete: () => void;
    onClose: () => void;
}) {
    const { csrf } = usePage<Shared>().props;
    const { toast } = useApp();
    const [amount, setAmount] = useState(row.amount);
    const [envelopeId, setEnvelopeId] = useState(row.envelope_id ?? 0);
    const [from, setFrom] = useState(placeOf(row, 'from'));
    const [to, setTo] = useState(placeOf(row, 'to'));
    const [date, setDate] = useState(row.date);
    const [note, setNote] = useState(row.note ?? '');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const noteOnly = tab === 'moved' && isInvestment(row);
    const locked = tab === 'moved' && isHidden(row);
    const title = tab === 'spent' ? (row.refund ? 'Refund' : 'Spent') : tab === 'income' ? 'Income' : 'Moved';
    const places = [
        ...envelopes.filter((e) => !e.archived || placeOf(row, 'from') === `e:${e.id}` || placeOf(row, 'to') === `e:${e.id}`).map((e) => ({ value: `e:${e.id}`, label: e.name })),
        ...accounts.filter((a) => a.type !== 'investment' || placeOf(row, 'from') === `a:${a.id}` || placeOf(row, 'to') === `a:${a.id}`).map((a) => ({ value: `a:${a.id}`, label: a.name })),
    ];

    const changes = (): Record<string, unknown> => {
        const out: Record<string, unknown> = {};
        if ((note.trim() || null) !== (row.note || null)) out.note = note.trim() || null;
        if (noteOnly) return out;
        if (toAmount(amount) !== row.amount) out.amount = toAmount(amount);
        if (date !== row.date) out.date = date;
        if (tab === 'spent' && envelopeId !== row.envelope_id) out.envelope_id = envelopeId;
        if (tab === 'moved') {
            for (const [side, now] of [['from', from], ['to', to]] as const) {
                if (now !== placeOf(row, side)) out[`${side}_${now.startsWith('e:') ? 'envelope' : 'account'}_id`] = Number(now.slice(2));
            }
        }
        return out;
    };
    const dirty = Object.keys(changes()).length > 0;

    async function save(e: FormEvent) {
        e.preventDefault();
        if (!dirty || busy || locked) return;
        setBusy('save');
        try {
            const fresh = await send<HistoryRow>(csrf, 'PATCH', `/history/${tab}/${row.id}`, changes());
            setErrors({});
            setSaved(true);
            window.setTimeout(() => setSaved(false), 1600);
            onSaved(fresh);
        } catch (err) {
            setErrors(err instanceof Refused ? err.errors : { form: 'That didn’t work.' });
        } finally {
            setBusy(null);
        }
    }

    async function upload(file: File) {
        const body = new FormData();
        body.append('receipt', file);
        setBusy('receipt');
        try {
            await send(csrf, 'POST', `/history/receipt/${row.id}`, body);
            onSaved({ ...row, has_receipt: true, receipt_version: String(Date.now()) });
            toast({ text: '✓ Receipt attached' });
            setErrors({});
        } catch (err) {
            setErrors(err instanceof Refused ? { receipt: Object.values(err.errors)[0] } : { receipt: 'That didn’t work.' });
        } finally {
            setBusy(null);
            if (fileRef.current) fileRef.current.value = '';
        }
    }

    async function removeReceipt() {
        setBusy('receipt');
        try {
            await send(csrf, 'DELETE', `/history/receipt/${row.id}`);
            onSaved({ ...row, has_receipt: false, receipt_version: null });
            toast({ text: 'Receipt removed' });
        } catch (err) {
            setErrors(err instanceof Refused ? { receipt: Object.values(err.errors)[0] } : { receipt: 'That didn’t work.' });
        } finally {
            setBusy(null);
        }
    }

    const err = (k: string) => (errors[k] ? <span className="text-[13px] font-bold text-red-ink">{errors[k]}</span> : null);
    const placeSelect = (value: string, set: (v: string) => void, label: string, k: 'from' | 'to') => (
        <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
            {label}
            {row[`${k}_private_account`] ? (
                <span className="flex h-11 items-center text-[15px] text-ink">Private account</span>
            ) : (
                <select value={value} disabled={noteOnly || locked} onChange={(e) => set(e.target.value)} className={field}>
                    {places.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
            )}
            {err(`${k}_envelope_id`) ?? err(`${k}_account_id`)}
        </label>
    );

    return (
        <form onSubmit={save} onKeyDown={(e) => e.key === 'Escape' && (e.target as HTMLElement).tagName !== 'SELECT' && onClose()} aria-label={`Change this ${title.toLowerCase()}`} className="flex flex-col gap-4 rounded-[24px] bg-card p-5">
            <div className="flex items-center gap-3">
                <h2 className="flex-1 text-[19px] font-extrabold">{title}</h2>
                <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-canvas text-slate hover:text-ink">
                    <Icon name="close" size={16} stroke={2.2} />
                </button>
            </div>

            {noteOnly ? <p className="rounded-xl bg-navy-tint px-3.5 py-2.5 text-[13.5px] font-bold text-navy-text">Money into or out of an investment: only the note can change. It can be deleted while it’s the holding’s newest movement.</p> : null}
            {locked ? <p className="rounded-xl bg-canvas px-3.5 py-2.5 text-[13.5px] font-bold text-slate">This went to or from someone’s private account, so only they can change it.</p> : null}
            {tab === 'income' && row.allocated && toCents(row.allocated) > 0n ? (
                <p className="rounded-xl bg-tint px-3.5 py-2.5 text-[13.5px] font-bold text-tint-sub">
                    {formatMoney(row.allocated)} of it already has a place, so it can’t go below that or be deleted.
                </p>
            ) : null}

            <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                Amount
                <span className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[15px] font-bold text-slate">{homeSymbol()}</span>
                    <input value={amount} disabled={noteOnly || locked} onChange={(e) => setAmount(cleanTyped(e.target.value))} inputMode="decimal" className={`${field} num pl-7 font-extrabold`} />
                </span>
                {err('amount')}
            </label>

            {tab === 'spent' ? (
                <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                    {row.refund ? 'Back into' : 'Envelope'}
                    <select value={envelopeId} onChange={(e) => setEnvelopeId(Number(e.target.value))} className={field}>
                        {envelopes
                            .filter((e) => !e.archived || e.id === row.envelope_id)
                            .map((e) => (
                                <option key={e.id} value={e.id}>
                                    {e.name}
                                </option>
                            ))}
                    </select>
                    {err('envelope_id')}
                </label>
            ) : null}
            {tab === 'moved' ? (
                <div className="grid grid-cols-2 gap-2.5">
                    {placeSelect(from, setFrom, 'From', 'from')}
                    {placeSelect(to, setTo, 'To', 'to')}
                </div>
            ) : null}

            <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                Date
                <input type="date" value={date} disabled={noteOnly || locked} onChange={(e) => e.target.value && setDate(e.target.value)} className={field} />
                {err('date')}
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                {tab === 'income' ? 'From' : 'Note'}
                <input value={note} disabled={locked} onChange={(e) => setNote(e.target.value)} maxLength={255} className={`${field} font-semibold`} />
                {err('note')}
            </label>

            {tab === 'spent' ? (
                <div className="flex flex-col gap-1.5 text-[13px] font-bold text-slate">
                    Receipt
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                    {row.has_receipt ? (
                        <div className="flex items-center gap-2 rounded-xl bg-canvas px-3 py-2.5 text-[14px] text-ink">
                            <Icon name="receipt" size={16} stroke={2} />
                            <a href={`/history/receipt/${row.id}?v=${row.receipt_version ?? ''}`} target="_blank" rel="noopener" className="flex-1 font-bold text-teal hover:underline">
                                Open the photo
                            </a>
                            {premium ? (
                                <button type="button" disabled={busy !== null} onClick={() => fileRef.current?.click()} className="font-bold text-teal hover:underline">
                                    Replace
                                </button>
                            ) : null}
                            <button type="button" disabled={busy !== null} onClick={removeReceipt} className="font-bold text-red-text hover:underline">
                                Remove
                            </button>
                        </div>
                    ) : premium ? (
                        <button type="button" disabled={busy !== null} onClick={() => fileRef.current?.click()} className="flex h-10 items-center gap-2 self-start rounded-xl px-1 text-[14px] font-bold text-teal hover:underline">
                            <Icon name="receipt" size={16} stroke={2} />
                            {busy === 'receipt' ? 'Attaching…' : 'Add a receipt photo'}
                        </button>
                    ) : (
                        <span className="font-semibold">Receipt photos come with Premium.</span>
                    )}
                    {err('receipt')}
                </div>
            ) : null}

            {errors.form ? <p role="alert" className="rounded-xl bg-red-tint px-3 py-2.5 text-[14px] font-bold text-red-ink">{errors.form}</p> : null}

            <div className="flex flex-col gap-2.5 border-t border-line pt-4">
                <div className="text-[12.5px] text-slate">
                    {who ? `Recorded by ${who} · ` : ''}
                    {dayLabel(row.date)}
                    {row.automatic ? ' · Automatic' : ''}
                </div>
                {!locked ? (
                    <button type="submit" disabled={!dirty || busy !== null} className={`h-11 rounded-xl text-[15px] font-extrabold transition-transform active:scale-[0.98] ${dirty || saved ? 'bg-mint text-on-mint' : 'bg-segment text-slate'}`}>
                        {busy === 'save' ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
                    </button>
                ) : null}
                {!locked ? (
                    <button type="button" onClick={onDelete} className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-red-tint text-[14px] font-bold text-red-text">
                        <Icon name="trash" size={16} stroke={2} />
                        Delete
                    </button>
                ) : null}
            </div>
        </form>
    );
}
