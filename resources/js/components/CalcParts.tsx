import { useId, useState, type ReactNode } from 'react';
import { fieldNumber, randsShort } from '@/shared/calculators';

export type Unit = 'R' | '%' | 'years' | 'months' | 'age';

/** 1234567 → "1,234,567"; other units as typed (a % keeps its decimals). */
function show(unit: Unit, n: number): string {
    if (unit === 'R') return Math.round(n).toLocaleString('en-ZA').replace(/\s/g, ',');
    return String(Math.round(n * 100) / 100);
}

/**
 * A number you can type or drag (W16). Typing has no upper limit and the slider stretches to
 * whatever was typed, so a quick drag is still possible afterwards.
 */
export function NumField({ label, value, onChange, unit, min = 0, max, step = 1, hint, narrow = false }: { label: string; value: number; onChange: (n: number) => void; unit: Unit; min?: number; max: number; step?: number; hint?: ReactNode; narrow?: boolean }) {
    const id = useId();
    const [typed, setTyped] = useState<string | null>(null);
    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-[13.5px] font-bold text-slate">
                {label}
            </label>
            <div className="flex items-center gap-3">
                <div className={`flex h-11 flex-none items-center gap-1 rounded-xl border border-line bg-canvas px-3 focus-within:border-mint ${narrow ? 'w-[96px]' : 'w-[148px]'}`}>
                    {unit === 'R' ? <span className="text-[15px] font-bold text-slate">R</span> : null}
                    <input
                        id={id}
                        inputMode="decimal"
                        value={typed ?? show(unit, value)}
                        onChange={(e) => {
                            setTyped(e.target.value);
                            onChange(fieldNumber(e.target.value));
                        }}
                        onBlur={() => setTyped(null)}
                        className="num min-w-0 flex-1 bg-transparent text-[15px] font-extrabold text-ink outline-none"
                    />
                    {unit !== 'R' ? <span className="text-[13px] font-bold text-slate">{unit === '%' ? '%' : unit === 'age' ? '' : unit}</span> : null}
                </div>
                <input
                    type="range"
                    aria-label={`${label}, slider`}
                    min={min}
                    max={Math.max(max, value)}
                    step={step}
                    value={Math.min(Math.max(value, min), Math.max(max, value))}
                    onChange={(e) => {
                        setTyped(null);
                        onChange(Number(e.target.value));
                    }}
                    className="h-6 min-w-0 flex-1 accent-mint"
                />
            </div>
            {hint ? <div className="text-[12.5px] text-slate">{hint}</div> : null}
        </div>
    );
}

/** A small switch between a few choices (the % / rand raise, the three ways to use Saving and growth). */
export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: [T, string][]; label: string }) {
    return (
        <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-xl bg-segment p-1">
            {options.map(([k, text]) => (
                <button key={k} type="button" role="radio" aria-checked={value === k} onClick={() => onChange(k)} className={`h-8 flex-1 rounded-lg px-2 text-[13px] font-bold transition-colors ${value === k ? 'bg-card text-ink shadow-sm' : 'text-slate'}`}>
                    {text}
                </button>
            ))}
        </div>
    );
}

export type Line = { points: number[]; tone: 'navy' | 'mint' | 'soft'; dashed?: boolean };

/**
 * The answer's chart: one or two lines over the years, an optional shaded band (normal ups and
 * downs) and a dashed amber line for what you're aiming for. Drawn in the page's own colours.
 */
export function CalcChart({ lines, band, target, targetLabel, xStart, xEnd, aria, legend }: { lines: Line[]; band?: { low: number[]; high: number[] }; target?: number; targetLabel?: string; xStart: string; xEnd: string; aria: string; legend: { text: string; swatch: 'navy' | 'mint' | 'band' | 'amber' }[] }) {
    const W = 560;
    const H = 190;
    const L = 8;
    const R = 8;
    const T = 14;
    const B = 22;
    const all = [...lines.flatMap((l) => l.points), ...(band?.high ?? []), target ?? 0];
    const top = Math.max(1, ...all) * 1.05;
    const n = Math.max(1, ...lines.map((l) => l.points.length - 1), band ? band.high.length - 1 : 0);
    const x = (i: number, len: number) => L + (i / Math.max(1, len - 1)) * (W - L - R);
    const y = (v: number) => T + (1 - Math.min(1, Math.max(0, v) / top)) * (H - T - B);
    const path = (pts: number[]) => pts.map((v, i) => `${i ? 'L' : 'M'}${x(i, pts.length).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const bandPath = band ? `${path(band.high)} ${band.low.map((v, i) => `L${x(band.low.length - 1 - i, band.low.length).toFixed(1)},${y(band.low[band.low.length - 1 - i]).toFixed(1)}`).join(' ')} Z` : '';
    const stroke = { navy: 'var(--navy-line)', mint: 'var(--mint)', soft: 'var(--chart-soft)' } as const;
    const swatch = { navy: 'bg-navy-line', mint: 'bg-mint', band: 'bg-chart-grey', amber: 'bg-amber' } as const;
    void n;
    return (
        <div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={aria}>
                <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="var(--line-strong)" />
                <text x={L} y={T - 3} fontSize={11} fontWeight={700} fill="var(--slate)">
                    {randsShort(top)}
                </text>
                {band ? <path d={bandPath} fill="var(--chart-grey)" opacity={0.45} /> : null}
                {target && target > 0 ? (
                    <g>
                        <line x1={L} x2={W - R} y1={y(target)} y2={y(target)} stroke="var(--amber)" strokeWidth={1.6} strokeDasharray="6 5" />
                        {targetLabel ? (
                            <text x={W - R} y={y(target) - 5} textAnchor="end" fontSize={11} fontWeight={700} fill="var(--amber)">
                                {targetLabel}
                            </text>
                        ) : null}
                    </g>
                ) : null}
                {lines.map((l, i) => (
                    <path key={i} d={path(l.points)} fill="none" stroke={stroke[l.tone]} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={l.dashed ? '2 5' : undefined} />
                ))}
                <text x={L} y={H - 6} fontSize={11} fontWeight={700} fill="var(--slate)">
                    {xStart}
                </text>
                <text x={W - R} y={H - 6} textAnchor="end" fontSize={11} fontWeight={700} fill="var(--slate)">
                    {xEnd}
                </text>
            </svg>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-slate">
                {legend.map((l) => (
                    <span key={l.text} className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-4 rounded-full ${swatch[l.swatch]}`} />
                        {l.text}
                    </span>
                ))}
            </div>
        </div>
    );
}

/** One plain line of the answer: what it is, then the figure. */
export function Fact({ k, v, tone = 'ink' }: { k: string; v: string; tone?: 'ink' | 'teal' | 'amber' }) {
    return (
        <div className="flex items-baseline justify-between gap-4 border-t border-rule py-2.5 first:border-t-0">
            <span className="text-[14px] text-slate">{k}</span>
            <span className={`num text-right text-[15px] font-extrabold ${tone === 'teal' ? 'text-teal' : tone === 'amber' ? 'text-amber' : 'text-ink'}`}>{v}</span>
        </div>
    );
}

/** A bar split into parts, each with its figure underneath. */
export function SplitBar({ parts }: { parts: { label: string; value: number; tone: 'navy' | 'mint' | 'soft' | 'amber' }[] }) {
    const total = parts.reduce((s, p) => s + Math.max(0, p.value), 0) || 1;
    const fill = { navy: 'bg-navy-line', mint: 'bg-mint', soft: 'bg-chart-soft', amber: 'bg-amber' } as const;
    return (
        <div>
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-segment" role="img" aria-label={parts.map((p) => `${p.label} ${randsShort(p.value)}`).join(', ')}>
                {parts.map((p) => (
                    <div key={p.label} className={`${fill[p.tone]} transition-[width] duration-300`} style={{ width: `${(Math.max(0, p.value) / total) * 100}%` }} />
                ))}
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[13px] font-bold text-slate">
                {parts.map((p) => (
                    <span key={p.label} className="flex items-center gap-1.5">
                        <span className={`size-2 rounded-full ${fill[p.tone]}`} />
                        {p.label} <span className="num text-ink">{randsShort(p.value)}</span>
                    </span>
                ))}
            </div>
        </div>
    );
}
