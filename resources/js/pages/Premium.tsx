import { Head, useForm } from '@inertiajs/react';
import HelpButton from '@/components/HelpButton';
import { type ReactNode } from 'react';
import Icon from '@/components/Icon';
import Shell from '@/components/Shell';
import { dateText, formatMoney, monthYear } from '@/lib/format';

type Sub = { active?: boolean; store?: string | null; product?: string | null; renews?: boolean; until?: string | null; max_budgets?: number; budgets?: { id: number; name: string; covered: boolean }[] };
type Event = { type: string; period_type?: string | null; occurred_at: string; period_start?: string | null; period_end?: string | null; months?: number | null; price: string | null; currency?: string | null };
type Detail = { active?: boolean; forever?: boolean; until?: string | null; subscription?: { name: string } | null; history?: { source: string; action: string; months?: number; until?: string; from?: string | null; created_at: string }[] };
type Props = {
    subscription: Sub;
    events: { months_paid?: number; since?: string | null; data: Event[] };
    budgets: { id: number; name: string; premium: Detail }[];
    manage: { app_store: string; play_store: string };
};

const WHAT: Record<string, string> = {
    initial_purchase: 'First payment', renewal: 'Renewal', product_change: 'Changed plan', cancellation: 'Cancelled', uncancellation: 'Turned back on', expiration: 'Ended', billing_issue: 'Payment problem',
    non_renewing_purchase: 'One-off purchase', subscription_paused: 'Paused', transfer: 'Moved between accounts',
};

function grant(g: NonNullable<Detail['history']>[number]): string {
    if (g.source === 'referral') return `1 free month${g.from ? ` · ${g.from} joined with a code` : ''}`;
    if (g.action === 'months') return `${g.months} ${g.months === 1 ? 'month' : 'months'} from PocFin`;
    if (g.action === 'forever') return 'Premium for good';
    if (g.action === 'until') return `Premium until ${dateText(g.until)}`;
    if (g.action === 'end') return 'Premium ended';
    return 'Change';
}

const hero = 'bg-[linear-gradient(165deg,var(--tint-soft),var(--tint))]';

/**
 * Premium: your subscription (bought and changed in the store, never here), which budgets it
 * covers, the payments the store reported, and the Premium state of each budget.
 */
export default function Premium({ subscription: sub, events, budgets, manage }: Props) {
    const active = sub.active ?? false;
    const store = sub.store === 'play_store' ? 'Google Play' : 'the App Store';
    const manageUrl = sub.store === 'play_store' ? manage.play_store : manage.app_store;
    const product = String(sub.product ?? '');
    const period = product.includes('year') || product.includes('annual') ? 'Yearly · R399.99 a year' : 'Monthly · R39.99 a month';
    const covered = (sub.budgets ?? []).filter((b) => b.covered).length;
    const form = useForm<{ budget_ids: number[] }>({ budget_ids: (sub.budgets ?? []).filter((b) => b.covered).map((b) => b.id) });
    const toggle = (id: number) => form.setData('budget_ids', form.data.budget_ids.includes(id) ? form.data.budget_ids.filter((x) => x !== id) : [...form.data.budget_ids, id]);

    return (
        <>
            <Head title="Premium" />
            <div className="flex max-w-[1040px] flex-col gap-5">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.02em]">Premium</h1>
                        <HelpButton topic="premium" />
                    </div>
                    <p className="mt-0.5 text-[15px] text-slate">Budgeting together, past recaps and receipt photos</p>
                </div>

                {active ? (
                    <>
                        <section aria-labelledby="sb" className="flex flex-wrap items-end gap-6 rounded-[28px] bg-navy px-7 py-7 text-white">
                            <div className="min-w-[260px] flex-1">
                                <div className="text-sm font-bold text-mint-light">Your subscription</div>
                                <h2 id="sb" className="mt-1.5 text-[28px] leading-9 font-extrabold tracking-[-0.02em]">
                                    {period}
                                </h2>
                                <p className="mt-1.5 text-[15px] text-navy-soft">
                                    {sub.renews ? 'Renews on' : 'Ends on'} {dateText(sub.until)} · bought in {store}
                                </p>
                                <div className="mt-[18px] flex flex-wrap gap-6">
                                    <div>
                                        <div className="num text-[26px] font-extrabold">{events.months_paid ?? 0}</div>
                                        <div className="text-[13.5px] font-bold text-navy-soft">months paid</div>
                                    </div>
                                    {events.since ? (
                                        <div>
                                            <div className="text-[26px] font-extrabold">{monthYear(events.since.slice(0, 10)).replace(/^(\w{3})\w*/, '$1')}</div>
                                            <div className="text-[13.5px] font-bold text-navy-soft">subscriber since</div>
                                        </div>
                                    ) : null}
                                    <div>
                                        <div className="num text-[26px] font-extrabold">
                                            {covered} of {sub.max_budgets ?? 3}
                                        </div>
                                        <div className="text-[13.5px] font-bold text-navy-soft">budgets covered</div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-start gap-2">
                                <a href={manageUrl} target="_blank" rel="noopener" className="inline-flex h-[46px] items-center gap-2 rounded-[14px] bg-white px-[18px] text-[15px] font-bold text-[#013551]">
                                    Manage in {store}
                                    <Icon name="chevronRight" size={16} stroke={2.2} />
                                </a>
                                <span className="text-[13px] text-navy-soft">Change plan or cancel there. We can’t from here.</span>
                            </div>
                        </section>

                        <form
                            aria-labelledby="cv"
                            onSubmit={(e) => {
                                e.preventDefault();
                                form.post('/premium/covered', { preserveScroll: true });
                            }}
                            className="rounded-[24px] bg-card p-6"
                        >
                            <h2 id="cv" className="text-[19px] font-extrabold">
                                Budgets your subscription covers
                            </h2>
                            <p className="mt-0.5 text-sm text-slate">Up to {sub.max_budgets ?? 3} budgets you own. Everyone in a covered budget gets Premium in it.</p>
                            <div className="mt-3">
                                {(sub.budgets ?? []).map((b) => (
                                    <label key={b.id} className="flex items-center gap-3.5 border-t border-rule py-3.5">
                                        <input type="checkbox" checked={form.data.budget_ids.includes(b.id)} onChange={() => toggle(b.id)} className="size-[22px] accent-mint" />
                                        <span className="flex-1 text-[15.5px] font-bold">{b.name}</span>
                                        {b.covered ? <span className="rounded-lg bg-tint px-2 py-0.5 text-[12px] font-extrabold text-teal">Covered</span> : null}
                                    </label>
                                ))}
                            </div>
                            {form.errors.budget_ids ? <p className="text-[13px] font-bold text-red">{form.errors.budget_ids}</p> : null}
                            <button type="submit" disabled={form.processing} className="mt-3 h-11 rounded-[14px] bg-mint px-5 text-[15px] font-extrabold text-on-mint transition-transform active:scale-[0.97] disabled:opacity-50">
                                Save
                            </button>
                        </form>
                    </>
                ) : (
                    <section className={`rounded-[28px] px-7 py-7 ${hero}`}>
                        <h2 className="text-[26px] font-extrabold tracking-[-0.02em]">No subscription</h2>
                        <p className="mt-2 max-w-[560px] text-[15.5px] leading-[23px] text-tint-sub">Premium is R39.99 a month or R399.99 a year, with a 7-day free trial, and covers up to 3 budgets you own. Subscribe in the PocFin app, from Premium in Profile.</p>
                    </section>
                )}

                {events.data.length ? (
                    <section aria-labelledby="py" className="rounded-[24px] bg-card pt-6 pb-2">
                        <div className="px-6">
                            <h2 id="py" className="text-[19px] font-extrabold">
                                Payments
                            </h2>
                            <p className="mt-0.5 text-sm text-slate">As the store reported them to us. Receipts come from the store.</p>
                        </div>
                        <div className="mt-3 overflow-x-auto">
                            <table className="w-full min-w-[520px] text-[14.5px]">
                                <thead>
                                    <tr className="text-left text-[13px] text-slate">
                                        <th scope="col" className="px-6 pb-2 font-bold">Date</th>
                                        <th scope="col" className="pb-2 font-bold">What happened</th>
                                        <th scope="col" className="pb-2 font-bold">Covers</th>
                                        <th scope="col" className="px-6 pb-2 text-right font-bold">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {events.data.map((e, i) => (
                                        <tr key={i} className="border-t border-rule">
                                            <td className="px-6 py-3 text-slate">{dateText(e.occurred_at)}</td>
                                            <td className="py-3 font-bold">{e.period_type === 'trial' ? 'Free trial started' : (WHAT[e.type] ?? e.type.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()))}</td>
                                            <td className="py-3 text-slate">{e.period_type === 'trial' ? '7 days' : e.months ? `${dateText(e.period_start)} to ${dateText(e.period_end)}` : ''}</td>
                                            <td className="num px-6 py-3 text-right font-extrabold">{e.price !== null ? (e.currency === 'ZAR' || !e.currency ? formatMoney(e.price) : `${e.currency} ${e.price}`) : ''}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                ) : null}

                <section aria-labelledby="pb" className="rounded-[24px] bg-card p-6">
                    <h2 id="pb" className="text-[19px] font-extrabold">
                        Premium in each budget
                    </h2>
                    <div className="mt-3.5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-4">
                        {budgets.map((b) => {
                            const d = b.premium;
                            return (
                                <div key={b.id} className="rounded-[18px] bg-canvas px-5 py-[18px]">
                                    <div className="flex items-baseline justify-between gap-2.5">
                                        <span className="text-base font-extrabold">{b.name}</span>
                                        <span className={`rounded-lg px-2 py-0.5 text-[12px] font-extrabold ${d.active ? 'bg-mint text-on-mint' : 'bg-card text-slate'}`}>{d.active ? 'Premium' : 'Free'}</span>
                                    </div>
                                    <p className="mt-1 text-[13.5px] text-slate">
                                        {d.forever ? 'Premium for good' : d.until ? `${d.active ? 'Until' : 'Ended'} ${dateText(d.until)}${d.subscription ? ` · ${d.subscription.name}’s subscription` : ''}` : 'Free'}
                                    </p>
                                    {d.history?.length ? (
                                        <div className="mt-3.5 flex flex-col gap-2 text-sm">
                                            {d.history.slice(0, 4).map((g, i) => (
                                                <div key={i} className="flex justify-between gap-2.5">
                                                    <span>{grant(g)}</span>
                                                    <span className="text-slate">{dateText(g.created_at)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>
        </>
    );
}

Premium.layout = (page: ReactNode) => (
    <Shell active="premium" title="Premium">
        {page}
    </Shell>
);
