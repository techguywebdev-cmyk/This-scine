/**
 * Official Cine Arcs — progressive intensity watchlists curated by CineScroll.
 * Copy to: lib/arcs-data.js
 *
 * intensity: 1 (entry) → 5 (peak)
 * media_type: 'movie' | 'tv'
 */

export const ARC_THEMES = {
  action: {
    id: 'action',
    label: 'Action',
    accent: '#FF7A2F',
    meter: 'fuse',
    stages: ['Spark', 'Heat', 'Blaze', 'Detonation', 'Aftermath'],
    stageCopy: [
      'The fuse is lit.',
      'Pressure builds.',
      'No turning back.',
      'This is the deep end.',
      'You made it through the fire.',
    ],
  },
  romance: {
    id: 'romance',
    label: 'Romance',
    accent: '#FF6BAE',
    meter: 'warmth',
    stages: ['Glance', 'Pull', 'Fall', 'Free fall', 'Afterglow'],
    stageCopy: [
      'Just a look.',
      'Something shifts.',
      'Hearts on the line.',
      'All in.',
      'What remains.',
    ],
  },
  horror: {
    id: 'horror',
    label: 'Horror',
    accent: '#FF4444',
    meter: 'dread',
    stages: ['Unease', 'Shadows', 'Breach', 'No sleep', 'Silence'],
    stageCopy: [
      'Something feels off.',
      'The house notices you.',
      'Rules break.',
      'Lights stay on.',
      'What you carry home.',
    ],
  },
  mind: {
    id: 'mind',
    label: 'Mind-bender',
    accent: '#B07FEF',
    meter: 'fracture',
    stages: ['Crack', 'Tilt', 'Spiral', 'Shatter', 'Echo'],
    stageCopy: [
      'A hairline fracture.',
      'Reality leans.',
      'Which layer is true?',
      'Nothing holds.',
      'The question stays.',
    ],
  },
  comedy: {
    id: 'comedy',
    label: 'Comedy',
    accent: '#6BEF9E',
    meter: 'laugh',
    stages: ['Chuckle', 'Grin', 'Howl', 'Chaos', 'Encore'],
    stageCopy: [
      'Easy laughs.',
      'Getting ridiculous.',
      'Can’t keep a straight face.',
      'Absolute mayhem.',
      'One more for the road.',
    ],
  },
};

/**
 * Curated arcs. movie_id = TMDB id.
 * Order within each arc is the progression path.
 */
export const OFFICIAL_ARCS = [
  {
    id: 'action-fuse',
    slug: 'action-fuse',
    title: 'Action Arc: Fuse → Detonation',
    subtitle: 'Start sharp. End nuclear.',
    summary:
      'Six films that climb from precision kills to full-scale detonation. Wick opens the fuse; Maverick and Wick 4 push the ceiling.',
    theme: 'action',
    media_type: 'movie',
    items: [
      { movie_id: 245891, title: 'John Wick', intensity: 1, year: 2014 },
      { movie_id: 353081, title: 'Mission: Impossible – Fallout', intensity: 2, year: 2018 },
      { movie_id: 299534, title: 'Avengers: Endgame', intensity: 3, year: 2019 },
      { movie_id: 361743, title: 'Top Gun: Maverick', intensity: 4, year: 2022 },
      { movie_id: 603692, title: 'John Wick: Chapter 4', intensity: 5, year: 2023 },
      { movie_id: 872585, title: 'Oppenheimer', intensity: 5, year: 2023 },
    ],
  },
  {
    id: 'action-tv-heat',
    slug: 'action-tv-heat',
    title: 'Action TV: Rising Heat',
    subtitle: 'Binge the burn, episode by episode energy.',
    summary:
      'Series that start with atmosphere and escalate into pressure you feel across seasons — mystery, crime, fantasy, and pure kinetic craft.',
    theme: 'action',
    media_type: 'tv',
    items: [
      { movie_id: 66732, title: 'Stranger Things', intensity: 1, year: 2016 },
      { movie_id: 1396, title: 'Breaking Bad', intensity: 2, year: 2008 },
      { movie_id: 87108, title: 'Chernobyl', intensity: 3, year: 2019 },
      { movie_id: 1399, title: 'Game of Thrones', intensity: 4, year: 2011 },
      { movie_id: 94605, title: 'Arcane', intensity: 5, year: 2021 },
    ],
  },
  {
    id: 'romance-glance',
    slug: 'romance-glance',
    title: 'Romance Arc: Glance → Free Fall',
    subtitle: 'Soft start. Full heart.',
    summary:
      'A path from first glances and bittersweet near-misses into the stories that leave you wrecked — music, memory, and all-in love.',
    theme: 'romance',
    media_type: 'movie',
    items: [
      { movie_id: 313369, title: 'La La Land', intensity: 1, year: 2016 },
      { movie_id: 372058, title: 'Your Name.', intensity: 2, year: 2016 },
      { movie_id: 13, title: 'Forrest Gump', intensity: 2, year: 1994 },
      { movie_id: 11216, title: 'Cinema Paradiso', intensity: 3, year: 1988 },
      { movie_id: 597, title: 'Titanic', intensity: 4, year: 1997 },
      { movie_id: 11036, title: 'The Notebook', intensity: 5, year: 2004 },
    ],
  },
  {
    id: 'horror-unease',
    slug: 'horror-unease',
    title: 'Horror Arc: Unease → No Sleep',
    subtitle: 'Whispers first. Then the scream.',
    summary:
      'Social dread into family rot into daylight horror — then the classics that still own the night. Intensity only goes one direction.',
    theme: 'horror',
    media_type: 'movie',
    items: [
      { movie_id: 419430, title: 'Get Out', intensity: 1, year: 2017 },
      { movie_id: 493922, title: 'Hereditary', intensity: 2, year: 2018 },
      { movie_id: 530385, title: 'Midsommar', intensity: 3, year: 2019 },
      { movie_id: 694, title: 'The Shining', intensity: 4, year: 1980 },
      { movie_id: 346364, title: 'It', intensity: 4, year: 2017 },
      { movie_id: 138843, title: 'The Conjuring', intensity: 5, year: 2013 },
    ],
  },
  {
    id: 'mind-crack',
    slug: 'mind-crack',
    title: 'Mind-bender Arc: Crack → Shatter',
    subtitle: 'Question everything. Then question that.',
    summary:
      'Puzzle-box storytelling that starts with a hairline fracture in reality and ends with nothing you can trust — prestige, identity, and the long con.',
    theme: 'mind',
    media_type: 'movie',
    items: [
      { movie_id: 1124, title: 'The Prestige', intensity: 1, year: 2006 },
      { movie_id: 27205, title: 'Inception', intensity: 2, year: 2010 },
      { movie_id: 77, title: 'Memento', intensity: 3, year: 2000 },
      { movie_id: 141, title: 'Donnie Darko', intensity: 3, year: 2001 },
      { movie_id: 274, title: 'The Silence of the Lambs', intensity: 4, year: 1991 },
      { movie_id: 210577, title: 'Gone Girl', intensity: 5, year: 2014 },
    ],
  },
];

export function getArcById(id) {
  return OFFICIAL_ARCS.find((a) => a.id === id || a.slug === id) || null;
}

export function listArcs(filter = {}) {
  let arcs = [...OFFICIAL_ARCS];
  if (filter.theme) arcs = arcs.filter((a) => a.theme === filter.theme);
  if (filter.media_type) arcs = arcs.filter((a) => a.media_type === filter.media_type);
  return arcs.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    subtitle: a.subtitle,
    summary: a.summary || a.subtitle,
    theme: a.theme,
    media_type: a.media_type,
    item_count: a.items.length,
    max_intensity: Math.max(...a.items.map((i) => i.intensity)),
    theme_meta: ARC_THEMES[a.theme] || ARC_THEMES.action,
  }));
}

/** Suggest intensity order for a free-form list of movies (user watchlist Arc mode) */
export function suggestArcOrder(movies) {
  // Heuristic: lower vote_average first (gentler) → higher intensity at end;
  // boost runtime and recency slightly for "peak" feel
  return [...movies]
    .map((m, idx) => {
      const rating = Number(m.vote_average || m.rating || 6);
      const runtime = Number(m.runtime || 100);
      const year = Number((m.release_date || m.year || '2000').toString().slice(0, 4));
      const score = rating * 1.2 + runtime / 40 + (year - 1990) / 20;
      return { ...m, _arcScore: score, _origIdx: idx };
    })
    .sort((a, b) => a._arcScore - b._arcScore)
    .map((m, i, arr) => {
      const intensity = Math.min(5, Math.max(1, Math.ceil(((i + 1) / arr.length) * 5)));
      const { _arcScore, _origIdx, ...rest } = m;
      return { ...rest, intensity, arc_order: i };
    });
}
