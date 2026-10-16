import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useApi } from '../lib/api';
import { openTitle } from '../lib/titles';
import { Avatar } from './Ui';
import { F, T } from '../lib/theme';

// "Watched together": posters from finished watch parties (yours, or with this person)
export default function PartyHistory({ target = 'me', title = 'Watched together', accent = '#F5A623', style }) {
  const api = useApi();
  const [items, setItems] = useState(null);
  useEffect(() => {
    let alive = true;
    api.get(`/api/party?history=${encodeURIComponent(target)}`).then((d) => alive && setItems(d.history || [])).catch(() => alive && setItems([]));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  if (!items || !items.length) return null;
  return (
    <View style={style}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: F.bold, fontSize: 10.5, letterSpacing: 2.2, color: accent }}>🍿 {title.toUpperCase()}</Text>
        <Text style={{ fontFamily: F.body, fontSize: 11.5, color: T.text2 }}>{items.length} {items.length === 1 ? 'film' : 'films'}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, marginTop: 12 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
        {items.map((h) => (
          <Pressable key={h.id} onPress={() => openTitle({ id: h.movie?.id, title: h.movie?.title, poster: h.movie?.poster, accent: h.movie?.accent, isTV: !!h.movie?.is_tv })} style={{ width: 84 }}>
            <View>
              <Image source={{ uri: h.movie?.poster }} style={{ width: 84, height: 126, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.05)' }} contentFit="cover" />
              {target === 'me' && h.peer ? <View style={{ position: 'absolute', right: -5, bottom: -5, borderRadius: 14, borderWidth: 2, borderColor: '#0B0B12' }}><Avatar uri={h.peer.avatar_url} name={h.peer.display_name || h.peer.username} size={24} /></View> : null}
            </View>
            <Text style={{ fontFamily: F.semibold, fontSize: 11, color: '#fff', marginTop: 7 }} numberOfLines={1}>{h.movie?.title}</Text>
            {h.myRating || h.theirRating ? <Text style={{ fontSize: 10.5, color: accent, marginTop: 2 }}>{'★'.repeat(h.myRating || h.theirRating)}</Text> : null}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
