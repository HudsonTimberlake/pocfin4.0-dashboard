/** True on a Mac (or iPad/iPhone with a keyboard): shortcuts there use ⌘, everywhere else Ctrl. */
export function isMac(): boolean {
    if (typeof navigator === 'undefined') return false;
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    const platform = nav.userAgentData?.platform || navigator.platform || navigator.userAgent;
    return /mac|iphone|ipad|ipod/i.test(platform);
}

/** The label for the shortcut key: "⌘" on a Mac, "Ctrl" on Windows and Linux. */
export const MOD = isMac() ? '⌘' : 'Ctrl';
