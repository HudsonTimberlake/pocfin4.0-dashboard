import { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';
import { moneyParts, toCents } from '@/lib/format';
import { ARRIVE, COUNT_MS } from '@/lib/motion';

/**
 * An amount from the API as "R8,420" with ".50" half size and raised (design system rule). When
 * the amount changes (after a save) it counts to the new value over 600 ms (W5 · 3, the app's M4);
 * with "reduce motion" it jumps. Display only: the figure always ends on the server's string.
 */
export default function Money({ amount, income = false, cents = true, className }: { amount: string; income?: boolean; cents?: boolean; className?: string }) {
    const reduced = useReducedMotion();
    const [shown, setShown] = useState(amount);
    const last = useRef(amount);

    useEffect(() => {
        const from = Number(toCents(last.current));
        const to = Number(toCents(amount));
        last.current = amount;
        if (reduced || from === to) {
            setShown(amount);
            return;
        }
        const controls = animate(from, to, {
            duration: COUNT_MS / 1000,
            ease: ARRIVE,
            onUpdate: (v) => setShown((Math.round(v) / 100).toFixed(2)),
            onComplete: () => setShown(amount),
        });
        return () => controls.stop();
    }, [amount, reduced]);

    const p = moneyParts(shown, { income });
    return (
        <span className={`num ${className ?? ''}`}>
            {p.sign}
            {p.whole}
            {cents ? <span className="cents">{p.cents}</span> : null}
        </span>
    );
}
