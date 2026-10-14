import { useSyncExternalStore } from 'react';

// The colour of the film you're on in the feed — carried through every screen like the web's ambient gradient
let current = '#F5A623';
const subs = new Set();
export const setAccent = (c) => { if (!c || c === current) return; current = c; subs.forEach((f) => f()); };
export const getAccent = () => current;
export const useAccent = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => current, () => current);
