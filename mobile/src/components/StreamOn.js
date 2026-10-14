import { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useApi } from '../lib/api';
import { F } from '../lib/theme';

const cache = new Map();

// Direct platform links (same as the web): HTTPS links hand off to the installed app when there is one
function linkFor(p, title, year) {
  const q = encodeURIComponent([title, year].filter(Boolean).join(' ') || title || '');
  const n = (p.provider_name || '').toLowerCase(), id = p.provider_id;
  if (id === 8 || n.includes('netflix')) return `https://www.netflix.com/search?q=${q}`;
  if ([9, 119, 10].includes(id) || n.includes('prime') || n.includes('amazon')) return `https://www.amazon.com/gp/video/search?phrase=${q}&ie=UTF8`;
  if (id === 337 || n.includes('disney')) return `https://www.disneyplus.com/search/${q}`;
  if (id === 15 || n.includes('hulu')) return `https://www.hulu.com/search?q=${q}`;
  if ([1899, 384, 31].includes(id) || n.includes('max') || n.includes('hbo')) return `https://play.max.com/search?q=${q}`;
  if (id === 350 || n.includes('apple')) return `https://tv.apple.com/search?term=${q}`;
  if (id === 531 || n.includes('paramount')) return `https://www.paramountplus.com/search/?q=${q}`;
  if (id === 386 || n.includes('peacock')) return `https://www.peacocktv.com/search?q=${q}`;
  if (id === 283 || n.includes('crunchyroll')) return `https://www.crunchyroll.com/search?q=${q}`;
  return `https://www.justwatch.com/us/search?q=${q}`;
}

// "STREAM ON" + provider logos, like the web card
export default function StreamOn({ movie, style }) {
  const api = useApi();
  const key = `${movie.isTV || movie.is_tv ? 'tv' : 'movie'}-${movie.id}`;
  const [list, setList] = useState(cache.get(key) || null);
  useEffect(() => {
    if (cache.has(key)) { setList(cache.get(key)); return; }
    let alive = true;
    api.get(`/api/providers?id=${movie.id}&type=${movie.isTV || movie.is_tv ? 'tv' : 'movie'}`).then((d) => { const l = d.providers || []; cache.set(key, l); if (alive) setList(l); }).catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (!list || !list.length) return null;
  return (
    <View style={[{ marginBottom: 10 }, style]}>
      <Text style={{ fontFamily: F.bold, fontSize: 9, letterSpacing: 1.6, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>STREAM ON</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {list.slice(0, 6).map((p) => (
          <Pressable key={p.provider_id} onPress={() => Linking.openURL(linkFor(p, movie.title, movie.year)).catch(() => {})} accessibilityLabel={`Watch on ${p.provider_name}`} style={{ width: 30, height: 30, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(0,0,0,0.4)' }}>
            {p.logo_path ? <Image source={{ uri: `https://image.tmdb.org/t/p/w92${p.logo_path}` }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}
