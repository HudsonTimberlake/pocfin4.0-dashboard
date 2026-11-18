import { motion, useReducedMotion } from 'motion/react';
import { useId } from 'react';
import { ARRIVE } from '@/lib/motion';

// The logo's pocket in the logo's own coordinates (viewBox 236 340 552 500), the same as the app's
// PocketGauge: the outline plus the curved seam that makes it read as a pocket.
const OUTLINE = 'M266 380 H758 V560 C758 730 655 818 512 818 C369 818 266 730 266 560 Z';
const SEAM = 'M266 475 C360 475 432 495 512 542 C592 495 664 475 758 475';
const TOP = 380;
const BOTTOM = 818;

/** The pocket gauge (the logo's pocket, ink outline and seam, mint fill): the one signature graphic. */
export default function Gauge({ percent, size = 164, className = '' }: { percent: number; size?: number; className?: string }) {
    const reduced = useReducedMotion();
    // useId gives characters a url(#…) reference can't hold, so keep letters and digits only.
    const clip = 'pocket' + useId().replace(/[^a-zA-Z0-9]/g, '');
    const f = Math.max(0, Math.min(100, percent)) / 100;
    const top = BOTTOM - f * (BOTTOM - TOP);
    const height = Math.round((size * 500) / 552);
    return (
        <svg width={size} height={height} viewBox="236 340 552 500" role="img" aria-label={`Pocket gauge, ${percent}% of this month's money left`} className={`flex-none ${className}`}>
            <defs>
                <clipPath id={clip}>
                    <path d={OUTLINE} />
                </clipPath>
            </defs>
            <g clipPath={`url(#${clip})`}>
                <motion.rect x={236} width={552} height={560} className="fill-mint" y={top} initial={reduced ? false : { attrY: BOTTOM }} animate={{ attrY: top }} transition={{ duration: 0.8, ease: ARRIVE, delay: 0.1 }} />
            </g>
            <path d={OUTLINE} fill="none" className="stroke-ink" strokeWidth={34} strokeLinejoin="round" />
            <path d={SEAM} fill="none" className="stroke-ink" strokeWidth={28} strokeLinecap="round" />
        </svg>
    );
}
