import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_URL } from './config';

// Send app errors to our own server (same "client_error" events the website logs), so crashes on
// someone's phone show up without needing a cable or a crash service.
const build = String(Constants.expoConfig?.android?.versionCode || Constants.expoConfig?.version || '');
let sent = 0;
export const bootStage = { fonts: false, clerk: false, signedIn: null, feed: false, startedAt: Date.now() };

export function report(msg, extra = {}) {
  if (sent++ > 20) return; // never spam
  const props = { msg: String(msg || '').slice(0, 300), app: 'android', build, os: `${Platform.OS} ${Platform.Version}`, ...extra };
  try {
    fetch(`${API_URL}/api/track`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'client_error', props }) }).catch(() => {});
  } catch {}
}
