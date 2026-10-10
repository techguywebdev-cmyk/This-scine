// Server-safe copies of the app's colour system (mirrors components/cine/shared.js → ambient, and /api/movies ACCENTS)
export const NOIR = '#E6E6EA';
export const ACCENTS = [
  '#F5A623', '#818CF8', '#2DD4BF', '#FF6B8A',
  '#A3E635', '#E6E6EA', '#B07FEF', '#38BDF8', '#FDBA74',
  '#E87AAA', '#50C8D4', '#E8C84A', '#7C9CFF',
  '#86EFAC', '#F0ABFC', '#E6E6EA', '#FF7A2F', '#7BC8FF',
  '#C4922A', '#5EEAD4',
];
// Same accent a shared title gets in the app (/api/movies?item= uses id % ACCENTS.length)
export const accentForId = (id) => ACCENTS[(Number(id) || 0) % ACCENTS.length];
export const ambient = (a = '#F5A623') => a === NOIR
  ? 'radial-gradient(120% 70% at 0% 0%, rgba(255,255,255,0.06) 0%, transparent 70%), #000000'
  : `radial-gradient(120% 70% at 0% 0%, ${a}2e 0%, transparent 70%), radial-gradient(120% 70% at 100% 100%, ${a}24 0%, transparent 70%), linear-gradient(165deg, ${a}1f 0%, ${a}12 50%, ${a}1c 100%), #06060B`;
export const slugify = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'title';
export const titlePath = (type, id, title) => `/${type === 'tv' ? 'tv' : 'film'}/${id}-${slugify(title)}`;
