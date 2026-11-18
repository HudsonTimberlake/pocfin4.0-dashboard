import { Head, Link, router } from '@inertiajs/react';
import { type ReactNode } from 'react';
import Icon from '@/components/Icon';
import Money from '@/components/Money';
import Shell from '@/components/Shell';
import { dateText, formatMoney, initial, isNegative, monthYear, toCents } from '@/lib/format';

type Cycle = { start: string; end: string; seen: boolean };
type Recap = {
    cycle: { start: string; end: string };
    within_budget: { count: number; of: number };
    streak_weeks?: number;
    investing?: { current?: number };
    deposits: string;
    spent_net: string;
    refunded: string;
    kept: string;
    to_accounts: { total: string; savings?: string; holding?: string; investment?: string };
    envelopes: { name: string; kind: string; spent: string; balance_end: string }[];
    transactions?: { by_member?: { name: string | null; count: number }[] };
};
type Props = { cycles: Cycle[]; lockedCount: number; start: string | null; recap: Recap | null; premiumRequired: boolean };

const zero = (a: string | undefined) => !a || toCents(a) === 0n;
const hero = 'bg-[linear-gradient(165deg,var(--tint-soft),var(--tint))]';

/**
 * Recaps: one for each finished month, newest first, with the list beside it. Older ones follow
 * the Premium gate. "Kept" is what came in minus what was spent.
 */
export default function Recaps(p: Props) {
    const r = p.recap;
    const keptMore = r ? !isNegative(r.kept) : false;
    const open = (start: string) => router.get('/recaps', { cycle: start }, { preserveScroll: true, only: ['recap', 'start', 'premiumRequired'], preserveState: true, replace: true });

    return (
        <>
            <Head title="Recaps" />
            <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
                    <div className="min-w-[240px] flex-1">
                        <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.02em]">Recaps</h1>
                        <p className="mt-0.5 text-[15px] text-slate">One for each finished month</p>
                    </div>
                    {r ? (
                        <button type="button" onClick={() => window.print()} className="flex h-11 items-center gap-2 rounded-[14px] bg-card px-4 text-[15px] font-extrabold print:hidden hover:bg-segment">
                            <Icon name="receipt" size={17} />
                            Print
                        </button>
                    ) : null}
                </div>

                {p.cycles.length === 0 ? (
                    <section className="rounded-[24px] bg-card p-5">
                        <p className="text-[15px] text-slate">Your first recap comes at the end of your first full month.</p>
                    </section>
                ) : (
                    <div className="flex flex-wrap items-start gap-5">
                        <nav aria-label="Recaps" className="max-w-full flex-[1_1_220px] rounded-[24px] bg-card p-2.5 print:hidden">
                            {p.cycles.map((c) => (
                                <button key={c.start} type="button" onClick={() => open(c.start)} aria-current={c.start === p.start ? 'page' : undefined} className={`flex h-[52px] w-full items-center gap-2.5 rounded-[14px] px-3.5 text-left ${c.start === p.start ? 'bg-tint-soft' : 'hover:bg-canvas'}`}>
                                    <span className="flex-1">
                                        <span className="block text-[15px] font-bold">{monthYear(c.start)}</span>
                                        <span className="block text-[12.5px] text-slate">
                                            {dateText(c.start)} to {dateText(c.end)}
                                        </span>
                                    </span>
                                    {!c.seen ? <span className="rounded-lg bg-mint px-2 py-0.5 text-[12px] font-extrabold text-on-mint">New</span> : null}
                                </button>
                            ))}
                            {p.lockedCount > 0 ? (
                                <Link href="/premium" className="flex items-center gap-2.5 rounded-[14px] px-3.5 py-3 text-[13.5px] text-slate">
                                    <Icon name="lock" size={16} />
                                    {p.lockedCount} older {p.lockedCount === 1 ? 'recap' : 'recaps'} with Premium
                                </Link>
                            ) : null}
                        </nav>

                        {r ? (
                            <article aria-labelledby="rt" className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
                                <section className={`flex flex-wrap items-center gap-6 rounded-[28px] px-7 py-7 ${hero}`}>
                                    <div className="min-w-[240px] flex-1">
                                        <div className="text-[15px] font-bold text-teal">
                                            {monthYear(r.cycle.start)} · {dateText(r.cycle.start)} to {dateText(r.cycle.end)}
                                        </div>
                                        <h2 id="rt" className="mt-1.5 text-[clamp(28px,4vw,40px)] leading-[1.15] font-extrabold tracking-[-0.03em]">
                                            {keptMore ? 'You kept more than you spent' : 'A month that asked a lot'}
                                        </h2>
                                        <p className="mt-2.5 text-base leading-6 text-tint-sub">
                                            {r.within_budget.count} of {r.within_budget.of} envelopes stayed within budget.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2.5">
                                        {(r.streak_weeks ?? 0) > 0 ? <span className="rounded-[14px] bg-card px-3.5 py-2 text-sm font-bold">{r.streak_weeks}-week streak</span> : null}
                                        {(r.investing?.current ?? 0) > 1 ? <span className="rounded-[14px] bg-card px-3.5 py-2 text-sm font-bold">Investing {r.investing!.current} months running</span> : null}
                                    </div>
                                </section>

                                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3">
                                    <div className="rounded-[20px] bg-card px-5 py-[18px]">
                                        <div className="text-sm font-bold text-slate">Came in</div>
                                        <Money amount={r.deposits} className="mt-1 block text-[26px] font-extrabold" />
                                    </div>
                                    <div className="rounded-[20px] bg-card px-5 py-[18px]">
                                        <div className="text-sm font-bold text-slate">Spent</div>
                                        <Money amount={r.spent_net} className="mt-1 block text-[26px] font-extrabold" />
                                        {!zero(r.refunded) ? <div className="text-[13px] text-slate">After {formatMoney(r.refunded)} refunded</div> : null}
                                    </div>
                                    <div className={`rounded-[20px] px-5 py-[18px] ${keptMore ? 'bg-tint' : 'bg-red-tint'}`}>
                                        <div className={`text-sm font-bold ${keptMore ? 'text-teal' : 'text-red-ink'}`}>Kept</div>
                                        <Money amount={r.kept} className="mt-1 block text-[26px] font-extrabold" />
                                        {!zero(r.to_accounts.total) ? <div className="text-[13px] text-tint-sub">{formatMoney(r.to_accounts.total)} of it went to accounts</div> : null}
                                    </div>
                                </div>

                                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-start gap-5">
                                    <section aria-labelledby="env" className="rounded-[24px] bg-card p-5">
                                        <h3 id="env" className="mb-3 text-lg font-extrabold">
                                            Envelopes
                                        </h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[320px] text-[14.5px]">
                                                <thead>
                                                    <tr className="text-left text-[13px] text-slate">
                                                        <th scope="col" className="pb-2 font-bold">
                                                            Envelope
                                                        </th>
                                                        <th scope="col" className="pb-2 text-right font-bold">
                                                            Spent
                                                        </th>
                                                        <th scope="col" className="pb-2 text-right font-bold">
                                                            At the end
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {r.envelopes.map((e) => (
                                                        <tr key={e.name} className="border-t border-rule">
                                                            <td className="py-2.5 font-bold">
                                                                {e.name} {e.kind === 'saving_up' ? <span className="text-[12.5px] font-semibold text-slate">Saving up</span> : null}
                                                            </td>
                                                            <td className="num py-2.5 text-right">{formatMoney(e.spent)}</td>
                                                            <td className={`num py-2.5 text-right ${isNegative(e.balance_end) ? 'font-extrabold text-red' : ''}`}>{formatMoney(e.balance_end)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>

                                    <div className="flex min-w-0 flex-col gap-5">
                                        {!zero(r.to_accounts.total) ? (
                                            <section aria-labelledby="pa" className="rounded-[24px] bg-navy p-6 text-white">
                                                <h3 id="pa" className="text-lg font-extrabold">
                                                    Put away
                                                </h3>
                                                <div className="num mt-1.5 text-[30px] font-extrabold">{formatMoney(r.to_accounts.total)}</div>
                                                <div className="mt-3.5 flex flex-col gap-2 text-[14.5px]">
                                                    {(
                                                        [
                                                            ['savings', 'Savings'],
                                                            ['holding', 'Holding'],
                                                            ['investment', 'Investments'],
                                                        ] as const
                                                    ).map(([k, label]) =>
                                                        zero(r.to_accounts[k]) ? null : (
                                                            <div key={k} className="flex justify-between">
                                                                <span className="font-bold text-navy-soft">{label}</span>
                                                                <b className="num">{formatMoney(r.to_accounts[k]!)}</b>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            </section>
                                        ) : null}

                                        {(r.transactions?.by_member?.length ?? 0) > 1 ? (
                                            <section aria-labelledby="tog" className="rounded-[24px] bg-card p-5">
                                                <h3 id="tog" className="text-lg font-extrabold">
                                                    Who recorded what
                                                </h3>
                                                <div className="mt-3.5 flex flex-col gap-3">
                                                    {r.transactions!.by_member!.map((m, i) => (
                                                        <div key={i} className="flex items-center gap-3">
                                                            <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-navy-tint text-[14px] font-extrabold text-navy-text">
                                                                {initial(m.name ?? undefined)}
                                                            </span>
                                                            <span className="flex-1 text-[15px] font-bold">{m.name ?? 'Someone who left'}</span>
                                                            <span className="text-[14.5px] text-slate">
                                                                {m.count} {m.count === 1 ? 'entry' : 'entries'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        ) : null}

                                        <section className="rounded-[24px] bg-card p-5">
                                            <h3 className="text-lg font-extrabold">See you next month</h3>
                                            <p className="mt-2 text-[15px] leading-[23px] text-slate">Small, regular check-ins beat big catch-ups.</p>
                                        </section>
                                    </div>
                                </div>
                            </article>
                        ) : p.premiumRequired ? (
                            <section className="flex-[999_1_560px] rounded-[24px] bg-card p-5">
                                <p className="text-[15px] text-slate">
                                    Older recaps come with Premium.{' '}
                                    <Link href="/premium" className="font-extrabold text-teal underline-offset-2 hover:underline">
                                        See Premium
                                    </Link>
                                </p>
                            </section>
                        ) : null}
                    </div>
                )}
            </div>
        </>
    );
}

Recaps.layout = (page: ReactNode) => (
    <Shell active="recaps" title="Recaps">
        {page}
    </Shell>
);
