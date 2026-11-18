import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import HelpButton from '@/components/HelpButton';
import { type ReactNode } from 'react';
import Icon from '@/components/Icon';
import Shell from '@/components/Shell';
import { dateText } from '@/lib/format';
import type { Shared } from '@/types';

type Session = { client: string; name: string; current: boolean; last_used_at: string | null; created_at: string };

const field = 'h-11 w-full rounded-xl border border-line bg-canvas px-3 text-[15px] font-bold text-ink outline-none focus:border-mint';
const btn = 'h-11 rounded-[14px] bg-mint px-5 text-[15px] font-extrabold text-on-mint transition-transform active:scale-[0.97] disabled:opacity-50';

function Err({ text }: { text?: string }) {
    return text ? <p className="mt-1 text-[13px] font-bold text-red">{text}</p> : null;
}

/** Profile and security: your name, your password, where you're signed in, and deleting the account. */
export default function Account({ sessions }: { sessions: Session[] }) {
    const { me } = usePage<Shared>().props;
    const profile = useForm({ name: me?.name ?? '' });
    const password = useForm({ current_password: '', password: '', password_confirmation: '' });

    return (
        <>
            <Head title="Profile and security" />
            <div className="flex max-w-[880px] flex-col gap-5">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.02em]">Profile and security</h1>
                        <HelpButton topic="profile-details" />
                    </div>
                    <p className="mt-0.5 text-[15px] text-slate">Changes here apply in the app too</p>
                </div>

                <form
                    aria-labelledby="pr"
                    onSubmit={(e) => {
                        e.preventDefault();
                        profile.post('/account/profile', { preserveScroll: true });
                    }}
                    className="flex flex-col gap-4 rounded-[24px] bg-card p-6"
                >
                    <h2 id="pr" className="text-[19px] font-extrabold">
                        Profile
                    </h2>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-4">
                        <div>
                            <label htmlFor="name" className="mb-1.5 block text-[13.5px] font-bold text-slate">
                                Name
                            </label>
                            <input id="name" value={profile.data.name} onChange={(e) => profile.setData('name', e.target.value)} autoComplete="name" className={field} />
                            <Err text={profile.errors.name} />
                        </div>
                        <div>
                            <label htmlFor="email" className="mb-1.5 block text-[13.5px] font-bold text-slate">
                                Email
                            </label>
                            <input id="email" value={me?.email ?? ''} readOnly className={`${field} border-0 text-slate`} />
                            <p className="mt-1.5 ml-1 text-[13px] text-slate">Changing your email isn’t available yet.</p>
                        </div>
                    </div>
                    <div>
                        <button type="submit" disabled={profile.processing || !profile.data.name.trim()} className={btn}>
                            Save
                        </button>
                    </div>
                </form>

                <form
                    aria-labelledby="pw"
                    onSubmit={(e) => {
                        e.preventDefault();
                        password.post('/account/password', { preserveScroll: true, onSuccess: () => password.reset() });
                    }}
                    className="flex flex-col gap-4 rounded-[24px] bg-card p-6"
                >
                    <div>
                        <h2 id="pw" className="text-[19px] font-extrabold">
                            Password
                        </h2>
                        <p className="mt-0.5 text-sm text-slate">Changing it signs out your other devices.</p>
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-4">
                        {(
                            [
                                ['current_password', 'cp', 'Current password', 'current-password'],
                                ['password', 'np', 'New password', 'new-password'],
                                ['password_confirmation', 'np2', 'New password again', 'new-password'],
                            ] as const
                        ).map(([k, id, label, ac]) => (
                            <div key={k}>
                                <label htmlFor={id} className="mb-1.5 block text-[13.5px] font-bold text-slate">
                                    {label}
                                </label>
                                <input id={id} type="password" value={password.data[k]} onChange={(e) => password.setData(k, e.target.value)} autoComplete={ac} className={field} />
                                {k !== 'password_confirmation' ? <Err text={password.errors[k]} /> : null}
                            </div>
                        ))}
                    </div>
                    <div>
                        <button type="submit" disabled={password.processing} className={btn}>
                            Change password
                        </button>
                    </div>
                </form>

                <section aria-labelledby="ss" className="rounded-[24px] bg-card pt-6 pb-2">
                    <div className="px-6">
                        <h2 id="ss" className="text-[19px] font-extrabold">
                            Where you’re signed in
                        </h2>
                        <p className="mt-0.5 text-sm text-slate">Don’t recognise one? Sign out everywhere else, then change your password.</p>
                    </div>
                    <div className="mt-3">
                        {sessions.map((s, i) => (
                            <div key={i} className="flex items-center gap-3.5 border-t border-rule px-6 py-3.5">
                                <span className="grid size-10 flex-none place-items-center rounded-full bg-canvas text-slate">
                                    <Icon name={s.client === 'web' ? 'system' : 'accounts'} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-[15px] font-bold">{s.client === 'web' ? s.name : `PocFin app · ${s.name}`}</div>
                                    <div className="text-[13px] text-slate">{s.last_used_at ? `Last used ${dateText(s.last_used_at, true).toLowerCase()}` : `Signed in ${dateText(s.created_at, true).toLowerCase()}`}</div>
                                </div>
                                {s.current ? <span className="rounded-lg bg-tint px-2 py-0.5 text-[12px] font-extrabold text-teal">This browser</span> : null}
                            </div>
                        ))}
                    </div>
                    <div className="px-6 pt-3 pb-4">
                        <button type="button" onClick={() => router.post('/account/sessions', {}, { preserveScroll: true })} className="h-11 rounded-[14px] bg-segment px-4 text-[15px] font-extrabold">
                            Sign out everywhere else
                        </button>
                    </div>
                </section>

                <section aria-labelledby="dl" className="flex flex-wrap items-center gap-4 rounded-[24px] bg-card p-6">
                    <div className="min-w-[240px] flex-1">
                        <h2 id="dl" className="text-[19px] font-extrabold">
                            Delete account
                        </h2>
                        <p className="mt-1 text-sm leading-[21px] text-slate">Erases your account and every budget only you are in, straight away. It can’t be undone.</p>
                    </div>
                    <Link href="/account/delete" className="flex h-11 items-center rounded-[14px] bg-red-tint px-4 text-[15px] font-extrabold text-red-ink">
                        Delete account
                    </Link>
                </section>
            </div>
        </>
    );
}

Account.layout = (page: ReactNode) => (
    <Shell active="account" title="Profile and security">
        {page}
    </Shell>
);
