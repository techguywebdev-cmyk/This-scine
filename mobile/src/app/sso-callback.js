import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { TsLoader } from '../components/Brand';

// Google sign-in returns here; the sign-in screen finishes the session, so just step back
export default function SSOCallback() {
  useEffect(() => { const t = setTimeout(() => (router.canGoBack() ? router.back() : router.replace('/')), 400); return () => clearTimeout(t); }, []);
  return <View style={{ flex: 1, backgroundColor: '#06060B', alignItems: 'center', justifyContent: 'center' }}><TsLoader size={56} /></View>;
}
