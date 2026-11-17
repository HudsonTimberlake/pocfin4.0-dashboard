import { envelopeIcon } from '@/shared/envelopeIcons';

/** An envelope's icon in its circle: ink on white normally, red when overspent (the app's style). */
export default function EnvelopeIcon({ name, icon, over = false, size = 36, bg }: { name: string; icon?: string | null; over?: boolean; size?: number; bg?: string }) {
    const Glyph = envelopeIcon(name, icon);
    return (
        <span className={`grid flex-none place-items-center rounded-full ${over ? 'bg-red-tint text-red' : `${bg ?? 'bg-card'} text-ink`}`} style={{ width: size, height: size }}>
            <Glyph size={Math.round(size * 0.5)} weight="regular" />
        </span>
    );
}
