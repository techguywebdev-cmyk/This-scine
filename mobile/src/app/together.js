import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@clerk/expo';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Ambient from '../components/Ambient';
import { Avatar, Spinner } from '../components/Ui';
import { useApi } from '../lib/api';
import { useAccent } from '../lib/accent';
import { openTitle } from '../lib/titles';
import { F } from '../lib/theme';

const toMovie = (m) => ({ id: m.movie_id, title: m.title, poster: m.poster, backdrop: m.backdrop, year: m.year, rating: m.rating, accent: m.accent, isTV: !!m.is_tv, mediaType: m.is_tv ? 'tv' : 'movie' });

// "Watch together": what you and a friend both want to watch, and a one-tap pick for tonight
export default function Together() {
  const { id, name: rawName = '', avatar = '' } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const api = useApi();
  const { user } = useUser();
  const accent = useAccent();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [pick, setPick] = useState(null);
  const [providers, setProviders] = useState(null);
  const [shown, setShown] = useState([]);
  const [sent, setSent] = useState(false);
  const [starting, setStarting] = useState(false);
  const name = String(rawName || 'your friend').trim().split(/\s+/)[0];

  useEffect(() => {
    api.get(`/api/together?with=${encodeURIComponent(String(id))}`).then((d) => (d.error ? setErr(d.error) : setData(d))).catch(() => setErr('Couldn’t load — try again'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const both = data?.both || [];
  const pickOne = () => {
    const pool = both.filter((m) => !shown.includes(m.movie_id));
    const src = pool.length ? pool : both;
    if (!src.length) return;
    const top = src.slice(0, Math.min(8, src.length));
    const w = top.map((_, i) => 1 / (i + 1.5));
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    let chosen = top[0];
    for (let i = 0; i < top.length; i++) { r -= w[i]; if (r <= 0) { chosen = top[i]; break; } }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setPick(chosen); setSent(false); setProviders(null);
    setShown((s) => (pool.length ? [...s, chosen.movie_id] : [chosen.movie_id]));
    api.get(`/api/providers?id=${chosen.movie_id}&type=${chosen.is_tv ? 'tv' : 'movie'}`).then((d) => setProviders(d.providers || [])).catch(() => setProviders([]));
  };
  const sendPick = async () => {
    if (!pick) return;
    const meta = { id: pick.movie_id, type: pick.is_tv ? 'tv' : 'movie', title: pick.title, poster: pick.poster || null, backdrop: pick.backdrop || null, year: pick.year || null, rating: pick.rating || null, accent: pick.accent || null };
    await api.post('/api/messages', { toUserId: id, msg_type: 'title', text: pick.title, meta }).catch(() => {});
    await api.post('/api/messages', { toUserId: id, text: `Tonight? 🍿 We both saved ${pick.title}` }).catch(() => {});
    setSent(true);
  };
  const startParty = async () => {
    if (!pick || starting) return;
    setStarting(true);
    try {
      const d = await api.post('/api/party', { action: 'create', with: id, movie: { id: pick.movie_id, title: pick.title, poster: pick.poster, backdrop: pick.backdrop, year: pick.year, rating: pick.rating, is_tv: !!pick.is_tv, accent: pick.accent } });
      if (d.party?.id) router.replace({ pathname: '/party/[id]', params: { id: d.party.id } });
    } catch {}
    setStarting(false);
  };
  const col = (width - 40 - 20) / 3;
  const Row = ({ items, label }) => (items?.length ? (
    <View style={{ marginTop: 26 }}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, marginTop: 10 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
        {items.map((m) => <Pressable key={m.movie_id} onPress={() => openTitle(toMovie(m))} style={{ width: 84 }}><Image source={{ uri: m.poster }} style={styles.smallPoster} contentFit="cover" /><Text style={styles.small} numberOfLines={1}>{m.title}</Text></Pressable>)}
      </ScrollView>
    </View>
  ) : null);

  return (
    <View style={{ flex: 1, backgroundColor: '#06060B' }}>
      <Ambient accent={accent} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back} accessibilityLabel="Back"><Feather name="arrow-left" size={19} color="#fff" /></Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 16 }}>
          <View style={{ flexDirection: 'row' }}>
            <Avatar uri={user?.imageUrl} name={user?.firstName || user?.username} size={44} />
            <View style={{ marginLeft: -12, borderRadius: 24, borderWidth: 2, borderColor: accent }}><Avatar uri={String(avatar) || null} name={name} size={40} /></View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: accent }]}>WATCH TOGETHER</Text>
            <Text style={styles.h1}>You & {name}</Text>
          </View>
        </View>

        {!data && !err ? <Spinner accent={accent} /> : null}
        {err ? <Text style={styles.err}>{err}</Text> : null}
        {data?.private ? <Text style={styles.lead}>{name}’s watchlist is private. Once you follow each other, you’ll see what you both want to watch here.</Text> : null}

        {data && !data.private ? (
          <>
            <Text style={styles.lead}>{both.length ? <><Text style={{ fontFamily: F.bold, color: '#fff' }}>{both.length}</Text> {both.length === 1 ? 'title' : 'titles'} you both want to watch.</> : 'Nothing in common on your watchlists yet — save a few films and check back.'}</Text>
            {both.length && !pick ? (
              <Pressable onPress={pickOne} style={[styles.big, { backgroundColor: `${accent}33`, borderColor: `${accent}99` }]}><Text style={styles.bigText}>🍿  Pick for tonight</Text></Pressable>
            ) : null}

            {pick ? (
              <View style={styles.pick}>
                {pick.backdrop || pick.poster ? <Image source={{ uri: pick.backdrop || pick.poster }} style={[StyleSheet.absoluteFill, { opacity: 0.45 }]} contentFit="cover" /> : null}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(6,6,11,0.55)' }]} />
                <View style={{ flexDirection: 'row', gap: 14 }}>
                  <Image source={{ uri: pick.poster }} style={styles.pickPoster} contentFit="cover" />
                  <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                    <Text style={[styles.eyebrow, { color: accent }]}>TONIGHT’S PICK</Text>
                    <Text style={styles.pickTitle}>{pick.title}</Text>
                    <Text style={styles.pickMeta}>{[pick.year, pick.rating && pick.rating !== 'N/A' ? `★ ${pick.rating}` : null].filter(Boolean).join(' · ')}</Text>
                    <Text style={styles.pickMeta}>{providers === null ? 'Checking where to watch…' : providers.length ? `On ${providers.slice(0, 3).map((p) => p.provider_name).join(' · ')}` : 'Not streaming right now'}</Text>
                  </View>
                </View>
                <Pressable onPress={startParty} disabled={starting} style={[styles.big, { marginTop: 14, backgroundColor: `${accent}33`, borderColor: `${accent}99` }]}><Text style={styles.bigText}>{starting ? 'Starting…' : 'Start a watch party'}</Text></Pressable>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <Pressable onPress={() => openTitle(toMovie(pick))} style={styles.pill}><Feather name="play" size={13} color="#fff" /><Text style={styles.pillText}>Trailer</Text></Pressable>
                  <Pressable onPress={sendPick} disabled={sent} style={[styles.pill, sent && { opacity: 0.7 }]}><Feather name={sent ? 'check' : 'send'} size={13} color="#fff" /><Text style={styles.pillText}>{sent ? 'Sent' : `Send to ${name}`}</Text></Pressable>
                  {both.length > 1 ? <Pressable onPress={pickOne} style={[styles.pill, { backgroundColor: 'transparent', borderColor: 'transparent' }]}><Text style={[styles.pillText, { color: 'rgba(255,255,255,0.7)' }]}>Another</Text></Pressable> : null}
                </View>
              </View>
            ) : null}

            {both.length ? (
              <View style={{ marginTop: 26 }}>
                <Text style={styles.label}>YOU BOTH WANT TO WATCH</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
                  {both.map((m) => (
                    <Pressable key={m.movie_id} onPress={() => openTitle(toMovie(m))} style={{ width: col }}>
                      <Image source={{ uri: m.poster }} style={[styles.gridPoster, pick?.movie_id === m.movie_id && { borderWidth: 2, borderColor: accent }]} contentFit="cover" />
                      <Text style={styles.small} numberOfLines={1}>{m.title}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
            <Row items={data.theySaw} label={`${name.toUpperCase()} HAS SEEN THESE — ASK THEM`} />
            <Row items={data.youSaw} label={`YOU’VE SEEN — ${name.toUpperCase()} WANTS TO`} />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  eyebrow: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 2.2 },
  h1: { fontFamily: F.displayHeavy, fontSize: 24, color: '#fff', letterSpacing: -0.5, marginTop: 3 },
  lead: { fontFamily: F.body, fontSize: 14, lineHeight: 21, color: 'rgba(255,255,255,0.72)', marginTop: 18 },
  err: { fontFamily: F.semibold, fontSize: 13, color: '#FF8FA3', marginTop: 24 },
  big: { height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginTop: 16 },
  bigText: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
  pick: { marginTop: 18, borderRadius: 16, overflow: 'hidden', padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  pickPoster: { width: 86, height: 129, borderRadius: 6 },
  pickTitle: { fontFamily: F.displayHeavy, fontSize: 20, color: '#fff', letterSpacing: -0.4, marginTop: 4 },
  pickMeta: { fontFamily: F.body, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  pillText: { fontFamily: F.bold, fontSize: 12.5, color: '#fff' },
  label: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 2.2, color: 'rgba(255,255,255,0.5)' },
  gridPoster: { width: '100%', aspectRatio: 2 / 3, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.05)' },
  smallPoster: { width: 84, height: 126, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.05)' },
  small: { fontFamily: F.semibold, fontSize: 11.5, color: '#fff', marginTop: 6 },
});
