import AsyncStorage from '@react-native-async-storage/async-storage';

// What this device has already been shown (5 days), mirroring the web feed memory
const KEY = 'cine_seen';
let seen = {};
let loaded = false;

export const feedKey = (m) => `${m.isTV ? 't' : 'm'}${m.id}`;

export async function loadSeen() {
  if (loaded) return seen;
  try {
    const raw = JSON.parse((await AsyncStorage.getItem(KEY)) || '{}');
    const now = Date.now();
    seen = Object.fromEntries(Object.entries(raw).filter(([, t]) => now - t < 5 * 24 * 3600e3));
  } catch { seen = {}; }
  loaded = true;
  return seen;
}

export function markSeen(m) {
  const k = feedKey(m);
  if (seen[k]) return;
  seen[k] = Date.now();
  const trimmed = Object.fromEntries(Object.entries(seen).sort((a, b) => b[1] - a[1]).slice(0, 900));
  seen = trimmed;
  AsyncStorage.setItem(KEY, JSON.stringify(trimmed)).catch(() => {});
}

export const isSeen = (m) => !!seen[feedKey(m)];
export const recentSeen = (n = 70) => Object.entries(seen).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
