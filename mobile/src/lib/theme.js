// Design tokens shared with the web app (CineScroll.js `T`).
export const T = {
  bg: '#06060B',
  text: '#FFFFFF',
  text2: 'rgba(255,255,255,0.62)',
  text3: 'rgba(255,255,255,0.4)',
  hairline: 'rgba(255,255,255,0.08)',
  hairlineStrong: 'rgba(255,255,255,0.16)',
  surface: 'rgba(255,255,255,0.05)',
  accent: '#F5A623',
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
