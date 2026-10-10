import { SITE_URL } from '@/lib/brand';
import { getSitemapTitles } from '@/lib/title';
import { titlePath } from '@/lib/look';

export const revalidate = 86400;

export default async function sitemap() {
  const titles = await getSitemapTitles().catch(() => []);
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    ...titles.map((t) => ({ url: `${SITE_URL}${titlePath(t.type, t.id, t.title)}`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 })),
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
