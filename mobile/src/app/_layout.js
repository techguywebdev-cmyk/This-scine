import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
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

// Waits for sign-in to load, but never forever: after 9s it shows a retry screen instead of a dark one
function BootGate({ children, onRetry }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [slow, setSlow] = useState(false);
  useEffect(() => { if (isLoaded) { bootStage.clerk = true; bootStage.signedIn = !!isSignedIn; } }, [isLoaded, isSignedIn]);
  useEffect(() => {
    if (isLoaded) return;
    const t = setTimeout(() => { setSlow(true); report('clerk_not_loaded', { stage: JSON.stringify(bootStage) }); }, 9000);
    return () => clearTimeout(t);
  }, [isLoaded]);
  if (isLoaded) return children;
  if (!slow) return null;
  return (
    <View style={{ flex: 1, backgroundColor: '#06060B', padding: 28, justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 10 }}>Can’t connect right now</Text>
      <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 20 }}>Thiscene couldn’t reach the sign-in service. Check your internet connection and try again.</Text>
      <Pressable onPress={() => { setSlow(false); onRetry(); }} style={{ marginTop: 22, alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 22, paddingHorizontal: 20, height: 44, justifyContent: 'center' }}>
        <Text style={{ color: '#07070F', fontWeight: '700' }}>Try again</Text>
      </Pressable>
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
                <Stack.Screen name="sign-in" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
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
    <View style={{ flex: 1, backgroundColor: '#06060B', padding: 28, justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 10 }}>Something went wrong</Text>
      <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 19 }} selectable>{String(error?.message || error).slice(0, 600)}</Text>
      <Pressable onPress={retry} style={{ marginTop: 22, alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 22, paddingHorizontal: 20, height: 44, justifyContent: 'center' }}>
        <Text style={{ color: '#07070F', fontWeight: '700' }}>Try again</Text>
      </Pressable>
    </View>
  );
}
