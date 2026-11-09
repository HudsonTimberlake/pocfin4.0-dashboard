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
