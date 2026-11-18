import { Head, router, usePage } from '@inertiajs/react';
import HelpButton from '@/components/HelpButton';
import { useState, type FormEvent, type ReactNode } from 'react';
import Shell from '@/components/Shell';
import { useApp } from '@/lib/app';
import { Refused, send } from '@/lib/http';
import { initial } from '@/lib/format';
import type { Shared } from '@/types';

type Member = { id: number; name: string; email: string; role: 'owner' | 'member' };
type Invite = { id: number; email: string; expires_at: string };
type Props = { me: number; isOwner: boolean; members: Member[]; invitations: Invite[] };

type Confirm = { kind: 'owner' | 'remove'; id: number } | { kind: 'leave' } | null;

/**
 * W17b Members and invites: who shares this budget, who's been invited, and (for the owner) invite,
 * make owner and remove. Anyone but the owner can leave; the owner hands ownership on first.
 */
export default function Members(p: Props) {
    const { csrf, budgets, budgetId } = usePage<Shared>().props;
    const { toast } = useApp();
    const budget = budgets.find((b) => b.id === budgetId);
    const [email, setEmail] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [sent, setSent] = useState(false);
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState<Confirm>(null);

    async function call(fn: () => Promise<unknown>, done: string) {
        setBusy(true);
        try {
            await fn();
            toast({ text: done });
            router.reload({ only: ['members', 'invitations', 'isOwner', 'me'] });
        } catch (e) {
            toast({ text: e instanceof Refused ? e.message : 'That didn’t work.', ms: 6000 });
        } finally {
            setBusy(false);
            setConfirm(null);
        }
    }

    async function invite(e: FormEvent, again?: string) {
        e.preventDefault();
        const to = (again ?? email).trim();
        if (!to || busy) return;
        setBusy(true);
        setErrors({});
        try {
            await send(csrf, 'POST', '/members/invitations', { email: to });
            if (!again) {
                setEmail('');
                setSent(true);
            }
            toast({ text: again ? `Invite sent again to ${to}` : `Invite sent to ${to}` });
            router.reload({ only: ['invitations'] });
        } catch (err) {
            setErrors(err instanceof Refused ? err.errors : { form: 'That didn’t send.' });
        } finally {
            setBusy(false);
        }
    }

    async function leave() {
        setBusy(true);
        try {
            const r = await send<{ to: string }>(csrf, 'POST', '/members/leave');
            window.location.href = r.to;
        } catch (e) {
            toast({ text: e instanceof Refused ? e.message : 'That didn’t work.', ms: 6000 });
            setBusy(false);
            setConfirm(null);
        }
    }

    const name = budget?.name ?? 'this budget';
    const ghost = 'h-9 rounded-xl px-3 text-[13.5px] font-extrabold text-slate hover:bg-segment';
    const row = (key: string, avatar: string, title: ReactNode, sub: string, role: ReactNode, actions: ReactNode) => (
        <li key={key} className="flex flex-wrap items-center gap-3 border-t border-rule py-3 first:border-t-0">
            <span className="flex size-10 flex-none items-center justify-center rounded-full bg-navy-tint text-[15px] font-extrabold text-navy-text">{avatar}</span>
            <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-extrabold">{title}</div>
                <div className="truncate text-[13px] text-slate">{sub}</div>
            </div>
            {role}
            {actions}
        </li>
    );
    const chip = (text: string, tone: 'teal' | 'grey' | 'amber') => <span className={`rounded-lg px-2 py-0.5 text-[12px] font-extrabold ${{ teal: 'bg-tint text-teal', grey: 'bg-segment text-slate', amber: 'bg-amber-tint text-amber-text' }[tone]}`}>{text}</span>;
    const sure = (label: string, go: () => void) => (
        <span className="flex items-center gap-2">
            <button type="button" disabled={busy} onClick={go} className="h-9 rounded-xl bg-red-tint px-3 text-[13.5px] font-extrabold text-red-ink">
                {label}
            </button>
            <button type="button" onClick={() => setConfirm(null)} className="text-[13.5px] font-extrabold text-slate">
                Keep
            </button>
        </span>
    );

    return (
        <>
            <Head title="Members" />
            <div className="flex max-w-[760px] flex-col gap-5">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.02em]">Members</h1>
                        <HelpButton topic="members" />
                    </div>
                    <p className="mt-0.5 text-[15px] text-slate">Who shares {name}. Everyone sees the shared envelopes and accounts.</p>
                </div>

                {p.isOwner ? (
                    <form onSubmit={invite} className="flex flex-col gap-3 rounded-[24px] bg-card p-5">
                        <label htmlFor="invite" className="text-[17px] font-extrabold">
                            Invite someone by email
                        </label>
                        <div className="flex flex-wrap gap-2">
                            <input id="invite" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setSent(false); }} placeholder="name@example.com" className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-canvas px-3 text-[15px] font-bold outline-none focus:border-mint" />
                            <button type="submit" disabled={busy || !email.includes('@')} className="h-11 rounded-[14px] bg-mint px-4 text-[15px] font-extrabold text-on-mint transition-transform active:scale-[0.97] disabled:bg-segment disabled:text-slate">
                                {sent ? '✓ Invite sent' : 'Send invite'}
                            </button>
                        </div>
                        {errors.email || errors.form ? <span className="text-[13px] font-bold text-red">{errors.email ?? errors.form}</span> : null}
                        <p className="text-[13px] text-slate">They join from the PocFin app with the code in the email. {budget?.premium ? `Shared budgets are part of Premium, which ${name} has.` : 'Shared budgets are part of Premium.'}</p>
                    </form>
                ) : null}

                <section className="rounded-[24px] bg-card p-5">
                    <ul>
                        {p.members.map((m) =>
                            row(
                                `m${m.id}`,
                                initial(m.name),
                                m.id === p.me ? `${m.name} (you)` : m.name,
                                m.email,
                                chip(m.role === 'owner' ? 'Owner' : 'Member', m.role === 'owner' ? 'teal' : 'grey'),
                                p.isOwner && m.role !== 'owner' ? (
                                    confirm && 'id' in confirm && confirm.id === m.id ? (
                                        confirm.kind === 'owner' ? (
                                            sure('Make owner', () => void call(() => send(csrf, 'PUT', '/members/owner', { user_id: m.id }), `${m.name} is now the owner`))
                                        ) : (
                                            sure('Remove', () => void call(() => send(csrf, 'DELETE', `/members/${m.id}`), `${m.name} removed`))
                                        )
                                    ) : (
                                        <span className="flex gap-1">
                                            <button type="button" className={ghost} onClick={() => setConfirm({ kind: 'owner', id: m.id })}>
                                                Make owner
                                            </button>
                                            <button type="button" className={ghost} onClick={() => setConfirm({ kind: 'remove', id: m.id })}>
                                                Remove
                                            </button>
                                        </span>
                                    )
                                ) : null,
                            ),
                        )}
                        {p.invitations.map((i) =>
                            row(
                                `i${i.id}`,
                                '?',
                                i.email,
                                'Invited · waiting for them to join',
                                chip('Invited', 'amber'),
                                <span className="flex gap-1">
                                    <button type="button" className={ghost} disabled={busy} onClick={(e) => void invite(e, i.email)}>
                                        Resend
                                    </button>
                                    <button type="button" className={ghost} disabled={busy} onClick={() => void call(() => send(csrf, 'DELETE', `/members/invitations/${i.id}`), 'Invite cancelled')}>
                                        Cancel invite
                                    </button>
                                </span>,
                            ),
                        )}
                    </ul>
                </section>

                {confirm?.kind === 'owner' || confirm?.kind === 'remove' ? (
                    <p className="px-1 text-[13px] text-slate">{confirm.kind === 'owner' ? 'The new owner can invite, remove, rename and delete. You stay on as a member.' : 'They lose access at once. A member with money in a private account needs to empty it or share it first.'}</p>
                ) : null}

                {!p.isOwner ? (
                    <section className="flex flex-wrap items-center gap-3 rounded-[24px] bg-card p-5">
                        <p className="min-w-0 flex-1 text-[14px] text-slate">Your private accounts need to be empty to leave. Your notes go with you.</p>
                        {confirm?.kind === 'leave' ? (
                            sure(`Leave ${name}`, () => void leave())
                        ) : (
                            <button type="button" onClick={() => setConfirm({ kind: 'leave' })} className="h-11 rounded-[14px] bg-segment px-4 text-[15px] font-extrabold">
                                Leave budget
                            </button>
                        )}
                    </section>
                ) : (
                    <p className="px-1 text-[13px] text-slate">To leave, make someone else the owner first.</p>
                )}
            </div>
        </>
    );
}

Members.layout = (page: ReactNode) => (
    <Shell active="members" title="Members">
        {page}
    </Shell>
);
