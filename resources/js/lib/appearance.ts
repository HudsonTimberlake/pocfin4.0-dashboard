import type { Appearance } from '@/types';

const media = () => window.matchMedia('(prefers-color-scheme: dark)');

function resolve(a: Appearance): 'light' | 'dark' {
    return a === 'system' ? (media().matches ? 'dark' : 'light') : a;
}

/** Applies a theme with a short cross-fade instead of a flash (W5 · 7). */
function apply(theme: 'light' | 'dark') {
    const html = document.documentElement;
    if (html.dataset.theme === theme) return;
    html.classList.add('theme-fading');
    html.dataset.theme = theme;
    window.setTimeout(() => html.classList.remove('theme-fading'), 300);
}

/** Saves this browser's choice (a plain cookie, a year) and applies it. */
export function setAppearance(a: Appearance) {
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `appearance=${a}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
    document.documentElement.dataset.appearance = a;
    apply(resolve(a));
}

/** With System chosen, follows the computer when it changes (at sunset, say). Returns a clean-up. */
export function followSystem(): () => void {
    const m = media();
    const onChange = () => {
        if (document.documentElement.dataset.appearance === 'system') apply(m.matches ? 'dark' : 'light');
    };
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
}
