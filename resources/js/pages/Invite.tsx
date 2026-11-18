import { Head, useForm } from '@inertiajs/react';
import HelpButton from '@/components/HelpButton';
import { useState, type ReactNode } from 'react';
import Icon from '@/components/Icon';
import Shell from '@/components/Shell';
import { dateText, initial } from '@/lib/format';

type Props = {
    referrals: { code?: string; link?: string; months_earned?: number; max_months_ahead?: number; budget?: { id: number } | null; friends?: { name: string; rewarded: boolean; joined_at: string }[] };
    budgets: { id: number; name: string }[];
};

const hero = 'bg-[linear-gradient(165deg,var(--tint-soft),var(--tint))]';

function CopyButton({ text, label, primary = false }: { text: string; label: string; primary?: boolean }) {
    const [done, setDone] = useState(false);
    return (
        <button
            type="button"
            onClick={() => {
                navigator.clipboard?.writeText(text).then(() => {
                    setDone(true);
                    setTimeout(() => setDone(false), 1800);
                }).catch(() => {});
            }}
            className={`flex h-12 items-center gap-2 rounded-[14px] px-5 text-[15px] font-extrabold transition-transform active:scale-[0.97] ${primary ? 'bg-mint text-on-mint' : 'bg-card'}`}
        >
            {primary ? <Icon name="receipt" size={18} /> : null}
            {done ? 'Copied' : label}
        </button>
    );
}

/** Invite friends: your code and link, who joined, and which budget gets your free months. */
export default function Invite({ referrals: r, budgets }: Props) {
    const form = useForm({ budget_id: r.budget?.id ?? budgets[0]?.id ?? 0 });
    const earned = r.months_earned ?? 0;
    return (
        <>
            <Head title="Invite friends" />
            <div className="flex max-w-[1040px] flex-col gap-5">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.02em]">Invite friends</h1>
                        <HelpButton topic="invite" />
                    </div>
                    <p className="mt-0.5 text-[15px] text-slate">You both get a free month of Premium</p>
                </div>

                <section aria-labelledby="cd" className={`flex flex-wrap items-center gap-6 rounded-[28px] px-7 py-7 ${hero}`}>
                    <div className="min-w-[240px] flex-1">
                        <h2 id="cd" className="text-[15px] font-bold text-teal">
                            Your code
                        </h2>
                        <div className="mt-1 text-[44px] leading-[52px] font-extrabold tracking-[0.02em]">{r.code ?? ''}</div>
                        <div className="mt-1 text-[15px] break-all text-tint-sub">{r.link ?? ''}</div>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                        <CopyButton text={r.link ?? ''} label="Copy link" primary />
                        <CopyButton text={r.code ?? ''} label="Copy code" />
                    </div>
                </section>

                <section aria-labelledby="hw" className="rounded-[24px] bg-card p-6">
                    <h2 id="hw" className="text-[19px] font-extrabold">
                        How it works
                    </h2>
                    <ol className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-4">
                        {['Send your link. It fills in your code when they sign up.', 'They record their first expense in PocFin.', `You each get a month of Premium. Months add up, up to ${r.max_months_ahead ?? 12} ahead.`].map((t, i) => (
                            <li key={i} className="flex gap-3">
                                <span className="grid size-8 flex-none place-items-center rounded-full bg-tint font-extrabold text-teal">{i + 1}</span>
                                <span className="text-[15px] leading-[22px]">{t}</span>
                            </li>
                        ))}
                    </ol>
                </section>

                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-start gap-5">
                    <section aria-labelledby="fr" className="rounded-[24px] bg-card p-6">
                        <div className="flex items-baseline justify-between gap-2.5">
                            <h2 id="fr" className="text-[19px] font-extrabold">
                                Friends who joined
                            </h2>
                            <span className="text-sm font-bold text-teal">
                                {earned} {earned === 1 ? 'month' : 'months'} earned
                            </span>
                        </div>
                        <div className="mt-3">
                            {(r.friends ?? []).length ? (
                                r.friends!.map((f, i) => (
                                    <div key={i} className="flex items-center gap-3 border-t border-rule py-3.5">
                                        <span aria-hidden="true" className={`grid size-[34px] flex-none place-items-center rounded-full text-[13px] font-extrabold ${f.rewarded ? 'bg-tint text-teal' : 'bg-canvas text-slate'}`}>
                                            {initial(f.name)}
                                        </span>
                                        <span className="flex-1">
                                            <span className="block text-[15px] font-bold">{f.name}</span>
                                            <span className="block text-[13px] text-slate">{f.rewarded ? 'Free month earned' : `Joined ${dateText(f.joined_at)}, waiting for a first expense`}</span>
                                        </span>
                                        {f.rewarded ? (
                                            <span className="text-teal">
                                                <Icon name="check" stroke={2.4} />
                                            </span>
                                        ) : null}
                                    </div>
                                ))
                            ) : (
                                <p className="border-t border-rule pt-3.5 text-[15px] text-slate">Nobody yet. Send your link to someone who’d like a calmer budget.</p>
                            )}
                        </div>
                    </section>

                    <form
                        aria-labelledby="gt"
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.post('/invite/budget', { preserveScroll: true });
                        }}
                        className="rounded-[24px] bg-card p-6"
                    >
                        <h2 id="gt" className="text-[19px] font-extrabold">
                            Where your months go
                        </h2>
                        <p className="mt-0.5 text-sm text-slate">The budget that gets your free months</p>
                        <label htmlFor="bg" className="sr-only">
                            Budget
                        </label>
                        <select id="bg" value={form.data.budget_id} onChange={(e) => form.setData('budget_id', Number(e.target.value))} className="mt-3.5 h-11 w-full rounded-xl border border-line bg-canvas px-3 text-[15px] font-bold outline-none focus:border-mint">
                            {budgets.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.name}
                                </option>
                            ))}
                        </select>
                        {form.errors.budget_id ? <p className="mt-1 text-[13px] font-bold text-red">{form.errors.budget_id}</p> : null}
                        <button type="submit" disabled={form.processing} className="mt-3.5 h-11 rounded-[14px] bg-mint px-5 text-[15px] font-extrabold text-on-mint transition-transform active:scale-[0.97] disabled:opacity-50">
                            Save
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}

Invite.layout = (page: ReactNode) => (
    <Shell active="invite" title="Invite friends">
        {page}
    </Shell>
);
