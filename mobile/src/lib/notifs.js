import { useSyncExternalStore } from 'react';

// Unread notifications count, shared by the Friends bell and the notifications screen
let unread = 0;
const subs = new Set();
export const setUnreadNotifs = (n) => { if (n === unread) return; unread = n; subs.forEach((f) => f()); };
export const useUnreadNotifs = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => unread, () => unread);
