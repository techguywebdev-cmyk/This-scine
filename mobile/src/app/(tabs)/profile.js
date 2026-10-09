import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, useClerk, useUser } from '@clerk/expo';
import { Feather } from '@expo/vector-icons';
import Ambient from '../../components/Ambient';
import ProfileView from '../../components/ProfileView';
import { Empty, SectionLabel } from '../../components/Ui';
import { usePushRegistration } from '../../lib/push';
import { F, T } from '../../lib/theme';

export default function Me() {
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const push = usePushRegistration();

  if (!isSignedIn) {
    return (
      <View style={{ flex: 1, padding: 20, paddingTop: insets.top + 40 }}>
        <Ambient />
        <Text style={styles.h1}>Your CineScroll</Text>
        <Empty title="Sign in to save films, build folders and follow friends" sub="Same account as the website." />
        <Pressable onPress={() => router.push('/sign-in')} style={styles.cta}><Text style={styles.ctaText}>Sign in or create account</Text></Pressable>
      </View>
    );
  }

  const footer = (
    <View style={{ marginTop: 10 }}>
      <SectionLabel>Settings</SectionLabel>
      {[
        ['bell', push.enabled ? 'Notifications are on' : 'Turn on notifications', push.enabled ? null : push.enable],
        ['log-out', 'Sign out', () => signOut()],
      ].map(([icon, text, fn]) => (
        <Pressable key={text} disabled={!fn} onPress={fn} style={styles.row}>
          <Feather name={icon} size={17} color={T.accent} />
          <Text style={styles.rowText}>{text}</Text>
        </Pressable>
      ))}
    </View>
  );

  return <ProfileView userId={user.id} footer={footer} />;
}

const styles = StyleSheet.create({
  h1: { fontFamily: F.displayHeavy, fontSize: 28, color: '#fff', letterSpacing: -0.5 },
  cta: { alignSelf: 'flex-start', backgroundColor: T.accent, borderRadius: 21, paddingHorizontal: 20, height: 42, justifyContent: 'center', marginTop: 4 },
  ctaText: { fontFamily: F.bold, fontSize: 13, color: '#07070F' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.hairline },
  rowText: { fontFamily: F.semibold, fontSize: 14.5, color: '#fff' },
});
