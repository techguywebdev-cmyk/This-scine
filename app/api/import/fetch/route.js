import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Pull a user's public film history straight from Letterboxd or IMDb, so they don't have to export files.
// POST { source: 'letterboxd'|'imdb', handle, list: 'watched'|'watchlist', page }
//  → { items: [{ title, year, imdbId?, list }], more, page, user }
//  → { error, code: 'not_found'|'private'|'blocked'|'bad_handle' } when we can't read it (the app then offers the file route)

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';
const H = { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9' };
const MAX_PAGES = 60;

const decode = (s) => String(s || '')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16))).trim();

async function get(url) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 12000);
  try {
    const r = await fetch(url, { headers: H, redirect: 'follow', cache: 'no-store', signal: ac.signal });
    return { status: r.status, text: r.ok ? await r.text() : '' };
  } catch { return { status: 0, text: '' }; } finally { clearTimeout(t); }
}

function lbUser(handle) {
  const s = String(handle || '').trim().replace(/^@/, '');
  const m = s.match(/letterboxd\.com\/([A-Za-z0-9_]+)/i) || s.match(/^([A-Za-z0-9_]{2,40})$/);
  const u = m ? m[1] : null;
  return u && !/^(film|films|list|lists|settings|search|members|journal|about|pro|sign-in|create-account)$/i.test(u) ? u : null;
}
function imdbHandle(handle) {
  const s = String(handle || '');
  const ls = s.match(/\b(ls\d{5,12})\b/); if (ls) return { kind: 'list', id: ls[1] };
  const ur = s.match(/\b(ur\d{5,12})\b/); if (ur) return { kind: 'user', id: ur[1] };
  return null;
}

// Letterboxd poster grids: several markups over the years, so try each.
function parseLetterboxd(html) {
  const out = [];
  const seen = new Set();
  const add = (slug, name) => {
    if (!slug || seen.has(slug)) return;
    seen.add(slug);
    let title = decode(name || ''), year = '';
    const y = title.match(/^(.*)\s\((\d{4})\)$/);
    if (y) { title = y[1]; year = y[2]; }
    if (!year) { const sy = slug.match(/-(\d{4})$/); if (sy && +sy[1] > 1880 && +sy[1] < 2100) year = sy[1]; }
    if (!title) {
      const m = slug.match(/^(.*?)(?:-(\d{4}))?(?:-\d)?$/);
      title = m[1].replace(/-/g, ' ');
      if (m[2]) year = m[2];
    }
    out.push({ title, year });
  };
  // Each poster block: grab the tag that carries the slug and look for a name nearby
  const re = /data-(?:film-slug|item-slug|target-link)="(?:\/film\/)?([a-z0-9-]+)\/?"/g;
  let m;
  while ((m = re.exec(html))) {
    const a = html.lastIndexOf('<', m.index), z = html.indexOf('>', m.index);
    const tag = html.slice(a, z + 1);
    let nm = tag.match(/data-item-(?:full-display-)?name="([^"]+)"/) || tag.match(/data-film-name="([^"]+)"/);
    if (!nm) {
      const after = html.slice(z, z + 500).split(/data-(?:film|item)-slug=/)[0];
      nm = after.match(/<img[^>]+alt="([^"]+)"/);
    }
    add(m[1], nm && nm[1]);
  }
  const more = /class="next"|rel="next"|\/page\/\d+\/"[^>]*>\s*Older|class="paginate-nextprev"[^>]*>\s*<a[^>]+class="next"/.test(html);
  return { items: out, more };
}

// Recent diary via RSS — always includes the TMDB id, used when the grid can't be read.
function parseLetterboxdRss(xml) {
  const out = [];
  const seen = new Set();
  for (const it of xml.split('<item>').slice(1)) {
    const title = decode((it.match(/<letterboxd:filmTitle>([\s\S]*?)<\/letterboxd:filmTitle>/) || [])[1]);
    const year = (it.match(/<letterboxd:filmYear>(\d{4})</) || [])[1] || '';
    const tmdbId = (it.match(/<tmdb:(?:movie|tv)Id>(\d+)</) || [])[1];
    const k = tmdbId || `${title}|${year}`;
    if (!title || seen.has(k)) continue;
    seen.add(k);
    out.push({ title, year, tmdbId: tmdbId ? +tmdbId : undefined, tmdbType: /<tmdb:tvId>/.test(it) ? 'tv' : 'movie' });
  }
  return out;
}

function parseImdb(html) {
  const ids = [];
  const seen = new Set();
  let m;
  const re = /\/title\/(tt\d{7,10})/g;
  while ((m = re.exec(html))) if (!seen.has(m[1])) { seen.add(m[1]); ids.push(m[1]); }
  // names from the embedded JSON when present
  const names = {};
  const re2 = /"id":"(tt\d{7,10})"[^{}]{0,400}?"titleText":\{"text":"((?:[^"\\]|\\.)*)"/g;
  while ((m = re2.exec(html))) {
    if (names[m[1]]) continue;
    let title = m[2];
    try { title = JSON.parse(`"${m[2]}"`); } catch {}
    const y = html.slice(m.index, m.index + 900).match(/"releaseYear":\{"year":(\d{4})/);
    names[m[1]] = { title, year: y ? y[1] : '' };
  }
  return ids.map((id) => ({ imdbId: id, title: names[id]?.title || id, year: names[id]?.year || '' }));
}

export async function POST(req) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Sign in to import' }, { status: 401 });
  let b = {};
  try { b = await req.json(); } catch {}
  const list = b.list === 'watchlist' ? 'watchlist' : 'watched';
  const page = Math.max(1, Math.min(MAX_PAGES, parseInt(b.page, 10) || 1));

  if (b.source === 'letterboxd') {
    const u = lbUser(b.handle);
    if (!u) return Response.json({ error: 'That doesn’t look like a Letterboxd username', code: 'bad_handle' }, { status: 400 });
    const path = list === 'watchlist' ? `watchlist/page/${page}/` : `films/page/${page}/`;
    const r = await get(`https://letterboxd.com/${u}/${path}`);
    if (r.status === 404) return Response.json({ error: `We couldn’t find @${u} on Letterboxd`, code: 'not_found' }, { status: 404 });
    if (r.text) {
      const { items, more } = parseLetterboxd(r.text);
      if (items.length || page > 1 || /no films|is empty|hasn.t added|nothing here/i.test(r.text)) {
        return Response.json({ user: u, page, more: more && items.length > 0 && page < MAX_PAGES, items: items.map((x) => ({ ...x, list })) });
      }
    }
    // Grid blocked or unreadable → recent diary via RSS (watched only)
    if (list === 'watched' && page === 1) {
      const rss = await get(`https://letterboxd.com/${u}/rss/`);
      if (rss.status === 404) return Response.json({ error: `We couldn’t find @${u} on Letterboxd`, code: 'not_found' }, { status: 404 });
      const items = rss.text ? parseLetterboxdRss(rss.text) : [];
      if (items.length) return Response.json({ user: u, page, more: false, partial: true, items: items.map((x) => ({ ...x, list })) });
    }
    if (list === 'watchlist' && r.status === 200) return Response.json({ user: u, page, more: false, items: [] });
    return Response.json({ error: 'Letterboxd didn’t let us in this time', code: 'blocked' }, { status: 502 });
  }

  if (b.source === 'imdb') {
    const h = imdbHandle(b.handle);
    if (!h) return Response.json({ error: 'Paste your IMDb profile or list link (it has “ur…” or “ls…” in it)', code: 'bad_handle' }, { status: 400 });
    if (page > 1) return Response.json({ page, more: false, items: [] });
    const url = h.kind === 'list' ? `https://www.imdb.com/list/${h.id}/` : list === 'watchlist' ? `https://www.imdb.com/user/${h.id}/watchlist/` : `https://www.imdb.com/user/${h.id}/ratings/`;
    if (h.kind === 'list' && list === 'watched') return Response.json({ page, more: false, items: [] });
    const r = await get(url);
    if (r.status === 404) return Response.json({ error: 'We couldn’t find that IMDb page', code: 'not_found' }, { status: 404 });
    if (r.status === 403 && /private/i.test(r.text)) return Response.json({ error: 'That IMDb list is private', code: 'private' }, { status: 403 });
    if (!r.text) return Response.json({ error: 'IMDb didn’t let us in this time', code: 'blocked' }, { status: 502 });
    const items = parseImdb(r.text).map((x) => ({ ...x, list: h.kind === 'list' ? 'watchlist' : list }));
    if (!items.length && /private/i.test(r.text)) return Response.json({ error: 'That IMDb list is private', code: 'private' }, { status: 403 });
    return Response.json({ page, more: false, items });
  }

  return Response.json({ error: 'Unknown source' }, { status: 400 });
}
