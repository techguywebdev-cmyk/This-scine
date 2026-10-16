import { useSyncExternalStore } from 'react';
import { getUserTheme, subscribeTheme } from './userTheme';

// The colour of the film you're on in the feed — carried through every screen like the web's ambient gradient.
// If they chose their own colour (Appearance), that wins everywhere.
let current = '#F5A623';
const subs = new Set();
subscribeTheme(() => subs.forEach((f) => f()));
const resolved = () => { const t = getUserTheme(); return t.mode === 'fixed' && t.color ? t.color : current; };
export const setAccent = (c) => { if (!c || c === current) return; current = c; subs.forEach((f) => f()); };
export const getAccent = () => resolved();
export const useAccent = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, resolved, resolved);
