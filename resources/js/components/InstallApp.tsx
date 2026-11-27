import { usePage } from '@inertiajs/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Icon from '@/components/Icon';
import { promptInstall, useInstall, type InstallWay } from '@/lib/install';
import { ARRIVE } from '@/lib/motion';
import type { Shared } from '@/types';

const STEPS: Record<Exclude<InstallWay, 'prompt'>, { heading: string; body: string }[]> = {
    chrome: [
        { heading: 'From the address bar', body: 'Click the install icon at the right of the address bar (a screen with a small arrow), then Install.' },
        { heading: 'Or from the menu', body: 'Open the ⋮ menu, then Cast, save and share › Install page as app.' },
    ],
    edge: [
        { heading: 'From the address bar', body: 'Click the App available icon at the right of the address bar, then Install.' },
        { heading: 'Or from the menu', body: 'Open the … menu, then Apps › Install this site as an app.' },
    ],
    safari: [{ heading: 'In Safari on your Mac', body: 'In the menu bar at the top of the screen, choose File › Add to Dock, then click Add. This needs macOS Sonoma or later.' }],
    firefox: [{ heading: 'Firefox can’t install it', body: 'Firefox doesn’t install websites as apps. Open dashboard.pocfin.com in Chrome or Edge (Windows or Mac), or Safari on a Mac, and install it from there.' }],
    other: [{ heading: 'Use Chrome, Edge or Safari', body: 'Open dashboard.pocfin.com in Chrome or Edge (Windows or Mac), or Safari on a Mac, and install it from there.' }],
};

/**
 * "Install PocFin on this computer": Chrome and Edge show their own prompt; elsewhere a short
 * explanation in the "?" help style. Hidden when PocFin is already open as the installed app.
 */
export default function InstallApp({ children }: { children: (open: () => void) => ReactNode }) {
    const way = useInstall();
    const [open, setOpen] = useState(false);
    if (!way) return null;
    const start = () => {
        if (way === 'prompt') {
            void promptInstall().then((done) => {
                if (!done) setOpen(true);
            });
        } else setOpen(true);
    };
    return (
        <>
            {children(start)}
            <InstallDialog way={way} open={open} onClose={() => setOpen(false)} />
        </>
    );
}

function InstallDialog({ way, open, onClose }: { way: InstallWay; open: boolean; onClose: () => void }) {
    const { idleMinutes } = usePage<Shared>().props;
    const reduced = useReducedMotion();
    const titleId = useId();
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);
    // After a dismissed prompt the browser won't offer it again for a while: show its menu steps.
    const steps = STEPS[way === 'prompt' ? (/Edg\//.test(navigator.userAgent) ? 'edge' : 'chrome') : way];

    return createPortal(
        <AnimatePresence>
            {open ? (
                <motion.div key="install" className="fixed inset-0 z-[70] grid place-items-center bg-scrim p-4 text-left tracking-normal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
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
                                    Install PocFin on this computer
                                </h2>
                            </div>
                            <button type="button" autoFocus aria-label="Close" onClick={onClose} className="grid size-9 place-items-center rounded-full bg-canvas text-ink hover:bg-segment">
                                <Icon name="close" size={16} stroke={2.4} />
                            </button>
                        </div>
                        <p className="text-[15px] leading-relaxed font-medium text-ink">PocFin then opens in its own window from your Dock, Start menu or taskbar, with no browser tabs.</p>
                        <div className="flex flex-col divide-y divide-line rounded-2xl bg-canvas px-4">
                            {steps.map((s) => (
                                <div key={s.heading} className="py-3">
                                    <div className="text-[14.5px] font-extrabold text-ink">{s.heading}</div>
                                    <p className="mt-0.5 text-[14px] leading-relaxed font-medium text-slate">{s.body}</p>
                                </div>
                            ))}
                            <div className="py-3">
                                <div className="text-[14.5px] font-extrabold text-ink">It still locks</div>
                                <p className="mt-0.5 text-[14px] leading-relaxed font-medium text-slate">After {idleMinutes} minutes without use PocFin locks, as it does in the browser, and asks for your password to carry on.</p>
                            </div>
                        </div>
                        <div className="flex">
                            <button type="button" onClick={onClose} className="flex h-11 items-center rounded-[14px] bg-mint px-5 text-[14.5px] font-extrabold text-on-mint">
                                Got it
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>,
        document.body,
    );
}
