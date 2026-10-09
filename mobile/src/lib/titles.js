import { router } from 'expo-router';
import { Share } from 'react-native';
import { API_URL } from './config';

export const openTitle = (movie) => {
  const type = movie.isTV || movie.mediaType === 'tv' || movie.is_tv ? 'tv' : 'movie';
  router.push({ pathname: '/title/[type]/[id]', params: { type, id: String(movie.id || movie.movie_id), title: movie.title || '' } });
};

export const shareTitle = async (movie) => {
  const type = movie.isTV || movie.mediaType === 'tv' ? 'tv' : 'movie';
  const url = `${API_URL}/?m=${type}-${movie.id}`;
  try {
    await Share.share({ message: `${movie.title}${movie.year ? ` (${movie.year})` : ''} — found it on CineScroll ${url}`, url, title: movie.title });
  } catch {}
};
