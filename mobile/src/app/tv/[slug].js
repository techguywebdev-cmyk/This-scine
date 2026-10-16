import { Redirect, useLocalSearchParams } from 'expo-router';

// thiscene web links (/tv/1396-breaking-bad) open the film in the app
export default function TvLink() {
  const { slug } = useLocalSearchParams();
  const id = parseInt(String(slug || '').split('-')[0], 10);
  if (!id) return <Redirect href="/" />;
  return <Redirect href={{ pathname: '/title/[type]/[id]', params: { type: 'tv', id: String(id) } }} />;
}
