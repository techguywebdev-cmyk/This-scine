import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ClerkProvider, ClerkLoaded } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { InterTight_700Bold, InterTight_800ExtraBold } from '@expo-google-fonts/inter-tight';
import { WatchlistProvider } from '../lib/store';
import { CallProvider } from '../lib/calls';
import CallScreen from '../components/CallScreen';
import { CLERK_PUBLISHABLE_KEY } from '../lib/config';
import { T } from '../lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
try {
  const prev = global.ErrorUtils?.getGlobalHandler?.();
  global.ErrorUtils?.setGlobalHandler?.((e, fatal) => {
    if (fatal) { try { SplashScreen.hideAsync().catch(() => {}); require('react-native').Alert.alert('Thiscene hit a problem', String(e?.message || e).slice(0, 400)); } catch {} }
    prev && prev(e, fatal);
  });
} catch {}
SystemUI.setBackgroundColorAsync(T.bg).catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, InterTight_700Bold, InterTight_800ExtraBold });
  const [giveUp, setGiveUp] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGiveUp(true), 4000); return () => clearTimeout(t); }, []);
  const ready = fontsLoaded || !!fontError || giveUp;
  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => {}); }, [ready]);
  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: T.bg }}>
      <SafeAreaProvider>
        <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
          <ClerkLoaded>
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
          </ClerkLoaded>
        </ClerkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// If anything crashes while drawing a screen, show what happened instead of a black screen
export function ErrorBoundary({ error, retry }) {
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
