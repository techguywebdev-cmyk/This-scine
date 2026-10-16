// Status text styles — the same choices as the website's editor (components/cine/Status.js), saved in meta.text
export const STATUS_FONTS = {
  serif: ['Serif', 'InterTight_700Bold', false],
  sans: ['Modern', 'InterTight_800ExtraBold', false],
  mono: ['Type', 'monospace', false],
  classic: ['Classic', 'InterTight_700Bold', true],
};
export const STATUS_TEXT_COLORS = ['#FFFFFF', '#07070F', '#F5A623', '#FF6B8A', '#2DD4BF', '#818CF8', '#A3E635'];
export const NEXT_ALIGN = { center: 'left', left: 'right', right: 'center' };

export function statusTextStyle(t, len = 0) {
  const s = t || {};
  const f = STATUS_FONTS[s.font] || STATUS_FONTS.serif;
  const size = Math.min(2.5, Math.max(0.5, Number(s.size) || 1));
  const color = STATUS_TEXT_COLORS.includes(s.color) ? s.color : '#FFFFFF';
  const base = len > 140 ? 22 : len > 60 ? 28 : 34;
  const fontSize = Math.round(base * size);
  return {
    fontFamily: f[1], fontStyle: f[2] ? 'italic' : 'normal', color, fontSize, lineHeight: Math.round(fontSize * 1.25),
    textAlign: ['left', 'right'].includes(s.align) ? s.align : 'center', letterSpacing: s.font === 'mono' ? 0 : -0.4,
    textShadowColor: color === '#07070F' ? 'transparent' : 'rgba(0,0,0,0.35)', textShadowRadius: color === '#07070F' ? 0 : 12,
  };
}
