import 'react-native-gesture-handler';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StatusScreen from '../components/StatusScreen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { InterTight_700Bold, InterTight_800ExtraBold } from '@expo-google-fonts/inter-tight';
import { WatchlistProvider } from '../lib/store';
import { CallProvider } from '../lib/calls';
import CallScreen from '../components/CallScreen';
import LaunchSplash from '../components/LaunchSplash';
import { CLERK_PUBLISHABLE_KEY } from '../lib/config';
import { T } from '../lib/theme';
import { report, bootStage } from '../lib/report';
import { onBootReady } from '../lib/boot';

SplashScreen.preventAutoHideAsync().catch(() => {});
try {
  const prev = global.ErrorUtils?.getGlobalHandler?.();
  global.ErrorUtils?.setGlobalHandler?.((e, fatal) => {
    try { report(e?.message || e, { fatal: !!fatal, stack: String(e?.stack || '').slice(0, 450), stage: JSON.stringify(bootStage) }); } catch {}
    if (fatal) { try { SplashScreen.hideAsync().catch(() => {}); require('react-native').Alert.alert('Thiscene hit a problem', String(e?.message || e).slice(0, 400)); } catch {} }
    prev && prev(e, fatal);
  });
} catch {}
SystemUI.setBackgroundColorAsync(T.bg).catch(() => {});
onBootReady(() => { bootStage.feed = true; });
// If the app still isn't showing the feed after 15s, tell us where it got stuck
setTimeout(() => { if (!bootStage.feed) report('boot_stuck', { stage: JSON.stringify({ ...bootStage, secs: Math.round((Date.now() - bootStage.startedAt) / 1000) }) }); }, 15000);

// Never block the app on sign-in: browse straight away, show a small live banner while the
// account connects, and offer a retry if it takes too long.
function ConnectBanner({ slow, onRetry }) {
  const insets = useSafeAreaInsets();
  const a = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(a, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
    const l = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })); l.start();
    return () => l.stop();
  }, [a, spin]);
  return (
    <Animated.View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: insets.top + 6, alignItems: 'center', zIndex: 300, elevation: 30, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }] }}>
      <Pressable onPress={slow ? onRetry : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: 'rgba(12,12,20,0.92)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }}>
        {slow ? <Feather name="wifi-off" size={14} color="#FF8FA3" /> : <Animated.View style={{ transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}><Feather name="loader" size={14} color="#fff" /></Animated.View>}
        <Text style={{ color: '#fff', fontSize: 12.5, fontFamily: 'Inter_600SemiBold' }}>{slow ? 'Can’t reach your account · Tap to retry' : 'Connecting your account…'}</Text>
      </Pressable>
    </Animated.View>
  );
}

function BootGate({ children, onRetry }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [slow, setSlow] = useState(false);
  const [show, setShow] = useState(false);
  useEffect(() => { if (isLoaded) { bootStage.clerk = true; bootStage.signedIn = !!isSignedIn; } }, [isLoaded, isSignedIn]);
  useEffect(() => {
    if (isLoaded) return undefined;
    const t1 = setTimeout(() => setShow(true), 2500);
    const t2 = setTimeout(() => { setSlow(true); report('clerk_not_loaded', { stage: JSON.stringify(bootStage) }); }, 12000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isLoaded]);
  if (isLoaded) return children;
  if (!show) return null;
  return (
    <View style={{ flex: 1 }}>
      {children}
      <ConnectBanner slow={slow} onRetry={() => { setSlow(false); onRetry(); }} />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, InterTight_700Bold, InterTight_800ExtraBold });
  const [giveUp, setGiveUp] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { const t = setTimeout(() => setGiveUp(true), 4000); return () => clearTimeout(t); }, []);
  const ready = fontsLoaded || !!fontError || giveUp;
  useEffect(() => { if (ready) { bootStage.fonts = !!fontsLoaded; SplashScreen.hideAsync().catch(() => {}); } }, [ready, fontsLoaded]);
  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: T.bg }}>
      <SafeAreaProvider>
        <ClerkProvider key={attempt} publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
          <BootGate onRetry={() => setAttempt((a) => a + 1)}>
            <WatchlistProvider>
            <CallProvider>
              <StatusBar style="light" />
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: T.bg }, animation: 'slide_from_right' }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="title/[type]/[id]" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="folder/[id]" />
                <Stack.Screen name="person/[id]" />
                <Stack.Screen name="blocked" />
                <Stack.Screen name="welcome" options={{ animation: 'fade', gestureEnabled: false }} />
                <Stack.Screen name="messages" />
                <Stack.Screen name="chat/[id]" />
                <Stack.Screen name="status/[userId]" options={{ animation: 'fade' }} />
                <Stack.Screen name="status/new" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="party/[id]" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="ask" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="appearance" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="sign-in" options={{ animation: 'fade_from_bottom' }} />
                <Stack.Screen name="sso-callback" options={{ animation: 'none' }} />
              </Stack>
              <CallScreen />
            </CallProvider>
            </WatchlistProvider>
          </BootGate>
        </ClerkProvider>
        <LaunchSplash />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// If anything crashes while drawing a screen, show what happened instead of a black screen
export function ErrorBoundary({ error, retry }) {
  useEffect(() => { report(error?.message || error, { boundary: true, stack: String(error?.stack || '').slice(0, 450), stage: JSON.stringify(bootStage) }); }, [error]);
  return (
    <SafeAreaProvider>
      <StatusScreen icon="alert-triangle" title="That scene didn’t load" body="Something went wrong on this screen. We’ve been told about it — try again, and if it keeps happening, restart the app." primary={{ label: 'Try again', onPress: retry }} />
    </SafeAreaProvider>
  );
}
