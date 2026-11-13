import Alpine from '@alpinejs/csp';

// Alpine's CSP build: no eval, so every component lives here, not in the markup.
Alpine.data('toggle', () => ({
    open: false,
    flip() { this.open = ! this.open; },
    shut() { this.open = false; },
}));

// D8 grant panel: which action is picked.
Alpine.data('grant', () => ({
    action: 'months',
    pick(event) { this.action = event.target.value; },
    get isMonths() { return this.action === 'months'; },
    get isUntil() { return this.action === 'until'; },
}));

window.Alpine = Alpine;
Alpine.start();

// The sign-in form tells the API the visitor's time zone, which decides "today".
document.querySelectorAll('input[name="timezone"]').forEach((input) => {
    input.value = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
});

document.querySelectorAll('[data-print]').forEach((button) => button.addEventListener('click', () => window.print()));

document.querySelectorAll('[data-copy]').forEach((button) => button.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(button.dataset.copy);
        const label = button.querySelector('[data-label]') ?? button;
        const before = label.textContent;
        label.textContent = 'Copied';
        setTimeout(() => { label.textContent = before; }, 1600);
    } catch {
        // Clipboard blocked: the text is on the page to copy by hand.
    }
}));

document.querySelectorAll('[data-reveal]').forEach((button) => button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.reveal);
    input.type = input.type === 'password' ? 'text' : 'password';
    button.setAttribute('aria-pressed', String(input.type === 'text'));
}));

// The idle lock: after the page's minutes without use, lock it (the server checks again on the next request).
const lockForm = document.getElementById('lock-form');

if (lockForm) {
    const minutes = Number(document.body.dataset.idleMinutes || 15);
    let timer;
    const reset = () => {
        clearTimeout(timer);
        timer = setTimeout(() => lockForm.submit(), minutes * 60 * 1000);
    };
    ['mousemove', 'keydown', 'pointerdown', 'scroll', 'touchstart'].forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
}

// While the next page is on its way: a thin progress bar, the page dimmed and a repeat click on the
// same link or form ignored, so people don't click again and again. Cleared when the page shows
// again (back button) and after 20 seconds in case the answer was a download that stays on this page.
const bar = document.createElement('div');
bar.id = 'nav-progress';
bar.setAttribute('aria-hidden', 'true');
document.body.append(bar);

let pending = null;
let clearTimer;

const startLoading = (key) => {
    pending = key;
    document.body.classList.add('is-loading');
    document.getElementById('main')?.setAttribute('aria-busy', 'true');
    clearTimeout(clearTimer);
    clearTimer = setTimeout(stopLoading, 20000);
};

function stopLoading() {
    pending = null;
    document.body.classList.remove('is-loading');
    document.getElementById('main')?.removeAttribute('aria-busy');
}

window.addEventListener('pageshow', stopLoading);

document.addEventListener('click', (event) => {
    const link = event.target.closest?.('a[href]');

    if (! link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.target === '_blank' || link.hasAttribute('download') || link.dataset.noLoading !== undefined) return;

    const url = new URL(link.href, location.href);

    if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search && url.hash)) return;

    if (pending === url.href) {
        event.preventDefault();

        return;
    }

    startLoading(url.href);
});

document.addEventListener('submit', (event) => {
    const form = event.target;

    if (event.defaultPrevented || form.target === '_blank' || form.dataset.noLoading !== undefined) return;

    const key = `${form.method}:${form.action}`;

    if (pending === key) {
        event.preventDefault();

        return;
    }

    startLoading(key);
});
