import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useRef, useState } from 'react';
import Icon from '@/components/Icon';
import { ARRIVE } from '@/lib/motion';
import { monthLabel } from '@/shared/goals';

const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ym = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;

/**
 * A month and year picker: the year with arrows, then the twelve months as buttons. Months outside
 * `min`..`max` (Y-m) can't be picked. Replaces a long list of every month.
 */
export default function MonthPicker({ label, value, onChange, min, max, error, placeholder = 'Choose a month' }: { label: string; value: string; onChange: (v: string) => void; min: string; max: string; error?: string; placeholder?: string }) {
    const [open, setOpen] = useState(false);
    const [year, setYear] = useState(() => Number((value || min).slice(0, 4)));
    const box = useRef<HTMLDivElement>(null);
    const id = useId();
    const minY = Number(min.slice(0, 4));
    const maxY = Number(max.slice(0, 4));

    useEffect(() => {
        if (!open) return;
        setYear(Number((value || min).slice(0, 4)));
        const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
        const key = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.stopPropagation();
            setOpen(false);
        };
        window.addEventListener('pointerdown', away);
        window.addEventListener('keydown', key, true);
        return () => {
            window.removeEventListener('pointerdown', away);
            window.removeEventListener('keydown', key, true);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    return (
        <div ref={box} className="relative flex flex-col gap-1 text-[13px] font-bold text-slate">
            <span id={id}>{label}</span>
            <button
                type="button"
                aria-labelledby={id}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className={`flex h-11 w-full items-center gap-2 rounded-xl border bg-card px-3 text-left text-[15px] font-bold outline-none ${open ? 'border-mint' : 'border-line hover:border-line-strong'} ${value ? 'text-ink' : 'text-muted'}`}
            >
                <Icon name="calendar" size={18} className="text-slate" />
                <span className="flex-1">{value ? monthLabel(value) : placeholder}</span>
                <Icon name="chevrons" size={14} stroke={2.2} className="text-slate" />
            </button>
            {error ? <span className="text-red-ink">{error}</span> : null}
            <AnimatePresence>
                {open ? (
                    <motion.div
                        role="dialog"
                        aria-label={`${label}: pick a month`}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, transition: { duration: 0.1 } }}
                        transition={{ duration: 0.16, ease: ARRIVE }}
                        className="absolute top-full left-0 z-30 mt-1.5 w-full min-w-[280px] rounded-2xl border border-line bg-card p-3 shadow-lg"
                    >
                        <div className="mb-2.5 flex items-center justify-between">
                            <button type="button" aria-label="Year before" disabled={year <= minY} onClick={() => setYear((y) => y - 1)} className="grid size-9 place-items-center rounded-xl text-ink hover:bg-canvas disabled:opacity-30">
                                <Icon name="chevronRight" size={16} stroke={2.4} className="rotate-180" />
                            </button>
                            <span className="num text-[16px] font-extrabold text-ink">{year}</span>
                            <button type="button" aria-label="Next year" disabled={year >= maxY} onClick={() => setYear((y) => y + 1)} className="grid size-9 place-items-center rounded-xl text-ink hover:bg-canvas disabled:opacity-30">
                                <Icon name="chevronRight" size={16} stroke={2.4} />
                            </button>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                            {SHORT.map((m, i) => {
                                const v = ym(year, i + 1);
                                const off = v < min || v > max;
                                const on = v === value;
                                return (
                                    <button
                                        key={m}
                                        type="button"
                                        disabled={off}
                                        aria-pressed={on}
                                        aria-label={monthLabel(v)}
                                        onClick={() => {
                                            onChange(v);
                                            setOpen(false);
                                        }}
                                        className={`h-10 rounded-xl text-[14px] font-extrabold transition-colors disabled:opacity-30 ${on ? 'bg-mint text-on-mint' : 'bg-canvas text-ink hover:bg-segment'}`}
                                    >
                                        {m}
                                    </button>
                                );
                            })}
                        </div>
                        {maxY - minY > 1 ? (
                            <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-line pt-2.5">
                                {[1, 2, 5, 10, 20, 30]
                                    .map((n) => Number(min.slice(0, 4)) + n)
                                    .filter((y) => y <= maxY)
                                    .map((y) => (
                                        <button key={y} type="button" onClick={() => setYear(y)} className={`h-8 rounded-lg px-2.5 text-[12.5px] font-bold ${year === y ? 'bg-tint text-teal' : 'text-slate hover:bg-canvas'}`}>
                                            {y}
                                        </button>
                                    ))}
                            </div>
                        ) : null}
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}
