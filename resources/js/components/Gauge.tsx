import { motion, useReducedMotion } from 'motion/react';
import { useId } from 'react';
import { ARRIVE } from '@/lib/motion';

/** The pocket gauge (the logo's pocket, ink outline, mint fill): the one signature graphic. */
export default function Gauge({ percent, size = 164, className = '' }: { percent: number; size?: number; className?: string }) {
    const reduced = useReducedMotion();
    // useId gives characters a url(#…) reference can't hold, so keep letters and digits only.
    const clip = 'pocket' + useId().replace(/[^a-zA-Z0-9]/g, '');
    // The pocket runs from y 30 to y 125; the fill's top sits at the level for this percent.
    const top = 125 - (95 * Math.max(0, Math.min(100, percent))) / 100;
    return (
        <svg width={size} height={size} viewBox="0 0 150 150" role="img" aria-label={`Pocket gauge, ${percent}% of this month's money left`} className={`flex-none ${className}`}>
            <defs>
                <clipPath id={clip}>
                    <path d="M25 30h100v45a50 50 0 0 1-100 0z" />
                </clipPath>
            </defs>
            <path d="M25 30h100v45a50 50 0 0 1-100 0z" className="fill-tint" />
            <g clipPath={`url(#${clip})`}>
                <motion.rect x={20} width={110} height={130} className="fill-mint" y={top} initial={reduced ? false : { attrY: 125 }} animate={{ attrY: top }} transition={{ duration: 0.8, ease: ARRIVE, delay: 0.1 }} />
            </g>
            <path d="M25 30h100v45a50 50 0 0 1-100 0z" fill="none" className="stroke-ink" strokeWidth={5} strokeLinejoin="round" />
        </svg>
    );
}
