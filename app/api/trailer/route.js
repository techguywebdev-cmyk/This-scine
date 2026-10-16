// GET /api/trailer?id=123&type=movie|tv
// Server-side TMDB proxy for trailers. Picks the best YouTube video that can actually be
// played inside Thiscene (some uploads block embedding and show "Video unavailable"),
// and returns backups in order so players can fall back.

export const revalidate = 86400;

const TMDB_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

const TYPE_RANK = { Trailer: 0, Teaser: 1, Clip: 2, Featurette: 3, 'Opening Credits': 4, 'Behind the Scenes': 5, Bloopers: 6 };

const tmdb = (path, params = {}) => {
  const q = new URLSearchParams({ api_key: TMDB_KEY, ...params });
  return fetch(`${TMDB_BASE}${path}?${q}`, { next: { revalidate: 86400 } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
};

// YouTube's oEmbed answers 401/403 when the owner blocked embedding and 404 when the video is gone
async function embeddable(key) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 3500);
  try {
    const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${key}`)}`, { signal: ac.signal, next: { revalidate: 86400 } });
    return r.ok;
  } catch { return null; } // unknown (timeout) — keep it as a later option
  finally { clearTimeout(t); }
}

const rank = (list) => list
  .filter((v) => v.site === 'YouTube' && v.key)
  .sort((a, b) =>
    (TYPE_RANK[a.type] ?? 9) - (TYPE_RANK[b.type] ?? 9)
    || (b.official ? 1 : 0) - (a.official ? 1 : 0)
    || (a.iso_639_1 === 'en' ? 0 : 1) - (b.iso_639_1 === 'en' ? 0 : 1)
    || String(b.published_at || '').localeCompare(String(a.published_at || '')));

async function playable(list, max = 8) {
  const cand = rank(list).slice(0, max);
  const checks = await Promise.all(cand.map((v) => embeddable(v.key)));
  const ok = cand.filter((_, i) => checks[i] === true);
  const unknown = cand.filter((_, i) => checks[i] === null);
  return [...ok, ...unknown];
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type') === 'tv' ? 'tv' : 'movie';

  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
  if (!TMDB_KEY) return Response.json({ error: 'TMDB key not configured' }, { status: 500 });

  try {
    // English + no-language videos first
    const d = await tmdb(`/${type}/${id}/videos`, { include_video_language: 'en,null' });
    let good = await playable(d?.results || []);

    // Nothing playable? Try the film's own language, then every language
    if (!good.length) {
      const info = await tmdb(`/${type}/${id}`);
      const lang = info?.original_language;
      if (lang && lang !== 'en') {
        const d2 = await tmdb(`/${type}/${id}/videos`, { include_video_language: `${lang},en,null` });
        good = await playable(d2?.results || []);
      }
      if (!good.length) {
        const d3 = await tmdb(`/${type}/${id}/videos`);
        good = await playable(d3?.results || []);
      }
    }

    const pick = good[0];
    return Response.json({
      trailerKey: pick?.key || null,
      name: pick?.name || null,
      type: pick?.type || null,
      keys: good.map((v) => v.key).slice(0, 5),
    });
  } catch (err) {
    console.error('GET /api/trailer error:', err);
    return Response.json({ error: 'Failed to load trailer' }, { status: 500 });
  }
}
