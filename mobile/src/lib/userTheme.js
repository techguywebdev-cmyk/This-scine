import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// "Make it yours": follow each film's colour (default) or one colour everywhere.
// Kept on the phone for an instant start and on the account so the website matches.
export const PALETTE = [
  ['Indigo', '#818CF8'], ['Teal', '#2DD4BF'], ['Rose', '#FF6B8A'], ['Lime', '#A3E635'],
  ['Violet', '#B07FEF'], ['Sky', '#38BDF8'], ['Ember', '#FF7A2F'], ['Gold', '#F5A623'],
  ['Emerald', '#34D399'], ['Crimson', '#F43F5E'], ['Orchid', '#F0ABFC'], ['Azure', '#7C9CFF'],
  ['Mint', '#86EFAC'], ['Sand', '#E8C84A'], ['Coral', '#FDBA74'], ['Noir', '#E6E6EA'],
];
const KEY = 'thiscene.theme.v1';
let theme = { mode: 'film' };
const subs = new Set();
const emit = () => subs.forEach((f) => f());
const clean = (t) => {
  const color = /^#[0-9a-fA-F]{6}$/.test(t?.color || '') ? t.color.toUpperCase() : null;
  return t?.mode === 'fixed' && color ? { mode: 'fixed', color } : { mode: 'film', ...(color ? { color } : {}) };
};

AsyncStorage.getItem(KEY).then((v) => { if (v) { try { theme = clean(JSON.parse(v)); emit(); } catch {} } }).catch(() => {});

export const getUserTheme = () => theme;
export const subscribeTheme = (f) => { subs.add(f); return () => subs.delete(f); };
export function setUserTheme(t, api) {
  theme = clean(t);
  AsyncStorage.setItem(KEY, JSON.stringify(theme)).catch(() => {});
  emit();
  if (api) api.patch('/api/settings', { theme }).catch(() => {});
}
export const useUserTheme = () => useSyncExternalStore(subscribeTheme, () => theme, () => theme);
// The colour to use: their own when they picked one, otherwise the film's
export const themed = (c) => (theme.mode === 'fixed' && theme.color ? theme.color : c);
export const useThemed = (c) => { const t = useUserTheme(); return t.mode === 'fixed' && t.color ? t.color : c; };
