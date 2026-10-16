import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar } from './Ui';
import { useApi } from '../lib/api';
import { F } from '../lib/theme';

const HANDLE = /(@[a-zA-Z0-9_.]{2,32})/g;
export const openHandle = (h) => router.push({ pathname: '/person/[id]', params: { id: h.replace(/^@/, '') } });

// Comment text with @handles highlighted and tappable (opens their profile)
export function MentionText({ text, accent = '#fff', style }) {
  const parts = String(text || '').split(HANDLE);
  return (
    <Text style={style}>
      {parts.map((p, i) => (i % 2 === 1
        ? <Text key={i} onPress={() => openHandle(p)} suppressHighlighting style={{ color: accent, fontFamily: F.bold }}>{p}</Text>
        : <Text key={i}>{p}</Text>))}
    </Text>
  );
}

// Replace the "@na" being typed with the picked handle
export const applyMention = (value, u) => String(value || '').replace(/@([a-zA-Z0-9_.]{0,30})$/, `@${u.username} `);

// Suggestions while typing "@name": people you follow first, then everyone
export function MentionSuggest({ value, onPick, accent = '#fff' }) {
  const api = useApi();
  const [list, setList] = useState([]);
  const following = useRef(null);
  const m = /(?:^|\s)@([a-zA-Z0-9_.]{0,30})$/.exec(value || '');
  const q = m ? m[1].toLowerCase() : null;
  useEffect(() => {
    if (q === null) { setList([]); return undefined; }
    let alive = true;
    const run = async () => {
      if (!following.current) { try { following.current = (await api.get('/api/follows?type=following')).users || []; } catch { following.current = []; } }
      const local = following.current.filter((u) => !q || `${u.username} ${u.display_name || ''}`.toLowerCase().includes(q)).slice(0, 5);
      if (alive) setList(local);
      if (q.length >= 2) {
        try {
          const d = await api.get(`/api/follows?type=search&q=${encodeURIComponent(q)}`);
          if (!alive) return;
          const seen = new Set(local.map((u) => u.user_id));
          setList([...local, ...(d.users || []).filter((u) => !seen.has(u.user_id))].slice(0, 6));
        } catch {}
      }
    };
    const t = setTimeout(run, q.length >= 2 ? 220 : 0);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  if (q === null || !list.length) return null;
  return (
    <View style={[styles.box, { borderColor: `${accent}55`, backgroundColor: 'rgba(10,10,16,0.96)' }]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: `${accent}1c`, borderRadius: 18 }]} />
      {list.map((u) => (
        <Pressable key={u.user_id} onPress={() => onPick(u)} style={({ pressed }) => [styles.row, pressed && { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
          <Avatar uri={u.avatar_url} name={u.display_name || u.username} size={30} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{u.display_name || u.username}</Text>
            <Text style={styles.handle} numberOfLines={1}>@{u.username}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 18, borderWidth: 1, padding: 6, marginBottom: 8, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 7, borderRadius: 12 },
  name: { fontFamily: F.bold, fontSize: 13, color: '#fff' },
  handle: { fontFamily: F.body, fontSize: 11.5, color: 'rgba(255,255,255,0.55)' },
});
