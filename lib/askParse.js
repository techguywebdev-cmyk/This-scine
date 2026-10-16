// "Ask Thiscene": turn a plain sentence into a movie search, with no paid AI.
// parseAsk('something funny from the 90s on Netflix under 2 hours') →
//   { genres:['Comedy'], yearFrom:1990, yearTo:1999, providers:[8], maxRuntime:120, chips:[…] }

const has = (s, re) => re.test(s);
const words = (list) => new RegExp(`\\b(?:${list.join('|')})\\b`, 'i');

// Moods and genre words → genres (+ optional TMDB keyword ids and sort hints)
const MOODS = [
  { re: words(['funny', 'comedy', 'comedies', 'hilarious', 'laugh', 'laughs', 'lighthearted', 'light-hearted', 'silly', 'goofy']), genres: ['Comedy'], chip: 'Funny' },
  { re: words(['scary', 'horror', 'terrifying', 'creepy', 'spooky', 'frightening', 'haunted']), genres: ['Horror'], chip: 'Scary' },
  { re: words(['feel[- ]?good', 'uplifting', 'heartwarming', 'wholesome', 'happy', 'cheer me up', 'comforting', 'cozy', 'cosy']), genres: ['Comedy', 'Family'], any: true, chip: 'Feel-good' },
  { re: words(['romantic', 'romance', 'love story', 'rom[- ]?com', 'date night', 'date-night']), genres: ['Romance'], chip: 'Romantic' },
  { re: words(['rom[- ]?com']), genres: ['Romance', 'Comedy'], chip: 'Rom-com' },
  { re: words(['sad', 'cry', 'tearjerker', 'tear-jerker', 'emotional', 'moving', 'heartbreaking']), genres: ['Drama'], chip: 'Emotional' },
  { re: words(['mind[- ]?bending', 'mind[- ]?blowing', 'twist', 'twists', 'trippy', 'cerebral', 'makes me think', 'thought[- ]provoking']), genres: ['Sci-Fi', 'Mystery', 'Thriller'], any: true, chip: 'Mind-bending' },
  { re: words(['intense', 'edge of my seat', 'edge-of-your-seat', 'suspense', 'suspenseful', 'thriller', 'thrillers', 'gripping', 'tense']), genres: ['Thriller'], chip: 'Intense' },
  { re: words(['action', 'action[- ]packed', 'explosions', 'fight', 'fights', 'fighting', 'adrenaline']), genres: ['Action'], chip: 'Action' },
  { re: words(['sci[- ]?fi', 'science fiction', 'space', 'aliens?', 'futuristic', 'robots?', 'dystopian']), genres: ['Sci-Fi'], chip: 'Sci-fi' },
  { re: words(['fantasy', 'magic', 'magical', 'dragons?', 'wizards?']), genres: ['Fantasy'], chip: 'Fantasy' },
  { re: words(['animated', 'animation', 'cartoon', 'cartoons', 'anime', 'pixar']), genres: ['Animation'], chip: 'Animated' },
  { re: words(['kids', 'family', 'children', 'with my kids', 'for the kids', 'all ages']), genres: ['Family'], chip: 'Family', family: true },
  { re: words(['documentary', 'documentaries', 'docuseries', 'doc']), genres: ['Documentary'], chip: 'Documentary' },
  { re: words(['crime', 'gangsters?', 'mafia', 'mob', 'detective', 'detectives', 'cops?', 'murder']), genres: ['Crime'], chip: 'Crime' },
  { re: words(['mystery', 'mysteries', 'whodunn?it']), genres: ['Mystery'], chip: 'Mystery' },
  { re: words(['war', 'soldiers?', 'ww2', 'wwii', 'world war']), genres: ['War'], chip: 'War' },
  { re: words(['western', 'westerns', 'cowboys?']), genres: ['Western'], chip: 'Western' },
  { re: words(['adventure', 'adventures', 'epic', 'quest', 'journey']), genres: ['Adventure'], chip: 'Adventure' },
  { re: words(['history', 'historical', 'period piece', 'period drama']), genres: ['History'], chip: 'Historical' },
  { re: words(['drama', 'dramas', 'serious']), genres: ['Drama'], chip: 'Drama' },
];

// Topics TMDB tracks as keywords (ids are TMDB keyword ids)
const KEYWORDS = [
  { re: words(['true story', 'based on a true story', 'real events', 'real story', 'biopic']), id: 9672, chip: 'True story' },
  { re: words(['heist', 'heists', 'robbery', 'bank job']), id: 10051, chip: 'Heist' },
  { re: words(['time travel', 'time-travel', 'time loop']), id: 4379, chip: 'Time travel' },
  { re: words(['zombies?', 'undead']), id: 12377, chip: 'Zombies' },
  { re: words(['superheroes?', 'superhero', 'marvel', 'dc comics']), id: 9715, chip: 'Superheroes' },
  { re: words(['sports?', 'football', 'soccer', 'basketball', 'boxing', 'boxer']), id: 6075, chip: 'Sport' },
  { re: words(['vampires?']), id: 3133, chip: 'Vampires' },
  { re: words(['serial killers?']), id: 10714, chip: 'Serial killer' },
  { re: words(['coming of age', 'coming-of-age', 'high school', 'teen', 'teens', 'teenage']), id: 10683, chip: 'Coming of age' },
  { re: words(['dystopia', 'dystopian', 'post[- ]apocalyptic', 'apocalypse']), id: 4565, chip: 'Dystopia' },
  { re: words(['road trip']), id: 7312, chip: 'Road trip' },
  { re: words(['christmas', 'holiday', 'xmas']), id: 207317, chip: 'Christmas' },
  { re: words(['musical', 'musicals']), id: 4344, chip: 'Musical' },
  { re: words(['revenge']), id: 9748, chip: 'Revenge' },
  { re: words(['spy', 'spies', 'espionage', 'secret agent']), id: 470, chip: 'Spies' },
];

const LANGS = [
  [words(['korean', 'k[- ]?drama']), 'ko', 'Korean'], [words(['japanese']), 'ja', 'Japanese'], [words(['french']), 'fr', 'French'],
  [words(['spanish']), 'es', 'Spanish'], [words(['bollywood', 'hindi', 'indian']), 'hi', 'Hindi'], [words(['italian']), 'it', 'Italian'],
  [words(['german']), 'de', 'German'], [words(['chinese', 'mandarin', 'cantonese']), 'zh', 'Chinese'], [words(['nollywood', 'nigerian']), 'en', 'Nollywood'],
  [words(['turkish']), 'tr', 'Turkish'], [words(['danish']), 'da', 'Danish'], [words(['swedish']), 'sv', 'Swedish'], [words(['thai']), 'th', 'Thai'],
];

export const PROVIDERS = [
  [words(['netflix']), 8, 'Netflix'], [words(['prime', 'prime video', 'amazon']), 9, 'Prime Video'], [words(['disney\\+?', 'disney plus']), 337, 'Disney+'],
  [words(['apple tv\\+?', 'apple']), 350, 'Apple TV+'], [words(['max', 'hbo', 'hbo max']), 1899, 'Max'], [words(['hulu']), 15, 'Hulu'],
  [words(['paramount\\+?', 'paramount plus']), 531, 'Paramount+'], [words(['peacock']), 386, 'Peacock'], [words(['crunchyroll']), 283, 'Crunchyroll'],
];

// Filler words that never carry the subject of a request
const STOP = ["i'?m", 'im', 'i', 'me', 'my', 'we', 'us', 'our', 'you', 'your', 'can', 'could', 'would', "i'?d", 'please', 'want', 'wanna', 'need', 'looking', 'look', 'for', 'find', 'show me', 'give me', 'get me', 'recommend', 'recommendation', 'recommendations', 'suggest', 'suggestion', 'suggestions', 'some', 'something', 'anything', 'any', 'a', 'an', 'the', 'good', 'nice', 'cool', 'great', 'best', 'top', 'movie', 'movies', 'film', 'films', 'series', 'show', 'shows', 'tv', 'watch', 'watching', 'see', 'to', 'of', 'and', 'or', 'in', 'on', 'at', 'it', 'its', 'is', 'are', 'be', 'that', 'this', 'which', 'what', 'about', 'with', 'starring', 'featuring', 'feat', 'by', 'directed', 'director', 'from', 'story', 'life', 'based', 'biopic', 'biography', 'inspired', 'acted', 'played', 'tonight', 'today', 'now', 'like', 'similar', 'type', 'kind', 'sort', 'one', 'ones', 'please', 'thanks', 'lol', 'really', 'very', 'so', 'just', 'also', 'maybe', 'tell', 'whats', "what's", 'there', 'have', 'has', 'got', 'new', 'old', 'recent', 'latest', 'popular', 'trending', 'short', 'long', 'not', 'no', 'without', 'more', 'less', 'netflix', 'prime', 'hulu', 'max', 'english', 'subtitles'];

const NUM = { one: 1, two: 2, three: 3, a: 1, an: 1, half: 0.5 };
const num = (s) => (NUM[s] != null ? NUM[s] : parseFloat(s));

export function parseAsk(input) {
  const raw = String(input || '').trim().slice(0, 300);
  const s = ` ${raw.toLowerCase().replace(/[’']/g, "'")} `;
  const out = { raw, genres: [], anyGenre: false, without: [], keywords: [], chips: [], providers: [], type: 'movie' };
  const chip = (c) => { if (c && !out.chips.includes(c)) out.chips.push(c); };

  // "like Interstellar", "similar to The Office", "in the vibe of Knives Out"
  const like = raw.match(/\b(?:like|similar to|vibes? (?:of|like)|in the style of|same vibe as|reminds? me of|as good as)\s+["“]?([^,.;!?"”]+?)["”]?(?=\s+(?:but|and|with|without|from|on|in|under|over|that|for|which|only|less|more|shorter|longer|not)\b|[,.;!?]|$)/i);
  const wantLike = like && /\b(?:would|i'?d|i|we|you|really|just|also|they)\s*$/i.test(raw.slice(0, like.index).replace(/[’']/g, "'"));
  if (like && like[1] && !wantLike && like[1].trim().length > 1 && !/^(that|this|it|something|anything|a|the|an?\s+(?:movie|film|show|series)\b.*)$/i.test(like[1].trim())) {
    out.likeTitle = like[1].trim().replace(/\s+(movie|film|show|series)$/i, '');
    chip(`Like ${out.likeTitle}`);
  }
  const rest = like && !wantLike && out.likeTitle ? s.replace(like[0].toLowerCase(), ' ') : s;

  // TV vs film
  if (has(rest, /\b(series|show|shows|tv|sitcom|sitcoms|binge|seasons?|episodes?|k[- ]?drama)\b/)) { out.type = 'tv'; out.typeExplicit = true; chip('Series'); }
  else if (has(rest, /\b(movie|movies|film|films)\b/)) { out.type = 'movie'; out.typeExplicit = true; }

  // "not scary", "no horror", "without romance"
  for (const m of MOODS) {
    const neg = new RegExp(`\\b(?:not|no|nothing|without|avoid|hate|hates|don'?t want)\\s+(?:too\\s+|any\\s+|a\\s+)?(?:${m.re.source.replace(/^\\b\(\?:|\)\\b$/g, '')})`, 'i');
    if (neg.test(rest)) { out.without.push(...m.genres.filter((g) => g !== 'Family')); chip(`Not ${m.chip.toLowerCase()}`); continue; }
    if (m.re.test(rest)) {
      if (m.any) out.anyGenre = true;
      for (const g of m.genres) if (!out.genres.includes(g)) out.genres.push(g);
      if (m.family) out.family = true;
      chip(m.chip);
    }
  }
  if (out.genres.includes('Romance') && out.genres.includes('Comedy') && out.chips.includes('Rom-com')) out.chips = out.chips.filter((c) => c !== 'Romantic' && c !== 'Funny');
  // several moods → match any of them rather than all (keeps results non-empty)
  if (out.genres.length > 2) out.anyGenre = true;

  for (const k of KEYWORDS) if (k.re.test(rest)) { out.keywords.push(k.id); chip(k.chip); }

  // Decades & years
  const dec = rest.match(/\b(?:(19|20)?(\d)0)'?s\b/);
  if (dec) {
    const d = Number(dec[2]); const c = dec[1] ? Number(dec[1]) : d >= 3 ? 19 : 20;
    out.yearFrom = c * 100 + d * 10; out.yearTo = out.yearFrom + 9; chip(`${String(out.yearFrom).slice(dec[1] ? 0 : 2)}s`);
  }
  const yr = rest.match(/\b(?:from|in|released in)\s+((?:19|20)\d{2})\b/);
  if (yr) { out.yearFrom = out.yearTo = Number(yr[1]); chip(yr[1]); }
  const after = rest.match(/\b(?:after|since|newer than|post)\s+((?:19|20)\d{2})\b/); if (after) { out.yearFrom = Number(after[1]); chip(`After ${after[1]}`); }
  const before = rest.match(/\b(?:before|older than|pre)\s+((?:19|20)\d{2})\b/); if (before) { out.yearTo = Number(before[1]); chip(`Before ${before[1]}`); }
  const now = new Date().getFullYear();
  if (has(rest, /\b(new|newest|recent|latest|this year|just came out|brand new|fresh)\b/) && !out.yearFrom) { out.yearFrom = now - 2; out.sort = 'new'; chip('Recent'); }
  if (has(rest, /\b(old|classic|classics|oldies|vintage|golden age)\b/) && !out.yearTo) { out.yearTo = 1995; out.sort = 'top'; chip('Classic'); }

  // Length
  const under = rest.match(/\b(?:under|less than|shorter than|no more than|max|at most|below)\s+(\d+(?:\.\d+)?|one|two|three|an?|half)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/);
  if (under) { const n = num(under[1]); out.maxRuntime = Math.round(/^h/.test(under[2]) ? n * 60 : n); chip(`Under ${out.maxRuntime >= 60 && out.maxRuntime % 60 === 0 ? `${out.maxRuntime / 60}h` : `${out.maxRuntime}m`}`); }
  else if (has(rest, /\bshorter\b/) && out.likeTitle) { out.shorter = true; chip('Shorter'); }
  else if (has(rest, /\b(short|shorter|quick|shortish|not too long|not long)\b/)) { out.maxRuntime = 100; chip('Short'); }
  const overR = rest.match(/\b(?:over|longer than|more than|at least)\s+(\d+(?:\.\d+)?|one|two|three|an?)\s*(hours?|hrs?|h)\b/);
  if (overR) { out.minRuntime = Math.round(num(overR[1]) * 60); chip(`Over ${out.minRuntime / 60}h`); }
  else if (has(rest, /\b(long|epic length|a long one)\b/) && !out.maxRuntime) { out.minRuntime = 140; chip('Long'); }

  // Language
  if (has(rest, /\b(no subtitles|without subtitles|hates? subtitles|(?:don'?t|doesn'?t) (?:like|want|do) subtitles|no subs|in english|english only|english[- ]language)\b/)) { out.language = 'en'; chip('In English'); }
  for (const [re, code, name] of LANGS) if (re.test(rest)) { out.language = code; if (name === 'Nollywood') out.region = 'NG'; chip(name); break; }

  // Where to watch
  for (const [re, id, name] of PROVIDERS) if (re.test(rest)) { out.providers.push(id); chip(`On ${name}`); }

  // Quality / discovery style
  if (has(rest, /\b(underrated|hidden gems?|lesser[- ]known|nobody'?s seen|obscure|under the radar)\b/)) { out.sort = 'hidden'; chip('Hidden gems'); }
  else if (has(rest, /\b(best|highest rated|top rated|masterpiece|acclaimed|award[- ]winning|oscar|great|critically)\b/)) { out.sort = out.sort || 'top'; chip('Highly rated'); }
  else if (has(rest, /\b(popular|trending|everyone'?s watching|hyped|blockbuster)\b/)) { out.sort = 'popular'; chip('Popular'); }

  // Family-safe
  if (out.family || has(rest, /\b(clean|no sex|nothing explicit|family[- ]friendly|safe for kids|with my parents|with my mum|with my mom|with my dad)\b/)) { out.safe = true; if (!out.chips.includes('Family')) chip('Family-friendly'); }

  // What's left once moods, filters and filler are taken out is the subject: a person, a topic or a title.
  // "a movie about Steve Jobs" → subject "steve jobs" (about) · "films with Denzel Washington" → (person)
  const used = [...MOODS.map((m) => m.re), ...KEYWORDS.map((k) => k.re), ...LANGS.map((l) => l[0]), ...PROVIDERS.map((x) => x[0])];
  let left = ` ${rest} `;
  for (const re of used) left = left.replace(new RegExp(re.source, 'gi'), ' ');
  const rel = left.match(/\b(about|on the life of|the life of|life of|story of|based on|biopic of|biography of|inspired by|with|starring|featuring|feat|by|directed by|from director|acted by|played by)\s+(.+)$/i);
  if (rel) out.subjectMode = /^(with|starring|featuring|feat|acted by|played by)$/i.test(rel[1]) ? 'cast' : /^(by|directed by|from director)$/i.test(rel[1]) ? 'crew' : 'about';
  left = left
    .replace(/\b(?:(?:19|20)?\d0'?s|(?:19|20)\d{2})\b/g, ' ')
    .replace(/\b(?:under|less than|shorter than|over|longer than|more than|at least|at most|max)\s+\S+\s*(?:hours?|hrs?|h|minutes?|mins?|m)\b/g, ' ')
    .replace(new RegExp(`\\b(?:${STOP.join('|')})\\b`, 'gi'), ' ')
    .replace(/[^a-z0-9&:'\- ]+/gi, ' ').replace(/\s+/g, ' ').trim();
  if (left.length >= 3 && /[a-z]/.test(left) && !out.likeTitle) {
    out.subject = left.slice(0, 60);
    if (!out.subjectMode) out.subjectMode = 'any';
  }

  out.understood = !!(out.subject || out.likeTitle || out.genres.length || out.keywords.length || out.yearFrom || out.yearTo || out.maxRuntime || out.minRuntime || out.language || out.providers.length || out.sort || out.without.length || out.type === 'tv');
  return out;
}
