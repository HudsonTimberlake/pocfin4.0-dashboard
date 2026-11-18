import { Link, router, usePage } from '@inertiajs/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import AddPanel from '@/components/AddPanel';
import Icon, { type IconName } from '@/components/Icon';
import { AppContext, type AddOpen, type Toast } from '@/lib/app';
import { followSystem, setAppearance } from '@/lib/appearance';
import { ARRIVE } from '@/lib/motion';
import type { Appearance, Shared } from '@/types';

type Item = { key: string; label: string; href: string; icon: IconName; spa?: boolean; badge?: number };

// Pages built in version 2 swap in place (spa); the rest are release 1 Blade pages for now and
// load in full. Pages not built yet stay out of the menu until they work.
const MONEY: Item[] = [
    { key: 'overview', label: 'Overview', href: '/', icon: 'overview', spa: true },
    { key: 'budget', label: 'Budget', href: '/budget', icon: 'budget', spa: true },
    { key: 'history', label: 'History', href: '/history', icon: 'history', spa: true },
    { key: 'accounts', label: 'Accounts', href: '/accounts', icon: 'accounts', spa: true },
    { key: 'goals', label: 'Goals', href: '/goals', icon: 'goals', spa: true },
    { key: 'automatic', label: 'Automatic', href: '/automatic', icon: 'automatic', spa: true },
    { key: 'analytics', label: 'Analytics', href: '/analytics', icon: 'analytics', spa: true },
    { key: 'calculators', label: 'Calculators', href: '/calculators', icon: 'calculators', spa: true },
    { key: 'recaps', label: 'Recaps', href: '/recaps', icon: 'recaps' },
];
const ACCOUNT: Item[] = [
    { key: 'account', label: 'Profile and security', href: '/account', icon: 'profile' },
    { key: 'premium', label: 'Premium', href: '/premium', icon: 'premium' },
    { key: 'invite', label: 'Invite friends', href: '/invite', icon: 'invite' },
];
const ADMIN: Item[] = [
    { key: 'users', label: 'Users', href: '/admin/users', icon: 'users' },
    { key: 'support', label: 'Support', href: '/admin/support', icon: 'support' },
    { key: 'log', label: 'Admin log', href: '/admin/log', icon: 'log' },
];

function NavLink({ item, active, onGo }: { item: Item; active: boolean; onGo?: () => void }) {
    const cls = `flex h-10 items-center gap-3 rounded-xl px-3 text-[15px] font-bold transition-colors ${active ? 'bg-card text-ink' : 'text-ink hover:bg-card/60'}`;
    const inner = (
        <>
            <span className={active ? 'text-teal' : 'text-slate'}>
                <Icon name={item.icon} />
            </span>
            <span className="flex-1">{item.label}</span>
            {item.badge ? <span className="rounded-[10px] bg-mint px-2 text-xs font-extrabold text-on-mint">{item.badge}</span> : null}
        </>
    );
    return item.spa ? (
        <Link href={item.href} className={cls} aria-current={active ? 'page' : undefined} onClick={onGo} prefetch>
            {inner}
        </Link>
    ) : (
        <a href={item.href} className={cls} aria-current={active ? 'page' : undefined}>
            {inner}
        </a>
    );
}

function BudgetSwitcher() {
    const { budgets, budgetId } = usePage<Shared>().props;
    const [open, setOpen] = useState(false);
    const current = budgets.find((b) => b.id === budgetId) ?? budgets[0];
    if (!current) return null;
    const many = budgets.length > 1;
    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => many && setOpen(!open)}
                aria-expanded={many ? open : undefined}
                aria-label={many ? `Switch budget: ${current.name}` : current.name}
                className="flex w-full items-center gap-2.5 rounded-2xl bg-card px-3 py-2.5 text-left"
            >
                <span className="grid size-9 flex-none place-items-center rounded-xl bg-tint text-[15px] font-extrabold text-teal">{current.initials}</span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold">{current.name}</span>
                    <span className="block text-[12.5px] text-slate">{current.premium ? 'Premium' : 'Free'}</span>
                </span>
                {many ? (
                    <span className="text-slate">
                        <Icon name="chevrons" size={16} stroke={2.2} />
                    </span>
                ) : null}
            </button>
            <AnimatePresence>
                {open ? (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
                        transition={{ duration: 0.18, ease: ARRIVE }}
                        className="absolute inset-x-0 top-full z-20 mt-1.5 rounded-2xl border border-line bg-card p-1.5"
                        role="menu"
                    >
                        {budgets.map((b) => (
                            <button
                                key={b.id}
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    setOpen(false);
                                    if (b.id !== budgetId) router.post('/budget/switch', { budget_id: b.id });
                                }}
                                className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-canvas ${b.id === budgetId ? 'bg-canvas' : ''}`}
                            >
                                <span className="grid size-8 place-items-center rounded-[10px] bg-tint text-[13px] font-extrabold text-teal">{b.initials}</span>
                                <span className="flex-1 truncate text-[14.5px] font-bold">{b.name}</span>
                                {b.paused ? <span className="text-xs font-bold text-slate">Paused</span> : null}
                            </button>
                        ))}
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}

function AccountMenu() {
    const { me, csrf } = usePage<Shared>().props;
    const [open, setOpen] = useState(false);
    return (
        <div className="relative border-t border-line pt-3.5">
            <AnimatePresence>
                {open ? (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4, transition: { duration: 0.12 } }}
                        transition={{ duration: 0.18, ease: ARRIVE }}
                        className="absolute inset-x-0 bottom-full z-20 mb-1.5 rounded-2xl border border-line bg-card p-1.5"
                    >
                        {ACCOUNT.map((item) => (
                            <a key={item.key} href={item.href} className="flex h-10 items-center gap-3 rounded-xl px-3 text-[14.5px] font-bold hover:bg-canvas">
                                <span className="text-slate">
                                    <Icon name={item.icon} size={18} />
                                </span>
                                {item.label}
                            </a>
                        ))}
                        <form method="POST" action="/lock-now">
                            <input type="hidden" name="_token" value={csrf} />
                            <button type="submit" className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[14.5px] font-bold text-teal hover:bg-canvas">
                                <Icon name="lock" size={18} />
                                Lock now
                            </button>
                        </form>
                        <form method="POST" action="/sign-out">
                            <input type="hidden" name="_token" value={csrf} />
                            <button type="submit" className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[14.5px] font-bold text-teal hover:bg-canvas">
                                <Icon name="signOut" size={18} />
                                Sign out
                            </button>
                        </form>
                    </motion.div>
                ) : null}
            </AnimatePresence>
            <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Your account: profile, Premium, invite friends, lock, sign out" className="flex w-full items-center gap-2.5 rounded-2xl px-3 py-2 text-left hover:bg-card/60">
                <span className="grid size-[34px] flex-none place-items-center rounded-full bg-navy-tint text-[13px] font-extrabold text-navy-text">{(me?.name ?? '?').charAt(0)}</span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{me?.name}</span>
                    <span className="block text-[12.5px] text-slate">Account, Premium, help</span>
                </span>
                <span className="text-slate">
                    <Icon name="chevrons" size={16} stroke={2.2} />
                </span>
            </button>
        </div>
    );
}

function Nav({ active, onGo }: { active: string; onGo?: () => void }) {
    const { me } = usePage<Shared>().props;
    return (
        <nav aria-label="Main" className="flex min-h-full flex-col gap-4 px-3.5 py-5">
            <Link href="/" className="flex items-center gap-2.5 px-2" onClick={onGo}>
                <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
                    <rect width="34" height="34" rx="10" className="fill-card" />
                    <rect x=".75" y=".75" width="32.5" height="32.5" rx="9.25" fill="none" className="stroke-line" strokeWidth="1.5" />
                    <path d="M9 11h16v7.5a8 8 0 0 1-16 0z" fill="none" className="stroke-teal" strokeWidth="2.4" strokeLinejoin="round" />
                    <circle cx="17" cy="11.5" r="4" fill="#03C7AA" className="stroke-teal" strokeWidth="1.6" />
                </svg>
                <span className="text-xl font-extrabold tracking-[-0.02em]">PocFin</span>
            </Link>
            <BudgetSwitcher />
            <div className="flex flex-col gap-0.5">
                {MONEY.map((item) => (
                    <NavLink key={item.key} item={item} active={active === item.key} onGo={onGo} />
                ))}
            </div>
            {me?.isAdmin ? (
                <div className="flex flex-col gap-0.5">
                    <div className="px-3 pb-1.5 text-[13px] font-bold text-slate">Admin</div>
                    {ADMIN.map((item) => (
                        <NavLink key={item.key} item={item} active={active === item.key} />
                    ))}
                </div>
            ) : null}
            <div className="mt-auto">
                <AccountMenu />
            </div>
        </nav>
    );
}

export function AppearanceSwitch() {
    const { appearance } = usePage<Shared>().props;
    const [value, setValue] = useState<Appearance>(appearance);
    const options: { key: Appearance; label: string }[] = [
        { key: 'system', label: 'Use system setting' },
        { key: 'light', label: 'Light' },
        { key: 'dark', label: 'Dark' },
    ];
    return (
        <div role="radiogroup" aria-label="Appearance" className="flex gap-0.5 rounded-[13px] bg-segment p-[3px]">
            {options.map((o) => (
                <button
                    key={o.key}
                    type="button"
                    role="radio"
                    aria-checked={value === o.key}
                    aria-label={o.label}
                    title={o.label}
                    onClick={() => {
                        setValue(o.key);
                        setAppearance(o.key);
                    }}
                    className={`grid size-[38px] place-items-center rounded-[10px] transition-colors ${value === o.key ? 'bg-card text-ink' : 'text-slate hover:text-ink'}`}
                >
                    <Icon name={o.key} size={18} />
                </button>
            ))}
        </div>
    );
}

/** Locks the page after the idle time, like the app's App lock (the server checks again). */
function useIdleLock(minutes: number, form: React.RefObject<HTMLFormElement | null>) {
    useEffect(() => {
        let last = Date.now();
        const touch = () => (last = Date.now());
        const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
        events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
        const timer = window.setInterval(() => {
            if (Date.now() - last > minutes * 60_000) form.current?.submit();
        }, 15_000);
        return () => {
            events.forEach((e) => window.removeEventListener(e, touch));
            window.clearInterval(timer);
        };
    }, [minutes, form]);
}

/**
 * Every version 2 page sits in this: the side menu (a top bar and a full-height menu below 860 px)
 * and the top bar. Pages swap inside with a short fade and rise (W5 · 1); the menu never reloads.
 */
/** The one toast at the bottom: a message, and Undo when the action can still be taken back. */
function ToastView({ toast, onDone }: { toast: (Toast & { id: number }) | null; onDone: () => void }) {
    useEffect(() => {
        if (!toast) return;
        const t = window.setTimeout(onDone, toast.ms ?? 4000);
        return () => window.clearTimeout(t);
    }, [toast, onDone]);
    return (
        <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex justify-center px-4">
            <AnimatePresence>
                {toast ? (
                    <motion.div
                        key={toast.id}
                        role="status"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
                        transition={{ duration: 0.22, ease: ARRIVE }}
                        className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-toast py-2.5 pr-2.5 pl-[18px] text-[14.5px] font-bold text-white"
                    >
                        {toast.text}
                        {toast.undo ? (
                            <button
                                type="button"
                                onClick={() => {
                                    toast.undo?.();
                                    onDone();
                                }}
                                className="h-[34px] rounded-[10px] bg-mint px-3 text-sm font-extrabold text-[#1E1E1E]"
                            >
                                Undo
                            </button>
                        ) : null}
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}

function AddButton({ onClick }: { onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} className="flex h-11 items-center gap-2 rounded-[14px] bg-mint pr-2.5 pl-4 text-[15px] font-extrabold text-on-mint transition-transform active:scale-[0.97]">
            <Icon name="plus" size={18} stroke={2.4} />
            Add
            <kbd className="rounded-lg bg-white/35 px-2 py-0.5 font-sans text-xs font-extrabold">N</kbd>
        </button>
    );
}

/**
 * Every version 2 page sits in this: the side menu (a top bar and a full-height menu below 860 px)
 * and the top bar with Add. Pages swap inside with a short fade and rise (W5 · 1); the menu never
 * reloads. It also holds the Add panel and the toast, which any page opens through useApp().
 */
export default function Shell({ active, title, children }: { active: string; title: string; children: ReactNode }) {
    const { url, props } = usePage<Shared>();
    const reduced = useReducedMotion();
    const [menu, setMenu] = useState(false);
    const [add, setAdd] = useState<{ open: boolean; start: AddOpen }>({ open: false, start: {} });
    const [toast, setToast] = useState<(Toast & { id: number }) | null>(null);
    const lockForm = useRef<HTMLFormElement>(null);

    const openAdd = useCallback((o: AddOpen = {}) => setAdd({ open: true, start: o }), []);
    const showToast = useCallback((t: Toast) => setToast({ ...t, id: Date.now() }), []);
    const clearToast = useCallback(() => setToast(null), []);
    const app = useMemo(() => ({ openAdd, toast: showToast }), [openAdd, showToast]);

    useEffect(() => followSystem(), []);
    // A message the server flashed (for example "Saved, but the receipt didn't attach") shows as a toast.
    useEffect(() => {
        if (props.status) showToast({ text: props.status, ms: 7000 });
    }, [props.status, showToast]);
    useIdleLock(props.idleMinutes, lockForm);
    useEffect(() => {
        if (!menu) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [menu]);
    // N opens Add from anywhere, except while typing.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement;
            if (e.key.toLowerCase() !== 'n' || e.metaKey || e.ctrlKey || e.altKey || add.open || t?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
            e.preventDefault();
            openAdd();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [add.open, openAdd]);

    return (
        <AppContext.Provider value={app}>
            <div className="flex min-h-screen bg-canvas text-ink">
                <form ref={lockForm} method="POST" action="/lock-now" className="hidden">
                    <input type="hidden" name="_token" value={props.csrf} />
                </form>
                <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-xl focus:bg-card focus:px-4 focus:py-2 focus:font-bold">
                    Skip to content
                </a>
                <aside className="sticky top-0 hidden h-screen w-[248px] flex-none overflow-y-auto min-[860px]:block">
                    <Nav active={active} />
                </aside>

                <div className="min-w-0 flex-1">
                    <header className="sticky top-0 z-30 flex h-[60px] items-center gap-2 bg-glass px-3 backdrop-blur min-[860px]:hidden">
                        <button type="button" onClick={() => setMenu(true)} aria-label="Open menu" aria-expanded={menu} className="grid size-11 place-items-center rounded-[14px] bg-card">
                            <Icon name="menu" stroke={2.2} />
                        </button>
                        <span className="flex-1 truncate text-lg font-extrabold">{title}</span>
                        <button type="button" onClick={() => openAdd()} aria-label="Add" className="grid size-11 place-items-center rounded-[14px] bg-mint text-on-mint transition-transform active:scale-[0.97]">
                            <Icon name="plus" stroke={2.6} />
                        </button>
                    </header>

                    <AnimatePresence>
                        {menu ? (
                            <>
                                <motion.div className="fixed inset-0 z-40 bg-scrim min-[860px]:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenu(false)} />
                                <motion.div
                                    role="dialog"
                                    aria-modal="true"
                                    aria-label="Menu"
                                    className="fixed inset-y-0 left-0 z-50 w-[min(320px,88vw)] overflow-y-auto bg-canvas min-[860px]:hidden"
                                    initial={reduced ? { opacity: 0 } : { x: '-100%' }}
                                    animate={reduced ? { opacity: 1 } : { x: 0 }}
                                    exit={reduced ? { opacity: 0 } : { x: '-100%', transition: { duration: 0.2 } }}
                                    transition={{ duration: 0.28, ease: ARRIVE }}
                                >
                                    <button type="button" onClick={() => setMenu(false)} aria-label="Close menu" className="absolute top-5 right-3 z-10 grid size-10 place-items-center rounded-full bg-card">
                                        <Icon name="close" stroke={2.2} size={18} />
                                    </button>
                                    <Nav active={active} onGo={() => setMenu(false)} />
                                </motion.div>
                            </>
                        ) : null}
                    </AnimatePresence>

                    <div className="flex flex-col gap-5 px-4 pt-3 pb-16 min-[860px]:px-8 min-[860px]:pt-5">
                        <div role="toolbar" aria-label="Top bar" className="hidden flex-wrap items-center gap-2.5 min-[860px]:flex">
                            <div className="flex-1" />
                            <AppearanceSwitch />
                            <AddButton onClick={() => openAdd()} />
                        </div>
                        <motion.main
                            id="main"
                            key={url.split('?')[0]}
                            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, ease: ARRIVE }}
                        >
                            {children}
                        </motion.main>
                        <div className="min-[860px]:hidden">
                            <AppearanceSwitch />
                        </div>
                    </div>
                </div>
                <AddPanel open={add.open} start={add.start} onClose={() => setAdd((a) => ({ ...a, open: false }))} />
                <ToastView toast={toast} onDone={clearToast} />
            </div>
        </AppContext.Provider>
    );
}
