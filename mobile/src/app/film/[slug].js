import { Redirect, useLocalSearchParams } from 'expo-router';

// thiscene web links (/film/603-the-matrix) open the film in the app
export default function FilmLink() {
  const { slug } = useLocalSearchParams();
  const id = parseInt(String(slug || '').split('-')[0], 10);
  if (!id) return <Redirect href="/" />;
  return <Redirect href={{ pathname: '/title/[type]/[id]', params: { type: 'movie', id: String(id) } }} />;
}
