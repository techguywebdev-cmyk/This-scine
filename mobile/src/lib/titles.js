import { router } from 'expo-router';
import { Share } from 'react-native';
import { API_URL } from './config';

export const openTitle = (movie) => {
  const type = movie.isTV || movie.mediaType === 'tv' || movie.is_tv ? 'tv' : 'movie';
  router.push({ pathname: '/title/[type]/[id]', params: { type, id: String(movie.id || movie.movie_id), title: movie.title || '', accent: movie.accent || '' } });
};

export const shareExternal = async (movie) => {
  const type = movie.isTV || movie.mediaType === 'tv' ? 'tv' : 'movie';
  const slug = String(movie.title || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  const url = `${API_URL}/${type === 'tv' ? 'tv' : 'film'}/${movie.id}${slug ? `-${slug}` : ''}`;
  try {
    await Share.share({ message: `${movie.title}${movie.year ? ` (${movie.year})` : ''} — found it on Thiscene ${url}`, url, title: movie.title });
  } catch {}
};

// Share opens the in-app sheet (send to friends, or share the link anywhere)
export const shareTitle = (movie) => { require('../components/ShareSheet').openShare(movie); };
