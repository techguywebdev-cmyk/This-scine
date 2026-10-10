// Shared logic for /film/[slug] and /tv/[slug]
import { notFound, permanentRedirect } from 'next/navigation';
import { TitlePage } from '@/components/TitlePage';
import { getTitle, getCommunityReviews } from '@/lib/title';
import { APP_NAME, SITE_URL } from '@/lib/brand';
import { titlePath } from '@/lib/look';

const idFrom = (slug) => parseInt(String(slug || '').split('-')[0], 10) || null;
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export async function titleMetadata(type, slug) {
  const t = await getTitle(type, idFrom(slug));
  if (!t) return { title: `Not found · ${APP_NAME}` };
  const name = `${t.title}${t.year ? ` (${t.year})` : ''}`;
  const where = t.providers.filter((p) => p.kind === 'Stream').slice(0, 2).map((p) => p.name);
  const desc = clip(`${where.length ? `Streaming on ${where.join(' and ')}. ` : ''}${t.overview || `${t.type === 'tv' ? 'Series' : 'Film'} — trailer, cast and where to watch.`}`, 158);
  const url = `${SITE_URL}${titlePath(t.type, t.id, t.title)}`;
  const images = [t.backdrop, t.poster].filter(Boolean).map((u) => ({ url: u }));
  return {
    title: `${name} — trailer, cast & where to watch · ${APP_NAME}`,
    description: desc,
    alternates: { canonical: url },
    openGraph: { type: t.type === 'tv' ? 'video.tv_show' : 'video.movie', title: name, description: desc, url, siteName: APP_NAME, images },
    twitter: { card: 'summary_large_image', title: name, description: desc, images: images.map((i) => i.url) },
  };
}

export async function TitleRoute({ type, slug }) {
  const t = await getTitle(type, idFrom(slug));
  if (!t) notFound();
  const canonical = titlePath(t.type, t.id, t.title);
  if (`/${type === 'tv' ? 'tv' : 'film'}/${slug}` !== canonical) permanentRedirect(canonical);
  const reviews = await getCommunityReviews(t.id).catch(() => []);
  const iso = (m) => (m ? `PT${Math.floor(m / 60)}H${m % 60}M` : undefined);
  const ld = {
    '@context': 'https://schema.org',
    '@type': t.type === 'tv' ? 'TVSeries' : 'Movie',
    name: t.title,
    url: `${SITE_URL}${canonical}`,
    image: t.poster || undefined,
    description: t.overview || undefined,
    datePublished: t.date || undefined,
    genre: t.genres.length ? t.genres : undefined,
    duration: t.type === 'movie' ? iso(t.runtime) : undefined,
    contentRating: t.cert || undefined,
    [t.type === 'tv' ? 'creator' : 'director']: t.directors.length ? t.directors.map((n) => ({ '@type': 'Person', name: n })) : undefined,
    actor: t.cast.slice(0, 8).map((c) => ({ '@type': 'Person', name: c.name })),
    trailer: t.trailer ? { '@type': 'VideoObject', name: `${t.title} trailer`, embedUrl: `https://www.youtube.com/embed/${t.trailer.key}`, thumbnailUrl: `https://i.ytimg.com/vi/${t.trailer.key}/hqdefault.jpg`, uploadDate: t.date || undefined } : undefined,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <TitlePage t={t} reviews={reviews} />
    </>
  );
}
