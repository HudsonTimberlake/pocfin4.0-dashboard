import { createContext, useContext } from 'react';

export type AddTab = 'spent' | 'income' | 'move' | 'refund';
export type AddOpen = { tab?: AddTab; envelopeId?: number; toEnvelopeId?: number; fromAccountId?: number; amount?: string };
export type Toast = { text: string; undo?: () => void; ms?: number };

/** What the Shell offers every page: the Add panel and the one toast at the bottom. */
export const AppContext = createContext<{ openAdd: (o?: AddOpen) => void; toast: (t: Toast) => void }>({
    openAdd: () => {},
    toast: () => {},
});

export const useApp = () => useContext(AppContext);
