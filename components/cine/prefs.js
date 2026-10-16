'use client';
import { useEffect, useState } from 'react';

// "Your feed" settings: country + services, trailers & data, content filters.
// Stored on this device for an instant start and on the account so the app matches.
export const DEFAULT_PREFS = { region: null, services: [], onlyMine: false, autoplay: true, startMuted: false, dataSaver: false, hideGenres: [], safe: false, kind: 'both' };
const KEY = 'ts_prefs_v1';
let cur = null;

export function getPrefs() {
  if (cur) return cur;
  try { cur = { ...DEFAULT_PREFS, ...(JSON.parse(localStorage.getItem(KEY) || 'null') || {}) }; } catch { cur = { ...DEFAULT_PREFS }; }
  return cur;
}

export function setPrefs(patch, { save = true } = {}) {
  cur = { ...getPrefs(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(cur)); } catch {}
  try { window.dispatchEvent(new CustomEvent('cine:prefs', { detail: cur })); } catch {}
  if (save) fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefs: patch }) }).catch(() => {});
}

export function usePrefs() {
  const [p, setP] = useState(DEFAULT_PREFS);
  useEffect(() => {
    setP(getPrefs());
    const f = () => setP({ ...getPrefs() });
    window.addEventListener('cine:prefs', f);
    return () => window.removeEventListener('cine:prefs', f);
  }, []);
  return p;
}

// Adds the person's settings to API calls that depend on them (feed, streaming info, Ask)
export function withPrefs(path) {
  let p;
  try { p = getPrefs(); } catch { return path; }
  try {
    const u = new URL(path, 'https://x');
    const q = u.searchParams;
    if (u.pathname === '/api/providers' || u.pathname === '/api/ask') {
      if (p.region && !q.has('region')) q.set('region', p.region);
    } else if (u.pathname === '/api/movies') {
      const special = ['item', 'similar', 'search', 'onboard', 'popular'].some((k) => q.has(k));
      if (!special) {
        if (p.region && !q.has('region')) q.set('region', p.region);
        if (p.onlyMine && p.services?.length && !q.has('provider') && !q.has('providerId')) q.set('mine', p.services.join('|'));
        if (p.hideGenres?.length) q.set('hide', p.hideGenres.join(','));
        if (p.kind && p.kind !== 'both') q.set('kind', p.kind);
        if (p.safe) q.set('safe', '1');
      }
    } else return path;
    return u.pathname + (q.toString() ? `?${q}` : '');
  } catch { return path; }
}

// Smaller images on data saver
export const img = (url, prefs) => {
  if (!url || !(prefs || getPrefs()).dataSaver) return url;
  return url.replace('/t/p/original/', '/t/p/w780/').replace('/t/p/w1280/', '/t/p/w780/').replace('/t/p/w500/', '/t/p/w342/');
};
