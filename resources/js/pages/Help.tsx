import { Head, router, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Icon from '@/components/Icon';
import Shell from '@/components/Shell';
import { dayLabel } from '@/lib/format';
import { Refused, send } from '@/lib/http';
import { ARRIVE } from '@/lib/motion';
import { GUIDES, type Guide } from '@/shared/guides';
import type { Shared } from '@/types';

type Kind = 'problem' | 'question' | 'idea' | 'account';
type Attachment = { id: number; mime: string };
type Message = { id: number; from_admin: boolean; author: string; body: string; attachments: Attachment[]; created_at: string };
type Thread = { id: number; kind: Kind; subject: string; status: 'open' | 'answered' | 'closed'; preview: string; last_from_admin: boolean; unread: boolean; last_message_at: string };
type Open = Thread & { messages: Message[] };
type Props = { threads: Thread[]; unread: number; selected: Open | null; tab: Tab | null };
type Tab = 'guides' | 'contact' | 'messages';

const KINDS: [Kind, string][] = [
    ['question', 'A question'],
    ['problem', 'Something’s not working'],
    ['idea', 'An idea'],
    ['account', 'Account or Premium'],
];
const SEEN = 'pocfin-guides-seen';
const MAX_SHOTS = 3;

function readSeen(): string[] {
    try {
        return JSON.parse(localStorage.getItem(SEEN) ?? '[]') as string[];
    } catch {
        return [];
    }
}

/** Screenshots picked for a message: up to three, shown as small previews you can remove. */
function Shots({ files, setFiles, error }: { files: File[]; setFiles: (f: File[]) => void; error?: string }) {
    const input = useRef<HTMLInputElement>(null);
    const [urls, setUrls] = useState<string[]>([]);
    useEffect(() => {
        const u = files.map((f) => URL.createObjectURL(f));
        setUrls(u);
        return () => u.forEach((x) => URL.revokeObjectURL(x));
    }, [files]);
    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
                {files.map((f, i) => (
                    <span key={`${f.name}${i}`} className="relative">
                        {urls[i] ? <img src={urls[i]} alt={`Screenshot ${i + 1}`} className="size-14 rounded-xl object-cover" /> : <span className="block size-14 rounded-xl bg-segment" />}
                        <button type="button" aria-label={`Remove screenshot ${i + 1}`} onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-ink text-card">
                            <Icon name="close" size={11} stroke={2.6} />
                        </button>
                    </span>
                ))}
                {files.length < MAX_SHOTS ? (
                    <button type="button" onClick={() => input.current?.click()} className="h-9 rounded-xl bg-segment px-3 text-[13.5px] font-extrabold">
                        Add a screenshot
                    </button>
                ) : null}
                <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple hidden onChange={(e) => { setFiles([...files, ...Array.from(e.target.files ?? [])].slice(0, MAX_SHOTS)); e.target.value = ''; }} />
            </div>
            {error ? <span className="text-[13px] font-bold text-red">{error}</span> : null}
        </div>
    );
}

function GuideReader({ guide, onClose }: { guide: Guide; onClose: () => void }) {
    const [i, setI] = useState(0);
    const card = guide.cards[i];
    const last = i === guide.cards.length - 1;
    useEffect(() => {
        const on = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight' && !last) setI((n) => n + 1);
            if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1));
        };
        window.addEventListener('keydown', on);
        return () => window.removeEventListener('keydown', on);
    });
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-scrim" onClick={onClose} />
            <motion.div role="dialog" aria-modal="true" aria-label={guide.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, ease: ARRIVE }} className="relative flex w-full max-w-[460px] flex-col gap-5 rounded-[28px] bg-card p-6">
                <div className="flex items-center gap-3">
                    <span className="flex-1 text-[13.5px] font-bold text-slate">Guide · {guide.title}</span>
                    <button type="button" aria-label="Close guide" onClick={onClose} className="flex size-9 items-center justify-center rounded-xl text-slate hover:bg-segment">
                        <Icon name="close" size={18} />
                    </button>
                </div>
                <div aria-live="polite" className="flex min-h-[170px] flex-col gap-3">
                    {last && guide.premium ? <span className="self-start rounded-lg bg-tint px-2 py-0.5 text-[12px] font-extrabold text-teal">Premium</span> : null}
                    <h2 className="text-[24px] leading-tight font-extrabold tracking-[-0.01em]">{card.title}</h2>
                    <p className="text-[16px] leading-relaxed text-slate">{card.body}</p>
                </div>
                <div className="flex items-center gap-4">
                    <div role="img" aria-label={`Card ${i + 1} of ${guide.cards.length}`} className="flex flex-1 gap-1.5">
                        {guide.cards.map((_, n) => (
                            <span key={n} className={`h-2 rounded-full transition-all ${n === i ? 'w-[22px] bg-mint' : 'w-2 bg-line-strong'}`} />
                        ))}
                    </div>
                    {i > 0 ? (
                        <button type="button" onClick={() => setI(i - 1)} className="h-11 rounded-[14px] px-4 text-[15px] font-extrabold text-slate">
                            Back
                        </button>
                    ) : null}
                    {last && guide.premium ? (
                        <a href="/premium" className="flex h-11 items-center rounded-[14px] bg-segment px-4 text-[15px] font-extrabold">
                            See Premium
                        </a>
                    ) : null}
                    <button type="button" autoFocus onClick={() => (last ? onClose() : setI(i + 1))} className="h-11 rounded-[14px] bg-mint px-5 text-[15px] font-extrabold text-on-mint transition-transform active:scale-[0.97]">
                        {last ? 'Done' : 'Next'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

/**
 * W18 Help: short guides, Contact us, and Your messages (the same conversations as in the app).
 * Guides are words only here; their drawings are in the app.
 */
export default function Help(p: Props) {
    const { csrf } = usePage<Shared>().props;
    const [tab, setTab] = useState<Tab>(p.tab ?? (p.selected ? 'messages' : 'guides'));
    const [guide, setGuide] = useState<Guide | null>(null);
    const [seen, setSeen] = useState<string[]>([]);
    useEffect(() => setSeen(readSeen()), []);

    const [kind, setKind] = useState<Kind>('question');
    const [msg, setMsg] = useState('');
    const [shots, setShots] = useState<File[]>([]);
    const [reply, setReply] = useState('');
    const [replyShots, setReplyShots] = useState<File[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    const [sent, setSent] = useState<number | null>(null);

    function closeGuide() {
        if (guide) {
            const next = [...new Set([...seen, guide.key])];
            setSeen(next);
            try {
                localStorage.setItem(SEEN, JSON.stringify(next));
            } catch {
                /* simply not remembered */
            }
        }
        setGuide(null);
    }

    function openThread(id: number) {
        setTab('messages');
        setErrors({});
        router.get('/help', { thread: id }, { only: ['threads', 'unread', 'selected'], preserveState: true, preserveScroll: true, replace: true });
    }

    function form(body: string, files: File[], extra: Record<string, string> = {}) {
        const f = new FormData();
        Object.entries(extra).forEach(([k, v]) => f.append(k, v));
        f.append('body', body.trim());
        files.forEach((file, i) => f.append(`images[${i}]`, file));
        return f;
    }

    async function submit(e: FormEvent, thread?: number) {
        e.preventDefault();
        const text = thread ? reply : msg;
        if (!text.trim() || busy) return;
        setBusy(true);
        setErrors({});
        try {
            const row = thread ? await send<Open>(csrf, 'POST', `/help/threads/${thread}/messages`, form(reply, replyShots)) : await send<Open>(csrf, 'POST', '/help/threads', form(msg, shots, { kind }));
            if (thread) {
                setReply('');
                setReplyShots([]);
                openThread(thread);
            } else {
                setMsg('');
                setShots([]);
                setSent(row.id);
                router.reload({ only: ['threads', 'unread'] });
            }
        } catch (err) {
            setErrors(err instanceof Refused ? err.errors : { form: 'That didn’t send.' });
        } finally {
            setBusy(false);
        }
    }

    async function closeThread(id: number) {
        try {
            await send(csrf, 'POST', `/help/threads/${id}/close`);
            openThread(id);
        } catch (err) {
            setErrors(err instanceof Refused ? err.errors : { form: 'That didn’t work.' });
        }
    }

    const tabs: [Tab, string][] = [
        ['guides', 'Guides'],
        ['contact', 'Contact us'],
        ['messages', 'Your messages'],
    ];
    const field = 'w-full rounded-xl border border-line bg-canvas p-3 text-[15px] font-semibold text-ink outline-none focus:border-mint';
    const state = (t: Thread) => (t.status === 'closed' ? `Closed · ${dayLabel(t.last_message_at.slice(0, 10))}` : t.last_from_admin ? `PocFin replied · ${dayLabel(t.last_message_at.slice(0, 10))}` : `Sent · ${dayLabel(t.last_message_at.slice(0, 10))}`);

    return (
        <>
            <Head title="Help" />
            <div className="flex max-w-[980px] flex-col gap-5">
                <div>
                    <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.02em]">Help and support</h1>
                    <p className="mt-0.5 text-[15px] text-slate">Short guides, or ask us anything</p>
                </div>

                <div role="tablist" aria-label="Help" className="flex flex-wrap gap-1 rounded-2xl bg-segment p-1 sm:self-start">
                    {tabs.map(([k, label]) => (
                        <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`flex h-10 items-center gap-2 rounded-xl px-4 text-[14.5px] font-extrabold transition-colors ${tab === k ? 'bg-card text-ink shadow-sm' : 'text-slate hover:text-ink'}`}>
                            {label}
                            {k === 'messages' && p.unread ? <span className="rounded-[10px] bg-mint px-2 text-xs font-extrabold text-on-mint">{p.unread}</span> : null}
                        </button>
                    ))}
                </div>

                {tab === 'guides' ? (
                    <ul className="grid gap-3 sm:grid-cols-2">
                        {GUIDES.map((g) => (
                            <li key={g.key}>
                                <button type="button" onClick={() => setGuide(g)} className="flex w-full items-center gap-3 rounded-[20px] bg-card p-4 text-left transition-transform active:scale-[0.99]">
                                    <span className="flex size-12 flex-none items-center justify-center rounded-2xl bg-tint text-[17px] font-extrabold text-teal">{g.cards.length}</span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[15.5px] font-extrabold">{g.title}</span>
                                        <span className="block text-[13px] text-slate">
                                            {g.cards.length} cards{seen.includes(g.key) ? ' · Seen' : ''}
                                        </span>
                                    </span>
                                    {g.premium ? <span className="rounded-lg bg-tint px-2 py-0.5 text-[12px] font-extrabold text-teal">Premium</span> : null}
                                    <span className="text-slate">
                                        <Icon name="chevronRight" size={16} />
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : null}

                {tab === 'contact' ? (
                    <form onSubmit={(e) => void submit(e)} className="flex max-w-[640px] flex-col gap-4 rounded-[24px] bg-card p-5">
                        {sent ? (
                            <div className="flex flex-col gap-3">
                                <h2 className="text-[19px] font-extrabold">Sent. Thank you.</h2>
                                <p className="text-[15px] text-slate">Our reply shows in Your messages, here and in the app. We email you a short notice when it’s there.</p>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => openThread(sent)} className="h-11 rounded-[14px] bg-mint px-4 text-[15px] font-extrabold text-on-mint">
                                        Open your message
                                    </button>
                                    <button type="button" onClick={() => setSent(null)} className="h-11 rounded-[14px] bg-segment px-4 text-[15px] font-extrabold">
                                        Write another
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div role="radiogroup" aria-label="What’s it about?" className="flex flex-wrap gap-2">
                                    {KINDS.map(([k, label]) => (
                                        <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={`h-9 rounded-xl px-3 text-[13.5px] font-extrabold ${kind === k ? 'bg-ink text-canvas' : 'bg-canvas text-ink'}`}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="msg" className="text-[13.5px] font-bold text-slate">
                                        Your message
                                    </label>
                                    <textarea id="msg" value={msg} onChange={(e) => setMsg(e.target.value)} rows={6} maxLength={5000} className={field} />
                                    {errors.body ? <span className="text-[13px] font-bold text-red">{errors.body}</span> : null}
                                </div>
                                <Shots files={shots} setFiles={setShots} error={errors.images ?? errors['images.0']} />
                                {errors.form || errors.kind ? <span className="text-[13px] font-bold text-red">{errors.form ?? errors.kind}</span> : null}
                                <div className="flex flex-wrap items-center gap-3">
                                    <button type="submit" disabled={!msg.trim() || busy} className="h-11 rounded-[14px] bg-mint px-5 text-[15px] font-extrabold text-on-mint transition-transform active:scale-[0.97] disabled:bg-segment disabled:text-slate">
                                        Send
                                    </button>
                                    <span className="text-[13px] text-slate">We see your account, never your amounts.</span>
                                </div>
                            </>
                        )}
                    </form>
                ) : null}

                {tab === 'messages' ? (
                    p.threads.length === 0 ? (
                        <p className="px-1 text-[15px] text-slate">
                            No messages yet.{' '}
                            <button type="button" onClick={() => setTab('contact')} className="font-extrabold text-teal underline-offset-2 hover:underline">
                                Contact us
                            </button>
                        </p>
                    ) : (
                        <div className="grid items-start gap-4 md:grid-cols-[300px_minmax(0,1fr)]">
                            <ul className="flex flex-col gap-1 rounded-[24px] bg-card p-2">
                                {p.threads.map((t) => (
                                    <li key={t.id}>
                                        <button type="button" onClick={() => openThread(t.id)} aria-current={p.selected?.id === t.id ? 'true' : undefined} className={`flex w-full items-start gap-2 rounded-2xl p-3 text-left ${p.selected?.id === t.id ? 'bg-tint' : 'hover:bg-segment'}`}>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-[15px] font-extrabold">{t.preview || t.subject}</span>
                                                <span className="block text-[13px] text-slate">
                                                    {t.subject} · {state(t)}
                                                </span>
                                            </span>
                                            {t.unread ? <span aria-label="New reply" className="mt-1.5 size-2.5 flex-none rounded-full bg-mint" /> : null}
                                        </button>
                                    </li>
                                ))}
                            </ul>

                            {p.selected ? (
                                <section className="flex flex-col gap-4 rounded-[24px] bg-card p-5" aria-label={`Conversation: ${p.selected.subject}`}>
                                    <div className="flex items-center gap-3">
                                        <h2 className="min-w-0 flex-1 truncate text-[19px] font-extrabold">{p.selected.subject}</h2>
                                        {p.selected.status !== 'closed' ? (
                                            <button type="button" onClick={() => void closeThread(p.selected!.id)} className="h-9 rounded-xl bg-segment px-3 text-[13.5px] font-extrabold">
                                                Close conversation
                                            </button>
                                        ) : (
                                            <span className="rounded-lg bg-segment px-2 py-0.5 text-[12px] font-extrabold text-slate">Closed</span>
                                        )}
                                    </div>
                                    <AnimatePresence initial={false}>
                                        <ul className="flex flex-col gap-3">
                                            {p.selected.messages.map((m) => (
                                                <motion.li key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className={`flex flex-col gap-1.5 rounded-2xl p-3.5 ${m.from_admin ? 'bg-tint' : 'bg-canvas'}`}>
                                                    <p className="text-[15px] leading-snug whitespace-pre-line">{m.body}</p>
                                                    {m.attachments.length ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {m.attachments.map((a) => (
                                                                <a key={a.id} href={`/help/attachments/${a.id}`} target="_blank" rel="noreferrer">
                                                                    <img src={`/help/attachments/${a.id}`} alt="Screenshot" loading="lazy" className="size-20 rounded-xl object-cover" />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                    <span className="text-[12.5px] font-bold text-slate">
                                                        {m.author} · {dayLabel(m.created_at.slice(0, 10))}
                                                    </span>
                                                </motion.li>
                                            ))}
                                        </ul>
                                    </AnimatePresence>
                                    {p.selected.status !== 'closed' ? (
                                        <form onSubmit={(e) => void submit(e, p.selected!.id)} className="flex flex-col gap-3 border-t border-rule pt-4">
                                            <label htmlFor="reply" className="sr-only">
                                                Reply
                                            </label>
                                            <textarea id="reply" value={reply} onChange={(e) => setReply(e.target.value)} rows={3} maxLength={5000} placeholder="Write a reply…" className={field} />
                                            <Shots files={replyShots} setFiles={setReplyShots} error={errors.images ?? errors['images.0']} />
                                            {errors.body || errors.form ? <span className="text-[13px] font-bold text-red">{errors.body ?? errors.form}</span> : null}
                                            <button type="submit" disabled={!reply.trim() || busy} className="h-11 self-start rounded-[14px] bg-mint px-5 text-[15px] font-extrabold text-on-mint transition-transform active:scale-[0.97] disabled:bg-segment disabled:text-slate">
                                                Send
                                            </button>
                                        </form>
                                    ) : (
                                        <p className="text-[14px] text-slate">This conversation is closed. Write to us again from Contact us if there’s more.</p>
                                    )}
                                </section>
                            ) : (
                                <p className="rounded-[24px] bg-card p-5 text-[15px] text-slate">Choose a message to read it.</p>
                            )}
                        </div>
                    )
                ) : null}
            </div>
            {guide ? <GuideReader guide={guide} onClose={closeGuide} /> : null}
        </>
    );
}

Help.layout = (page: ReactNode) => (
    <Shell active="help" title="Help">
        {page}
    </Shell>
);
