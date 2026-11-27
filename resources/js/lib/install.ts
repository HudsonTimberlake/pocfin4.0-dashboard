import { useEffect, useState } from 'react';

// "Install PocFin on this computer": the dashboard as a desktop app (a PWA) in its own window.
// The service worker (public/sw.js) caches nothing; it only meets the browsers' install rules.

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

/** How this browser installs: its own prompt, steps in a menu, or not at all. */
export type InstallWay = 'prompt' | 'chrome' | 'edge' | 'safari' | 'firefox' | 'other';

let deferred: InstallPrompt | null = null;
let installed = false;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((l) => l());

export function registerWorker() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        // No worker: the dashboard works the same, it just can't be installed from a prompt.
    });
}

if (typeof window !== 'undefined') {
    // Chrome and Edge fire this once, often before the menu exists, so it is kept here.
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferred = e as InstallPrompt;
        changed();
    });
    window.addEventListener('appinstalled', () => {
        deferred = null;
        installed = true;
        changed();
    });
}

/** Already open as the installed app (its own window), so there is nothing to install. */
export function runningInstalled() {
    return installed || window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Phones have the real PocFin app, so the option is for computers (and tablets) only. */
function onPhone() {
    return /iPhone|iPod|Android.+Mobile/i.test(navigator.userAgent);
}

function way(): InstallWay {
    if (deferred) return 'prompt';
    const ua = navigator.userAgent;
    if (/Edg\//.test(ua)) return 'edge';
    if (/Firefox\//.test(ua)) return 'firefox';
    if (/Chrome\//.test(ua)) return 'chrome';
    if (/Macintosh/.test(ua) && /Safari\//.test(ua)) return 'safari';
    return 'other';
}

export async function promptInstall(): Promise<boolean> {
    if (!deferred) return false;
    const e = deferred;
    deferred = null;
    await e.prompt();
    const { outcome } = await e.userChoice;
    changed();
    return outcome === 'accepted';
}

/** null when the option should be hidden; otherwise how this browser installs. */
export function useInstall(): InstallWay | null {
    const [, tick] = useState(0);
    useEffect(() => {
        const l = () => tick((n) => n + 1);
        listeners.add(l);
        const mq = window.matchMedia('(display-mode: standalone)');
        mq.addEventListener('change', l);
        return () => {
            listeners.delete(l);
            mq.removeEventListener('change', l);
        };
    }, []);
    if (typeof window === 'undefined' || runningInstalled() || onPhone()) return null;
    return way();
}
