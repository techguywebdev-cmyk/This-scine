// Finds a trailer on YouTube for titles TMDB has none for, using the official YouTube Data API.
// Each title is searched at most once (results — including "none found" — are saved in trailer_cache),
// and a daily cap keeps us inside the free quota (search = 100 units of the 10,000/day).
import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/db';

const YT_KEY = process.env.YOUTUBE_API_KEY;
const DAILY_CAP = Number(process.env.YOUTUBE_DAILY_SEARCHES || 90);
const RETRY_NONE_DAYS = 14;
const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
const db = (p) => `${SUPABASE_URL}/rest/v1/${p}`;

export const youtubeEnabled = () => !!YT_KEY;
const norm = (t) => String(t || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const decode = (t) => String(t || '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');

export async function cachedTrailers(items) {
  // items: [{ type, id }] → Map("type-id" → key) for the ones we already found on YouTube
  const out = new Map();
  if (!items.length) return out;
  try {
    const ids = [...new Set(items.map((i) => Number(i.id)).filter(Number.isFinite))].join(',');
    const rows = await fetch(db(`trailer_cache?tmdb_id=in.(${ids})&yt_key=not.is.null&select=media_type,tmdb_id,yt_key`), { headers: H, cache: 'no-store' }).then((r) => r.json());
    for (const r of Array.isArray(rows) ? rows : []) out.set(`${r.media_type}-${r.tmdb_id}`, r.yt_key);
  } catch {}
  return out;
}

async function embeddable(key) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 3500);
  try { const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${key}`)}`, { signal: ac.signal }); return r.ok; }
  catch { return null; } finally { clearTimeout(t); }
}

async function underCap() {
  try {
    const since = new Date(); since.setUTCHours(0, 0, 0, 0);
    const r = await fetch(db(`trailer_cache?source=eq.youtube&checked_at=gte.${since.toISOString()}&select=tmdb_id`), { headers: { ...H, Prefer: 'count=exact', Range: '0-0' }, cache: 'no-store' });
    const n = Number((r.headers.get('content-range') || '').split('/')[1] || 0);
    return n < DAILY_CAP;
  } catch { return false; }
}

const save = (type, id, key, title) => fetch(db('trailer_cache?on_conflict=media_type,tmdb_id'), {
  method: 'POST', headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal' },
  body: JSON.stringify({ media_type: type, tmdb_id: Number(id), yt_key: key || null, source: 'youtube', title: String(title || '').slice(0, 200), checked_at: new Date().toISOString() }),
}).catch(() => {});

// → YouTube video id, or null
export async function findYouTubeTrailer({ type, id, title, year }) {
  if (!id || !title) return null;
  // 1) Already looked?
  try {
    const rows = await fetch(db(`trailer_cache?media_type=eq.${type}&tmdb_id=eq.${Number(id)}&select=yt_key,checked_at`), { headers: H, cache: 'no-store' }).then((r) => r.json());
    const row = Array.isArray(rows) && rows[0];
    if (row?.yt_key) return row.yt_key;
    if (row && Date.now() - new Date(row.checked_at).getTime() < RETRY_NONE_DAYS * 86400000) return null;
  } catch {}
  if (!YT_KEY || !(await underCap())) return null;

  // 2) Ask YouTube
  const q = `${title} ${year || ''} ${type === 'tv' ? 'series' : ''} official trailer`.replace(/\s+/g, ' ').trim();
  const params = new URLSearchParams({ part: 'snippet', type: 'video', videoEmbeddable: 'true', maxResults: '8', q, key: YT_KEY, safeSearch: 'moderate' });
  let items = [];
  try {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, { cache: 'no-store' });
    if (!r.ok) return null; // quota/key problem — don't cache, try again another time
    items = (await r.json()).items || [];
  } catch { return null; }

  // 3) Pick the most trailer-like match for this exact title
  const want = norm(title);
  const words = want.split(' ').filter((w) => w.length > 1);
  const scored = items.map((it) => {
    const t = norm(decode(it.snippet?.title));
    const ch = norm(it.snippet?.channelTitle);
    let s = 0;
    if (t.includes(want)) s += 6; else s += 4 * (words.filter((w) => t.includes(w)).length / Math.max(1, words.length));
    if (/\btrailer\b/.test(t)) s += 3; else if (/\bteaser\b/.test(t)) s += 2;
    if (/\bofficial\b/.test(t)) s += 1;
    if (year && t.includes(String(year))) s += 1;
    if (/\b(reaction|review|explained|breakdown|recap|ending|fan made|fanmade|concept|parody|edit)\b/.test(t)) s -= 6;
    if (/\b(movieclips|trailers|netflix|prime video|hbo|a24|warner|universal|sony|paramount|disney|lionsgate|focus features|neon)\b/.test(ch)) s += 1;
    return { key: it.id?.videoId, s };
  }).filter((x) => x.key && x.s >= 6).sort((a, b) => b.s - a.s);

  let pick = null;
  for (const c of scored.slice(0, 3)) { if ((await embeddable(c.key)) !== false) { pick = c.key; break; } }
  await save(type, id, pick, title);
  return pick;
}
