import { Head, Link, useForm } from '@inertiajs/react';
import { type ReactNode } from 'react';
import Icon from '@/components/Icon';
import Shell from '@/components/Shell';

type Props = { subscription: { active: boolean; store: string | null }; blocked: string | null };

const MANAGE = { app_store: 'https://apps.apple.com/account/subscriptions', play_store: 'https://play.google.com/store/account/subscriptions' };

/** Delete your account: what happens, then your password and a tick. Nothing here can be undone. */
export default function DeleteAccount({ subscription, blocked }: Props) {
    const form = useForm({ password: '', understood: false });
    const play = subscription.store === 'play_store';
    const row = (tone: 'bad' | 'good', icon: 'close' | 'check', body: ReactNode) => (
        <li className="flex gap-3">
            <span className={`grid size-7 flex-none place-items-center rounded-full ${tone === 'bad' ? 'bg-red-tint text-red' : 'bg-tint text-teal'}`}>
                <Icon name={icon} size={16} stroke={2.6} />
            </span>
            <span className="text-[15px] leading-[22px]">{body}</span>
        </li>
    );
    return (
        <>
            <Head title="Delete account" />
            <div className="flex max-w-[760px] flex-col gap-5">
                <div>
                    <Link href="/account" className="inline-flex h-8 items-center gap-1 text-[15px] font-bold text-teal">
                        <span className="rotate-180">
                            <Icon name="chevronRight" size={16} stroke={2.4} />
                        </span>
                        Profile and security
                    </Link>
                    <h1 className="mt-1.5 text-[28px] leading-tight font-extrabold tracking-[-0.02em]">Delete your account</h1>
                </div>

                <section aria-labelledby="wh" className="rounded-[24px] bg-card p-6">
                    <h2 id="wh" className="text-lg font-extrabold">
                        What happens
                    </h2>
                    <ul className="mt-3.5 flex flex-col gap-3.5">
                        {row('bad', 'close', <><b>Every budget only you are in is erased</b>, with everything in it: envelopes, transactions, accounts, investments, notes, saved calculations and receipt photos.</>)}
                        {row('bad', 'close', <><b>Your account goes</b>, and you’re signed out of the app and this dashboard everywhere.</>)}
                        {row('good', 'check', <><b>Shared budgets stay</b> for the other people in them. What you recorded there stays, without your name, and your notes in them are deleted.</>)}
                    </ul>
                    <p className="mt-4 text-[15px] font-bold text-red-ink">It happens straight away and can’t be undone.</p>
                </section>

                {blocked ? (
                    <section role="alert" className="flex gap-3.5 rounded-[24px] bg-amber-tint p-6">
                        <span className="grid size-10 flex-none place-items-center rounded-full bg-card text-amber">
                            <Icon name="warning" />
                        </span>
                        <div>
                            <h2 className="text-[17px] font-extrabold text-amber-text">Not yet</h2>
                            <p className="mt-1.5 text-[15px] leading-[22px] text-amber-ink">{blocked} You can do that in the app, then come back.</p>
                        </div>
                    </section>
                ) : null}

                {subscription.active ? (
                    <section className="rounded-[24px] bg-navy-tint p-5">
                        <h2 className="text-base font-extrabold text-navy-text">Your subscription doesn’t stop by itself</h2>
                        <p className="mt-1 text-[14.5px] leading-[21px] text-navy-ink">
                            Cancel it in {play ? 'Google Play' : 'the App Store'} first, or you’ll keep being charged.{' '}
                            <a href={play ? MANAGE.play_store : MANAGE.app_store} target="_blank" rel="noopener" className="font-extrabold underline">
                                Manage it there
                            </a>
                        </p>
                    </section>
                ) : null}

                <form
                    aria-labelledby="cf"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post('/account/delete');
                    }}
                    className="flex flex-col gap-4 rounded-[24px] bg-card p-6"
                >
                    <h2 id="cf" className="text-lg font-extrabold">
                        Confirm it’s you
                    </h2>
                    <div>
                        <label htmlFor="dp" className="mb-1.5 block text-[13.5px] font-bold text-slate">
                            Password
                        </label>
                        <input id="dp" type="password" autoComplete="current-password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} className="h-11 w-full rounded-xl border border-line bg-canvas px-3 text-[15px] font-bold outline-none focus:border-mint" />
                        {form.errors.password ? <p className="mt-1 text-[13px] font-bold text-red">{form.errors.password}</p> : null}
                    </div>
                    <label className="flex items-start gap-3 text-[15px] leading-[22px]">
                        <input type="checkbox" checked={form.data.understood} onChange={(e) => form.setData('understood', e.target.checked)} className="mt-0.5 size-[22px] flex-none accent-red" />I understand my account and every budget only I am in will be erased for good.
                    </label>
                    {form.errors.understood ? <p className="text-[13px] font-bold text-red">{form.errors.understood}</p> : null}
                    <div className="flex flex-wrap gap-2.5">
                        <button type="submit" disabled={form.processing} className="h-12 rounded-[14px] bg-red px-5 text-[15px] font-extrabold text-white disabled:opacity-50">
                            Delete my account
                        </button>
                        <Link href="/account" className="flex h-12 items-center px-4 text-[15px] font-bold text-teal">
                            Keep my account
                        </Link>
                    </div>
                </form>
            </div>
        </>
    );
}

DeleteAccount.layout = (page: ReactNode) => (
    <Shell active="account" title="Delete account">
        {page}
    </Shell>
);
