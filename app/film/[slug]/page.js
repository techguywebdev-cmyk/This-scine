import { TitleRoute, titleMetadata } from '@/components/titleRoute';

export const revalidate = 21600;

export async function generateMetadata({ params }) {
  return titleMetadata('movie', params.slug);
}

export default function Page({ params }) {
  return <TitleRoute type="movie" slug={params.slug} />;
}
