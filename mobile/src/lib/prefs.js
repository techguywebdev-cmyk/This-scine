import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// "Your feed": country + services, trailers & data, content filters.
// Kept on the phone for an instant start and on the account so the website matches.
export const DEFAULT_PREFS = { region: null, services: [], onlyMine: false, autoplay: true, startMuted: false, dataSaver: false, hideGenres: [], safe: false, kind: 'both' };
const KEY = 'thiscene.prefs.v1';
let prefs = { ...DEFAULT_PREFS };
let version = 0; // bumps when anything that changes the feed changes
const subs = new Set();
const emit = () => subs.forEach((f) => f());
const FEED_KEYS = ['region', 'services', 'onlyMine', 'hideGenres', 'safe', 'kind'];

AsyncStorage.getItem(KEY).then((v) => { if (v) { try { prefs = { ...DEFAULT_PREFS, ...JSON.parse(v) }; version++; emit(); } catch {} } }).catch(() => {});

export const getPrefs = () => prefs;
export const getPrefsVersion = () => version;
export const subscribePrefs = (f) => { subs.add(f); return () => subs.delete(f); };
export function setPrefs(patch, api) {
  const before = prefs;
  prefs = { ...prefs, ...patch };
  if (FEED_KEYS.some((k) => JSON.stringify(before[k]) !== JSON.stringify(prefs[k]))) version++;
  AsyncStorage.setItem(KEY, JSON.stringify(prefs)).catch(() => {});
  emit();
  if (api) api.patch('/api/settings', { prefs: patch }).catch(() => {});
}
export const usePrefs = () => useSyncExternalStore(subscribePrefs, () => prefs, () => prefs);
export const usePrefsVersion = () => useSyncExternalStore(subscribePrefs, () => version, () => version);

// Adds the person's settings to the API calls that use them (feed, streaming info, Ask)
export function withPrefs(path) {
  const p = prefs;
  const [pathname, qs = ''] = path.split('?');
  const q = new URLSearchParams(qs);
  if (pathname === '/api/providers' || pathname === '/api/ask') {
    if (p.region && !q.has('region')) q.set('region', p.region);
  } else if (pathname === '/api/movies') {
    if (['item', 'similar', 'search', 'onboard', 'popular'].some((k) => q.has(k))) return path;
    if (p.region && !q.has('region')) q.set('region', p.region);
    if (p.onlyMine && p.services?.length && !q.has('provider') && !q.has('providerId')) q.set('mine', p.services.join('|'));
    if (p.hideGenres?.length) q.set('hide', p.hideGenres.join(','));
    if (p.kind && p.kind !== 'both') q.set('kind', p.kind);
    if (p.safe) q.set('safe', '1');
  } else return path;
  const s = q.toString();
  return pathname + (s ? `?${s}` : '');
}

// Smaller images on data saver
export const img = (url) => {
  if (!url || !prefs.dataSaver) return url;
  return url.replace('/t/p/original/', '/t/p/w780/').replace('/t/p/w1280/', '/t/p/w780/').replace('/t/p/w500/', '/t/p/w342/');
};
