import { useId } from 'react';

/**
 * The real PocFin mark (brand/logo/pocfin-mark.svg): the mint pocket with its coin tucked in, the
 * coin's ring cut out so it shows whatever is behind (light or dark). `size` is the height.
 */
export default function Logo({ size = 32 }: { size?: number }) {
    const id = 'pf' + useId().replace(/[^a-zA-Z0-9]/g, '');
    return (
        <svg height={size} width={Math.round((size * 552) / 682)} viewBox="236 162 552 682" aria-hidden="true" focusable="false" className="flex-none">
            <mask id={`${id}r`} maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">
                <rect width="1024" height="1024" fill="#fff" />
                <circle cx="512" cy="280" r="72" fill="none" stroke="#000" strokeWidth="20" />
            </mask>
            <clipPath id={`${id}c`}>
                <rect width="1024" height="335" />
            </clipPath>
            <g clipPath={`url(#${id}c)`}>
                <circle cx="512" cy="280" r="118" fill="#03C7AA" mask={`url(#${id}r)`} />
            </g>
            <path d="M266 380 H758 V560 C758 730 655 818 512 818 C369 818 266 730 266 560 Z" fill="none" stroke="#03C7AA" strokeWidth="50" strokeLinejoin="round" />
            <path d="M266 475 C360 475 432 495 512 542 C592 495 664 475 758 475" fill="none" stroke="#03C7AA" strokeWidth="44" strokeLinecap="round" />
        </svg>
    );
}
