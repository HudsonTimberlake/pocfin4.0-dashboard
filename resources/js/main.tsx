import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import type { ComponentType } from 'react';

// Version 2 pages (design/dashboard-v2.md). Each page lives in ./pages and sets its own layout,
// so the menu and top bar stay mounted while pages swap.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pages = import.meta.glob<{ default: ComponentType<any> }>('./pages/**/*.tsx', { eager: true });

createInertiaApp({
    title: (title) => (title ? `${title} · PocFin` : 'PocFin'),
    resolve: (name) => {
        const page = pages[`./pages/${name}.tsx`];
        if (!page) throw new Error(`No page called ${name}`);
        return page;
    },
    setup({ el, App, props }) {
        if (el) createRoot(el).render(<App {...props} />);
    },
    progress: { color: '#03C7AA', delay: 300, showSpinner: false },
});
