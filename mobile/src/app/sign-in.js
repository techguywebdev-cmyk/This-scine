import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { AuthView } from '@clerk/expo/native';
import { T } from '../lib/theme';

// Native Clerk sign-in / sign-up (same accounts as the web app)
export default function SignIn() {
  const { isSignedIn } = useAuth();
  useEffect(() => { if (isSignedIn && router.canGoBack()) router.back(); }, [isSignedIn]);
  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <AuthView mode="signInOrUp" isDismissible onDismiss={() => router.canGoBack() && router.back()} />
    </View>
  );
}
