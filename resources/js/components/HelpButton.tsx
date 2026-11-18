import { Link } from '@inertiajs/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '@/components/Icon';
import { ARRIVE } from '@/lib/motion';
import { GUIDES } from '@/shared/guides';
import { HELP_ALL, TOPIC_GUIDE, type HelpTopic } from '@/shared/help';

/**
 * The little "?" that explains the page, as in the app. Hovering shows what the page is for;
 * clicking opens the whole explanation, with a link to the matching guide in Help.
 */
export default function HelpButton({ topic, label }: { topic: HelpTopic; label?: string }) {
    const entry = HELP_ALL[topic];
    const reduced = useReducedMotion();
    const [hover, setHover] = useState(false);
    const [open, setOpen] = useState(false);
    const timer = useRef<number | undefined>(undefined);
    const tipId = useId();
    const titleId = useId();
    const guide = GUIDES.find((g) => g.key === TOPIC_GUIDE[topic]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);
    useEffect(() => () => window.clearTimeout(timer.current), []);

    if (!entry) return null;

    return (
        <span className="relative inline-flex align-middle">
            <button
                type="button"
                aria-label={label ?? `Help with ${entry.title}`}
                aria-describedby={hover ? tipId : undefined}
                onClick={() => {
                    setHover(false);
                    setOpen(true);
                }}
                onPointerEnter={(e) => {
                    if (e.pointerType !== 'mouse') return;
                    window.clearTimeout(timer.current);
                    timer.current = window.setTimeout(() => setHover(true), 250);
                }}
                onPointerLeave={() => {
                    window.clearTimeout(timer.current);
                    setHover(false);
                }}
                className="grid size-8 flex-none place-items-center rounded-full border border-line bg-card text-slate transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-mint"
            >
                <Icon name="help" size={16} stroke={2.4} />
            </button>
            <AnimatePresence>
                {hover && !open ? (
                    <motion.span
                        id={tipId}
                        role="tooltip"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, transition: { duration: 0.1 } }}
                        transition={{ duration: 0.15, ease: ARRIVE }}
                        className="pointer-events-none absolute top-full left-1/2 z-40 mt-2 w-[280px] -translate-x-1/2 rounded-2xl border border-line bg-card p-3.5 text-left shadow-lg"
                    >
                        <span className="block text-[14px] font-extrabold tracking-normal text-ink">{entry.title}</span>
                        <span className="mt-1 block text-[13px] leading-snug font-medium tracking-normal text-slate">{entry.intro}</span>
                        <span className="mt-2 block text-[12.5px] font-bold tracking-normal text-teal">Click for more</span>
                    </motion.span>
                ) : null}
            </AnimatePresence>
            {/* On <body>: the page's own fade-in transform would otherwise trap a fixed layer under the cards. */}
            {createPortal(
            <AnimatePresence>
                {open ? (
                    <motion.div key="help" className="fixed inset-0 z-[70] grid place-items-center bg-scrim p-4 text-left tracking-normal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby={titleId}
                            onClick={(e) => e.stopPropagation()}
                            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, transition: { duration: 0.12 } }}
                            transition={{ duration: 0.24, ease: ARRIVE }}
                            className="flex max-h-[85vh] w-full max-w-[520px] flex-col gap-4 overflow-y-auto rounded-[28px] bg-card p-6"
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex-1">
                                    <div className="text-[13px] font-bold text-slate">Help</div>
                                    <h2 id={titleId} className="text-[22px] leading-tight font-extrabold tracking-[-0.02em] text-ink">
                                        {entry.title}
                                    </h2>
                                </div>
                                <button type="button" autoFocus aria-label="Close help" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full bg-canvas text-ink hover:bg-segment">
                                    <Icon name="close" size={16} stroke={2.4} />
                                </button>
                            </div>
                            <p className="text-[15px] leading-relaxed font-medium text-ink">{entry.intro}</p>
                            {entry.sections?.length ? (
                                <div className="flex flex-col divide-y divide-line rounded-2xl bg-canvas px-4">
                                    {entry.sections.map((s) => (
                                        <div key={s.heading} className="py-3">
                                            <div className="text-[14.5px] font-extrabold text-ink">{s.heading}</div>
                                            <p className="mt-0.5 text-[14px] leading-relaxed font-medium whitespace-pre-line text-slate">{s.body}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                            <div className="flex flex-wrap gap-2">
                                {guide ? (
                                    <Link href={`/help?guide=${guide.key}`} onClick={() => setOpen(false)} className="flex h-11 items-center gap-2 rounded-[14px] bg-mint px-4 text-[14.5px] font-extrabold text-on-mint">
                                        Read the guide: {guide.title}
                                    </Link>
                                ) : null}
                                <Link href="/help" onClick={() => setOpen(false)} className="flex h-11 items-center rounded-[14px] bg-canvas px-4 text-[14.5px] font-extrabold text-ink hover:bg-segment">
                                    All guides and help
                                </Link>
                            </div>
                        </motion.div>
                    </motion.div>
                ) : null}
            </AnimatePresence>,
            document.body,
            )}
        </span>
    );
}
