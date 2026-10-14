// Design tokens shared with the web app (CineScroll.js `T`).
export const T = {
  bg: '#06060B',
  text: '#FFFFFF',
  text2: 'rgba(255,255,255,0.62)',
  text3: 'rgba(255,255,255,0.4)',
  hairline: 'rgba(255,255,255,0.08)',
  hairlineStrong: 'rgba(255,255,255,0.16)',
  surface: 'rgba(255,255,255,0.05)',
  accent: '#FFFFFF', // neutral UI accent (brand is black & white; films bring their own colour)
  star: '#FFD166',
};

export const F = {
  display: 'InterTight_700Bold',
  displayHeavy: 'InterTight_800ExtraBold',
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

// Section label used across screens: small, spaced, uppercase, accent coloured
export const label = (accent = T.accent) => ({
  fontFamily: F.bold,
  fontSize: 10.5,
  letterSpacing: 2.2,
  textTransform: 'uppercase',
  color: accent,
});

export const MOODS = ['Trending', 'Top rated', 'New', 'Hidden gems', 'Coming soon', 'International', 'Awards'];
// Same feed / genre / platform choices as the website's filter sheet
export const FEEDS = [
  { label: 'Trending', api: 'Trending', icon: 'trending-up', desc: 'Hot right now' },
  { label: 'Top rated', api: 'Top Rated', icon: 'star', desc: 'Best of all time' },
  { label: 'New this week', api: 'New', icon: 'zap', desc: 'Just landed' },
  { label: 'Coming soon', api: 'Upcoming', icon: 'calendar', desc: 'First looks' },
  { label: 'Hidden gems', api: 'Hidden Gems', icon: 'search', desc: 'Under the radar' },
  { label: 'International', api: 'International', icon: 'globe', desc: 'Beyond Hollywood' },
  { label: 'Award winners', api: 'Awards', icon: 'award', desc: 'Oscar, Cannes & festival picks' },
];
export const GENRES = [['Action', '28'], ['Drama', '18'], ['Horror', '27'], ['Sci-Fi', '878'], ['Comedy', '35'], ['Thriller', '53'], ['Romance', '10749'], ['Animation', '16'], ['Documentary', '99']];
export const PLATFORMS = [['Netflix', '#E50914'], ['Prime', '#00A8E0'], ['Disney+', '#3D7BFF'], ['Apple TV+', '#FFFFFF'], ['Max', '#5B7CFF'], ['Hulu', '#1CE783']];
// Dark text on light backgrounds (status colours, chips)
export const inkOn = (hex) => { const h = String(hex || '').replace('#', ''); if (h.length !== 6) return '#fff'; const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.42 ? '#07070F' : '#FFFFFF'; };
