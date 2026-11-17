// Line icons in the app's Phosphor-like style (design system: one stroke weight, round ends).
const PATHS = {
    overview: 'M4 11l8-7 8 7v9H4zM10 20v-5h4v5',
    budget: 'M3 6h18v12H3zM3 7l9 6 9-6',
    history: 'M8 6h12M8 12h12M8 18h12M4 6v.1M4 12v.1M4 18v.1',
    accounts: 'M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18',
    goals: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 7.5a4.5 4.5 0 1 0 0 9a4.5 4.5 0 1 0 0-9M12 11.2a.8.8 0 1 0 0 1.6a.8.8 0 1 0 0-1.6',
    analytics: 'M4 20V11M10 20V4M16 20v-7M21 20H3',
    recaps: 'M12 3.5l1.9 5.6 5.6 1.9-5.6 1.9L12 18.5l-1.9-5.6L4.5 11l5.6-1.9z',
    calculators: 'M6 3h12v18H6zM9 7h6M9 12h.1M12 12h.1M15 12h.1M9 16h.1M12 16h.1M15 16h.1',
    automatic: 'M20 12a8 8 0 0 1-14 5.3M4 12a8 8 0 0 1 14-5.3M18 3v4h-4M6 21v-4h4',
    notes: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5',
    members: 'M9 11a3.5 3.5 0 1 0 0-7a3.5 3.5 0 1 0 0 7M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5M16 4.5a3.5 3.5 0 0 1 0 6.5M18 15c2 .6 3.2 2.3 3.8 5',
    settings: 'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1',
    profile: 'M12 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5',
    premium: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
    invite: 'M4 10h16v10H4zM3 7h18v3H3zM12 7v13',
    users: 'M9 11a3.5 3.5 0 1 0 0-7a3.5 3.5 0 1 0 0 7M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5M16 4.5a3.5 3.5 0 0 1 0 6.5M18 15c2 .6 3.2 2.3 3.8 5',
    support: 'M4 5h16v11H9l-5 4z',
    log: 'M8 4h8v3H8zM6 5.5H5v15h14v-15h-1M9 12h6M9 16h4',
    lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
    signOut: 'M10 4H5v16h5M15 8l4 4-4 4M19 12H9',
    chevrons: 'M7 10l5-5 5 5M7 14l5 5 5-5',
    menu: 'M4 7h16M4 12h16M4 17h10',
    close: 'M6 6l12 12M18 6L6 18',
    system: 'M3 5h18v11H3zM8 20h8M12 16v4',
    light: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
    dark: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
    allocate: 'M4 12h10M10 6l6 6-6 6M20 5v14',
    warning: 'M12 4l9 16H3zM12 10v4.5M12 17.5v.1',
    flame: 'M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-7 2 1 3 3 3 5',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    chevronRight: 'M9 6l6 6-6 6',
    plus: 'M12 5v14M5 12h14',
    pen: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
    move: 'M7 7h12l-3-3M17 17H5l3 3',
    refund: 'M9 14l-4-4 4-4M5 10h9a5 5 0 0 1 0 10h-3',
    grip: 'M9 6v.1M15 6v.1M9 12v.1M15 12v.1M9 18v.1M15 18v.1',
    search: 'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14M16.5 16.5L21 21',
    archive: 'M3 5h18v4H3zM5 9v11h14V9M10 13h4',
    receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3',
    calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
    download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
    trash: 'M4 7h16M10 7V4h4v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
} as const;

export type IconName = keyof typeof PATHS;

export default function Icon({ name, size = 20, stroke = 1.9, className }: { name: IconName; size?: number; stroke?: number; className?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
            <path d={PATHS[name]} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
