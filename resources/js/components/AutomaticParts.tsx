import { router } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import Icon from '@/components/Icon';
import { cleanTyped, hasAmount, toAmount, ymd } from '@/lib/amount';
import { useApp } from '@/lib/app';
import { dayLabel, formatMoney, monthName, toCents } from '@/lib/format';
import { subtractForHint } from '@/shared/money';

export type Place = { id: number; name: string; kind: 'envelope' | 'account'; deleted: boolean };
export type Run = { id: number; due_date: string; status: 'waiting' | 'ready' | 'done' | 'skipped' | 'declined'; amount: string; attempts: number; reason: string | null; resolved_by: number | null };
export type Item = {
    id: number;
    name: string;
    type: 'expense' | 'transfer';
    from: Place;
    to: Place | null;
    amount: string;
    repeat: 'monthly' | 'weekly';
    day: number | null;
    last_day: boolean;
    weekday: number | null;
    starts_on: string;
    ends_on: string | null;
    mode: 'auto' | 'approve';
    paused: boolean;
    pause_reason: string | null;
    next_due: string | null;
    created_by: number | null;
    open_run: (Run & { source_balance: string; last_try: string | null }) | null;
    runs?: Run[];
};
export type Choice = { id: number; name: string; balance: string; type?: string };

const field = 'h-11 w-full rounded-xl border border-line bg-card px-3 text-[15px] font-bold text-ink outline-none focus:border-mint';
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ord = (d: number) => `${d}${[11, 12, 13].includes(d % 100) ? 'th' : d % 10 === 1 ? 'st' : d % 10 === 2 ? 'nd' : d % 10 === 3 ? 'rd' : 'th'}`;

export const repeatText = (i: Pick<Item, 'repeat' | 'day' | 'last_day' | 'weekday'>) =>
    i.repeat === 'weekly' ? `Every ${WEEKDAYS[i.weekday ?? 5]}` : i.last_day ? 'Monthly on the last day' : `Monthly on the ${ord(i.day ?? 1)}`;
export const route = (i: Item) => (i.type === 'transfer' && i.to ? `${i.from.name} → ${i.to.name}` : `From ${i.from.name}`);
export const MODE = { auto: { label: 'Automatic', tone: 'bg-tint text-teal' }, approve: { label: 'Ask me first', tone: 'bg-navy-tint text-navy-text' } };

/** The row's status chip: only when something's off the plain path. */
export function statusOf(i: Item): { label: string; tone: string } | null {
    if (i.paused) return { label: 'Paused', tone: 'bg-segment text-slate' };
    if (i.open_run?.status === 'ready') return { label: 'Ready to approve', tone: 'bg-amber-tint text-amber-ink' };
    if (i.open_run?.status === 'waiting') return { label: 'Short on money', tone: 'bg-amber-tint text-amber-ink' };
    return null;
}

export const nextText = (i: Item) => (i.paused ? 'Paused' : i.open_run?.status === 'waiting' ? 'Trying again tomorrow' : i.open_run?.status === 'ready' ? 'Today' : i.next_due ? dayLabel(i.next_due) : '—');

function runLabel(r: Run): { label: string; tone: string } {
    switch (r.status) {
        case 'done':
            return { label: r.resolved_by ? 'Approved' : 'Paid', tone: 'bg-tint text-teal' };
        case 'waiting':
            return { label: 'Waiting for money', tone: 'bg-amber-tint text-amber-ink' };
        case 'ready':
            return { label: 'Ready to approve', tone: 'bg-amber-tint text-amber-ink' };
        case 'declined':
            return { label: 'Skipped by you', tone: 'bg-segment text-slate' };
        default:
            return { label: 'Skipped', tone: 'bg-segment text-slate' };
    }
}

const send = (url: string, data: Record<string, unknown>, text: string, toast: (t: { text: string }) => void, onError?: (e: Record<string, string>) => void) =>
    router.post(url, data as never, { preserveScroll: true, preserveState: true, onSuccess: () => toast({ text }), onError: (er) => onError?.(er as Record<string, string>) });

/** Waiting for you: one Ask me first payment ready today, with Approve, a different amount this time, or Skip. */
export function ReadyCard({ i }: { i: Item }) {
    const { toast } = useApp();
    const run = i.open_run!;
    const [changing, setChanging] = useState(false);
    const [typed, setTyped] = useState(run.amount);
    const [error, setError] = useState<string | null>(null);
    const amount = changing ? toAmount(typed) : run.amount;
    const after = subtractForHint(run.source_balance, amount);
    const err = (e: Record<string, string>) => setError(Object.values(e)[0] ?? 'That didn’t work.');

    return (
        <div className="flex flex-wrap items-center gap-3 rounded-[20px] bg-amber-tint px-5 py-4">
            <span className="grid size-10 flex-none place-items-center rounded-full bg-card text-amber">
                <Icon name="automatic" size={20} />
            </span>
            <div className="min-w-[220px] flex-1">
                <div className="text-[15.5px] font-extrabold">{i.name} is ready to approve</div>
                <div className="num text-[13.5px] text-amber-ink">
                    {formatMoney(amount)} {route(i).replace(/^From/, 'from')} · due {dayLabel(run.due_date).toLowerCase() === 'today' ? 'today' : dayLabel(run.due_date)} · {i.from.name} has {formatMoney(run.source_balance)}
                    {toCents(after) < 0n ? ` (it would go to ${formatMoney(after)})` : ''}
                </div>
                {error ? <div className="mt-1 text-[13px] font-bold text-red-ink">{error}</div> : null}
            </div>
            {changing ? (
                <label className="flex items-center gap-2 text-[13px] font-bold text-amber-ink">
                    This time only
                    <span className="relative">
                        <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[14px] text-slate">R</span>
                        <input autoFocus value={typed} onChange={(e) => setTyped(cleanTyped(e.target.value))} inputMode="decimal" className="num h-10 w-[120px] rounded-xl border border-line bg-card pr-2 pl-6 text-[15px] font-bold text-ink outline-none focus:border-mint" />
                    </span>
                </label>
            ) : null}
            <div className="flex gap-2">
                <button type="button" disabled={!hasAmount(typed)} onClick={() => send(`/automatic/${i.id}/runs/${run.id}/approve`, changing ? { amount } : {}, `✓ ${i.name} approved: ${formatMoney(amount)}, dated today`, toast, err)} className="h-10 rounded-xl bg-mint px-4 text-[14.5px] font-extrabold text-on-mint disabled:opacity-60">
                    Approve
                </button>
                {!changing ? (
                    <button type="button" onClick={() => setChanging(true)} className="h-10 rounded-xl bg-card px-3.5 text-[14.5px] font-bold">
                        Change amount
                    </button>
                ) : null}
                <button type="button" onClick={() => send(`/automatic/${i.id}/runs/${run.id}/skip`, {}, `${i.name} skipped for ${monthName(run.due_date)}`, toast, err)} className="h-10 rounded-xl bg-card px-3.5 text-[14.5px] font-bold">
                    Skip
                </button>
            </div>
        </div>
    );
}

/**
 * W14, one payment beside the table: why it's waiting, the facts, the last runs, what can be done
 * about an open run (Move money to it, Run now, Skip this month), then Edit, Pause or Resume, Delete.
 */
export function AutoPanel({ i, members, onClose, onMoveMoney }: { i: Item; members: { id: number; name: string }[]; onClose: () => void; onMoveMoney: (envelopeId: number, amount: string) => void }) {
    const { toast } = useApp();
    const [editing, setEditing] = useState(false);
    const [confirm, setConfirm] = useState<'delete' | 'overspend' | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const run = i.open_run;
    const short = run && run.status === 'waiting' ? subtractForHint(run.amount, run.source_balance) : null;
    const who = members.find((m) => m.id === i.created_by)?.name;
    const err = (e: Record<string, string>) => setErrors(e);

    const banner = i.paused
        ? `Paused${i.pause_reason === 'place_removed' ? ' because where it comes from or goes to was removed' : ''}. Resuming starts from the next date; nothing is back-filled.`
        : run?.status === 'waiting'
          ? `${i.from.name} has ${formatMoney(run.source_balance)}. We try again each morning and it goes off the moment the money is there.${run.last_try ? ` After ${dayLabel(run.last_try)} it’s skipped for ${monthName(run.due_date)}.` : ''}`
          : null;
    const facts: [string, string][] = [
        ['From', i.from.name + (i.from.deleted ? ' (removed)' : '')],
        ...(i.to ? [['To', i.to.name + (i.to.deleted ? ' (removed)' : '')] as [string, string]] : []),
        ['Amount', formatMoney(i.amount)],
        ['Repeats', repeatText(i)],
        ['How', MODE[i.mode].label],
        ...(i.ends_on ? [['Ends', dayLabel(i.ends_on)] as [string, string]] : []),
        ...(run?.status === 'waiting' ? [['Tries so far', String(run.attempts)] as [string, string]] : []),
        ...(who ? [['Made by', who] as [string, string]] : []),
    ];

    return (
        <div className="flex flex-col gap-4 rounded-[24px] bg-card p-5">
            <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[19px] font-extrabold">{i.name}</h2>
                    <div className="text-[13px] font-bold text-slate">{route(i)}</div>
                </div>
                <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-canvas text-slate hover:text-ink">
                    <Icon name="close" size={16} stroke={2.2} />
                </button>
            </div>
            {banner ? <p className={`rounded-2xl px-3.5 py-3 text-[13.5px] font-bold ${i.paused ? 'bg-canvas text-ink' : 'bg-amber-tint text-amber-ink'}`}>{banner}</p> : null}

            <dl className="flex flex-col">
                {facts.map(([k, v], n) => (
                    <div key={k} className={`flex justify-between gap-3 py-2 text-[14px] ${n ? 'border-t border-line' : ''}`}>
                        <dt className="text-slate">{k}</dt>
                        <dd className="num text-right font-bold">{v}</dd>
                    </div>
                ))}
            </dl>

            {run?.status === 'waiting' && !i.paused ? (
                <div className="flex flex-col gap-2">
                    {i.from.kind === 'envelope' && short && toCents(short) > 0n ? (
                        <button type="button" onClick={() => onMoveMoney(i.from.id, short)} className="h-11 rounded-xl bg-mint text-[14.5px] font-extrabold text-on-mint">
                            Move {formatMoney(short)} to {i.from.name}
                        </button>
                    ) : null}
                    {confirm === 'overspend' ? (
                        <div role="alertdialog" className="flex flex-col gap-2 rounded-xl bg-red-tint p-3 text-[14px] font-bold text-red-ink">
                            {i.from.name} would go to {formatMoney(subtractForHint(run.source_balance, run.amount))}. Run it anyway?
                            <div className="flex gap-2">
                                <button type="button" autoFocus onClick={() => send(`/automatic/${i.id}/runs/${run.id}/run-now`, { overspend: true }, `✓ ${i.name} paid`, toast, err)} className="h-10 flex-1 rounded-xl bg-red text-white">
                                    Run it
                                </button>
                                <button type="button" onClick={() => setConfirm(null)} className="h-10 rounded-xl bg-card px-3">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => (short && toCents(short) > 0n ? setConfirm('overspend') : send(`/automatic/${i.id}/runs/${run.id}/run-now`, {}, `✓ ${i.name} paid`, toast, err))} className="h-10 rounded-xl bg-canvas text-[14px] font-bold hover:bg-segment">
                                Run now
                            </button>
                            <button type="button" onClick={() => send(`/automatic/${i.id}/runs/${run.id}/skip`, {}, `${i.name} skipped for ${monthName(run.due_date)}`, toast, err)} className="h-10 rounded-xl bg-canvas text-[14px] font-bold hover:bg-segment">
                                Skip this month
                            </button>
                        </div>
                    )}
                </div>
            ) : null}
            {run?.status === 'ready' && !i.paused ? <ReadyCard i={i} /> : null}
            {errors.overspend || errors.run || errors.form ? <p role="alert" className="rounded-xl bg-red-tint px-3 py-2.5 text-[14px] font-bold text-red-ink">{errors.overspend || errors.run || errors.form}</p> : null}

            {i.runs?.length ? (
                <div className="border-t border-line pt-4">
                    <h3 className="mb-1 text-[15px] font-extrabold">Last runs</h3>
                    {i.runs.map((r, n) => {
                        const l = runLabel(r);
                        return (
                            <div key={r.id} className={`num flex items-center justify-between gap-3 py-2 text-[14px] ${n ? 'border-t border-line' : ''}`}>
                                <span className="font-bold">{dayLabel(r.due_date)}</span>
                                <span className="flex items-center gap-2">
                                    {r.status === 'done' && r.amount !== i.amount ? <span className="text-slate">{formatMoney(r.amount)}</span> : null}
                                    <span className={`rounded-lg px-2 py-0.5 text-[12.5px] font-bold ${l.tone}`}>{l.label}</span>
                                </span>
                            </div>
                        );
                    })}
                </div>
            ) : null}

            <div className="flex flex-col gap-2 border-t border-line pt-4">
                {editing ? (
                    <AutoForm item={i} onDone={() => setEditing(false)} />
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setEditing(true)} className="h-10 rounded-xl bg-canvas text-[14px] font-bold hover:bg-segment">
                            Edit
                        </button>
                        <button type="button" onClick={() => send(`/automatic/${i.id}/${i.paused ? 'resume' : 'pause'}`, {}, i.paused ? `${i.name} resumed` : `${i.name} paused`, toast, err)} className="h-10 rounded-xl bg-canvas text-[14px] font-bold hover:bg-segment">
                            {i.paused ? 'Resume' : 'Pause'}
                        </button>
                    </div>
                )}
                {confirm === 'delete' ? (
                    <div role="alertdialog" className="flex flex-col gap-2 rounded-xl bg-red-tint p-3">
                        <p className="text-[14px] font-bold text-red-ink">Delete {i.name}? Future runs stop. Rows it already made stay in History.</p>
                        <div className="flex gap-2">
                            <button type="button" autoFocus onClick={() => router.delete(`/automatic/${i.id}`, { onSuccess: () => toast({ text: `${i.name} deleted` }) })} className="h-10 flex-1 rounded-xl bg-red text-[14px] font-extrabold text-white">
                                Delete
                            </button>
                            <button type="button" onClick={() => setConfirm(null)} className="h-10 rounded-xl bg-card px-3 text-[14px] font-bold">
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <button type="button" onClick={() => setConfirm('delete')} className="h-10 rounded-xl bg-red-tint text-[14px] font-bold text-red-text">
                        Delete
                    </button>
                )}
                <p className="text-[12.5px] text-slate">Deleting stops future runs. Rows it already made stay in History.</p>
            </div>
        </div>
    );
}

/** Edit: name, amount, the day, how it goes off, and an end date. Where it comes from stays (make a new one to change that). */
function AutoForm({ item, onDone }: { item: Item; onDone: () => void }) {
    const { toast } = useApp();
    const [name, setName] = useState(item.name);
    const [typed, setTyped] = useState(item.amount);
    const [day, setDay] = useState(item.repeat === 'weekly' ? String(item.weekday ?? 5) : item.last_day ? 'last' : String(item.day ?? 1));
    const [mode, setMode] = useState(item.mode);
    const [ends, setEnds] = useState(item.ends_on ?? '');
    const [errors, setErrors] = useState<Record<string, string>>({});

    function save(e: FormEvent) {
        e.preventDefault();
        router.patch(`/automatic/${item.id}`, {
            name: name.trim(),
            amount: toAmount(typed),
            mode,
            ends_on: ends || null,
            ...(item.repeat === 'weekly' ? { weekday: Number(day) } : day === 'last' ? { last_day: true, day: null } : { day: Number(day), last_day: false }),
        }, { preserveScroll: true, preserveState: true, onSuccess: () => { toast({ text: '✓ Saved' }); onDone(); }, onError: (er) => setErrors(er as Record<string, string>) });
    }

    return (
        <form onSubmit={save} onKeyDown={(e) => e.key === 'Escape' && onDone()} className="flex flex-col gap-2.5 rounded-2xl bg-canvas p-3.5">
            <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                Name
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className={field} />
                {errors.name ? <span className="text-red-ink">{errors.name}</span> : null}
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                Amount
                <input value={typed} onChange={(e) => setTyped(cleanTyped(e.target.value))} inputMode="decimal" className={`${field} num`} />
                {errors.amount ? <span className="text-red-ink">{errors.amount}</span> : null}
            </label>
            <DayPick repeat={item.repeat} value={day} set={setDay} error={errors.day || errors.weekday} />
            <ModePick value={mode} set={setMode} />
            <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                Ends (optional)
                <input type="date" value={ends} min={ymd()} onChange={(e) => setEnds(e.target.value)} className={field} />
                {errors.ends_on ? <span className="text-red-ink">{errors.ends_on}</span> : null}
            </label>
            <div className="flex gap-2">
                <button type="submit" className="h-10 flex-1 rounded-xl bg-mint text-[14.5px] font-extrabold text-on-mint">
                    Save
                </button>
                <button type="button" onClick={onDone} className="h-10 rounded-xl px-3 text-[14.5px] font-bold text-teal">
                    Cancel
                </button>
            </div>
        </form>
    );
}

function DayPick({ repeat, value, set, error }: { repeat: 'monthly' | 'weekly'; value: string; set: (v: string) => void; error?: string }) {
    return (
        <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
            On
            <select value={value} onChange={(e) => set(e.target.value)} className={field}>
                {repeat === 'weekly'
                    ? [1, 2, 3, 4, 5, 6, 0].map((d) => (
                          <option key={d} value={d}>
                              {WEEKDAYS[d]}
                          </option>
                      ))
                    : [
                          ...Array.from({ length: 28 }, (_, n) => (
                              <option key={n + 1} value={n + 1}>
                                  The {ord(n + 1)}
                              </option>
                          )),
                          <option key="last" value="last">
                              The last day
                          </option>,
                      ]}
            </select>
            {error ? <span className="text-red-ink">{error}</span> : null}
        </label>
    );
}

function ModePick({ value, set }: { value: 'auto' | 'approve'; set: (v: 'auto' | 'approve') => void }) {
    return (
        <div role="radiogroup" aria-label="How it goes off" className="grid grid-cols-2 gap-2">
            {([
                ['auto', 'Automatic', 'Goes off by itself when the money is there'],
                ['approve', 'Ask me first', 'Waits for you to approve it'],
            ] as const).map(([k, label, sub]) => (
                <button key={k} type="button" role="radio" aria-checked={value === k} onClick={() => set(k)} className={`rounded-2xl px-3.5 py-2.5 text-left ${value === k ? 'bg-tint ring-2 ring-mint ring-inset' : 'bg-card hover:bg-segment'}`}>
                    <span className="block text-[14px] font-extrabold">{label}</span>
                    <span className="block text-[12.5px] text-slate">{sub}</span>
                </button>
            ))}
        </div>
    );
}

/**
 * W14b New automatic: spend or move, from, to, amount, monthly or weekly and the day, Automatic or
 * Ask me first, and one plain sentence saying what will happen. Investment accounts can't be used.
 */
export function NewAutomatic({ envelopes, accounts, onClose }: { envelopes: Choice[]; accounts: Choice[]; onClose: () => void }) {
    const [kind, setKind] = useState<'expense' | 'transfer'>('expense');
    const [name, setName] = useState('');
    const [from, setFrom] = useState(envelopes[0] ? `e:${envelopes[0].id}` : '');
    const [to, setTo] = useState('');
    const [typed, setTyped] = useState('');
    const [repeat, setRepeat] = useState<'monthly' | 'weekly'>('monthly');
    const [day, setDay] = useState('25');
    const [mode, setMode] = useState<'auto' | 'approve'>('auto');
    const [starts, setStarts] = useState(ymd());
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);

    const places = [...envelopes.map((e) => ({ value: `e:${e.id}`, label: e.name, balance: e.balance })), ...(kind === 'transfer' ? accounts.map((a) => ({ value: `a:${a.id}`, label: a.name, balance: a.balance })) : [])];
    const fromName = places.find((p) => p.value === from)?.label ?? 'it';
    const toName = places.find((p) => p.value === to)?.label;
    const amount = hasAmount(typed) ? formatMoney(toAmount(typed)) : 'The amount';
    const when = repeat === 'weekly' ? `Every ${WEEKDAYS[Number(day)]}` : day === 'last' ? 'On the last day of every month' : `On the ${ord(Number(day))} of every month`;
    const what = kind === 'transfer' ? `${amount} moves from ${fromName} to ${toName ?? '…'}` : `${amount} is paid from ${fromName}`;
    const how = mode === 'auto' ? ` by itself, if ${fromName} has it. If not, we try for 3 more mornings, then skip that time.` : '. We ask you first on the day; you can approve, change the amount or skip.';

    function create(e: FormEvent) {
        e.preventDefault();
        if (busy) return;
        const side = (v: string, k: 'from' | 'to') => (v.startsWith('e:') ? { [`${k}_envelope_id`]: Number(v.slice(2)) } : v.startsWith('a:') ? { [`${k}_account_id`]: Number(v.slice(2)) } : {});
        setBusy(true);
        router.post('/automatic', {
            name: name.trim(),
            type: kind,
            ...side(from, 'from'),
            ...(kind === 'transfer' ? side(to, 'to') : {}),
            amount: toAmount(typed),
            repeat,
            ...(repeat === 'weekly' ? { weekday: Number(day) } : day === 'last' ? { last_day: true } : { day: Number(day) }),
            starts_on: starts,
            mode,
        }, { preserveScroll: true, onError: (er) => setErrors(er as Record<string, string>), onFinish: () => setBusy(false) });
    }

    return (
        <form onSubmit={create} onKeyDown={(e) => e.key === 'Escape' && onClose()} className="flex flex-col gap-3.5 rounded-[24px] bg-card p-5">
            <div className="flex items-center gap-3">
                <h2 className="flex-1 text-[19px] font-extrabold">New automatic</h2>
                <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-canvas text-slate hover:text-ink">
                    <Icon name="close" size={16} stroke={2.2} />
                </button>
            </div>
            <div role="radiogroup" aria-label="What it does" className="grid grid-cols-2 gap-1 rounded-xl bg-segment p-1">
                {([
                    ['expense', 'Spend from an envelope'],
                    ['transfer', 'Move money'],
                ] as const).map(([k, label]) => (
                    <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => { setKind(k); setTo(''); }} className={`h-9 rounded-[10px] text-[13.5px] font-extrabold ${kind === k ? 'bg-card text-ink' : 'text-slate'}`}>
                        {label}
                    </button>
                ))}
            </div>
            <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                Name
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder={kind === 'transfer' ? 'Emergency fund top-up' : 'Netflix'} className={field} />
                {errors.name ? <span className="text-red-ink">{errors.name}</span> : null}
            </label>
            <div className={`grid gap-2 ${kind === 'transfer' ? 'grid-cols-2' : ''}`}>
                <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                    From
                    <select value={from} onChange={(e) => setFrom(e.target.value)} className={field}>
                        {places.map((p) => (
                            <option key={p.value} value={p.value}>
                                {p.label} · {formatMoney(p.balance)}
                            </option>
                        ))}
                    </select>
                    {errors.from_envelope_id || errors.from_account_id ? <span className="text-red-ink">{errors.from_envelope_id || errors.from_account_id}</span> : null}
                </label>
                {kind === 'transfer' ? (
                    <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                        To
                        <select value={to} onChange={(e) => setTo(e.target.value)} className={field}>
                            <option value="">Choose…</option>
                            {places
                                .filter((p) => p.value !== from)
                                .map((p) => (
                                    <option key={p.value} value={p.value}>
                                        {p.label}
                                    </option>
                                ))}
                        </select>
                        {errors.to_envelope_id || errors.to_account_id ? <span className="text-red-ink">{errors.to_envelope_id || errors.to_account_id}</span> : null}
                    </label>
                ) : null}
            </div>
            <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                Amount
                <span className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[15px] font-bold text-slate">R</span>
                    <input value={typed} onChange={(e) => setTyped(cleanTyped(e.target.value))} inputMode="decimal" placeholder="0.00" className={`${field} num pl-7`} />
                </span>
                {errors.amount ? <span className="text-red-ink">{errors.amount}</span> : null}
            </label>
            <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                    Repeats
                    <select value={repeat} onChange={(e) => { const r = e.target.value as 'monthly' | 'weekly'; setRepeat(r); setDay(r === 'weekly' ? '5' : '25'); }} className={field}>
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                    </select>
                </label>
                <DayPick repeat={repeat} value={day} set={setDay} error={errors.day || errors.weekday} />
            </div>
            <label className="flex flex-col gap-1 text-[13px] font-bold text-slate">
                Starting from
                <input type="date" value={starts} onChange={(e) => e.target.value && setStarts(e.target.value)} className={field} />
                {errors.starts_on ? <span className="text-red-ink">{errors.starts_on}</span> : null}
            </label>
            <ModePick value={mode} set={setMode} />
            <p className="num rounded-xl bg-tint px-3.5 py-2.5 text-[13.5px] font-bold text-tint-sub">
                {when}, {what}
                {how}
            </p>
            {errors.type || errors.form ? <p role="alert" className="rounded-xl bg-red-tint px-3 py-2.5 text-[14px] font-bold text-red-ink">{errors.type || errors.form}</p> : null}
            <button type="submit" disabled={!name.trim() || !hasAmount(typed) || !from || (kind === 'transfer' && !to) || busy} className="h-11 rounded-xl bg-mint text-[15px] font-extrabold text-on-mint disabled:opacity-60">
                {busy ? 'Making…' : 'Create'}
            </button>
            <p className="text-[12px] text-slate">Investment accounts can’t be used here yet. Income is never automatic.</p>
        </form>
    );
}
