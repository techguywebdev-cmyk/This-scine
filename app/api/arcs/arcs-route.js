/**
 * GET /api/arcs — list official Cine Arcs
 * GET /api/arcs?id=action-fuse — single arc detail
 *
 * Copy to: app/api/arcs/route.js
 *
 * Progress is client-side (localStorage) for v1.
 * Optional: persist via user_settings.arc_progress jsonb later.
 */

import { listArcs, getArcById, ARC_THEMES } from '@/lib/arcs-data';

const TMDB_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY || '';

async function enrichItem(item, mediaType) {
  if (!TMDB_KEY) {
    return {
      ...item,
      poster: null,
      backdrop: null,
      overview: null,
      vote_average: null,
    };
  }
  try {
    const type = mediaType === 'tv' ? 'tv' : 'movie';
    const res = await fetch(
      `https://api.themoviedb.org/3/${type}/${item.movie_id}?api_key=${TMDB_KEY}&language=en-US`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return { ...item, poster: null };
    const d = await res.json();
    return {
      ...item,
      title: d.title || d.name || item.title,
      poster: d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : null,
      backdrop: d.backdrop_path ? `https://image.tmdb.org/t/p/w780${d.backdrop_path}` : null,
      overview: d.overview || null,
      vote_average: d.vote_average || null,
      release_date: d.release_date || d.first_air_date || null,
      runtime: d.runtime || (d.episode_run_time && d.episode_run_time[0]) || null,
    };
  } catch {
    return { ...item, poster: null };
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const theme = searchParams.get('theme') || undefined;
    const media_type = searchParams.get('media_type') || undefined;

    if (id) {
      const arc = getArcById(id);
      if (!arc) return Response.json({ error: 'Arc not found' }, { status: 404 });

      const themeMeta = ARC_THEMES[arc.theme] || ARC_THEMES.action;
      const items = [];
      for (const it of arc.items) {
        items.push(await enrichItem(it, arc.media_type));
      }

      const cover =
        items.find((i) => i.poster)?.poster ||
        items.find((i) => i.backdrop)?.backdrop ||
        null;

      return Response.json({
        ...arc,
        theme_meta: themeMeta,
        cover_poster: cover,
        items,
      });
    }

    const arcs = listArcs({ theme, media_type });

    // Light enrich: first item poster as cover
    const withCovers = await Promise.all(
      arcs.map(async (a) => {
        const full = getArcById(a.id);
        if (!full?.items?.[0]) return a;
        const first = await enrichItem(full.items[0], full.media_type);
        return {
          ...a,
          cover_poster: first.poster,
          sample_title: first.title,
        };
      })
    );

    return Response.json({ arcs: withCovers, themes: ARC_THEMES });
  } catch (err) {
    console.error('GET /api/arcs', err);
    return Response.json({ error: 'Failed to load arcs' }, { status: 500 });
  }
}
