import { useSyncExternalStore } from 'react';

// What the For You feed is showing — set from Discover (feed type, genre, streaming service)
let state = { mood: 'Trending', genre: '', provider: '' };
const subs = new Set();
export const setFeedFilter = (patch) => { state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }; subs.forEach((f) => f()); };
export const useFeedFilter = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state, () => state);
