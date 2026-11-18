/**
 * Small JSON calls to the dashboard's own server (never the API), for writes that shouldn't
 * reload the page. A 422 comes back as { field: message }; anything else as { form: … }.
 */
export class Refused extends Error {
    constructor(public errors: Record<string, string>) {
        super(Object.values(errors)[0] ?? 'That didn’t work.');
    }
}

export async function send<T = unknown>(csrf: string, method: string, url: string, body?: Record<string, unknown> | FormData, keepalive = false): Promise<T> {
    const form = body instanceof FormData;
    const r = await fetch(url, {
        method,
        keepalive,
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': csrf,
            ...(body && !form ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? (form ? body : JSON.stringify(body)) : undefined,
    });
    if (r.status === 204) return undefined as T;
    const json = await r.json().catch(() => ({}));
    if (r.ok) return json as T;
    if (r.status === 422 && json.errors) {
        throw new Refused(Object.fromEntries(Object.entries(json.errors as Record<string, string[]>).map(([k, v]) => [k, v[0]])));
    }
    if (r.status === 419) throw new Refused({ form: 'This page has been open a while. Reload it and try again.' });
    throw new Refused({ form: json.message && r.status < 500 ? json.message : 'That didn’t work. Check your connection and try again.' });
}
