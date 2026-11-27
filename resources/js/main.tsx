import { createInertiaApp, router } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import type { ComponentType } from 'react';

import type { Shared } from '@/types';
import { setHomeCurrency } from '@/shared/currency';
import { registerWorker } from '@/lib/install';

// Installable as a desktop app: a worker that caches nothing (public/sw.js).
registerWorker();

// Version 2 pages (design/dashboard-v2.md). Each page lives in ./pages and sets its own layout,
// so the menu and top bar stay mounted while pages swap.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pages = import.meta.glob<{ default: ComponentType<any> }>('./pages/**/*.tsx', { eager: true });

// Menu links prefetch their page on hover and keep it for a while. Any change (switching budget,
// saving, deleting) makes those copies out of date, so they are thrown away once it is done:
// otherwise the next page could show the old budget or the old figures.
router.on('finish', (event) => {
    if (event.detail.visit.method !== 'get') router.flushAll();
});

// Every amount is in the budget's currency (design/currencies.md). A page builds its amounts while
// it renders, before its layout (Shell) does, so each page is wrapped to set the currency first.
// One wrapper per page, kept, so a page isn't remounted on every visit; its layout carries over.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wrapped = new Map<string, { default: ComponentType<any> }>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withCurrency(name: string, Page: ComponentType<any> & { layout?: unknown }) {
    let found = wrapped.get(name);
    if (!found) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Wrapped = (props: any) => {
            const shared = props as Partial<Shared>;
            setHomeCurrency(shared.budgets?.find((b) => b.id === shared.budgetId)?.currency);
            return <Page {...props} />;
        };
        Object.assign(Wrapped, { layout: Page.layout, displayName: `WithCurrency(${name})` });
        found = { default: Wrapped };
        wrapped.set(name, found);
    }
    return found;
}

createInertiaApp({
    title: (title) => (title ? `${title} · PocFin` : 'PocFin'),
    resolve: (name) => {
        const page = pages[`./pages/${name}.tsx`];
        if (!page) throw new Error(`No page called ${name}`);
        return withCurrency(name, page.default);
    },
    setup({ el, App, props }) {
        if (el) createRoot(el).render(<App {...props} />);
    },
    progress: { color: '#03C7AA', delay: 300, showSpinner: false },
});
