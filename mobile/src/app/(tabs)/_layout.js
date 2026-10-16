import { StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { F, T } from '../../lib/theme';
import { usePushRegistration, usePushRouting } from '../../lib/push';
import InviteBanner from '../../components/InviteBanner';
import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@clerk/expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWatchlist } from '../../lib/store';
import { WELCOME_KEY } from '../../lib/keys';
import { View } from 'react-native';
import { useApi } from '../../lib/api';
import { getUserTheme, setUserTheme } from '../../lib/userTheme';

const icon = (name) => ({ color, size }) => <Feather name={name} size={size - 2} color={color} />;

export default function TabsLayout() {
  usePushRouting();
  const { isSignedIn } = useAuth();
  const wl = useWatchlist();
  const checked = useRef(false);
  const api = useApi();
  const push = usePushRegistration();
  // Ask for notification permission once (after sign-in), so calls and messages can ring
  useEffect(() => {
    if (!isSignedIn) return;
    const t = setTimeout(async () => {
      const asked = await AsyncStorage.getItem('thiscene.pushAsked.v1').catch(() => '1');
      if (asked) return;
      await AsyncStorage.setItem('thiscene.pushAsked.v1', '1').catch(() => {});
      push.enable();
    }, 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);
  // Bring in the colour they picked on another device (Appearance)
  useEffect(() => {
    if (!isSignedIn) return;
    api.get('/api/settings').then((d) => { if (d?.theme && JSON.stringify(d.theme) !== JSON.stringify(getUserTheme())) setUserTheme(d.theme); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);
  useEffect(() => {
    if (!isSignedIn || checked.current || wl.loading) return;
    const t = setTimeout(async () => {
      if (checked.current) return;
      checked.current = true;
      const seen = await AsyncStorage.getItem(WELCOME_KEY).catch(() => '1');
      if (!seen && wl.items.length === 0) router.push('/welcome');
    }, 1200);
    return () => clearTimeout(t);
  }, [isSignedIn, wl.loading, wl.items.length]);
  return (
    <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.45)',
        tabBarLabelStyle: { fontFamily: F.semibold, fontSize: 10.5 },
        tabBarStyle: { position: 'absolute', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.08)', backgroundColor: 'transparent', elevation: 0 },
        tabBarBackground: () => <BlurView intensity={40} tint="dark" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(6,6,11,0.55)' }]} />,
        sceneStyle: { backgroundColor: T.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'For you', tabBarIcon: icon('play-circle') }} />
      <Tabs.Screen name="discover" options={{ title: 'Discover', tabBarIcon: icon('compass') }} />
      <Tabs.Screen name="watchlist" options={{ title: 'Watchlist', tabBarIcon: icon('bookmark') }} />
      <Tabs.Screen name="friends" options={{ title: 'Friends', tabBarIcon: icon('users') }} />
      <Tabs.Screen name="profile" options={{ title: 'You', tabBarIcon: icon('user') }} />
    </Tabs>
    <InviteBanner />
    </View>
  );
}
