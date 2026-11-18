import { motion, useReducedMotion } from 'motion/react';
import { ARRIVE } from '@/lib/motion';

/** A progress bar that fills on arrival and slides to new widths (W5 · 3). Red when overspent. */
export default function Bar({ percent, over = false, height = 6, tone = 'mint', delay = 0 }: { percent: number; over?: boolean; height?: number; tone?: 'mint' | 'navy' | 'amber'; delay?: number }) {
    const reduced = useReducedMotion();
    const fill = over ? 'bg-red' : tone === 'navy' ? 'bg-navy-line' : tone === 'amber' ? 'bg-amber' : 'bg-mint';
    const track = over ? 'bg-red-tint' : tone === 'navy' ? 'bg-navy-tint' : 'bg-tint';
    return (
        <div className={`overflow-hidden rounded-full ${track}`} style={{ height }}>
            <motion.div
                className={`h-full rounded-full ${fill}`}
                initial={reduced ? false : { width: 0 }}
                animate={{ width: `${over ? 100 : percent}%` }}
                transition={{ duration: 0.6, ease: ARRIVE, delay }}
            />
        </div>
    );
}
