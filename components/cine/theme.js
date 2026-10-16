'use client';
import { useEffect, useState } from 'react';

// "Make it yours": follow each film's colour (default), or one colour of your own everywhere.
// Stored on this device for an instant start, and on the account so the app matches.
export const PALETTE = [
  ['Indigo', '#818CF8'], ['Teal', '#2DD4BF'], ['Rose', '#FF6B8A'], ['Lime', '#A3E635'],
  ['Violet', '#B07FEF'], ['Sky', '#38BDF8'], ['Ember', '#FF7A2F'], ['Gold', '#F5A623'],
  ['Emerald', '#34D399'], ['Crimson', '#F43F5E'], ['Orchid', '#F0ABFC'], ['Azure', '#7C9CFF'],
  ['Mint', '#86EFAC'], ['Sand', '#E8C84A'], ['Coral', '#FDBA74'], ['Noir', '#E6E6EA'],
];
const KEY = 'ts_theme_v1';
let cur = null;

const clean = (t) => {
  const color = /^#[0-9a-fA-F]{6}$/.test(t?.color || '') ? t.color.toUpperCase() : null;
  return t?.mode === 'fixed' && color ? { mode: 'fixed', color } : { mode: 'film', ...(color ? { color } : {}) };
};

export function getTheme() {
  if (cur) return cur;
  try { cur = clean(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch { cur = { mode: 'film' }; }
  return cur;
}

export function setTheme(t, { save = true } = {}) {
  cur = clean(t);
  try { localStorage.setItem(KEY, JSON.stringify(cur)); } catch {}
  try { window.dispatchEvent(new CustomEvent('cine:theme', { detail: cur })); } catch {}
  if (save) fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme: cur }) }).catch(() => {});
}

export function useTheme() {
  const [t, setT] = useState({ mode: 'film' });
  useEffect(() => {
    setT(getTheme());
    const f = () => setT({ ...getTheme() });
    window.addEventListener('cine:theme', f);
    return () => window.removeEventListener('cine:theme', f);
  }, []);
  return t;
}

export const themed = (t, a) => (t?.mode === 'fixed' && t.color ? t.color : a);
