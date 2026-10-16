import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { useApi } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

// Registers this phone for push (messages, calls, followers, release reminders) and routes taps
export function usePushRegistration() {
  const { isSignedIn } = useAuth();
  const api = useApi();
  const [enabled, setEnabled] = useState(false);

  const register = useCallback(async (ask) => {
    if (!isSignedIn || !Device.isDevice) return false;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', { name: 'Thiscene', importance: Notifications.AndroidImportance.HIGH, lightColor: '#F5A623' }).catch(() => {});
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted' && ask) ({ status } = await Notifications.requestPermissionsAsync());
    if (status !== 'granted') { setEnabled(false); return false; }
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
    if (!projectId) return false;
    try {
      const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
      await api.post('/api/push-expo', { token });
      setEnabled(true);
      return true;
    } catch { return false; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  useEffect(() => { register(false); }, [register]);

  return { enabled, enable: () => register(true) };
}

// Buttons on watch reminders: "Tomorrow night" (snooze) and "Watch together"
Notifications.setNotificationCategoryAsync('watch_reminder', [
  { identifier: 'snooze', buttonTitle: 'Tomorrow night', options: { opensAppToForeground: false } },
  { identifier: 'party', buttonTitle: 'Watch together', options: { opensAppToForeground: true } },
]).catch(() => {});

// Open the right screen when a notification is tapped (mounted once, in the tabs layout)
export function usePushRouting() {
  const api = useApi();
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      const data = r.notification.request.content.data || {};
      if (r.actionIdentifier === 'snooze' && data.movieId) {
        const t = new Date(); t.setDate(t.getDate() + 1); t.setHours(20, 0, 0, 0);
        api.patch('/api/watchlist', { movieId: data.movieId, remindAt: t.toISOString() })
          .then(() => Notifications.scheduleNotificationAsync({ content: { title: 'Snoozed till tomorrow night', body: 'We’ll remind you at 8pm 🍿' }, trigger: null }))
          .catch(() => {});
        Notifications.dismissNotificationAsync(r.notification.request.identifier).catch(() => {});
        return;
      }
      const url = (r.actionIdentifier === 'party' && data.url ? `${data.url}${data.url.includes('?') ? '&' : '?'}act=party` : data.url) || '';
      const chat = /chat=([^&]+)/.exec(url)?.[1];
      const title = /[?&]m=(movie|tv)-(\d+)/.exec(url);
      const party = /party=([^&]+)/.exec(url)?.[1];
      if (party) router.push({ pathname: '/party/[id]', params: { id: decodeURIComponent(party) } });
      else if (chat) router.push({ pathname: '/chat/[id]', params: { id: decodeURIComponent(chat) } });
      else if (title) router.push({ pathname: '/title/[type]/[id]', params: { type: title[1], id: title[2], ...(/act=party/.test(url) ? { act: 'party' } : {}), ...(/tab=comments/.test(url) ? { tab: 'comments' } : {}) } });
      else if (/notifs=1/.test(url)) router.push('/notifications');
      else router.navigate('/');
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

}
