import { useMemo, useState } from 'react';
import Icon from '@/components/Icon';
import { ENVELOPE_ICONS, ICON_GROUPS, type EnvelopeIconKey } from '@/shared/envelopeIcons';

/**
 * The app's envelope icons (B5): every group, with a search box, and "From the name" to go back to
 * the icon the name suggests (null). Picks straight away; the panel's Save sends it.
 */
export default function IconPicker({ value, suggested, onPick }: { value: string | null; suggested: EnvelopeIconKey; onPick: (key: string | null) => void }) {
    const [q, setQ] = useState('');
    const groups = useMemo(() => {
        const words = q.trim().toLowerCase();
        if (!words) return ICON_GROUPS;
        const keys = (Object.keys(ENVELOPE_ICONS) as EnvelopeIconKey[]).filter((k) => k.includes(words) || ENVELOPE_ICONS[k].label.toLowerCase().includes(words));
        return [{ title: 'Found', keys }];
    }, [q]);
    const Suggested = ENVELOPE_ICONS[suggested].Icon;

    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-3">
            <label className="flex h-10 items-center gap-2 rounded-xl bg-canvas px-3 text-slate">
                <Icon name="search" size={16} stroke={2} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search icons" aria-label="Search icons" className="min-w-0 flex-1 bg-transparent text-[14.5px] font-semibold text-ink outline-none placeholder:text-muted" />
            </label>
            <button
                type="button"
                onClick={() => onPick(null)}
                aria-pressed={value === null}
                className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[14px] font-bold ${value === null ? 'bg-tint text-teal' : 'hover:bg-canvas'}`}
            >
                <Suggested size={20} />
                From the name
            </button>
            <div className="flex max-h-[280px] flex-col gap-3 overflow-y-auto pr-1">
                {groups.map((g) => (
                    <div key={g.title}>
                        <div className="mb-1.5 text-[12.5px] font-bold text-slate">{g.title}</div>
                        {g.keys.length === 0 ? <p className="text-[13.5px] text-slate">No icon matches that.</p> : null}
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-1.5">
                            {g.keys.map((k) => {
                                const G = ENVELOPE_ICONS[k].Icon;
                                const on = value === k;
                                return (
                                    <button
                                        key={k}
                                        type="button"
                                        title={ENVELOPE_ICONS[k].label}
                                        aria-label={ENVELOPE_ICONS[k].label}
                                        aria-pressed={on}
                                        onClick={() => onPick(k)}
                                        className={`grid aspect-square place-items-center rounded-xl transition-colors ${on ? 'bg-tint text-teal ring-2 ring-mint ring-inset' : 'text-ink hover:bg-canvas'}`}
                                    >
                                        <G size={20} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
