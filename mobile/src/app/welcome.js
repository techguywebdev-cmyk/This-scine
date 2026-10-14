import { useEffect, useState } from 'react';
import { FlatList, Pressable, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@clerk/expo';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ambient from '../components/Ambient';
import { TsLoader } from '../components/Brand';
import { useApi } from '../lib/api';
import { useWatchlist } from '../lib/store';
import { API_URL } from '../lib/config';
import { F, T, label } from '../lib/theme';

const NEED = 5;
import { WELCOME_KEY } from '../lib/keys';

// First run: pick 5 films you love (tunes the feed) → invite a friend
export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user } = useUser();
  const api = useApi();
  const wl = useWatchlist();
  const [step, setStep] = useState(0);
  const [pool, setPool] = useState(null);
  const [picked, setPicked] = useState([]);
  const accent = picked[picked.length - 1]?.accent || '#818CF8';
  const name = user?.firstName || '';

  useEffect(() => { api.get('/api/movies?onboard=1').then((d) => setPool(d.movies || [])).catch(() => setPool([])); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const toggle = (m) => {
    Haptics.selectionAsync().catch(() => {});
    setPicked((p) => (p.some((x) => x.id === m.id) ? p.filter((x) => x.id !== m.id) : [...p, m]));
  };
  const done = async () => { await AsyncStorage.setItem(WELCOME_KEY, '1').catch(() => {}); router.replace('/'); };
  const savePicks = () => {
    api.post('/api/watchlist', { items: picked, watched: true }).then(() => wl.refresh()).catch(() => {});
    setStep(1);
  };
  const invite = async () => {
    try { await Share.share({ message: `Join me on Thiscene — let’s see what we both want to watch 🍿 ${API_URL}` }); } catch {}
  };

  const col = (width - 40 - 20) / 3;
  const left = Math.max(0, NEED - picked.length);

  if (step === 1) return (
    <View style={{ flex: 1, padding: 24, paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }}>
      <Ambient accent={accent} />
      <Text style={label(accent)}>Better together</Text>
      <Text style={styles.h1}>Bring a friend</Text>
      <Text style={styles.sub}>See what they’re saving, swap recommendations and start watch parties that keep you both in sync.</Text>
      <View style={{ flex: 1 }} />
      <Pressable onPress={invite} style={styles.primary}><Feather name="send" size={16} color="#07070F" /><Text style={styles.primaryText}>Invite a friend</Text></Pressable>
      <Pressable onPress={done} style={styles.quiet}><Text style={styles.quietText}>Start exploring</Text></Pressable>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Ambient accent={accent} />
      {pool === null ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><TsLoader size={52} /></View> : (
        <FlatList
          data={pool}
          numColumns={3}
          keyExtractor={(m) => String(m.id)}
          columnWrapperStyle={{ gap: 10 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 30, paddingBottom: insets.bottom + 120, gap: 10 }}
          ListHeaderComponent={
            <View style={{ marginBottom: 16 }}>
              <Text style={label(accent)}>{name ? `Welcome, ${name}` : 'Welcome to Thiscene'}</Text>
              <Text style={styles.h1}>Pick 5 films you love</Text>
              <Text style={styles.sub}>We’ll tune your feed around them. They’re added to your Watched list.</Text>
            </View>
          }
          renderItem={({ item: m }) => {
            const on = picked.some((x) => x.id === m.id);
            return (
              <Pressable onPress={() => toggle(m)} style={{ width: col }} accessibilityLabel={`${m.title}${on ? ', picked' : ''}`}>
                <View style={[styles.poster, on && { borderColor: '#fff' }]}>
                  {m.poster ? <Image source={{ uri: m.poster }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
                  {on ? <View style={styles.check}><Feather name="check" size={14} color="#07070F" /></View> : null}
                </View>
                <Text style={styles.title} numberOfLines={1}>{m.title}</Text>
              </Pressable>
            );
          }}
        />
      )}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <Pressable disabled={left > 0} onPress={savePicks} style={[styles.primary, { opacity: left > 0 ? 0.5 : 1 }]}>
          <Text style={styles.primaryText}>{left > 0 ? `Pick ${left} more` : 'Continue'}</Text>
        </Pressable>
        <Pressable onPress={done} style={styles.quiet}><Text style={styles.quietText}>Skip for now</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontFamily: F.displayHeavy, fontSize: 30, lineHeight: 34, color: '#fff', letterSpacing: -0.6, marginTop: 8 },
  sub: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: T.text2, marginTop: 8 },
  poster: { aspectRatio: 2 / 3, borderRadius: 8, overflow: 'hidden', backgroundColor: T.surface, borderWidth: 2, borderColor: 'transparent' },
  check: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: F.semibold, fontSize: 11.5, color: '#fff', marginTop: 5 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 14, backgroundColor: 'rgba(6,6,11,0.85)' },
  primary: { height: 52, borderRadius: 26, backgroundColor: '#fff', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontFamily: F.bold, fontSize: 15, color: '#07070F' },
  quiet: { height: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  quietText: { fontFamily: F.semibold, fontSize: 13.5, color: T.text2 },
});
