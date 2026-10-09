import { StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { F, T } from '../../lib/theme';
import { usePushRouting } from '../../lib/push';

const icon = (name) => ({ color, size }) => <Feather name={name} size={size - 2} color={color} />;

export default function TabsLayout() {
  usePushRouting();
  return (
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
  );
}
