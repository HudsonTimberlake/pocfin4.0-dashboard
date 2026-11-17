import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState, type ReactNode } from 'react';
import { Head, router } from '@inertiajs/react';
import { AutoPanel, MODE, NewAutomatic, ReadyCard, nextText, repeatText, route, statusOf, type Choice, type Item } from '@/components/AutomaticParts';
import Icon from '@/components/Icon';
import Shell from '@/components/Shell';
import { useApp } from '@/lib/app';
import { formatMoney } from '@/lib/format';
import { ARRIVE } from '@/lib/motion';

type Props = {
    items: Item[];
    ready: Item[];
    selected: Item | null;
    envelopes: Choice[];
    accounts: Choice[];
    members: { id: number; name: string }[];
};

/**
 * W14 Automatic: "What's going off, and does anything need me?" Waiting for you first (Approve,
 * Change amount for this time, Skip), then every payment with its next date and how it goes off.
 * A payment opens beside the table; New automatic (W14b) too.
 */
export default function Automatic(p: Props) {
    const reduced = useReducedMotion();
    const { openAdd } = useApp();
    const [panel, setPanel] = useState<number | 'new' | null>(p.selected?.id ?? null);
    useEffect(() => setPanel((cur) => (p.selected ? p.selected.id : cur === 'new' ? cur : null)), [p.selected]);
    const open = typeof panel === 'number' ? (p.selected?.id === panel ? p.selected : p.items.find((i) => i.id === panel)) : undefined;

    function openItem(i: Item) {
        if (panel === i.id) return close();
        setPanel(i.id);
        router.get('/automatic', { item: i.id }, { only: ['selected'], preserveState: true, preserveScroll: true, replace: true });
    }
    function close() {
        setPanel(null);
        router.replace({ url: '/automatic', preserveState: true, preserveScroll: true, props: (old) => ({ ...old, selected: null }) });
    }
    useEffect(() => {
        if (panel === null) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !(e.target as HTMLElement)?.closest?.('input, select, textarea') && close();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    const cols = open || panel === 'new' ? 'grid-cols-[minmax(0,1fr)_110px] @2xl:grid-cols-[minmax(0,1fr)_150px_110px]' : 'grid-cols-[minmax(0,1fr)_110px] @2xl:grid-cols-[minmax(0,1.4fr)_180px_130px_110px]';
    const how = open || panel === 'new' ? 'hidden' : 'hidden @2xl:block';

    return (
        <>
            <Head title="Automatic" />
            <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.02em]">Automatic</h1>
                        <p className="mt-0.5 text-[15px] text-slate">Payments and moves that happen on a date, so you don’t add them by hand</p>
                    </div>
                    <button type="button" onClick={() => setPanel('new')} className="flex h-11 items-center gap-2 rounded-[14px] bg-mint px-4 text-[15px] font-extrabold text-on-mint transition-transform active:scale-[0.97]">
                        <Icon name="plus" size={16} stroke={2.4} />
                        New automatic
                    </button>
                </div>

                <div className="flex items-start gap-5">
                    <div className="flex min-w-0 flex-1 flex-col gap-5">
                        {p.ready.length ? (
                            <section aria-labelledby="waiting" className="flex flex-col gap-2.5">
                                <h2 id="waiting" className="mx-1 text-[17px] font-extrabold">
                                    Waiting for you
                                </h2>
                                <AnimatePresence initial={false}>
                                    {p.ready.map((i) => (
                                        <motion.div key={i.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22, ease: ARRIVE }} className="overflow-hidden">
                                            <ReadyCard i={i} />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </section>
                        ) : null}

                        {p.items.length === 0 ? (
                            <div className="rounded-[24px] bg-card px-6 py-7">
                                <h2 className="text-[19px] font-extrabold">Nothing automatic yet</h2>
                                <p className="mt-1 text-[15px] text-slate">Rent, a subscription, a monthly move to savings: set it once and it goes off on its date.</p>
                            </div>
                        ) : (
                            <div role="table" aria-label="Payments" className="@container overflow-hidden rounded-[24px] bg-card">
                                <div role="row" className={`grid ${cols} items-center gap-3 border-b border-line px-5 py-3 text-[12.5px] font-bold text-slate`}>
                                    <span>Payment</span>
                                    <span className="hidden @2xl:block">Next</span>
                                    <span className={how}>How</span>
                                    <span className="text-right">Amount</span>
                                </div>
                                {p.items.map((i, n) => {
                                    const st = statusOf(i);
                                    const sel = panel === i.id;
                                    return (
                                        <div key={i.id} role="row" onClick={() => openItem(i)} className={`grid ${cols} cursor-pointer items-center gap-3 px-5 py-3 transition-colors ${n ? 'border-t border-line' : ''} ${sel ? 'bg-tint' : 'hover:bg-canvas'} ${i.paused ? 'opacity-70' : ''}`}>
                                            <span className="min-w-0">
                                                <button type="button" onClick={(e) => { e.stopPropagation(); openItem(i); }} aria-expanded={sel} className="flex max-w-full items-center gap-2 text-left text-[15px] font-bold">
                                                    <span className="truncate">{i.name}</span>
                                                    {st ? <span className={`hidden flex-none rounded-md px-1.5 py-0.5 text-[11.5px] font-bold @2xl:inline ${st.tone}`}>{st.label}</span> : null}
                                                </button>
                                                {st ? <span className={`mt-0.5 inline-block rounded-md px-1.5 py-0.5 text-[11.5px] font-bold @2xl:hidden ${st.tone}`}>{st.label}</span> : null}
                                                <span className="block truncate text-[13px] text-slate">
                                                    {route(i)}
                                                    <span className="@2xl:hidden"> · {nextText(i)}</span>
                                                </span>
                                            </span>
                                            <span className="hidden min-w-0 @2xl:block">
                                                <span className="block truncate text-[14px] font-bold">{nextText(i)}</span>
                                                <span className="block truncate text-[12.5px] text-slate">{repeatText(i)}</span>
                                            </span>
                                            <span className={how}>
                                                <span className={`rounded-lg px-2 py-0.5 text-[12.5px] font-bold ${MODE[i.mode].tone}`}>{MODE[i.mode].label}</span>
                                            </span>
                                            <span className="num text-right text-[15px] font-extrabold">{formatMoney(i.amount)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <p className="px-1 text-[13px] text-slate">Automatic only goes off when the money is there. Nothing is ever overspent by itself.</p>
                    </div>

                    <AnimatePresence>
                        {panel !== null && (panel === 'new' || open) ? (
                            <>
                                <motion.div key="scrim" className="fixed inset-0 z-40 bg-scrim xl:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
                                <motion.aside
                                    key="panel"
                                    aria-label={panel === 'new' ? 'New automatic' : `${open?.name} details`}
                                    initial={reduced ? { opacity: 0 } : { opacity: 0, x: 24 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={reduced ? { opacity: 0 } : { opacity: 0, x: 24, transition: { duration: 0.18 } }}
                                    transition={{ duration: 0.28, ease: ARRIVE }}
                                    className="fixed inset-y-0 right-0 z-50 w-[min(420px,100vw)] overflow-y-auto bg-canvas p-3 xl:sticky xl:top-5 xl:z-auto xl:max-h-[calc(100vh-40px)] xl:w-[380px] xl:flex-none xl:rounded-[24px] xl:p-0"
                                >
                                    {panel === 'new' ? (
                                        <NewAutomatic envelopes={p.envelopes} accounts={p.accounts} onClose={close} />
                                    ) : open ? (
                                        <AutoPanel key={`${open.id}-${open.runs ? 'full' : 'list'}`} i={open} members={p.members} onClose={close} onMoveMoney={(envelopeId, amount) => openAdd({ tab: 'move', toEnvelopeId: envelopeId, amount })} />
                                    ) : null}
                                </motion.aside>
                            </>
                        ) : null}
                    </AnimatePresence>
                </div>
            </div>
        </>
    );
}

Automatic.layout = (page: ReactNode) => (
    <Shell active="automatic" title="Automatic">
        {page}
    </Shell>
);
