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
      await Notifications.setNotificationChannelAsync('default', { name: 'CineScroll', importance: Notifications.AndroidImportance.HIGH, lightColor: '#F5A623' }).catch(() => {});
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

// Open the right screen when a notification is tapped (mounted once, in the tabs layout)
export function usePushRouting() {
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      const url = r.notification.request.content.data?.url || '';
      const chat = /chat=([^&]+)/.exec(url)?.[1];
      if (chat) router.push({ pathname: '/person/[id]', params: { id: decodeURIComponent(chat) } });
      else router.navigate('/');
    });
    return () => sub.remove();
  }, []);

}
