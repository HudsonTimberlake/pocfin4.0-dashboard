import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Icon from '@/components/Icon';
import { ARRIVE } from '@/lib/motion';

/** True below 640 px, where panels come up from the bottom like the app's sheets. */
function usePhone() {
    const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches);
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 639px)');
        const on = () => setPhone(mq.matches);
        mq.addEventListener('change', on);
        return () => mq.removeEventListener('change', on);
    }, []);
    return phone;
}

/**
 * The slide-out card the Add panel uses, for any short task: in from the right on a computer, up
 * from the bottom on a phone. Esc or the scrim closes it.
 */
export default function SidePanel({ open, title, sub, onClose, children, footer }: { open: boolean; title: string; sub?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
    const reduced = useReducedMotion();
    const phone = usePhone();
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    return createPortal(
        <AnimatePresence>
            {open ? (
                <>
                    <motion.div key="scrim" className="fixed inset-0 z-50 bg-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }} onClick={onClose} />
                    <motion.div
                        key="panel"
                        role="dialog"
                        aria-modal="true"
                        aria-label={title}
                        className={
                            phone
                                ? 'fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col overflow-hidden rounded-t-[28px] bg-card'
                                : 'fixed top-3 right-3 bottom-3 z-50 flex w-[min(500px,calc(100vw-24px))] flex-col overflow-hidden rounded-[28px] bg-card'
                        }
                        initial={reduced ? { opacity: 0 } : phone ? { y: '100%' } : { x: 48, opacity: 0 }}
                        animate={reduced ? { opacity: 1 } : phone ? { y: 0 } : { x: 0, opacity: 1 }}
                        exit={reduced ? { opacity: 0 } : phone ? { y: '100%', transition: { duration: 0.2 } } : { x: 48, opacity: 0, transition: { duration: 0.2 } }}
                        transition={{ duration: 0.28, ease: ARRIVE }}
                    >
                        <div className="flex items-start gap-3 px-6 pt-5">
                            <div className="min-w-0 flex-1">
                                <h2 className="text-2xl font-extrabold tracking-[-0.02em]">{title}</h2>
                                {sub ? <div className="mt-0.5 text-[14px] text-slate">{sub}</div> : null}
                            </div>
                            <button type="button" onClick={onClose} aria-label="Close (Esc)" title="Close (Esc)" className="grid size-10 flex-none place-items-center rounded-full bg-canvas">
                                <Icon name="close" size={18} stroke={2.2} />
                            </button>
                        </div>
                        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pt-5 pb-5">{children}</div>
                        {footer ? <div className="border-t border-line px-6 py-4">{footer}</div> : null}
                    </motion.div>
                </>
            ) : null}
        </AnimatePresence>,
        document.body,
    );
}
