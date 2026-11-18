import { Head, router, usePage } from '@inertiajs/react';
import HelpButton from '@/components/HelpButton';
import { useState, type FormEvent, type ReactNode } from 'react';
import Shell from '@/components/Shell';
import { useApp } from '@/lib/app';
import { Refused, send } from '@/lib/http';
import type { Shared } from '@/types';

type Budget = { id: number; name: string; cycle_start_day: number; role: 'owner' | 'member'; premium: { active: boolean; status: string; until: string | null; forever: boolean } };

const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;

function dayNote(day: number): string {
    const now = new Date();
    const month = now.toLocaleString('en-ZA', { month: 'long' });
    const short = now.toLocaleString('en-ZA', { month: 'short' });
    if (day === 1) return `Months run from the 1st to the last day. ${month} runs 1 to ${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()} ${short}.`;
    const next = new Date(now.getFullYear(), now.getMonth() + 1, day - 1);
    return `Months run from payday: ${month} would be ${day} ${short} to ${next.getDate()} ${next.toLocaleString('en-ZA', { month: 'short' })}. Past recaps keep their own dates.`;
}

function premiumLine(p: Budget['premium']): string {
    if (p.forever) return 'Premium with no end date';
    if (!p.active) return 'Not on Premium';
    const until = p.until ? new Date(`${p.until}T00:00:00`).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    return p.status === 'grace' ? `Premium ended ${until}; there’s a short grace period` : `Premium until ${until}`;
}

/**
 * W17c Budget settings: the name and the day a month starts (owner only), Premium for this budget,
 * and deleting it. Start fresh isn't here yet: it isn't built in the app.
 */
export default function BudgetSettings({ budget }: { budget: Budget }) {
    const { csrf } = usePage<Shared>().props;
    const { toast } = useApp();
    const owner = budget.role === 'owner';
    const [name, setName] = useState(budget.name);
    const [day, setDay] = useState(budget.cycle_start_day);
    const [saved, setSaved] = useState({ name: budget.name, day: budget.cycle_start_day });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [typed, setTyped] = useState('');

    const changed = name.trim() !== saved.name || day !== saved.day;

    async function save(e: FormEvent) {
        e.preventDefault();
        if (!changed || busy) return;
        setBusy(true);
        setErrors({});
        try {
            const b = await send<Budget>(csrf, 'PATCH', '/settings', { name: name.trim(), cycle_start_day: day });
            setSaved({ name: b.name, day: b.cycle_start_day });
            setName(b.name);
            toast({ text: 'Saved' });
            router.reload({ only: ['budgets'] });
        } catch (err) {
            setErrors(err instanceof Refused ? err.errors : { form: 'That didn’t save.' });
        } finally {
            setBusy(false);
        }
    }

    async function remove() {
        setBusy(true);
        try {
            const r = await send<{ to: string }>(csrf, 'DELETE', '/settings');
            window.location.href = r.to;
        } catch (err) {
            setErrors(err instanceof Refused ? err.errors : { form: 'That didn’t delete.' });
            setBusy(false);
        }
    }

    const field = 'h-11 w-full rounded-xl border border-line bg-canvas px-3 text-[15px] font-bold text-ink outline-none focus:border-mint disabled:opacity-60';

    return (
        <>
            <Head title="Budget settings" />
            <div className="flex max-w-[640px] flex-col gap-5">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.02em]">Budget settings</h1>
                        <HelpButton topic="budget-settings" />
                    </div>
                    <p className="mt-0.5 text-[15px] text-slate">
                        {saved.name} · you’re {owner ? 'the owner' : 'a member'}
                    </p>
                </div>

                <form onSubmit={save} className="flex flex-col gap-4 rounded-[24px] bg-card p-5">
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="bname" className="text-[13.5px] font-bold text-slate">
                            Name
                        </label>
                        <input id="bname" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} disabled={!owner} className={field} />
                        {errors.name ? <span className="text-[13px] font-bold text-red">{errors.name}</span> : null}
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="bday" className="text-[13.5px] font-bold text-slate">
                            When your month starts
                        </label>
                        <select id="bday" value={day} onChange={(e) => setDay(Number(e.target.value))} disabled={!owner} className={field}>
                            {Array.from({ length: 28 }, (_, i) => i + 1).map((n) => (
                                <option key={n} value={n}>
                                    On the {ordinal(n)}
                                </option>
                            ))}
                        </select>
                        {errors.cycle_start_day ? <span className="text-[13px] font-bold text-red">{errors.cycle_start_day}</span> : null}
                        <p className="text-[13px] leading-snug text-slate">{dayNote(day)}</p>
                    </div>
                    {errors.form ? <span className="text-[13px] font-bold text-red">{errors.form}</span> : null}
                    {owner ? (
                        <button type="submit" disabled={!changed || busy} className="h-11 self-start rounded-[14px] bg-mint px-5 text-[15px] font-extrabold text-on-mint transition-transform active:scale-[0.97] disabled:bg-segment disabled:text-slate">
                            {changed ? 'Save' : '✓ Saved'}
                        </button>
                    ) : (
                        <p className="text-[13px] text-slate">Only the owner can change these.</p>
                    )}
                </form>

                <section className="flex flex-wrap items-center gap-3 rounded-[24px] bg-card p-5">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-[17px] font-extrabold">Premium for {saved.name}</h2>
                        <p className="text-[14px] text-slate">{premiumLine(budget.premium)}</p>
                    </div>
                    <a href="/premium" className="flex h-11 items-center rounded-[14px] bg-segment px-4 text-[15px] font-extrabold">
                        See Premium
                    </a>
                </section>

                {owner ? (
                    <section className="flex flex-col gap-3 rounded-[24px] bg-card p-5">
                        <p className="text-[14px] text-slate">Deleting erases every envelope, account and row in {saved.name} for everyone who shares it. It can’t be undone.</p>
                        {deleting ? (
                            <div role="alertdialog" className="flex flex-col gap-2 rounded-xl bg-red-tint p-3">
                                <label htmlFor="confirm-name" className="text-[14px] font-bold text-red-ink">
                                    Type {saved.name} to delete it
                                </label>
                                <input id="confirm-name" autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} className={field} />
                                <div className="flex gap-2">
                                    <button type="button" disabled={typed.trim() !== saved.name || busy} onClick={() => void remove()} className="h-10 flex-1 rounded-xl bg-red text-[14px] font-extrabold text-white disabled:opacity-40">
                                        Delete budget
                                    </button>
                                    <button type="button" onClick={() => { setDeleting(false); setTyped(''); }} className="h-10 rounded-xl bg-card px-3 text-[14px] font-bold">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button type="button" onClick={() => setDeleting(true)} className="h-11 self-start rounded-[14px] bg-red-tint px-4 text-[15px] font-extrabold text-red-ink">
                                Delete budget
                            </button>
                        )}
                    </section>
                ) : null}
            </div>
        </>
    );
}

BudgetSettings.layout = (page: ReactNode) => (
    <Shell active="settings" title="Budget settings">
        {page}
    </Shell>
);
