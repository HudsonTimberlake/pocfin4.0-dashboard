import { Head, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { useState, type FormEvent, type ReactNode } from 'react';
import Shell from '@/components/Shell';
import { useApp } from '@/lib/app';
import { dayLabel, monthName } from '@/lib/format';
import { Refused, send } from '@/lib/http';
import { ARRIVE } from '@/lib/motion';
import type { Shared } from '@/types';

type Note = { id: number; body: string; shared: boolean; cycle_start: string | null; remind_at: string | null; mine: boolean; author: string; created_at: string };
type Props = { notes: Note[]; cycle: { start: string; end: string } | null };

const remindText = (iso: string) => {
    const d = new Date(iso);
    return `Reminder ${d.getDate()} ${d.toLocaleString('en-ZA', { month: 'short' })}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function Chip({ tone, children }: { tone: 'teal' | 'amber' | 'grey'; children: ReactNode }) {
    const c = { teal: 'bg-tint text-teal', amber: 'bg-amber-tint text-amber-text', grey: 'bg-segment text-slate' }[tone];
    return <span className={`rounded-lg px-2 py-0.5 text-[12px] font-extrabold ${c}`}>{children}</span>;
}

/**
 * W17 Notes: what to do next, or why a month looked the way it did. A note can be tagged to the
 * running month (it appears in that month's recap), carry a reminder, and be shared with the
 * budget or kept private. Only the author changes or deletes one.
 */
export default function Notes(p: Props) {
    const { csrf } = usePage<Shared>().props;
    const { toast } = useApp();
    const [notes, setNotes] = useState(p.notes);
    const [draft, setDraft] = useState('');
    const [month, setMonth] = useState(false);
    const [remind, setRemind] = useState(false);
    const [when, setWhen] = useState('');
    const [shared, setShared] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [sure, setSure] = useState<number | null>(null);
    const thisMonth = p.cycle ? monthName(p.cycle.start) : 'this month';

    async function add(e: FormEvent) {
        e.preventDefault();
        if (!draft.trim() || busy) return;
        if (remind && !when) return setError('Pick the day to be reminded.');
        setBusy(true);
        setError('');
        try {
            const row = await send<Note>(csrf, 'POST', '/notes', { body: draft.trim(), shared, this_cycle: month, ...(remind ? { remind_at: new Date(`${when}T08:00:00`).toISOString() } : {}) });
            setNotes((n) => [row, ...n]);
            setDraft('');
            setMonth(false);
            setRemind(false);
            setWhen('');
        } catch (err) {
            setError(err instanceof Refused ? err.message : 'That didn’t save.');
        } finally {
            setBusy(false);
        }
    }

    async function remove(id: number) {
        setSure(null);
        try {
            await send(csrf, 'DELETE', `/notes/${id}`);
            setNotes((n) => n.filter((x) => x.id !== id));
        } catch (err) {
            toast({ text: err instanceof Refused ? err.message : 'That didn’t delete.' });
        }
    }

    const opt = (on: boolean, flip: () => void, label: string) => (
        <button type="button" role="switch" aria-checked={on} onClick={flip} className={`h-9 rounded-xl px-3 text-[13.5px] font-extrabold transition-colors ${on ? 'bg-tint text-teal' : 'bg-canvas text-slate'}`}>
            {on ? '✓ ' : ''}
            {label}
        </button>
    );

    return (
        <>
            <Head title="Notes" />
            <div className="flex max-w-[760px] flex-col gap-5">
                <div>
                    <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.02em]">Notes</h1>
                    <p className="mt-0.5 text-[15px] text-slate">What to do next, or why a month looked the way it did.</p>
                </div>

                <form onSubmit={add} className="flex flex-col gap-3 rounded-[24px] bg-card p-5">
                    <label htmlFor="note" className="sr-only">
                        New note
                    </label>
                    <textarea id="note" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2000} rows={3} placeholder="Write a note…" className="w-full resize-y rounded-xl border border-line bg-canvas p-3 text-[15px] font-semibold text-ink outline-none focus:border-mint" />
                    <div className="flex flex-wrap items-center gap-2">
                        {opt(month, () => setMonth(!month), `Tag to ${thisMonth}`)}
                        {opt(remind, () => setRemind(!remind), 'Remind me')}
                        {remind ? <input type="date" aria-label="Remind me on" value={when} onChange={(e) => setWhen(e.target.value)} className="h-9 rounded-xl border border-line bg-canvas px-2 text-[13.5px] font-bold outline-none focus:border-mint" /> : null}
                        {opt(shared, () => setShared(!shared), 'Share with this budget')}
                        <button type="submit" disabled={!draft.trim() || busy} className="ml-auto h-10 rounded-[14px] bg-mint px-4 text-[15px] font-extrabold text-on-mint transition-transform active:scale-[0.97] disabled:bg-segment disabled:text-slate">
                            Save note
                        </button>
                    </div>
                    {error ? <span className="text-[13px] font-bold text-red">{error}</span> : null}
                </form>

                {notes.length === 0 ? <p className="px-1 text-[15px] text-slate">No notes yet. A note tagged to a month shows up in that month’s recap.</p> : null}
                <ul className="flex flex-col gap-3">
                    <AnimatePresence initial={false}>
                        {notes.map((n) => (
                            <motion.li key={n.id} layout="position" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22, ease: ARRIVE }} className="rounded-[20px] bg-card p-4">
                                <p className="text-[15px] leading-snug font-semibold whitespace-pre-line">{n.body}</p>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    {n.cycle_start ? <Chip tone="teal">In {monthName(n.cycle_start)}’s recap</Chip> : null}
                                    {n.remind_at ? <Chip tone="amber">{remindText(n.remind_at)}</Chip> : null}
                                    {!n.shared ? <Chip tone="grey">Only you</Chip> : null}
                                    <span className="text-[13px] text-slate">
                                        {n.mine ? 'You' : n.author} · {dayLabel(n.created_at.slice(0, 10))}
                                    </span>
                                    {n.mine ? (
                                        <span className="ml-auto flex items-center gap-2">
                                            {sure === n.id ? (
                                                <>
                                                    <button type="button" onClick={() => void remove(n.id)} className="h-8 rounded-lg bg-red-tint px-3 text-[13px] font-extrabold text-red-ink">
                                                        Delete note
                                                    </button>
                                                    <button type="button" onClick={() => setSure(null)} className="text-[13px] font-extrabold text-slate">
                                                        Keep
                                                    </button>
                                                </>
                                            ) : (
                                                <button type="button" onClick={() => setSure(n.id)} className="text-[13px] font-extrabold text-slate hover:text-red-ink">
                                                    Delete
                                                </button>
                                            )}
                                        </span>
                                    ) : null}
                                </div>
                            </motion.li>
                        ))}
                    </AnimatePresence>
                </ul>
            </div>
        </>
    );
}

Notes.layout = (page: ReactNode) => (
    <Shell active="notes" title="Notes">
        {page}
    </Shell>
);
