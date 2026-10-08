'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import CineArcs from './CineArcs';

// ─── DESIGN TOKENS ──────────────────────────────────────────────────────────
// Neutrals carry the visual weight since the accent color is dynamic (shifts per
// movie/mood). Borders are quiet hairlines, not boxes; separation comes from
// whitespace and the serif/sans type pairing rather than bordered containers.
const T = {
  bg:        '#06060B',            // near-black base, cinematic dim-theater feel
  surface:   'rgba(255,255,255,0.05)', // elevated cards — frosted glass over the page wash
  surface2:  'rgba(255,255,255,0.025)', // subtler inline surface (list rows, inputs)
  hairline:  'rgba(255,255,255,0.06)',  // default border
  hairlineStrong: 'rgba(255,255,255,0.1)',
  text:      'rgba(255,255,255,0.92)',  // primary text, off-white not pure white
  text2:     'rgba(255,255,255,0.45)',  // secondary text
  text3:     'rgba(255,255,255,0.25)',  // tertiary / caption / placeholder
  serif:     "var(--font-display), 'Inter Tight', system-ui, -apple-system, sans-serif",
};

// Soft cinematic page backdrop: the current film's accent washes across the whole screen.
// Noir films (silver accent) get a pure black backdrop instead of a tint.
const NOIR = '#E6E6EA';
const ambient = (a = '#F5A623') => a === NOIR
  ? 'radial-gradient(120% 70% at 0% 0%, rgba(255,255,255,0.06) 0%, transparent 70%), #000000'
  : `radial-gradient(120% 70% at 0% 0%, ${a}2e 0%, transparent 70%), radial-gradient(120% 70% at 100% 100%, ${a}24 0%, transparent 70%), linear-gradient(165deg, ${a}1f 0%, ${a}12 50%, ${a}1c 100%), #06060B`;

// Tracked-out uppercase eyebrow label, used above stats/sections instead of bordered headers
const Eyebrow = ({ children, color = T.text3, style = {} }) => (
  <div style={{ fontSize: 9.5, letterSpacing: 2.2, color, fontWeight: 700, textTransform: 'uppercase', ...style }}>{children}</div>
);

// Large serif numeral, the hero treatment for stats/scores/counts throughout the app
const SerifStat = ({ children, size = 20, color = T.text, style = {} }) => (
  <div style={{ fontFamily: T.serif, letterSpacing: '-0.02em', fontSize: size, fontWeight: 700, color, lineHeight: 1.1, ...style }}>{children}</div>
);

// Hairline divider replacing bordered-box separation
const Hairline = ({ style = {} }) => (
  <div style={{ height: 1, background: T.hairline, ...style }} />
);

// Soft radial glow in the active accent color, the app's one signature motif -
// the chrome visibly "reacts" to whatever movie/content is currently in focus
const AccentGlow = ({ accent, size = 140, style = {} }) => (
  <div style={{ position: 'absolute', width: size, height: size, borderRadius: '50%', background: `radial-gradient(circle,${accent}26 0%,transparent 70%)`, pointerEvents: 'none', ...style }} />
);

const SvgIcon = ({ name, size = 20, color = 'currentColor', filled = false }) => {
  const icons = {
    search:   'M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z',
    close:    ['M18 6L6 18','M6 6l12 12'],
    sliders:  ['M4 21v-7','M4 10V3','M12 21v-9','M12 8V3','M20 21v-5','M20 12V3','M1 14h6','M9 8h6','M17 16h6'],
    heart:    'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
    star:     'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    chat:     'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    bookmark: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z',
    send:     ['M22 2L11 13','M22 2l-7 20-4-9-9-4 20-7z'],
    chevron:  'M6 9l6 6 6-6',
    flame:    'M12 2s-5 5.5-5 10a5 5 0 0 0 10 0C17 7.5 12 2 12 2z',
    sparkle:  'M12 2l2.4 7.4H22l-6.2 4.6 2.4 7.4L12 17l-6.2 4.4 2.4-7.4L2 9.4h7.6z',
    gem:      ['M6 3h12l4 6-10 13L2 9z','M2 9h20','M6 3l4 6','M18 3l-4 6'],
    eye:      ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z','M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
    similar:  'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
    reply:    ['M9 17l-5-5 5-5','M4 12h11a4 4 0 0 1 0 8h-1'],
    user:     ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2','M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
    people:   ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2','M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z','M23 21v-2a4 4 0 0 0-3-3.87','M16 3.13a4 4 0 0 1 0 7.75'],
    logout:   ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4','M16 17l5-5-5-5','M21 12H9'],
    trash:    ['M3 6h18','M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6','M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2'],
    check:    'M20 6L9 17l-5-5',
    share:    ['M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8','M16 6l-4-4-4 4','M12 2v13'],
    play:     'M5 3l14 9-14 9V3z',
    settings: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z','M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'],
    list:     ['M8 6h13','M8 12h13','M8 18h13','M3 6h.01','M3 12h.01','M3 18h.01'],
    plus:     ['M12 5v14','M5 12h14'],
    globe:    ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z','M2 12h20','M12 2a15 15 0 0 1 0 20','M12 2a15 15 0 0 0 0 20'],
    notFor:   ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z','M4.9 4.9l14.2 14.2'],
    folder:   'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    lock:     ['M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z','M8 11V8a4 4 0 0 1 8 0v3'],
    calendar: ['M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z','M16 2v4','M8 2v4','M3 10h18'],
    clock:    ['M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z','M12 6v6l4 2'],
    bell:     ['M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9','M13.73 21a2 2 0 0 1-3.46 0'],
    userPlus: ['M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2','M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z','M19 8v6','M22 11h-6'],
    dots:     ['M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z','M19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z','M5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z'],
    badgeCheck:['M12 2l2.4 1.7 2.8-.3 1.1 2.6 2.6 1.1-.3 2.8L22 12l-1.7 2.4.3 2.8-2.6 1.1-1.1 2.6-2.8-.3L12 22l-2.4-1.7-2.8.3-1.1-2.6-2.6-1.1.3-2.8L2 12l1.7-2.4-.3-2.8 2.6-1.1 1.1-2.6 2.8.3z','M9 12l2 2 4-4'],
    inbox:    ['M22 12h-6l-2 3h-4l-2-3H2','M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z'],
    friends:  ['M9 13a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z','M3.5 19.5v-1.2a4 4 0 0 1 4-4h3a4 4 0 0 1 4 4v1.2','M17 10.2a2.6 2.6 0 1 0 0-5.2','M19.8 16.2a3.2 3.2 0 0 0-2.6-3.1'],
    edit:     ['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7','M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'],
    trophy:   ['M8 21h8','M12 17v4','M7 4h10v6a5 5 0 0 1-10 0V4z','M7 5H4a1 1 0 0 0-1 1v1a3 3 0 0 0 3 3','M17 5h3a1 1 0 0 1 1 1v1a3 3 0 0 1-3 3'],
    masks:    ['M9 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6z','M5 8c-2 0-3 1.5-3 3.5S4 16 7 16','M15 6a3 3 0 1 1 0 6 3 3 0 0 1 0-6z','M19 8c2 0 3 1.5 3 3.5S20 16 17 16','M9 9.5c.5.5 1.5.5 2 0M15 9.5c-.5.5-1.5.5-2 0'],
    plus:     ['M12 5v14','M5 12h14'],
    gif:      ['M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z','M7 12h2.5a1.5 1.5 0 0 1 0 3H8v2','M13 9v6','M13 12h2.5','M17 9v6'],
    phone:     ['M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z'],
    phoneEnd:  ['M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07','M1 1l22 22'],
    video:     ['M23 7l-7 5 7 5V7z','M14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z'],
    videoOff:  ['M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10','M1 1l22 22'],
    mic:       ['M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z','M19 10v2a7 7 0 0 1-14 0v-2','M12 19v4','M8 23h8'],
    micOff:    ['M1 1l22 22','M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6','M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23','M12 19v4','M8 23h8'],
    speaker:   ['M11 5L6 9H2v6h4l5 4V5z','M15.54 8.46a5 5 0 0 1 0 7.07','M19.07 4.93a10 10 0 0 1 0 14.14'],
    speakerOff:['M11 5L6 9H2v6h4l5 4V5z','M23 9l-6 6','M17 9l6 6'],
    flipCam:   ['M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5','M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5','M16 11l2-2-2-2','M8 13l-2 2 2 2'],
  };
  const def = icons[name];
  if (!def) return null;
  const paths = Array.isArray(def) ? def : [def];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
};

const MoodIcon = ({ mood, size = 24, color = '#fff' }) => {
  const icons = {
    Inspired:    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L9.5 8.5H3l5.5 4-2 6.5L12 15l5.5 4-2-6.5L21 8.5h-6.5L12 2z"/></svg>,
    Thrilled:    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4 14h8l-1 8 9-12h-7l1-8z" fill={color} fillOpacity="0.2"/><path d="M13 2L4 14h8l-1 8 9-12h-7l1-8z"/></svg>,
    Scared:      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9-4-9-9-9z"/><path d="M9 10h.01M15 10h.01"/><path d="M9 15c.5-1 1.5-2 3-2s2.5 1 3 2"/><path d="M12 3v3M5.2 5.2l2.1 2.1M18.8 5.2l-2.1 2.1"/></svg>,
    Romantic:    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
    'Mind-blown':<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><path d="M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/></svg>,
    Laugh:       <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 9.5c.5-.5 1-.5 1.5 0M14.5 9.5c.5-.5 1-.5 1.5 0"/><path d="M7 13.5s1.5 3.5 5 3.5 5-3.5 5-3.5" fill={color} fillOpacity="0.15"/><path d="M7 13.5s1.5 3.5 5 3.5 5-3.5 5-3.5"/></svg>,
    Emotional:   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01"/><path d="M9 15.5c1-1.5 5-1.5 6 0"/><path d="M10 7l-1-2M14 7l1-2" opacity="0.6"/></svg>,
    Epic:        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2.5l-5 5-3-1-4 4 2 1-3 4h4l1 3 4-3 1 2 4-4-1-3 5-5z" fill={color} fillOpacity="0.15"/><path d="M14.5 2.5l-5 5-3-1-4 4 2 1-3 4h4l1 3 4-3 1 2 4-4-1-3 5-5z"/></svg>,
    Dark:        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill={color} fillOpacity="0.2"/><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
    Nostalgic:   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><circle cx="12" cy="13" r="3"/><path d="M2 10h20" opacity="0.4"/></svg>,
  };
  return icons[mood] || null;
};

const GENRE_OPTIONS = [
  {label:'All',id:''},{label:'Action',id:'28'},{label:'Drama',id:'18'},
  {label:'Horror',id:'27'},{label:'Sci-Fi',id:'878'},{label:'Comedy',id:'35'},
  {label:'Thriller',id:'53'},{label:'Romance',id:'10749'},
  {label:'Animation',id:'16'},{label:'Documentary',id:'99'},
];

// Full TMDB genre name -> id map (movie genre list), used for profile cover photo lookups
const TMDB_GENRE_IDS = {
  'Action':'28','Adventure':'12','Animation':'16','Comedy':'35','Crime':'80',
  'Documentary':'99','Drama':'18','Family':'10751','Fantasy':'14','History':'36',
  'Horror':'27','Music':'10402','Mystery':'9648','Romance':'10749','Science Fiction':'878',
  'Sci-Fi':'878','TV Movie':'10770','Thriller':'53','War':'10752','Western':'37',
};

const FEED_MOODS = [
  { label:'Trending',    icon:'flame',   desc:"What's hot right now" },
  { label:'Top Rated',   icon:'star',    desc:'Highest rated picks' },
  { label:'New',         icon:'sparkle', desc:'Fresh out this week' },
  { label:'Hidden Gems', icon:'gem',     desc:'Underrated classics' },
];

const FEEL_MOODS = [
  { label:'Inspired',   color:'#F5C842', bg:'#2A2000', genres:'18,36',    desc:'Stories of triumph & courage' },
  { label:'Thrilled',   color:'#4DA8FF', bg:'#001528', genres:'28,53',    desc:'Edge-of-your-seat tension' },
  { label:'Scared',     color:'#FF4444', bg:'#200000', genres:'27',       desc:'Things that go bump at night' },
  { label:'Romantic',   color:'#FF6BAE', bg:'#200010', genres:'10749,18', desc:'Love stories that move you' },
  { label:'Mind-blown', color:'#B07FEF', bg:'#0E0020', genres:'878,9648', desc:'Reality-bending narratives' },
  { label:'Laugh',      color:'#6BEF9E', bg:'#002010', genres:'35',       desc:'Pure unfiltered comedy' },
  { label:'Emotional',  color:'#7BC8FF', bg:'#001020', genres:'18,10749', desc:'Films that make you feel deeply' },
  { label:'Epic',       color:'#FF7A2F', bg:'#200800', genres:'28,14,12', desc:'Grand adventures & battles' },
  { label:'Dark',       color:'#AAAAAA', bg:'#0A0A0A', genres:'80,53,18', desc:'Noir, crime & moral ambiguity' },
  { label:'Nostalgic',  color:'#C4922A', bg:'#1A0E00', genres:'35,18',   desc:'Classic tales from another era' },
];

const GRADS = [
  'linear-gradient(170deg,#0a0500 0%,#2e1c00 50%,#7a4800 100%)',
  'linear-gradient(170deg,#080300 0%,#200d00 50%,#6b2800 100%)',
  'linear-gradient(170deg,#060310 0%,#120830 50%,#3d1f7a 100%)',
  'linear-gradient(170deg,#060000 0%,#1c0505 50%,#5c1212 100%)',
  'linear-gradient(170deg,#00060d 0%,#001428 50%,#0a3352 100%)',
  'linear-gradient(170deg,#050300 0%,#150e00 50%,#3d2800 100%)',
  'linear-gradient(170deg,#000600 0%,#081508 50%,#1a4a1a 100%)',
  'linear-gradient(170deg,#080005 0%,#200010 50%,#6b0a35 100%)',
];

function getContentLabel(movie) {
  if (!movie) return 'Films';
  const genres = (movie.genre || []).map(g => g.toLowerCase());
  if (genres.includes('animation')) return 'Anime & Cartoons';
  if (movie.isTV) return 'Series';
  return 'Movies';
}

function CertBadge({ cert }) {
  if (!cert) return null;
  const color = cert==='R'||cert==='NC-17'||cert==='18'||cert==='TV-MA' ? '#FF4444'
    : cert==='PG-13'||cert==='TV-14'||cert==='15' ? '#F5A623'
    : 'rgba(255,255,255,0.5)';
  return <span style={{fontSize:9,fontWeight:800,color,border:`1px solid ${color}55`,borderRadius:4,padding:'2px 5px',letterSpacing:0.5,flexShrink:0}}>{cert}</span>;
}

function loadCanvasImage(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const safeUrl = url.replace('https://image.tmdb.org/t/p/original','https://image.tmdb.org/t/p/w342').replace('https://image.tmdb.org/t/p/w500','https://image.tmdb.org/t/p/w342');
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = safeUrl;
    setTimeout(() => resolve(null), 5000);
  });
}

async function generateShareCard(type, data, accent) {
  const W=750,H=1334;
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#05050D';ctx.fillRect(0,0,W,H);
  const g1=ctx.createRadialGradient(W*.5,0,0,W*.5,0,H*.65);
  g1.addColorStop(0,accent+'30');g1.addColorStop(1,'transparent');
  ctx.fillStyle=g1;ctx.fillRect(0,0,W,H);
  ctx.shadowColor=accent;ctx.shadowBlur=20;ctx.strokeStyle=accent+'60';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.roundRect(10,10,W-20,H-20,32);ctx.stroke();ctx.shadowBlur=0;
  ctx.fillStyle='#ffffff';ctx.font='800 32px system-ui, -apple-system, Helvetica, Arial, sans-serif';ctx.textAlign='left';ctx.fillText('CineScroll',66,76);
  if(type==='score'){
    ctx.fillStyle='rgba(255,255,255,0.35)';ctx.font='600 13px sans-serif';ctx.textAlign='center';ctx.letterSpacing='4px';ctx.fillText('CINEPHILE PROFILE',W/2,152);ctx.letterSpacing='0px';
    ctx.fillStyle='#ffffff';ctx.font='800 60px system-ui, -apple-system, Helvetica, Arial, sans-serif';ctx.fillText(data.name,W/2,224);
    const cx=W/2,cy=460,r=150;
    ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=20;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
    const pct=Math.min(data.score/999,1);
    if(pct>0){const ag=ctx.createLinearGradient(cx-r,cy,cx+r,cy);ag.addColorStop(0,accent+'80');ag.addColorStop(0.5,accent);ag.addColorStop(1,accent+'cc');ctx.shadowColor=accent;ctx.shadowBlur=16;ctx.strokeStyle=ag;ctx.lineWidth=20;ctx.lineCap='round';ctx.beginPath();ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+pct*2*Math.PI);ctx.stroke();ctx.shadowBlur=0;ctx.lineCap='butt';}
    ctx.fillStyle='#ffffff';ctx.font='bold 108px Georgia, serif';ctx.shadowColor=accent;ctx.shadowBlur=20;ctx.fillText(data.score,cx,cy+34);ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='600 13px sans-serif';ctx.letterSpacing='5px';ctx.fillText('CINESCORE',cx,cy+68);ctx.letterSpacing='0px';
    const cols=[{label:'WATCHED',value:data.watched},{label:'REVIEWS',value:data.reviews},{label:'SAVED',value:data.saved}];
    const statY=680;const colW=W/3;
    cols.forEach((s,i)=>{const x=colW*i+colW/2;ctx.fillStyle='rgba(255,255,255,0.04)';ctx.beginPath();ctx.roundRect(colW*i+24,statY-46,colW-48,100,18);ctx.fill();ctx.fillStyle=accent;ctx.font='bold 34px Georgia, serif';ctx.fillText(s.value,x,statY+24);ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='600 11px sans-serif';ctx.letterSpacing='2px';ctx.fillText(s.label,x,statY+44);ctx.letterSpacing='0px';});
    ctx.fillStyle=accent+'15';ctx.beginPath();ctx.roundRect(W/2-155,830,310,50,25);ctx.fill();ctx.fillStyle=accent;ctx.font='bold 16px sans-serif';ctx.fillText('this-scine.vercel.app',W/2,860);
  } else if(type==='watchlist'){
    ctx.fillStyle='rgba(255,255,255,0.32)';ctx.font='600 13px sans-serif';ctx.textAlign='center';ctx.letterSpacing='4px';ctx.fillText('WATCHLIST',W/2,148);ctx.letterSpacing='0px';
    ctx.fillStyle='#ffffff';ctx.font='800 54px system-ui, -apple-system, Helvetica, Arial, sans-serif';ctx.fillText(data.name,W/2,210);
    const items=data.items.slice(0,6);const CARD_H=118,POSTER_W=72,POSTER_H=102,startY=296;
    for(let idx=0;idx<items.length;idx++){
      const m=items[idx];const cardY=startY+idx*(CARD_H+8);
      ctx.fillStyle='rgba(255,255,255,0.04)';ctx.beginPath();ctx.roundRect(36,cardY,W-72,CARD_H,16);ctx.fill();
      ctx.strokeStyle=accent+'22';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(36,cardY,W-72,CARD_H,16);ctx.stroke();
      const posterX=50,posterY=cardY+8;
      if(m.poster){const img=await loadCanvasImage(m.poster);if(img){ctx.save();ctx.beginPath();ctx.roundRect(posterX,posterY,POSTER_W,POSTER_H,10);ctx.clip();const scale=Math.max(POSTER_W/img.width,POSTER_H/img.height);ctx.drawImage(img,posterX+(POSTER_W-img.width*scale)/2,posterY+(POSTER_H-img.height*scale)/2,img.width*scale,img.height*scale);ctx.restore();}}
      const textX=50+POSTER_W+28;const title=m.title.length>22?m.title.slice(0,22)+'...':m.title;
      ctx.fillStyle='#ffffff';ctx.font='800 21px system-ui, -apple-system, Helvetica, Arial, sans-serif';ctx.textAlign='left';ctx.fillText(title,textX,cardY+36);
      if(m.genre&&m.genre.length>0){ctx.fillStyle=accent+'99';ctx.font='12px sans-serif';ctx.fillText(m.genre.slice(0,2).join(' · '),textX,cardY+57);}
      ctx.fillStyle='rgba(255,255,255,0.28)';ctx.font='13px sans-serif';ctx.fillText(m.year||'',textX,cardY+76);
      const ratingX=W-36-76,ratingY=cardY+CARD_H/2-16;
      ctx.fillStyle=accent+'18';ctx.beginPath();ctx.roundRect(ratingX,ratingY,68,32,16);ctx.fill();
      ctx.strokeStyle=accent+'44';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(ratingX,ratingY,68,32,16);ctx.stroke();
      ctx.fillStyle=accent;ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.fillText('* '+m.rating,ratingX+34,ratingY+20);
    }
    const urlY=H-90;ctx.fillStyle=accent+'15';ctx.beginPath();ctx.roundRect(W/2-155,urlY,310,50,25);ctx.fill();ctx.fillStyle=accent;ctx.font='bold 16px sans-serif';ctx.textAlign='center';ctx.fillText('this-scine.vercel.app',W/2,urlY+30);
  }
  const botBar=ctx.createLinearGradient(0,0,W,0);botBar.addColorStop(0,'transparent');botBar.addColorStop(0.5,accent+'cc');botBar.addColorStop(1,'transparent');
  ctx.fillStyle=botBar;ctx.beginPath();ctx.roundRect(40,H-13,W-80,3,2);ctx.fill();
  return canvas.toDataURL('image/png');
}

async function shareImage(dataUrl,title,text){
  try{const blob=await(await fetch(dataUrl)).blob();const file=new File([blob],'cinescroll.png',{type:'image/png'});if(navigator.share&&navigator.canShare({files:[file]})){await navigator.share({title,text,files:[file],url:'https://this-scine.vercel.app'});return;}}catch{}
  const a=document.createElement('a');a.href=dataUrl;a.download='cinescroll.png';a.click();
}

function calcCineScore(watched,reviews,saved){return Math.min(999,(watched*3)+(reviews*8)+(saved*2));}

function CineScoreRing({score,accent}){
  const r=38,circ=2*Math.PI*r,dash=(score/999)*circ;
  return(
    <div style={{position:'relative',width:100,height:100,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <svg width="100" height="100" style={{position:'absolute',inset:0,transform:'rotate(-90deg)'}}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"/>
        <circle cx="50" cy="50" r={r} fill="none" stroke={accent} strokeWidth="6" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{transition:'stroke-dasharray 1s ease'}}/>
      </svg>
      <div style={{textAlign:'center',zIndex:1}}>
        <div style={{fontFamily:T.serif,letterSpacing:'-0.02em',fontSize:22,fontWeight:800,color:'#fff',lineHeight:1}}>{score}</div>
        <div style={{fontSize:8,letterSpacing:2,color:'rgba(255,255,255,0.35)',fontWeight:700,marginTop:2}}>SCORE</div>
      </div>
    </div>
  );
}

function Toast({message,accent}){
  return(
    <div style={{position:'fixed',top:80,left:'50%',transform:'translateX(-50%)',zIndex:200,background:'rgba(5,5,12,0.96)',backdropFilter:'blur(20px)',border:`1px solid ${accent}44`,borderRadius:24,padding:'12px 24px',display:'flex',alignItems:'center',gap:10,animation:'toastIn 0.3s cubic-bezier(0.22,1,0.36,1)',whiteSpace:'nowrap'}}>
      <div style={{width:8,height:8,borderRadius:'50%',background:accent}}/>
      <span style={{fontSize:14,fontWeight:600,color:'#fff'}}>{message}</span>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(-16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
    </div>
  );
}

function StreamingBadges({ movieId, mediaType, title, year }) {
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    if (!movieId) return;
    const type = mediaType === 'tv' ? 'tv' : 'movie';
    let cancelled = false;
    fetch(`/api/providers?id=${movieId}&type=${type}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || data.error) return;
        setProviders(data.providers || []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [movieId, mediaType]);

  if (providers.length === 0) return null;

  // Direct platform links only (no TMDB). HTTPS universal links open the installed app when possible.
  const providerLinks = (p) => {
    const raw = [title, year].filter(Boolean).join(' ');
    const q = encodeURIComponent(raw || title || '');
    const name = (p.provider_name || '').toLowerCase();
    const id = p.provider_id;

    // Netflix (provider 8)
    if (id === 8 || name.includes('netflix')) {
      return {
        app: `nflx://www.netflix.com/search?q=${q}`,
        web: `https://www.netflix.com/search?q=${q}`,
      };
    }
    // Prime Video (9, 119, 10)
    if (id === 9 || id === 119 || id === 10 || name.includes('prime') || name.includes('amazon')) {
      return {
        app: `aiv://aiv/search?phrase=${q}`,
        web: `https://www.amazon.com/gp/video/search?phrase=${q}&ie=UTF8`,
      };
    }
    // Disney+ (337)
    if (id === 337 || name.includes('disney')) {
      return {
        app: `disneyplus://search/${q}`,
        web: `https://www.disneyplus.com/search/${q}`,
      };
    }
    // Hulu (15)
    if (id === 15 || name.includes('hulu')) {
      return {
        app: `hulu://search?q=${q}`,
        web: `https://www.hulu.com/search?q=${q}`,
      };
    }
    // Max / HBO Max (1899, 384, 31)
    if (id === 1899 || id === 384 || id === 31 || name.includes('max') || name.includes('hbo')) {
      return {
        app: `https://play.max.com/search?q=${q}`,
        web: `https://www.max.com/search?q=${q}`,
      };
    }
    // Apple TV+ (350)
    if (id === 350 || name.includes('apple')) {
      return {
        app: `https://tv.apple.com/search?term=${q}`,
        web: `https://tv.apple.com/search?term=${q}`,
      };
    }
    // Paramount+ (531)
    if (id === 531 || name.includes('paramount')) {
      return {
        app: `https://www.paramountplus.com/search/?q=${q}`,
        web: `https://www.paramountplus.com/search/?q=${q}`,
      };
    }
    // Peacock (386)
    if (id === 386 || name.includes('peacock')) {
      return {
        app: `https://www.peacocktv.com/search?q=${q}`,
        web: `https://www.peacocktv.com/search?q=${q}`,
      };
    }
    // Fallback: JustWatch search for that title (still not TMDB)
    return {
      app: null,
      web: `https://www.justwatch.com/us/search?q=${q}`,
    };
  };

  const openProvider = (p, e) => {
    e?.stopPropagation?.();
    e?.preventDefault?.();
    const { app, web } = providerLinks(p);
    if (!web && !app) return;
    // Prefer universal HTTPS links — on phones they usually hand off to the installed app.
    // Custom schemes as a secondary attempt when distinct from web.
    const primary = web || app;
    const secondary = app && app !== web ? app : null;
    if (secondary) {
      // Hidden iframe kick for custom schemes (iOS/Android), then open HTTPS
      try {
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'display:none;width:0;height:0;border:0';
        iframe.src = secondary;
        document.body.appendChild(iframe);
        setTimeout(() => { try { document.body.removeChild(iframe); } catch {} }, 1200);
      } catch {}
    }
    // Always open the platform URL (not TMDB) — new tab on desktop, app handoff on mobile
    const a = document.createElement('a');
    a.href = primary;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, marginBottom: 10 }}>
      <span style={{ fontSize: 9, letterSpacing: 1.6, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase' }}>
        Stream on
      </span>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {providers.map((p) => (
          <button
            key={p.provider_id}
            type="button"
            title={`Watch on ${p.provider_name}`}
            onClick={(e) => openProvider(p, e)}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.22)',
              padding: 0,
              cursor: 'pointer',
              background: 'rgba(0,0,0,0.4)',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
            }}
          >
            <img
              src={`https://image.tmdb.org/t/p/original${p.logo_path}`}
              alt={p.provider_name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

// INLINE PLAYER
export function InlinePlayer({ movie, onClose, accent, onSave, isSaved, initialTab, highlightCommentId }) {
  const [trailerKey, setTrailerKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab || 'about');
  const [showAddToList, setShowAddToList] = useState(false);
  const [movieDetails, setMovieDetails] = useState(null);
  const [cast, setCast] = useState([]);
  const [userRating, setUserRating] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentInput, setCommentInput] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [timestampMode, setTimestampMode] = useState(false);
  const [manualTimestamp, setManualTimestamp] = useState('');
  const [likedLocal, setLikedLocal] = useState({}); // cosmetic only, reviews table has no likes column
  const [viewingProfile, setViewingProfile] = useState(null);
  const commentInputRef = useRef(null);
  const { isSignedIn, user } = useUser();
  useEffect(() => {
    if (!movie?.id) return;
    setLoadingComments(true);
    fetch(`/api/reviews?movieId=${movie.id}`)
      .then(r => r.json())
      .then(d => {
        setComments(d.comments || []);
        setLoadingComments(false);
        if (highlightCommentId) {
          setTimeout(() => {
            const el = document.getElementById(`comment-${highlightCommentId}`);
            if (el) { el.scrollIntoView({ behavior:'smooth', block:'center' }); el.style.transition='background 0.3s ease'; el.style.background=`${accent}1a`; setTimeout(()=>{ el.style.background='transparent'; }, 1800); }
          }, 350);
        }
      })
      .catch(() => setLoadingComments(false));
  }, [movie?.id]);

  useEffect(() => {
    if (!movie?.id) { setNotFound(true); setLoading(false); return; }
    setLoading(true);
    setNotFound(false);
    setTrailerKey(null);
    setMovieDetails(null);
    setCast([]);
    const mediaType = movie.mediaType || (movie.isTV || movie.is_tv ? 'tv' : 'movie');
    // Trailer via server proxy (no client TMDB key needed)
    fetch(`/api/trailer?id=${movie.id}&type=${mediaType}`)
      .then(r => r.json())
      .then(d => {
        if (d.trailerKey) setTrailerKey(d.trailerKey);
        else setNotFound(true);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
    // Full details: director, runtime, release date, language, cast
    fetch(`/api/movie-details?id=${movie.id}&type=${mediaType}`)
      .then(r => r.json())
      .then(d => {
        if (d.details) {
          setMovieDetails(d.details);
          setCast(d.cast || d.details?.credits?.cast?.slice(0, 12) || []);
        }
      })
      .catch(() => {});
  }, [movie?.id, movie?.mediaType]);

  const postComment = async () => {
    if (!isSignedIn) return;
    if (!commentInput.trim()) return;
    const text = commentInput;
    const parentId = replyingTo ? replyingTo.id : null;
    const ts = (!parentId && timestampMode && manualTimestamp) ? manualTimestamp : null;
    setCommentInput(''); setManualTimestamp(''); setReplyingTo(null);
    try {
      const res = await fetch('/api/reviews', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ movieId: movie?.id, movieTitle: movie?.title, text, rating:0, parentId, time: ts }) });
      const data = await res.json();
      if (data.comment) {
        if (parentId) {
          setComments(p => p.map(c => c.id===parentId ? {...c, replies:[...(c.replies||[]), data.comment]} : c));
        } else {
          setComments(p => [data.comment, ...p]);
          fetch('/api/activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'reviewed',movieId:movie?.id,movieTitle:movie?.title,moviePoster:movie?.poster,movieYear:movie?.year,movieRating:movie?.rating,movieAccent:movie?.accent||accent,username:user?.username||user?.firstName||'user',avatarUrl:user?.imageUrl||null,reviewId:data.comment.id})}).catch(()=>{});
        }
      }
    } catch {}
  };

  const startReply = (c) => { if (!isSignedIn) return; setReplyingTo(c); setTimestampMode(false); setManualTimestamp(''); setCommentInput(`@${c.username} `); setTimeout(()=>commentInputRef.current?.focus(), 100); };
  const toggleLike = id => setLikedLocal(p => ({ ...p, [id]: !p[id] }));

  const deleteComment = async (id, parentId) => {
    if (parentId) {
      setComments(p => p.map(c => c.id===parentId ? {...c, replies:(c.replies||[]).filter(r=>r.id!==id)} : c));
    } else {
      setComments(p => p.filter(c => c.id!==id));
    }
    try {
      const res = await fetch('/api/reviews', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id }) });
      if (!res.ok) throw new Error('failed');
    } catch {
      fetch(`/api/reviews?movieId=${movie.id}`).then(r=>r.json()).then(d=>setComments(d.comments||[])).catch(()=>{});
    }
  };

  const timeAgo = (ts) => {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff/60000);
    if (mins<1) return 'now'; if (mins<60) return `${mins}m`;
    const hrs = Math.floor(mins/60); if (hrs<24) return `${hrs}h`;
    return `${Math.floor(hrs/24)}d`;
  };

  const runtime = movieDetails?.runtime;
  const runtimeStr = runtime ? `${Math.floor(runtime/60)}h ${runtime%60}m` : movieDetails?.episode_run_time?.[0] ? `${movieDetails.episode_run_time[0]}m` : null;
  const director = (movieDetails?.credits?.crew || []).find(c => c.job === 'Director') || (movieDetails?.created_by||[])[0];
  const language = movieDetails?.spoken_languages?.[0]?.english_name || movieDetails?.original_language?.toUpperCase();
  const releaseDate = movieDetails?.release_date || movieDetails?.first_air_date;
  const releaseDateFormatted = releaseDate ? new Date(releaseDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : null;
  const voteCount = movieDetails?.vote_count;
  const voteCountStr = voteCount>=1000 ? `${(voteCount/1000).toFixed(0)}K` : String(voteCount||0);
  const overview = movieDetails?.overview || movie?.overview || '';
  const shortOverview = overview.length > 180 ? overview.slice(0,180)+'...' : overview;
  const cert = (() => {
    if (!movieDetails) return movie?.certification || '';
    if (movie.mediaType==='tv') {
      const cr = movieDetails.content_ratings?.results || [];
      return cr.find(r=>r.iso_3166_1==='US')?.rating || '';
    } else {
      const rd = movieDetails.release_dates?.results || [];
      const us = rd.find(r=>r.iso_3166_1==='US');
      return us?.release_dates?.find(d=>d.certification)?.certification || movie?.certification || '';
    }
  })();

  return (
    <div style={{position:'fixed',inset:0,zIndex:260,background:ambient(accent),display:'flex',flexDirection:'column',animation:'playerSlideUp 0.4s cubic-bezier(0.22,1,0.36,1)',overflow:'hidden'}}>
      <style>{`@keyframes playerSlideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}div::-webkit-scrollbar{display:none}.cast-scroll::-webkit-scrollbar{display:none}`}</style>
      <div style={{position:'relative',zIndex:10,background:'#000',flexShrink:0,boxShadow:'0 8px 24px rgba(0,0,0,0.45)'}}>
        {loading&&<div style={{height:220,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12}}><div style={{width:30,height:30,border:`2.5px solid rgba(255,255,255,0.1)`,borderTop:`2.5px solid ${accent}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/><span style={{fontSize:12.5,color:T.text3}}>Loading trailer...</span></div>}
        {!loading&&notFound&&<div style={{height:180,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:8}}><SvgIcon name="play" size={28} color={T.hairlineStrong}/><div style={{fontSize:13.5,color:T.text2}}>No trailer available</div></div>}
        {!loading&&trailerKey&&<div style={{position:'relative',width:'100%',paddingBottom:'56.25%'}}><iframe src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1&playsinline=1`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen style={{position:'absolute',inset:0,width:'100%',height:'100%',border:'none'}} title={`${movie?.title} Trailer`}/></div>}
        <button onClick={onClose} style={{position:'absolute',top:12,left:12,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(10px)',border:'1px solid rgba(255,255,255,0.14)',borderRadius:10,width:32,height:32,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:5}}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
      </div>
      <div style={{flex:1,minHeight:0,overflowY:'auto',WebkitOverflowScrolling:'touch'}}>
      <div style={{padding:'18px 18px 0',flexShrink:0}}>
        <h1 style={{fontFamily:T.serif,letterSpacing:'-0.02em',fontSize:'clamp(20px,5vw,27px)',fontWeight:700,color:T.text,margin:'0 0 9px',lineHeight:1.15,letterSpacing:-0.3}}>{movie?.title}</h1>
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <span style={{fontSize:13,color:T.text2}}>{movie?.year}</span>
          {cert&&<CertBadge cert={cert}/>}
          {(movie?.genre||[]).map((g,i)=>(<span key={g} style={{fontSize:13,color:accent,fontWeight:500}}>{i>0&&<span style={{color:T.hairlineStrong,marginRight:4}}>·</span>}{g}</span>))}
        </div>
      </div>
      <div style={{display:'flex',gap:24,padding:'0 18px',borderBottom:`1px solid ${T.hairline}`,marginTop:16,flexShrink:0}}>
        {[['about','About'],['comments',`Comments (${comments.length})`]].map(([tab,label])=>(
          <button key={tab} onClick={()=>setActiveTab(tab)} style={{background:'none',border:'none',cursor:'pointer',padding:'0 0 13px',fontSize:13.5,fontWeight:activeTab===tab?700:500,color:activeTab===tab?accent:T.text3,borderBottom:`2px solid ${activeTab===tab?accent:'transparent'}`,fontFamily:'inherit',transition:'all 0.2s ease'}}>{label}</button>
        ))}
      </div>
      {activeTab==='about'&&(
        <div style={{padding:'18px',animation:'fadeIn 0.2s ease'}}>
          <div style={{display:'flex',gap:14,marginBottom:20}}>
            <div style={{width:108,flexShrink:0,borderRadius:12,overflow:'hidden',aspectRatio:'2/3',background:movie?.gradient||T.surface2}}>
              {movie?.poster&&<img src={movie.poster} alt={movie.title} style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
            </div>
            <div style={{flex:1}}>
              <p style={{fontSize:13.5,color:T.text2,lineHeight:1.65,margin:'0 0 8px'}}>{expanded?overview:shortOverview}</p>
              {overview.length>180&&<button onClick={()=>setExpanded(p=>!p)} style={{background:'none',border:'none',cursor:'pointer',color:accent,fontSize:12.5,fontWeight:600,padding:0,fontFamily:'inherit'}}>{expanded?'Show less':'Read more'}</button>}
              <div style={{display:'flex',gap:5,flexWrap:'wrap',marginTop:11}}>
                {cert&&<CertBadge cert={cert}/>}
                {(movie?.genre||[]).map(g=>(<span key={g} style={{fontSize:10,color:T.text2,background:T.surface2,border:`1px solid ${T.hairline}`,borderRadius:20,padding:'2px 8px'}}>{g}</span>))}
              </div>
            </div>
          </div>
          <div style={{position:'relative',display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,borderTop:`1px solid ${T.hairline}`,borderBottom:`1px solid ${T.hairline}`,borderRadius:0,overflow:'hidden',marginBottom:18}}>
            <AccentGlow accent={accent} size={140} style={{right:-30,top:-50}}/>
            <div style={{position:'relative',background:'transparent',boxShadow:`-1px 0 0 ${T.hairline}, 0 -1px 0 ${T.hairline}`,padding:'15px'}}>
              <Eyebrow style={{marginBottom:9}}>TMDB Rating</Eyebrow>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}><SvgIcon name="star" size={16} color={accent} filled/><SerifStat size={22}>{movie?.rating}</SerifStat><span style={{fontSize:12,color:T.text3}}>/10</span></div>
              <div style={{fontSize:11,color:T.text3}}>{voteCountStr} votes</div>
            </div>
            <div style={{position:'relative',background:'transparent',boxShadow:`-1px 0 0 ${T.hairline}, 0 -1px 0 ${T.hairline}`,padding:'15px'}}>
              <Eyebrow style={{marginBottom:9}}>Your Rating</Eyebrow>
              <div style={{display:'flex',gap:4,marginBottom:4}}>
                {[1,2,3,4,5].map(s=>(<button key={s} onMouseEnter={()=>setHoverStar(s)} onMouseLeave={()=>setHoverStar(0)} onClick={()=>setUserRating(s)} style={{background:'none',border:'none',cursor:'pointer',padding:0,transition:'transform 0.1s ease',transform:hoverStar===s?'scale(1.2)':'scale(1)'}}><SvgIcon name="star" size={17} color={s<=(hoverStar||userRating)?accent:T.hairlineStrong} filled={s<=(hoverStar||userRating)}/></button>))}
              </div>
              <div style={{fontSize:11,color:T.text3}}>{userRating>0?`${userRating}/5 stars`:'Rate this movie'}</div>
            </div>
          </div>
          {showAddToList&&<AddToListSheet movie={movie} onClose={()=>setShowAddToList(false)} accent={accent} isSaved={isSaved} onEnsureSaved={onSave}/>}
          {onSave&&(
            <div style={{display:'flex',gap:8,marginBottom:18}}>
              <button onClick={()=>onSave(movie)} style={{flex:1,background:isSaved?`${accent}16`:T.surface2,border:`1px solid ${isSaved?accent+'4a':T.hairline}`,borderRadius:14,padding:'13px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,fontFamily:'inherit',transition:'all 0.2s ease'}}>
                <SvgIcon name={isSaved?'check':'plus'} size={15} color={isSaved?accent:T.text2}/>
                <span style={{fontSize:13,fontWeight:600,color:isSaved?accent:T.text2}}>{isSaved?'Saved':'Add to Watchlist'}</span>
              </button>
              <button onClick={()=>setShowAddToList(true)} style={{background:T.surface2,border:`1px solid ${T.hairline}`,borderRadius:14,padding:'13px 16px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:7,fontFamily:'inherit',flexShrink:0}}>
                <SvgIcon name="list" size={15} color={T.text2}/>
                <span style={{fontSize:13,fontWeight:600,color:T.text2}}>List</span>
              </button>
            </div>
          )}
          <StreamingBadges movieId={movie?.id} mediaType={movie?.mediaType} title={movie?.title} year={movie?.year}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,borderTop:`1px solid ${T.hairline}`,borderBottom:`1px solid ${T.hairline}`,borderRadius:0,overflow:'hidden',marginBottom:20,marginTop:8}}>
            {[
              {icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="7" width="4" height="10"/><path d="M6 7l4-4 4 4M14 7v10M18 7l2 2v6l-2 2"/></svg>,label:'Director',value:director?.name||'—'},
              {icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,label:'Release Date',value:releaseDateFormatted||'—'},
              {icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg>,label:'Runtime',value:runtimeStr||'—'},
              {icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>,label:'Language',value:language||'—'},
            ].map((m,i)=>(
              <div key={i} style={{background:'transparent',boxShadow:`-1px 0 0 ${T.hairline}, 0 -1px 0 ${T.hairline}`,padding:'14px',display:'flex',alignItems:'center',gap:12}}>
                <div style={{flexShrink:0}}>{m.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <Eyebrow style={{marginBottom:3,fontSize:8.5}}>{m.label}</Eyebrow>
                  <div style={{fontSize:12.5,fontWeight:600,color:T.text,lineHeight:1.3}}>{m.value}</div>
                </div>
              </div>
            ))}
          </div>
          {cast.length>0&&(
            <div style={{marginBottom:32}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                <span style={{fontSize:17,letterSpacing:'-0.02em',fontWeight:700,color:T.text,fontFamily:T.serif}}>Cast</span>
                <span style={{fontSize:12.5,color:accent,fontWeight:600}}>See all</span>
              </div>
              <div className="cast-scroll" style={{display:'flex',gap:16,overflowX:'auto',WebkitOverflowScrolling:'touch',scrollbarWidth:'none',paddingBottom:4}}>
                {cast.map(person=>(
                  <div key={person.id} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,flexShrink:0,width:66}}>
                    <div style={{width:60,height:60,borderRadius:'50%',overflow:'hidden',background:T.surface2,border:`1px solid ${T.hairline}`}}>
                      {person.profile_path?<img src={`https://image.tmdb.org/t/p/w185${person.profile_path}`} alt={person.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,color:T.text3}}>{person.name[0]}</div>}
                    </div>
                    <div style={{textAlign:'center'}}>
                      <div style={{fontSize:11,fontWeight:600,color:T.text,lineHeight:1.3,wordBreak:'break-word'}}>{person.name}</div>
                      <div style={{fontSize:9,color:T.text3,lineHeight:1.3,marginTop:2,wordBreak:'break-word'}}>{person.character}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {activeTab==='comments'&&(
        <div style={{display:'flex',flexDirection:'column',animation:'fadeIn 0.2s ease'}}>
          {viewingProfile&&<UserProfileSheet userId={viewingProfile} onClose={()=>setViewingProfile(null)} accent={accent} onWatchTrailer={onWatchTrailer||(()=>{})} onAddToWatchlist={onSave}/>}
          <div style={{padding:'14px 18px',display:'flex',flexDirection:'column',gap:16}}>
            {loadingComments?(
              <div style={{display:'flex',justifyContent:'center',padding:24}}><div style={{width:20,height:20,border:`2px solid rgba(255,255,255,0.1)`,borderTop:`2px solid ${accent}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/></div>
            ):comments.length===0?(
              <div style={{textAlign:'center',padding:'24px 0',fontSize:12.5,color:T.text3}}>No comments yet. Be the first!</div>
            ):comments.map(c=>(
              <div key={c.id} id={`comment-${c.id}`} style={{borderRadius:10,padding:'2px 4px',margin:'-2px -4px'}}>
                <div style={{display:'flex',gap:10}}>
                  <button onClick={()=>setViewingProfile(c.user_id)} style={{width:34,height:34,borderRadius:'50%',background:`${accent}18`,border:`1px solid ${accent}38`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:accent,flexShrink:0,overflow:'hidden',padding:0,cursor:'pointer'}}>
                    {c.avatar_url?<img src={c.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:(c.username||'U')[0].toUpperCase()}
                  </button>
                  <div style={{flex:1}}>
                    <p style={{fontSize:13.5,color:T.text,lineHeight:1.55,margin:'0 0 5px'}}>{c.text}</p>
                    <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:7}}>
                      <button onClick={()=>setViewingProfile(c.user_id)} style={{background:'none',border:'none',cursor:'pointer',padding:0,fontFamily:'inherit'}}><span style={{fontSize:12,fontWeight:600,color:T.text2}}>@{c.username}</span></button>
                      {c.time&&(<span style={{fontSize:10,color:accent,background:`${accent}16`,border:`1px solid ${accent}2e`,borderRadius:10,padding:'1px 8px',fontWeight:700,display:'inline-flex',alignItems:'center',gap:3}}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg>{c.time}</span>)}
                      <span style={{fontSize:10,color:T.text3,marginLeft:'auto'}}>{timeAgo(c.created_at)}</span>
                    </div>
                    <div style={{display:'flex',gap:14,alignItems:'center'}}>
                      <button onClick={()=>toggleLike(c.id)} style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center',gap:4}}>
                        <SvgIcon name="heart" size={13} color={likedLocal[c.id]?'#FF6B8A':T.hairlineStrong} filled={!!likedLocal[c.id]}/>
                      </button>
                      <button onClick={()=>startReply(c)} style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center',gap:4}}>
                        <SvgIcon name="reply" size={12} color={T.text3}/>
                        <span style={{fontSize:11,color:T.text3,fontWeight:500}}>Reply</span>
                      </button>
                      {c.isSelf&&(
                        <button onClick={()=>deleteComment(c.id,null)} style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center',marginLeft:'auto'}}>
                          <SvgIcon name="trash" size={12} color={T.text3}/>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {(c.replies||[]).map(r=>(
                  <div key={r.id} id={`comment-${r.id}`} style={{display:'flex',gap:10,marginTop:10,marginLeft:44}}>
                    <button onClick={()=>setViewingProfile(r.user_id)} style={{width:26,height:26,borderRadius:'50%',background:T.surface2,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:T.text2,flexShrink:0,overflow:'hidden',padding:0,cursor:'pointer',border:'none'}}>
                      {r.avatar_url?<img src={r.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:(r.username||'U')[0].toUpperCase()}
                    </button>
                    <div style={{flex:1}}>
                      <p style={{fontSize:12.5,color:T.text,lineHeight:1.5,margin:'0 0 4px'}}>{r.text}</p>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <button onClick={()=>setViewingProfile(r.user_id)} style={{background:'none',border:'none',cursor:'pointer',padding:0,fontFamily:'inherit'}}><span style={{fontSize:11,fontWeight:600,color:T.text2}}>@{r.username}</span></button>
                        {r.isSelf&&(
                          <button onClick={()=>deleteComment(r.id,c.id)} style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center'}}>
                            <SvgIcon name="trash" size={11} color={T.text3}/>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{padding:'12px 18px 32px',borderTop:`1px solid ${T.hairline}`,marginTop:8}}>
            {replyingTo&&(
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,fontSize:11,color:T.text2}}>
                <span>Replying to <span style={{color:accent}}>@{replyingTo.username}</span></span>
                <button onClick={()=>{setReplyingTo(null);setCommentInput('');}} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,fontSize:14,padding:0}}>×</button>
              </div>
            )}
            {!replyingTo&&(
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                <button onClick={()=>setTimestampMode(p=>!p)} style={{display:'flex',alignItems:'center',gap:5,background:timestampMode?`${accent}16`:T.surface2,border:`1px solid ${timestampMode?accent+'40':T.hairline}`,borderRadius:20,padding:'5px 12px',cursor:'pointer',fontFamily:'inherit',fontSize:11,color:timestampMode?accent:T.text2,fontWeight:600}}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg>
                  Timestamp
                </button>
                {timestampMode&&<input value={manualTimestamp} onChange={e=>setManualTimestamp(e.target.value)} placeholder="e.g. 1:23" style={{background:T.surface2,border:`1px solid ${accent}40`,borderRadius:10,padding:'5px 10px',color:accent,fontSize:12,outline:'none',fontFamily:'inherit',width:72}}/>}
              </div>
            )}
            {isSignedIn?(
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input ref={commentInputRef} value={commentInput} onChange={e=>setCommentInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&postComment()} placeholder={replyingTo?`Reply to @${replyingTo.username}...`:'Comment on this trailer...'} style={{flex:1,background:T.surface2,border:`1px solid ${T.hairline}`,borderRadius:22,padding:'12px 16px',color:T.text,fontSize:14,outline:'none',fontFamily:'inherit'}}/>
                <button onClick={postComment} style={{background:accent,border:'none',borderRadius:'50%',width:42,height:42,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><SvgIcon name="send" size={15} color="#07070F"/></button>
              </div>
            ):(
              <div style={{textAlign:'center',padding:'10px 0',fontSize:13,color:T.text3}}>Sign in to comment</div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
// PROFILE SHEET
// COVER CROP MODAL (Twitter-style drag-to-reposition + zoom, exports a compressed JPEG)
function CoverCropModal({file,onCancel,onSave,accent,aspect=2.5,title='Adjust Cover Photo',outputWidth=1920,roundPreview=false}){
  const ASPECT=aspect;
  const[imgUrl,setImgUrl]=useState(null);
  const[natural,setNatural]=useState({w:0,h:0});
  const[containerSize,setContainerSize]=useState({w:0,h:0});
  const[scale,setScale]=useState(1);
  const[offset,setOffset]=useState({x:0,y:0});
  const[saving,setSaving]=useState(false);
  const containerRef=useRef(null);
  const imgElRef=useRef(null);
  const dragRef=useRef(null);

  useEffect(()=>{
    const url=URL.createObjectURL(file);
    setImgUrl(url);
    return()=>URL.revokeObjectURL(url);
  },[file]);

  useEffect(()=>{
    const measure=()=>{if(containerRef.current){const r=containerRef.current.getBoundingClientRect();setContainerSize({w:r.width,h:r.height});}};
    measure();
    window.addEventListener('resize',measure);
    return()=>window.removeEventListener('resize',measure);
  },[]);

  const baseScale=natural.w&&containerSize.w?Math.max(containerSize.w/natural.w,containerSize.h/natural.h):1;
  const effectiveScale=baseScale*scale;
  const displayW=natural.w*effectiveScale;
  const displayH=natural.h*effectiveScale;

  const clamp=(ox,oy,curScale)=>{
    const eScale=baseScale*curScale;
    const dW=natural.w*eScale,dH=natural.h*eScale;
    const maxX=Math.max(0,(dW-containerSize.w)/2);
    const maxY=Math.max(0,(dH-containerSize.h)/2);
    return{x:Math.min(maxX,Math.max(-maxX,ox)),y:Math.min(maxY,Math.max(-maxY,oy))};
  };

  const onImgLoad=(e)=>{setNatural({w:e.target.naturalWidth,h:e.target.naturalHeight});setOffset({x:0,y:0});setScale(1);};

  const onPointerDown=(e)=>{
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current={startX:e.clientX,startY:e.clientY,startOffX:offset.x,startOffY:offset.y};
  };
  const onPointerMove=(e)=>{
    if(!dragRef.current)return;
    const dx=e.clientX-dragRef.current.startX;
    const dy=e.clientY-dragRef.current.startY;
    setOffset(clamp(dragRef.current.startOffX+dx,dragRef.current.startOffY+dy,scale));
  };
  const onPointerUp=()=>{dragRef.current=null;};

  const onZoomChange=(e)=>{
    const next=parseFloat(e.target.value);
    setScale(next);
    setOffset(o=>clamp(o.x,o.y,next));
  };

  const handleSave=()=>{
    if(!imgElRef.current||!natural.w)return;
    setSaving(true);
    const OUT_W=outputWidth;const OUT_H=Math.round(OUT_W/ASPECT);
    const canvas=document.createElement('canvas');
    canvas.width=OUT_W;canvas.height=OUT_H;
    const ctx=canvas.getContext('2d');
    const imgLeft=(containerSize.w-displayW)/2+offset.x;
    const imgTop=(containerSize.h-displayH)/2+offset.y;
    let srcX=(-imgLeft)/effectiveScale;
    let srcY=(-imgTop)/effectiveScale;
    let srcW=containerSize.w/effectiveScale;
    let srcH=containerSize.h/effectiveScale;
    srcX=Math.max(0,Math.min(natural.w-srcW,srcX));
    srcY=Math.max(0,Math.min(natural.h-srcH,srcY));
    // Decode a fresh, full-resolution copy of the source image specifically for export.
    // Some mobile browsers cache a downscaled decode of an <img> that's been rendered
    // small on screen, which silently degrades quality when that element is later
    // drawn to canvas. A clean Image() load guarantees we draw from the real source data.
    const fullResImg=new Image();
    fullResImg.onload=()=>{
      ctx.imageSmoothingEnabled=true;
      ctx.imageSmoothingQuality='high';
      ctx.drawImage(fullResImg,srcX,srcY,srcW,srcH,0,0,OUT_W,OUT_H);
      canvas.toBlob(blob=>{setSaving(false);if(blob)onSave(blob);},'image/jpeg',0.92);
    };
    fullResImg.onerror=()=>{
      ctx.imageSmoothingEnabled=true;
      ctx.imageSmoothingQuality='high';
      ctx.drawImage(imgElRef.current,srcX,srcY,srcW,srcH,0,0,OUT_W,OUT_H);
      canvas.toBlob(blob=>{setSaving(false);if(blob)onSave(blob);},'image/jpeg',0.9);
    };
    fullResImg.src=imgUrl;
  };

  return(
    <div style={{position:'fixed',inset:0,zIndex:200,background:'#05050a',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'16px 16px 12px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
        <button onClick={onCancel} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:18,padding:'8px 16px',cursor:'pointer',fontFamily:'inherit',fontSize:13,color:'rgba(255,255,255,0.6)',fontWeight:600}}>Cancel</button>
        <span style={{fontSize:14,fontWeight:700,color:'#fff'}}>{title}</span>
        <button onClick={handleSave} disabled={saving||!natural.w} style={{background:accent,border:'none',borderRadius:18,padding:'8px 18px',cursor:saving?'default':'pointer',fontFamily:'inherit',fontSize:13,color:'#07070F',fontWeight:700,display:'flex',alignItems:'center',gap:6,opacity:saving?0.7:1}}>
          {saving&&<div style={{width:11,height:11,border:'1.5px solid rgba(7,7,15,0.3)',borderTop:'1.5px solid #07070F',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>}
          Save
        </button>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'0 16px'}}>
        <div ref={containerRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          style={{width:'100%',maxWidth:480,aspectRatio:`${ASPECT}`,position:'relative',overflow:'hidden',borderRadius:roundPreview?'50%':16,border:`1px solid ${accent}44`,background:'#000',touchAction:'none',cursor:'grab'}}>
          {roundPreview&&<div style={{position:'absolute',inset:0,borderRadius:'50%',border:`2px solid ${accent}`,zIndex:3,pointerEvents:'none'}}/>}
          {imgUrl&&(
            <img ref={imgElRef} src={imgUrl} onLoad={onImgLoad} alt="" draggable={false}
              style={{position:'absolute',left:(containerSize.w-displayW)/2+offset.x,top:(containerSize.h-displayH)/2+offset.y,width:displayW||'auto',height:displayH||'auto',maxWidth:'none',userSelect:'none',pointerEvents:'none'}}/>
          )}
          {!natural.w&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:24,height:24,border:'2px solid rgba(255,255,255,0.15)',borderTop:`2px solid ${accent}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/></div>}
        </div>
        <div style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginTop:12,marginBottom:18}}>Drag to reposition</div>
        <div style={{width:'100%',maxWidth:480,display:'flex',alignItems:'center',gap:12}}>
          <SvgIcon name="search" size={13} color="rgba(255,255,255,0.25)"/>
          <input type="range" min="1" max="2.5" step="0.01" value={scale} onChange={onZoomChange} style={{flex:1,accentColor:accent}}/>
          <SvgIcon name="search" size={17} color="rgba(255,255,255,0.4)"/>
        </div>
      </div>
    </div>
  );
}

function ProfileSheet({onClose,accent,watchlist,setWatchlist,userReviews,loadingData,onDiscover,onWatchTrailer}){
  const{user}=useUser();const{signOut}=useClerk();
  const[tab,setTab]=useState('profile');const[signingOut,setSigningOut]=useState(false);const[signedOut,setSignedOut]=useState(false);const[showTmdb,setShowTmdb]=useState(false);const[sharing,setSharing]=useState(false);const[toast,setToast]=useState(null);const[watchlistSearch,setWatchlistSearch]=useState('');const[watchlistFilter,setWatchlistFilter]=useState('all');const[watchlistSort,setWatchlistSort]=useState('date');const[watchlistPlatform,setWatchlistPlatform]=useState('');const[providerCache,setProviderCache]=useState({});const[loadingProviders,setLoadingProviders]=useState(false);const[platformAlerts,setPlatformAlerts]=useState([]);const[playerMovie,setPlayerMovie]=useState(null);
  const[watchlistPublic,setWatchlistPublic]=useState(true);const[loadingSettings,setLoadingSettings]=useState(true);const[notifyPrefs,setNotifyPrefs]=useState({email:true,web:true,app:true,messages:true,follows:true,activity:true});const[hasWebPush,setHasWebPush]=useState(false);const[pushBusy,setPushBusy]=useState(false);
  const[bio,setBio]=useState('');const[bioInput,setBioInput]=useState('');const[savingBio,setSavingBio]=useState(false);
  const[nickname,setNickname]=useState('');const[nicknameInput,setNicknameInput]=useState('');const[savingNickname,setSavingNickname]=useState(false);
  const[coverUrl,setCoverUrl]=useState(null);const[uploadingCover,setUploadingCover]=useState(false);
  const[cropFile,setCropFile]=useState(null);
  const[avatarCropFile,setAvatarCropFile]=useState(null);
  const[uploadingAvatar,setUploadingAvatar]=useState(false);
  const avatarInputRef=useRef(null);
  const coverInputRef=useRef(null);
  const bioRef=useRef(null);
  const[showOwnPreview,setShowOwnPreview]=useState(false);
  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(null),3000);};
  useEffect(()=>{
    fetch('/api/settings').then(r=>r.json()).then(d=>{setWatchlistPublic(d.watchlist_public!==false);setBio(d.bio||'');setBioInput(d.bio||'');setCoverUrl(d.cover_url||null);setNickname(d.nickname||'');setNicknameInput(d.nickname||'');setNotifyPrefs(d.notify_prefs||{email:true,web:true,app:true,messages:true,follows:true,activity:true});setHasWebPush(!!d.has_web_push);setLoadingSettings(false);}).catch(()=>setLoadingSettings(false));
  },[]);
  const togglePrivacy=async()=>{
    const next=!watchlistPublic;
    setWatchlistPublic(next);
    try{
      const res=await fetch('/api/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({watchlist_public:next})});
      const data=await res.json();
      if(!res.ok||data.error){throw new Error(data.error||'Failed');}
      showToast(next?'Watchlist is now public':'Watchlist is now private');
    }catch{setWatchlistPublic(!next);showToast('Could not update — try again');}
  };
  const toggleNotify=async(key)=>{
    const next={...notifyPrefs,[key]:!notifyPrefs[key]};
    setNotifyPrefs(next);
    try{
      const res=await fetch('/api/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({notify_prefs:next})});
      const data=await res.json();
      if(!res.ok||data.error){throw new Error(data.error||'Failed');}
      showToast('Notification preference saved');
    }catch(e){
      setNotifyPrefs(p=>({...p,[key]:!next[key]}));
      showToast(e.message||'Could not save preference');
    }
  };
  const enableWebPush=async()=>{
    if(typeof window==='undefined'||!('Notification' in window)||!('serviceWorker' in navigator)){
      showToast('Web push not supported on this browser');
      return;
    }
    setPushBusy(true);
    try{
      const perm=await Notification.requestPermission();
      if(perm!=='granted'){showToast('Permission denied');setPushBusy(false);return;}
      await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const keyRes=await fetch('/api/push-subscribe');
      const keyData=await keyRes.json();
      if(!keyData.enabled||!keyData.publicKey){
        const next={...notifyPrefs,web:true};
        setNotifyPrefs(next);
        await fetch('/api/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({notify_prefs:next})});
        showToast('Web preference on — add VAPID keys to finish push');
        setPushBusy(false);
        return;
      }
      const urlBase64ToUint8Array=(base64String)=>{
        const padding='='.repeat((4-base64String.length%4)%4);
        const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
        const rawData=atob(base64);
        const outputArray=new Uint8Array(rawData.length);
        for(let i=0;i<rawData.length;++i){outputArray[i]=rawData.charCodeAt(i);}
        return outputArray;
      };
      const reg=await navigator.serviceWorker.ready;
      const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(keyData.publicKey)});
      await fetch('/api/push-subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subscription:sub.toJSON()})});
      setHasWebPush(true);
      const next={...notifyPrefs,web:true};
      setNotifyPrefs(next);
      await fetch('/api/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({notify_prefs:next})});
      showToast('Browser notifications enabled');
    }catch(e){
      console.error(e);
      showToast('Could not enable web push');
    }
    setPushBusy(false);
  };

  const saveBio=async()=>{
    if(bioInput===bio)return;
    setSavingBio(true);
    try{
      const res=await fetch('/api/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({bio:bioInput})});
      let data={};
      try{data=await res.json();}catch{throw new Error(`Bad response (status ${res.status})`);}
      if(!res.ok||data.error){throw new Error(data.error||`Save failed (status ${res.status})`);}
      setBio(bioInput);
      showToast('Bio updated');
    }catch(err){setBioInput(bio);showToast(err.message||'Could not save bio — try again');}
    setSavingBio(false);
  };
  const saveNickname=async()=>{
    if(nicknameInput===nickname)return;
    setSavingNickname(true);
    try{
      const res=await fetch('/api/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({nickname:nicknameInput})});
      const data=await res.json();
      if(!res.ok||data.error){throw new Error(data.error||'Failed');}
      setNickname(nicknameInput);
      showToast('Display name updated');
    }catch{setNicknameInput(nickname);showToast('Could not save — try again');}
    setSavingNickname(false);
  };
  const uploadCoverBlob=async(blobOrFile)=>{
    setUploadingCover(true);
    try{
      const formData=new FormData();formData.append('file',blobOrFile,'cover.jpg');
      const res=await fetch('/api/upload-cover',{method:'POST',body:formData});
      let data={};
      try{data=await res.json();}catch{throw new Error(`Server returned an unexpected response (status ${res.status})`);}
      if(res.ok&&data.cover_url){setCoverUrl(data.cover_url);showToast('Cover photo updated');}
      else{throw new Error(data.error||`Upload failed (status ${res.status})`);}
    }catch(err){showToast(err.message||'Upload failed — try a smaller image');}
    setUploadingCover(false);
  };
  const onCoverFileSelected=(e)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    const validTypes=['image/jpeg','image/png','image/gif','image/webp'];
    if(!validTypes.includes(file.type)){showToast('Use JPG, PNG, GIF, or WEBP');if(coverInputRef.current)coverInputRef.current.value='';return;}
    if(file.type==='image/gif'){
      // GIFs can't be cropped client-side without losing animation, so upload directly with a tighter size cap
      if(file.size>4*1024*1024){showToast('GIFs must be under 4MB');if(coverInputRef.current)coverInputRef.current.value='';return;}
      uploadCoverBlob(file).then(()=>{if(coverInputRef.current)coverInputRef.current.value='';});
    }else{
      // static images go through the crop modal first
      setCropFile(file);
    }
  };
  const handleCropCancel=()=>{setCropFile(null);if(coverInputRef.current)coverInputRef.current.value='';};
  const handleCropSave=async(blob)=>{setCropFile(null);await uploadCoverBlob(blob);if(coverInputRef.current)coverInputRef.current.value='';};

  const onAvatarFileSelected=(e)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    const validTypes=['image/jpeg','image/png','image/webp'];
    if(!validTypes.includes(file.type)){showToast('Use JPG, PNG, or WEBP');if(avatarInputRef.current)avatarInputRef.current.value='';return;}
    setAvatarCropFile(file);
  };
  const handleAvatarCropCancel=()=>{setAvatarCropFile(null);if(avatarInputRef.current)avatarInputRef.current.value='';};
  const handleAvatarCropSave=async(blob)=>{
    setAvatarCropFile(null);
    setUploadingAvatar(true);
    try{
      await user?.setProfileImage({file:blob});
      await user?.reload?.();
      showToast('Profile photo updated');
    }catch{showToast('Could not update photo — try again');}
    setUploadingAvatar(false);
    if(avatarInputRef.current)avatarInputRef.current.value='';
  };
  const toggleWatched=async(item)=>{
    const next=!item.watched;
    setWatchlist(p=>p.map(m=>m.movie_id===item.movie_id?{...m,watched:next}:m));
    await fetch('/api/watchlist',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({movieId:item.movie_id,watched:next})});
    if(next){
      fetch('/api/activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'watched',movieId:item.movie_id,movieTitle:item.title,moviePoster:item.poster,movieYear:item.year,movieRating:item.rating,movieAccent:item.accent,username:user?.username||user?.firstName||'user',avatarUrl:user?.imageUrl||null})}).catch(()=>{});
    }
  };
  const removeFromWatchlist=async(item)=>{setWatchlist(p=>p.filter(m=>m.movie_id!==item.movie_id));await fetch('/api/watchlist',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({movieId:item.movie_id})});};
  const handleSignOut=async()=>{setSigningOut(true);try{await signOut();}catch{}setSigningOut(false);setSignedOut(true);showToast('Signed out successfully');setTimeout(()=>onClose(),2000);};
  const watched=watchlist.filter(m=>m.watched).length;const saved=watchlist.length;const reviews=userReviews.length;
  const cineScore=calcCineScore(watched,reviews,saved);
  const avgRating=userReviews.filter(r=>r.rating>0).length>0?(userReviews.filter(r=>r.rating>0).reduce((s,r)=>s+r.rating,0)/userReviews.filter(r=>r.rating>0).length).toFixed(1):'--';
  const topGenres=watchlist.flatMap(m=>m.genre||[]).reduce((acc,g)=>{acc[g]=(acc[g]||0)+1;return acc;},{});
  const sortedGenres=Object.entries(topGenres).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const WATCHLIST_PLATFORMS=[
    {name:'Netflix',ids:[8],color:'#E50914'},
    {name:'Prime',ids:[9,119,10],color:'#00A8E0'},
    {name:'Disney+',ids:[337],color:'#0063e5'},
    {name:'Apple TV+',ids:[350],color:'#aaaaaa'},
    {name:'Max',ids:[1899,384,31],color:'#002BE7'},
    {name:'Hulu',ids:[15],color:'#1CE783'},
  ];
  useEffect(()=>{
    if(tab!=='watchlist'||watchlist.length===0)return;
    // Always hydrate providers on watchlist (for platform filter + alerts)
    const missing=watchlist.filter(m=>!providerCache[String(m.movie_id)]);
    if(missing.length===0)return;
    let cancelled=false;
    setLoadingProviders(true);
    (async()=>{
      const next={...providerCache};
      for(let i=0;i<missing.length;i+=6){
        const chunk=missing.slice(i,i+6);
        await Promise.all(chunk.map(async(m)=>{
          try{
            const type=m.is_tv?'tv':'movie';
            const r=await fetch(`/api/providers?id=${m.movie_id}&type=${type}`);
            const d=await r.json();
            next[String(m.movie_id)]=(d.providers||[]).map(p=>p.provider_id);
          }catch{ next[String(m.movie_id)]=[]; }
        }));
        if(cancelled)return;
        setProviderCache({...next});
      }
      if(!cancelled){setProviderCache({...next});setLoadingProviders(false);}
    })();
    return()=>{cancelled=true;};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[tab,watchlistPlatform,watchlist.length]);

  // Platform change alerts: compare current providers to last snapshot
  useEffect(()=>{
    if(!watchlist.length||Object.keys(providerCache).length===0)return;
    // Only run when we have coverage for most of the list
    const covered=watchlist.filter(m=>providerCache[String(m.movie_id)]!==undefined).length;
    if(covered<Math.min(watchlist.length,3))return;
    try{
      const key='cine_provider_snapshot_v1';
      const prev=JSON.parse(localStorage.getItem(key)||'{}');
      const PLATFORM_MAP=[
        {name:'Netflix',ids:[8]},
        {name:'Prime',ids:[9,119,10]},
        {name:'Disney+',ids:[337]},
        {name:'Max',ids:[1899,384,31]},
        {name:'Hulu',ids:[15]},
        {name:'Apple TV+',ids:[350]},
      ];
      const preferred=localStorage.getItem('cine_preferred_provider')||'';
      const next={};
      const alerts=[];
      for(const m of watchlist){
        if(m.watched)continue;
        const id=String(m.movie_id);
        const ids=providerCache[id];
        if(!ids)continue;
        next[id]=ids;
        const old=prev[id];
        if(!old)continue; // first time seeing this title — not an alert
        for(const p of PLATFORM_MAP){
          const had=old.some(x=>p.ids.includes(x));
          const has=ids.some(x=>p.ids.includes(x));
          if(!had&&has){
            if(!preferred||preferred===p.name){
              alerts.push({kind:'new',platform:p.name,title:m.title,movieId:m.movie_id,poster:m.poster});
            }
          }
          if(had&&!has){
            if(!preferred||preferred===p.name){
              alerts.push({kind:'left',platform:p.name,title:m.title,movieId:m.movie_id,poster:m.poster});
            }
          }
        }
      }
      localStorage.setItem(key,JSON.stringify({...prev,...next}));
      // Cap and dedupe
      const seen=new Set();
      const unique=[];
      for(const a of alerts){
        const k=a.kind+a.platform+a.movieId;
        if(seen.has(k))continue;
        seen.add(k);
        unique.push(a);
        if(unique.length>=6)break;
      }
      if(unique.length)setPlatformAlerts(unique);
    }catch{}
  },[providerCache,watchlist]);

  const filteredWatchlist=watchlist.filter(m=>{
    if(watchlistFilter==='movies'&&m.is_tv)return false;
    if(watchlistFilter==='tv'&&!m.is_tv)return false;
    if(watchlistSearch&&!m.title?.toLowerCase().includes(watchlistSearch.toLowerCase()))return false;
    if(watchlistPlatform){
      const platform=WATCHLIST_PLATFORMS.find(p=>p.name===watchlistPlatform);
      if(platform){
        const ids=providerCache[String(m.movie_id)];
        if(!ids)return false;
        if(!ids.some(id=>platform.ids.includes(id)))return false;
      }
    }
    return true;
  }).sort((a,b)=>{
    if(watchlistSort==='rating')return parseFloat(b.rating||0)-parseFloat(a.rating||0);
    if(watchlistSort==='title')return(a.title||'').localeCompare(b.title||'');
    return(b.saved_at||0)-(a.saved_at||0);
  });
  const handleWatchlistItemClick=(item)=>{
    const payload={
      id:item.movie_id||item.id,
      title:item.title,
      year:item.year,
      rating:item.rating,
      poster:item.poster,
      backdrop:item.backdrop,
      genre:Array.isArray(item.genre)?item.genre:(typeof item.genre==='string'?(()=>{try{return JSON.parse(item.genre);}catch{return[];}})():[]),
      overview:item.overview,
      accent:item.accent||accent,
      mediaType:item.is_tv||item.isTV?'tv':'movie',
      isTV:!!(item.is_tv||item.isTV),
      certification:item.certification||'',
    };
    if(onWatchTrailer){ onWatchTrailer(payload); }
    else { setPlayerMovie(payload); }
  };
  return(
    <>
    {playerMovie&&<InlinePlayer movie={playerMovie} onClose={()=>setPlayerMovie(null)} accent={playerMovie.accent||accent}/>}
    {cropFile&&<CoverCropModal file={cropFile} accent={accent} onCancel={handleCropCancel} onSave={handleCropSave}/>}
    {avatarCropFile&&<CoverCropModal file={avatarCropFile} accent={accent} onCancel={handleAvatarCropCancel} onSave={handleAvatarCropSave} aspect={1} title="Adjust Profile Photo" outputWidth={600} roundPreview/>}
    {showOwnPreview&&user&&<UserProfileSheet userId={user.id} onClose={()=>setShowOwnPreview(false)} accent={accent} onWatchTrailer={setPlayerMovie}/>}
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,0.82)',backdropFilter:'blur(20px)',display:'flex',alignItems:'flex-end',animation:'fadeIn 0.2s ease'}}>
      {toast&&<Toast message={toast} accent={accent}/>}
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',height:'92%',background:ambient(accent),borderRadius:'28px 28px 0 0',border:`1px solid ${T.hairline}`,borderBottom:'none',display:'flex',flexDirection:'column',animation:'sheetUp 0.35s cubic-bezier(0.22,1,0.36,1)'}}>
        <style>{`@keyframes sheetUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={{width:32,height:3,borderRadius:2,background:'rgba(255,255,255,0.14)',margin:'14px auto 0',flexShrink:0}}/>
        <div style={{padding:'16px 18px 0',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <span style={{fontFamily:T.serif,fontSize:21,letterSpacing:'-0.02em',fontWeight:700,color:T.text}}>My Profile</span>
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            <button onClick={()=>setShowOwnPreview(true)} title="Preview public profile" style={{background:'transparent',border:'none',width:30,height:30,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="eye" size={15} color={T.text2}/></button>
            <button onClick={()=>{bioRef.current?.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>bioRef.current?.focus(),300);}} title="Edit Profile" style={{background:'transparent',border:'none',width:30,height:30,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="edit" size={15} color={T.text2}/></button>
            <button onClick={onClose} style={{background:'transparent',border:'none',width:30,height:30,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="close" size={15} color={T.text2}/></button>
          </div>
        </div>
        <div style={{display:'flex',padding:'18px 18px 0',gap:16,flexShrink:0,borderBottom:`1px solid ${T.hairline}`,overflowX:'auto',WebkitOverflowScrolling:'touch',scrollbarWidth:'none'}}>
          {[['profile','Profile'],['watchlist','Watchlist'],['watched','Watched'],['reviews','Reviews']].map(([t,label])=>(
            <button key={t} onClick={()=>setTab(t)} style={{background:'none',border:'none',cursor:'pointer',padding:'0 0 14px',fontFamily:'inherit',fontSize:12.5,fontWeight:tab===t?700:500,color:tab===t?accent:T.text3,borderBottom:`2px solid ${tab===t?accent:'transparent'}`,transition:'all 0.2s ease',letterSpacing:0.2,flexShrink:0}}>
              {label}{t==='watchlist'&&watchlist.length>0?` (${watchlist.length})`:''}{t==='watched'&&watched>0?` (${watched})`:''}
            </button>
          ))}
        </div>
        <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',scrollbarWidth:'none'}}>
          {tab==='profile'&&(
            <div style={{padding:'16px'}}>
              {loadingData&&<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,padding:'10px 14px',background:'rgba(255,255,255,0.03)',borderRadius:12}}><div style={{width:14,height:14,border:`2px solid rgba(255,255,255,0.1)`,borderTop:`2px solid ${accent}`,borderRadius:'50%',animation:'spin 0.7s linear infinite',flexShrink:0}}/><span style={{fontSize:12,color:'rgba(255,255,255,0.3)'}}>Loading...</span></div>}

              {/* COVER + AVATAR — unified header */}
              <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={onCoverFileSelected} style={{display:'none'}}/>
              <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onAvatarFileSelected} style={{display:'none'}}/>
              <button onClick={()=>coverInputRef.current?.click()} disabled={uploadingCover} style={{position:'relative',width:'100%',aspectRatio:'2.5',borderRadius:18,overflow:'hidden',border:`1px solid ${T.hairline}`,background:coverUrl?'#0a0a12':`linear-gradient(150deg,${accent}1f,${T.surface})`,cursor:'pointer',padding:0,display:'block',position:'relative'}}>
                {coverUrl&&<img src={coverUrl} alt="" decoding="async" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',objectPosition:'center top',imageRendering:'auto',transform:'translateZ(0)'}}/>}
                <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(0,0,0,0.1),rgba(0,0,0,0.5))'}}/>
                <div style={{position:'absolute',right:10,top:10,display:'flex',alignItems:'center',gap:6,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(6px)',borderRadius:18,padding:'6px 12px'}}>
                  {uploadingCover?<div style={{width:12,height:12,border:'1.5px solid rgba(255,255,255,0.25)',borderTop:'1.5px solid #fff',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>:<SvgIcon name="plus" size={11} color="#fff"/>}
                  <span style={{fontSize:10.5,fontWeight:600,color:'#fff'}}>{coverUrl?'Change cover':'Add cover'}</span>
                </div>
              </button>

              <div style={{position:'relative',display:'flex',alignItems:'center',gap:14,padding:'0 4px',marginTop:-32,marginBottom:24}}>
                <AccentGlow accent={accent} size={110} style={{left:-12,top:-30}}/>
                <button onClick={()=>avatarInputRef.current?.click()} disabled={uploadingAvatar} style={{position:'relative',width:72,height:72,borderRadius:'50%',background:T.surface,border:`3px solid ${T.bg}`,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',padding:0,cursor:'pointer',flexShrink:0}}>
                  {user?.imageUrl?<img src={user.imageUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:24,fontWeight:700,color:accent,fontFamily:T.serif}}>{(user?.firstName||user?.username||'?')[0].toUpperCase()}</span>}
                  <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',opacity:uploadingAvatar?1:0,transition:'opacity 0.15s ease'}} onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=uploadingAvatar?1:0}>
                    {uploadingAvatar?<div style={{width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',borderTop:'2px solid #fff',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>:<SvgIcon name="edit" size={14} color="#fff"/>}
                  </div>
                </button>
                <div style={{position:'relative',paddingTop:18}}>
                  <div style={{fontSize:19,fontWeight:700,color:T.text,fontFamily:T.serif,letterSpacing:'-0.02em',lineHeight:1.2}}>{nickname||user?.firstName||user?.username||'Cinephile'}</div>
                  <div style={{display:'flex',alignItems:'center',gap:5,marginTop:4}}><div style={{width:5,height:5,borderRadius:'50%',background:accent,flexShrink:0}}/><span style={{fontSize:11,color:T.text2,fontWeight:500}}>{user?.primaryEmailAddress?.emailAddress}</span></div>
                </div>
              </div>

              {/* NICKNAME */}
              <div style={{display:'flex',alignItems:'flex-start',gap:12,padding:'14px 2px',borderTop:`1px solid ${T.hairline}`}}>
                <div style={{width:30,height:30,borderRadius:9,background:`${accent}14`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}><SvgIcon name="user" size={14} color={accent}/></div>
                <div style={{flex:1,minWidth:0}}>
                  <Eyebrow color={accent} style={{marginBottom:7}}>Display Name</Eyebrow>
                  <input value={nicknameInput} onChange={e=>setNicknameInput(e.target.value)} maxLength={40} placeholder={user?.firstName||user?.username||'Your name'} style={{width:'100%',boxSizing:'border-box',background:'transparent',border:'none',padding:0,color:T.text,fontSize:14.5,fontWeight:600,outline:'none',fontFamily:'inherit'}}/>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:6}}>
                    <span style={{fontSize:10.5,color:T.text3}}>Shown instead of your name · @{user?.username||'handle'} stays the same</span>
                    {nicknameInput!==nickname&&(
                      <button onClick={saveNickname} disabled={savingNickname} style={{background:savingNickname?'rgba(255,255,255,0.08)':accent,border:'none',borderRadius:14,padding:'5px 16px',cursor:savingNickname?'default':'pointer',fontSize:11,fontWeight:700,color:savingNickname?T.text2:'#07070F',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                        {savingNickname&&<div style={{width:10,height:10,border:'1.5px solid rgba(255,255,255,0.3)',borderTop:'1.5px solid #fff',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>}
                        {savingNickname?'Saving':'Save'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* BIO */}
              <div style={{display:'flex',alignItems:'flex-start',gap:12,padding:'14px 2px',borderTop:`1px solid ${T.hairline}`,borderBottom:`1px solid ${T.hairline}`,marginBottom:26}}>
                <div style={{width:30,height:30,borderRadius:9,background:`${accent}14`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}><SvgIcon name="edit" size={13} color={accent}/></div>
                <div style={{flex:1,minWidth:0}}>
                  <Eyebrow color={accent} style={{marginBottom:7}}>Bio</Eyebrow>
                  <textarea ref={bioRef} value={bioInput} onChange={e=>setBioInput(e.target.value)} maxLength={160} placeholder="Tell people about your taste in film..." rows={2} style={{width:'100%',boxSizing:'border-box',background:'transparent',border:'none',padding:0,color:T.text,fontSize:14,outline:'none',fontFamily:'inherit',resize:'none',lineHeight:1.5}}/>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:6}}>
                    <span style={{fontSize:10.5,color:T.text3}}>{bioInput.length}/160</span>
                    {bioInput!==bio&&(
                      <button onClick={saveBio} disabled={savingBio} style={{background:savingBio?'rgba(255,255,255,0.08)':accent,border:'none',borderRadius:14,padding:'5px 16px',cursor:savingBio?'default':'pointer',fontSize:11,fontWeight:700,color:savingBio?T.text2:'#07070F',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6}}>
                        {savingBio&&<div style={{width:10,height:10,border:'1.5px solid rgba(255,255,255,0.3)',borderTop:'1.5px solid #fff',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>}
                        {savingBio?'Saving':'Save'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div style={{position:'relative',marginBottom:26}}>
                <AccentGlow accent={accent} size={160} style={{right:-40,top:-40}}/>
                <div style={{position:'relative',display:'flex',alignItems:'center',gap:16,marginBottom:18}}>
                  <CineScoreRing score={cineScore} accent={accent}/>
                  <div style={{flex:1}}>
                    <Eyebrow style={{marginBottom:5}}>CineScore</Eyebrow>
                    <div style={{fontSize:12,color:T.text2,lineHeight:1.5,marginBottom:9}}>{cineScore<100?'Just getting started — mark a film watched or leave a review.':cineScore<300?'Casual viewer — keep logging watches to climb.':cineScore<600?'Dedicated cinephile — share a list to grow your score.':'Elite connoisseur.'}</div>
                    {cineScore<300&&(
                      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
                        <button onClick={()=>setTab('watched')} style={{background:`${accent}14`,border:`1px solid ${accent}40`,borderRadius:14,padding:'5px 10px',cursor:'pointer',fontSize:10,fontWeight:700,color:accent,fontFamily:'inherit'}}>View watched</button>
                        <button onClick={()=>{onClose&&onClose();onDiscover&&onDiscover();}} style={{background:T.surface2,border:`1px solid ${T.hairline}`,borderRadius:14,padding:'5px 10px',cursor:'pointer',fontSize:10,fontWeight:600,color:T.text2,fontFamily:'inherit'}}>Find something new</button>
                      </div>
                    )}
                    <button onClick={async()=>{setSharing(true);try{const d=await generateShareCard('score',{score:cineScore,name:user?.firstName||user?.username||'Cinephile',watched,reviews,saved},accent);await shareImage(d,'My CineScore',`My CineScore is ${cineScore}!`);showToast('Share card ready!');}catch(e){console.error(e);}setSharing(false);}} disabled={sharing} style={{background:'none',border:'none',padding:0,cursor:'pointer',fontSize:11,color:accent,fontWeight:600,fontFamily:'inherit',display:'flex',alignItems:'center',gap:5,opacity:sharing?0.6:1}}>
                      <SvgIcon name="share" size={11} color={accent}/>{sharing?'Preparing…':'Share Score'}
                    </button>
                  </div>
                </div>
                <div style={{position:'relative',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:1,borderTop:`1px solid ${T.hairline}`,borderBottom:`1px solid ${T.hairline}`,borderRadius:0,overflow:'hidden'}}>
                  {[{label:'Titles',value:saved},{label:'Watched',value:watched},{label:'Reviews',value:reviews}].map(s=>(
                    <div key={s.label} style={{background:'transparent',boxShadow:`-1px 0 0 ${T.hairline}`,padding:'14px 6px',textAlign:'center'}}>
                      <SerifStat size={21}>{s.value}</SerifStat>
                      <Eyebrow style={{marginTop:4,fontSize:8.5}}>{s.label}</Eyebrow>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,marginBottom:26,borderTop:`1px solid ${T.hairline}`,borderBottom:`1px solid ${T.hairline}`,borderRadius:0,overflow:'hidden'}}>
                {[{label:'Avg Rating',value:avgRating,icon:'star'},{label:'Genres Explored',value:Object.keys(topGenres).length,icon:'gem'}].map(s=>(
                  <div key={s.label} style={{background:'transparent',boxShadow:`-1px 0 0 ${T.hairline}`,padding:'14px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:7}}><SvgIcon name={s.icon} size={11} color={T.text3}/><Eyebrow style={{fontSize:8.5}}>{s.label}</Eyebrow></div>
                    <SerifStat size={23}>{s.value}</SerifStat>
                  </div>
                ))}
              </div>
              {sortedGenres.length>0&&(
                <div style={{marginBottom:26}}>
                  <Eyebrow style={{marginBottom:12}}>Top Genres</Eyebrow>
                  {sortedGenres.map(([genre,count])=>(
                    <div key={genre} style={{marginBottom:10}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}><span style={{fontSize:12.5,color:T.text,fontWeight:500}}>{genre}</span><span style={{fontSize:11,color:T.text3}}>{count} films</span></div>
                      <div style={{height:2,borderRadius:2,background:T.hairline}}><div style={{height:'100%',borderRadius:2,background:accent,width:`${(count/sortedGenres[0][1])*100}%`,transition:'width 0.8s ease'}}/></div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:'14px',marginBottom:14,display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:36,height:36,borderRadius:10,background:`${accent}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <SvgIcon name={watchlistPublic?'eye':'bookmark'} size={16} color={accent}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#fff'}}>Public Watchlist</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginTop:1}}>{watchlistPublic?'Anyone can see your watchlist':'Only you can see your watchlist'}</div>
                </div>
                <button onClick={togglePrivacy} disabled={loadingSettings} role="switch" aria-checked={watchlistPublic} style={{width:44,height:26,borderRadius:13,border:'none',cursor:loadingSettings?'default':'pointer',background:watchlistPublic?accent:'rgba(255,255,255,0.12)',position:'relative',flexShrink:0,transition:'background 0.2s ease',padding:0}}>
                  <div style={{position:'absolute',top:3,left:watchlistPublic?23:3,width:20,height:20,borderRadius:'50%',background:'#fff',transition:'left 0.2s ease'}}/>
                </button>
              </div>

              {/* Notifications */}
              <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:'14px',marginBottom:14}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                  <div style={{width:36,height:36,borderRadius:10,background:`${accent}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <SvgIcon name="bell" size={16} color={accent}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#fff'}}>Notifications</div>
                    <div style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginTop:1}}>Email, browser, and app alerts</div>
                  </div>
                </div>

                {/* Email — primary row */}
                <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderTop:`1px solid ${T.hairline}`}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:T.text}}>Email</div>
                    <div style={{fontSize:11,color:T.text3,marginTop:2}}>
                      {user?.primaryEmailAddress?.emailAddress
                        ? `Send to ${user.primaryEmailAddress.emailAddress}`
                        : 'Messages & follows to your inbox'}
                    </div>
                  </div>
                  <button type="button" onClick={()=>toggleNotify('email')} disabled={loadingSettings} role="switch" aria-checked={!!notifyPrefs.email} style={{width:44,height:26,borderRadius:13,border:'none',cursor:'pointer',background:notifyPrefs.email?accent:'rgba(255,255,255,0.12)',position:'relative',flexShrink:0,padding:0}}>
                    <div style={{position:'absolute',top:3,left:notifyPrefs.email?23:3,width:20,height:20,borderRadius:'50%',background:'#fff',transition:'left 0.2s ease'}}/>
                  </button>
                </div>

                {/* Web push */}
                <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderTop:`1px solid ${T.hairline}`}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:T.text}}>Web push</div>
                    <div style={{fontSize:11,color:T.text3,marginTop:2}}>{hasWebPush?'Enabled on this browser':'Browser alerts when you\'re away'}</div>
                  </div>
                  {hasWebPush?(
                    <button type="button" onClick={()=>toggleNotify('web')} disabled={loadingSettings} role="switch" aria-checked={!!notifyPrefs.web} style={{width:44,height:26,borderRadius:13,border:'none',cursor:'pointer',background:notifyPrefs.web?accent:'rgba(255,255,255,0.12)',position:'relative',flexShrink:0,padding:0}}>
                      <div style={{position:'absolute',top:3,left:notifyPrefs.web?23:3,width:20,height:20,borderRadius:'50%',background:'#fff',transition:'left 0.2s ease'}}/>
                    </button>
                  ):(
                    <button type="button" onClick={enableWebPush} disabled={pushBusy||loadingSettings} style={{background:`${accent}18`,border:`1px solid ${accent}44`,borderRadius:16,padding:'7px 12px',cursor:'pointer',fontSize:11,fontWeight:700,color:accent,fontFamily:'inherit',flexShrink:0}}>
                      {pushBusy?'…':'Enable'}
                    </button>
                  )}
                </div>

                {/* App */}
                <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderTop:`1px solid ${T.hairline}`}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:T.text}}>App</div>
                    <div style={{fontSize:11,color:T.text3,marginTop:2}}>Native push on iOS & Android</div>
                  </div>
                  <span style={{fontSize:10,color:T.text3,fontWeight:600,flexShrink:0}}>Coming soon</span>
                </div>

                <div style={{marginTop:4,paddingTop:10,borderTop:`1px solid ${T.hairline}`}}>
                  <div style={{fontSize:10,letterSpacing:1.2,color:T.text3,fontWeight:700,textTransform:'uppercase',marginBottom:8}}>Notify me about</div>
                  {[
                    {key:'messages',label:'Messages & requests'},
                    {key:'follows',label:'New followers'},
                    {key:'activity',label:'Likes & list activity'},
                  ].map(row=>(
                    <div key={row.key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 0'}}>
                      <span style={{fontSize:12.5,color:T.text2}}>{row.label}</span>
                      <button type="button" onClick={()=>toggleNotify(row.key)} disabled={loadingSettings} role="switch" aria-checked={!!notifyPrefs[row.key]} style={{width:40,height:24,borderRadius:12,border:'none',cursor:'pointer',background:notifyPrefs[row.key]?accent:'rgba(255,255,255,0.12)',position:'relative',flexShrink:0,padding:0}}>
                        <div style={{position:'absolute',top:3,left:notifyPrefs[row.key]?20:3,width:18,height:18,borderRadius:'50%',background:'#fff',transition:'left 0.2s ease'}}/>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

                            <button type="button" onClick={()=>setShowTmdb(true)} style={{display:'block',width:'100%',background:'none',border:'none',padding:'0 0 14px',cursor:'pointer',textAlign:'center',fontFamily:'inherit'}}>
                <span style={{fontSize:11,color:T.text3,lineHeight:1.4,textDecoration:'underline',textDecorationColor:'rgba(255,255,255,0.15)',textUnderlineOffset:3}}>
                  Movie data provided by TMDB · Disclaimer
                </span>
              </button>
              {showTmdb&&(
                <div onClick={()=>setShowTmdb(false)} style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(12px)',display:'flex',alignItems:'center',justifyContent:'center',padding:24,animation:'fadeIn 0.2s ease'}}>
                  <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:340,background:'rgba(18,18,26,0.82)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',border:`1px solid ${T.hairline}`,borderRadius:18,padding:'22px 20px 20px',position:'relative'}}>
                    <button type="button" onClick={()=>setShowTmdb(false)} style={{position:'absolute',top:12,right:12,background:'transparent',border:'none',cursor:'pointer',padding:4}}><SvgIcon name="close" size={13} color={T.text2}/></button>
                    <div style={{fontFamily:T.serif,letterSpacing:'-0.02em',fontSize:17,fontWeight:700,color:T.text,marginBottom:12}}>Data disclaimer</div>
                    <div style={{fontSize:13,color:T.text2,lineHeight:1.55,marginBottom:14}}>
                      This product uses the TMDB API but is not endorsed or certified by TMDB.
                    </div>
                    <div style={{fontSize:12,color:T.text3,lineHeight:1.5,marginBottom:16}}>
                      Titles, posters, ratings, and related metadata come from The Movie Database (TMDB). CineScroll is an independent discovery app and is not affiliated with TMDB.
                    </div>
                    <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:12,fontWeight:600,color:accent,textDecoration:'none'}}>
                      Visit themoviedb.org →
                    </a>
                  </div>
                </div>
              )}
<button onClick={handleSignOut} disabled={signingOut||signedOut} style={{width:'100%',background:signedOut?`${accent}10`:'rgba(255,255,255,0.03)',border:`1px solid ${signedOut?accent+'44':'rgba(255,255,255,0.07)'}`,borderRadius:14,padding:'13px',cursor:signingOut||signedOut?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,fontFamily:'inherit',transition:'all 0.3s ease'}}>
                {signedOut?(<><div style={{width:16,height:16,borderRadius:'50%',background:accent,display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="check" size={10} color="#000"/></div><span style={{fontSize:13,color:accent,fontWeight:600}}>Signed out</span></>):signingOut?(<><div style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.1)',borderTop:'2px solid rgba(255,255,255,0.6)',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/><span style={{fontSize:13,color:'rgba(255,255,255,0.5)'}}>Signing out...</span></>):(<><SvgIcon name="logout" size={15} color="rgba(255,255,255,0.4)"/><span style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>Sign out</span></>)}
              </button>
            </div>
          )}
          {tab==='watchlist'&&(
            <div>
              <div style={{margin:'16px 18px 0',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:1,borderTop:`1px solid ${T.hairline}`,borderBottom:`1px solid ${T.hairline}`,borderRadius:0,overflow:'hidden'}}>
                <div style={{background:'transparent',boxShadow:`-1px 0 0 ${T.hairline}`,padding:'13px 8px',textAlign:'center'}}><SerifStat size={18}>{watchlist.length}</SerifStat><Eyebrow style={{marginTop:3,fontSize:8.5}}>Titles</Eyebrow></div>
                <div style={{background:'transparent',boxShadow:`-1px 0 0 ${T.hairline}`,padding:'13px 8px',textAlign:'center'}}><SerifStat size={18} color={accent}>{avgRating}</SerifStat><Eyebrow style={{marginTop:3,fontSize:8.5}}>Avg Rating</Eyebrow></div>
                <div style={{background:'transparent',boxShadow:`-1px 0 0 ${T.hairline}`,padding:'13px 8px',textAlign:'center'}}><SerifStat size={18} color="#7BC8FF">{watched}</SerifStat><Eyebrow style={{marginTop:3,fontSize:8.5}}>Watched</Eyebrow></div>
              </div>
              <div style={{padding:'14px 18px 6px',display:'flex',flexDirection:'column',gap:9}}>
                <div style={{position:'relative'}}><div style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)'}}><SvgIcon name="search" size={13} color={T.text3}/></div><input value={watchlistSearch} onChange={e=>setWatchlistSearch(e.target.value)} placeholder="Search watchlist..." style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${T.hairline}`,borderRadius:12,padding:'9px 12px 9px 34px',color:T.text,fontSize:13,outline:'none',fontFamily:'inherit'}}/></div>
                <div style={{display:'flex',gap:5,alignItems:'center'}}>
                  <div style={{display:'flex',gap:4,flex:1}}>{[['all','All'],['movies','Movies'],['tv','TV']].map(([val,label])=>(<button key={val} onClick={()=>setWatchlistFilter(val)} style={{flex:1,background:watchlistFilter===val?accent:'transparent',border:`1px solid ${watchlistFilter===val?accent:T.hairlineStrong}`,borderRadius:20,padding:'5px 6px',cursor:'pointer',fontSize:11,fontWeight:watchlistFilter===val?700:500,color:watchlistFilter===val?'#07070F':T.text2,fontFamily:'inherit',transition:'all 0.2s ease'}}>{label}</button>))}</div>
                  <select value={watchlistSort} onChange={e=>setWatchlistSort(e.target.value)} style={{background:T.surface2,border:`1px solid ${T.hairline}`,borderRadius:20,padding:'5px 8px',color:T.text2,fontSize:11,outline:'none',fontFamily:'inherit',cursor:'pointer'}}><option value="date">Date added</option><option value="rating">Rating</option><option value="title">A-Z</option></select>
                </div>
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <Eyebrow color={T.text3} style={{marginBottom:0}}>On my platforms</Eyebrow>
                    {watchlistPlatform?(
                      <button type="button" onClick={()=>setWatchlistPlatform('')} style={{background:'none',border:'none',cursor:'pointer',fontSize:11,color:accent,fontWeight:600,fontFamily:'inherit',padding:0}}>Clear</button>
                    ):null}
                  </div>
                  <div style={{display:'flex',gap:6,overflowX:'auto',WebkitOverflowScrolling:'touch',scrollbarWidth:'none',paddingBottom:2}}>
                    {WATCHLIST_PLATFORMS.map(p=>{
                      const on=watchlistPlatform===p.name;
                      return (
                        <button key={p.name} type="button" onClick={()=>setWatchlistPlatform(on?'':p.name)} style={{flexShrink:0,background:on?`${p.color}22`:'transparent',border:`1px solid ${on?p.color+'66':T.hairlineStrong}`,borderRadius:20,padding:'5px 12px',cursor:'pointer',fontSize:11,fontWeight:on?700:500,color:on?p.color:T.text2,fontFamily:'inherit',transition:'all 0.2s ease'}}>{p.name}</button>
                      );
                    })}
                  </div>
                </div>
                {platformAlerts.length>0&&(
                  <div style={{marginTop:12,display:'flex',flexDirection:'column',gap:8}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <Eyebrow color={T.text3} style={{marginBottom:0}}>Platform updates</Eyebrow>
                      <button type="button" onClick={()=>setPlatformAlerts([])} style={{background:'none',border:'none',cursor:'pointer',fontSize:11,color:T.text3,fontFamily:'inherit',padding:0}}>Dismiss</button>
                    </div>
                    {platformAlerts.map((a,i)=>(
                      <div key={i} style={{display:'flex',gap:10,alignItems:'center',padding:'10px 12px',borderRadius:14,border:`1px solid ${T.hairline}`,background:T.surface2}}>
                        {a.poster?(
                          <div style={{width:28,height:40,borderRadius:6,overflow:'hidden',flexShrink:0}}><img src={a.poster} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/></div>
                        ):(
                          <div style={{width:28,height:40,borderRadius:6,background:T.surface,flexShrink:0}}/>
                        )}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12.5,fontWeight:700,color:T.text,fontFamily:T.serif,letterSpacing:'-0.02em',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.title}</div>
                          <div style={{fontSize:11,color:a.kind==='new'?'#7BFF9E':'#FF8B8B',marginTop:2,fontWeight:600}}>
                            {a.kind==='new'?`Now on ${a.platform}`:`Left ${a.platform}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {loadingData||(loadingProviders&&watchlistPlatform)?(<div style={{textAlign:'center',padding:24,color:T.text3,fontSize:13,display:'flex',flexDirection:'column',alignItems:'center',gap:8}}><div style={{width:20,height:20,border:`2px solid rgba(255,255,255,0.1)`,borderTop:`2px solid ${accent}`,borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>{loadingProviders?'Checking platforms...':'Loading...'}</div>)
              :filteredWatchlist.length===0?(<div style={{textAlign:'center',padding:'24px 20px',display:'flex',flexDirection:'column',alignItems:'center',gap:12}}><SvgIcon name="bookmark" size={26} color={T.hairlineStrong}/><div style={{fontSize:13.5,color:T.text3}}>{watchlistSearch?'No matches':watchlistPlatform?`Nothing on ${watchlistPlatform} in your watchlist`:'Your watchlist is empty'}</div>{!watchlistSearch&&!watchlistPlatform&&<button onClick={()=>{if(onDiscover){onDiscover();}else if(onClose){onClose();}}} style={{marginTop:4,background:accent,border:'none',borderRadius:20,padding:'10px 18px',cursor:'pointer',fontSize:12,fontWeight:700,color:'#07070F',fontFamily:'inherit'}}>Discover movies</button>}{watchlistPlatform&&<button onClick={()=>setWatchlistPlatform('')} style={{marginTop:4,background:'transparent',border:`1px solid ${T.hairlineStrong}`,borderRadius:20,padding:'10px 18px',cursor:'pointer',fontSize:12,fontWeight:600,color:T.text2,fontFamily:'inherit'}}>Show all titles</button>}</div>)
              :(
                <div style={{display:'flex',flexDirection:'column',padding:'0 18px 12px'}}>
                  {filteredWatchlist.map((m,i)=>(
                    <div key={m.movie_id} style={{display:'flex',gap:10,alignItems:'flex-start',padding:'13px 0',borderTop:i>0?`1px solid ${T.hairline}`:'none'}}>
                      <div style={{width:18,textAlign:'center',flexShrink:0,marginTop:5}}><span style={{fontSize:11,fontWeight:700,fontFamily:T.serif,letterSpacing:'-0.02em',color:i<3?accent:T.text3}}>{i+1}</span></div>
                      <button onClick={()=>handleWatchlistItemClick(m)} style={{width:52,height:72,borderRadius:10,flexShrink:0,overflow:'hidden',background:m.gradient||GRADS[i%GRADS.length],position:'relative',border:'none',cursor:'pointer',padding:0}}>
                        {m.poster&&<img src={m.poster} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
                        {m.watched&&<div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="check" size={14} color={accent}/></div>}
                        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:22,height:22,borderRadius:'50%',background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="play" size={10} color="#fff" filled/></div></div>
                      </button>
                      <div style={{flex:1,minWidth:0}}>
                        <button onClick={()=>handleWatchlistItemClick(m)} style={{background:'none',border:'none',cursor:'pointer',padding:0,textAlign:'left',width:'100%'}}>
                          <div style={{display:'flex',alignItems:'flex-start',gap:5,marginBottom:3}}><span style={{fontSize:14,fontWeight:700,color:m.watched?T.text3:T.text,fontFamily:T.serif,letterSpacing:'-0.02em',lineHeight:1.2,textDecoration:m.watched?'line-through':'none'}}>{m.title}</span>{m.is_tv&&<span style={{fontSize:9,color:'#7BC8FF',border:'1px solid #7BC8FF44',borderRadius:4,padding:'1px 4px',flexShrink:0,marginTop:2,fontWeight:700}}>TV</span>}</div>
                        </button>
                        <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:6}}><span style={{fontSize:11,color:T.text3}}>{m.year}</span><SvgIcon name="star" size={10} color={accent} filled/><span style={{fontSize:11,color:accent,fontWeight:600}}>{m.rating}</span>{m.watched&&<span style={{fontSize:9,color:accent,background:`${accent}14`,borderRadius:10,padding:'1px 6px',fontWeight:700}}>Watched</span>}</div>
                        {m.genre&&m.genre.length>0&&<div style={{display:'flex',gap:3,flexWrap:'wrap',marginBottom:8}}>{m.genre.slice(0,3).map(g=><span key={g} style={{fontSize:9,color:T.text3,background:T.surface2,border:`1px solid ${T.hairline}`,borderRadius:20,padding:'2px 6px'}}>{g}</span>)}</div>}
                        <div style={{display:'flex',gap:5}}>
                          <button onClick={()=>toggleWatched(m)} style={{display:'flex',alignItems:'center',gap:3,background:m.watched?`${accent}14`:'transparent',border:`1px solid ${m.watched?accent+'40':T.hairlineStrong}`,borderRadius:20,padding:'3px 9px',cursor:'pointer',fontSize:10,color:m.watched?accent:T.text2,fontFamily:'inherit',fontWeight:600}}><SvgIcon name="check" size={9} color={m.watched?accent:T.text2}/>{m.watched?'Watched':'Mark watched'}</button>
                          <button onClick={()=>handleWatchlistItemClick(m)} style={{display:'flex',alignItems:'center',gap:3,background:'transparent',border:`1px solid ${T.hairlineStrong}`,borderRadius:20,padding:'3px 9px',cursor:'pointer',fontSize:10,color:T.text2,fontFamily:'inherit',fontWeight:600}}><SvgIcon name="play" size={9} color={T.text2} filled/>Trailer</button>
                          <button onClick={()=>removeFromWatchlist(m)} style={{background:'transparent',border:`1px solid ${T.hairline}`,borderRadius:20,padding:'3px 7px',cursor:'pointer',display:'flex',alignItems:'center'}}><SvgIcon name="trash" size={10} color={T.text3}/></button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); if(onDiscover){ onDiscover(); } else if(onClose){ onClose(); } }}
                    style={{display:'flex',alignItems:'center',gap:10,padding:'16px 0 4px',justifyContent:'center',marginTop:4,borderTop:`1px solid ${T.hairline}`,width:'100%',background:'none',borderLeft:'none',borderRight:'none',borderBottom:'none',cursor:'pointer',fontFamily:'inherit'}}
                  >
                    <SvgIcon name="plus" size={13} color={T.text3}/>
                    <div style={{textAlign:'left'}}><div style={{fontSize:12,color:T.text2,fontWeight:500}}>Add something to your watchlist</div><div style={{fontSize:10,color:T.text3,marginTop:1}}>Find your next great watch</div></div>
                  </button>
                </div>
              )}
            </div>
          )}
          {tab==='watched'&&(
            <div style={{padding:'16px 18px'}}>
              {/* Summary banner */}
              <div style={{position:'relative',borderRadius:20,padding:'20px 18px',marginBottom:18,overflow:'hidden',border:`1px solid rgba(255,255,255,0.08)`,background:T.surface,backdropFilter:'blur(18px)',WebkitBackdropFilter:'blur(18px)'}}>
                <AccentGlow accent={accent} size={140} style={{right:-30,top:-40}}/>
                <div style={{position:'relative',zIndex:1}}>
                  <Eyebrow color={T.text3} style={{marginBottom:8}}>Your history</Eyebrow>
                  <div style={{fontFamily:T.serif,letterSpacing:'-0.02em',fontSize:22,fontWeight:700,color:T.text,lineHeight:1.25,marginBottom:6}}>
                    {watched===0
                      ? <>You haven&apos;t marked anything as <span style={{color:accent}}>seen</span> yet</>
                      : <>You&apos;ve watched a total of <span style={{color:accent}}>{watched}</span> {watched===1?'title':'titles'}</>}
                  </div>
                  <div style={{fontSize:12.5,color:T.text3,lineHeight:1.5}}>
                    {watched===0
                      ? 'Tap Seen on any film in the feed to log it here and grow your CineScore.'
                      : watched<5
                        ? 'Nice start — keep logging watches to build your CineScore.'
                        : watched<20
                          ? 'Solid streak. Your taste is taking shape.'
                          : 'Deep log. You know what you like.'}
                  </div>
                  {watched>0&&(
                    <div style={{display:'flex',gap:16,marginTop:14}}>
                      <div>
                        <div style={{fontSize:18,fontWeight:700,color:accent,fontFamily:T.serif}}>{watched}</div>
                        <div style={{fontSize:10,color:T.text3,letterSpacing:0.5,textTransform:'uppercase',fontWeight:600}}>Watched</div>
                      </div>
                      <div style={{width:1,background:T.hairline}}/>
                      <div>
                        <div style={{fontSize:18,fontWeight:700,color:T.text,fontFamily:T.serif}}>{watchlist.filter(m=>!m.watched).length}</div>
                        <div style={{fontSize:10,color:T.text3,letterSpacing:0.5,textTransform:'uppercase',fontWeight:600}}>Still to watch</div>
                      </div>
                      <div style={{width:1,background:T.hairline}}/>
                      <div>
                        <div style={{fontSize:18,fontWeight:700,color:T.text,fontFamily:T.serif}}>{cineScore}</div>
                        <div style={{fontSize:10,color:T.text3,letterSpacing:0.5,textTransform:'uppercase',fontWeight:600}}>CineScore</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {loadingData?(
                <div style={{textAlign:'center',padding:30,color:T.text3,fontSize:13,display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
                  <div style={{width:20,height:20,border:`2px solid rgba(255,255,255,0.1)`,borderTop:`2px solid ${accent}`,borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
                  Loading...
                </div>
              ):watched===0?(
                <div style={{textAlign:'center',padding:'28px 16px',display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
                  <SvgIcon name="check" size={28} color={T.hairlineStrong}/>
                  <div style={{fontSize:13.5,color:T.text3}}>Nothing watched yet</div>
                  <button
                    type="button"
                    onClick={()=>{if(onDiscover){onDiscover();}else if(onClose){onClose();}}}
                    style={{marginTop:4,background:accent,border:'none',borderRadius:20,padding:'10px 18px',cursor:'pointer',fontSize:12,fontWeight:700,color:'#07070F',fontFamily:'inherit'}}
                  >
                    Browse the feed
                  </button>
                </div>
              ):(
                <div style={{display:'flex',flexDirection:'column'}}>
                  {watchlist.filter(m=>m.watched).sort((a,b)=>(b.saved_at||0)-(a.saved_at||0)).map((m,i)=>(
                    <div key={m.movie_id} style={{display:'flex',gap:10,alignItems:'flex-start',padding:'13px 0',borderTop:i>0?`1px solid ${T.hairline}`:'none'}}>
                      <button type="button" onClick={()=>handleWatchlistItemClick(m)} style={{width:48,height:70,borderRadius:10,overflow:'hidden',flexShrink:0,padding:0,border:'none',cursor:'pointer',background:T.surface2,position:'relative'}}>
                        {m.poster?<img src={m.poster} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<div style={{width:'100%',height:'100%',background:T.surface}}/>}
                        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.25)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <div style={{width:22,height:22,borderRadius:'50%',background:`${accent}cc`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <SvgIcon name="check" size={11} color="#07070F" filled/>
                          </div>
                        </div>
                      </button>
                      <div style={{flex:1,minWidth:0}}>
                        <button type="button" onClick={()=>handleWatchlistItemClick(m)} style={{background:'none',border:'none',cursor:'pointer',padding:0,textAlign:'left',width:'100%'}}>
                          <div style={{display:'flex',alignItems:'flex-start',gap:5,marginBottom:3}}>
                            <span style={{fontSize:14,fontWeight:700,color:T.text,fontFamily:T.serif,letterSpacing:'-0.02em',lineHeight:1.2}}>{m.title}</span>
                            {m.is_tv&&<span style={{fontSize:9,color:'#7BC8FF',border:'1px solid #7BC8FF44',borderRadius:4,padding:'1px 4px',flexShrink:0,marginTop:2,fontWeight:700}}>TV</span>}
                          </div>
                        </button>
                        <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:8}}>
                          <span style={{fontSize:11,color:T.text3}}>{m.year}</span>
                          <SvgIcon name="star" size={10} color={accent} filled/>
                          <span style={{fontSize:11,color:accent,fontWeight:600}}>{m.rating}</span>
                          <span style={{fontSize:9,color:accent,background:`${accent}14`,borderRadius:10,padding:'1px 6px',fontWeight:700}}>Watched</span>
                        </div>
                        <div style={{display:'flex',gap:5}}>
                          <button type="button" onClick={()=>toggleWatched(m)} style={{display:'flex',alignItems:'center',gap:3,background:`${accent}14`,border:`1px solid ${accent}40`,borderRadius:20,padding:'3px 9px',cursor:'pointer',fontSize:10,color:accent,fontFamily:'inherit',fontWeight:600}}>
                            <SvgIcon name="check" size={9} color={accent}/>Unmark
                          </button>
                          <button type="button" onClick={()=>handleWatchlistItemClick(m)} style={{display:'flex',alignItems:'center',gap:3,background:'transparent',border:`1px solid ${T.hairlineStrong}`,borderRadius:20,padding:'3px 9px',cursor:'pointer',fontSize:10,color:T.text2,fontFamily:'inherit',fontWeight:600}}>
                            <SvgIcon name="play" size={9} color={T.text2} filled/>Trailer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab==='reviews'&&(
            <div style={{padding:'16px 18px'}}>
              {loadingData?<div style={{textAlign:'center',padding:30,color:T.text3,fontSize:13}}>Loading...</div>
              :userReviews.length===0?(<div style={{textAlign:'center',padding:'32px 0',display:'flex',flexDirection:'column',alignItems:'center',gap:10}}><SvgIcon name="chat" size={26} color={T.hairlineStrong}/><div style={{fontSize:13.5,color:T.text3}}>No reviews yet</div></div>)
              :(<div style={{display:'flex',flexDirection:'column'}}>
                {userReviews.map((r,i)=>(
                  <div key={r.id} style={{padding:'14px 0',borderTop:i>0?`1px solid ${T.hairline}`:'none'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><span style={{fontSize:14,fontWeight:700,color:T.text,fontFamily:T.serif}}>{r.movie_title}</span><span style={{fontSize:11,color:T.text3}}>{r.time}</span></div>
                    {r.rating>0&&<div style={{display:'flex',gap:2,marginBottom:7}}>{[1,2,3,4,5].map(s=><SvgIcon key={s} name="star" size={11} color={s<=r.rating?accent:T.hairlineStrong} filled={s<=r.rating}/>)}</div>}
                    <p style={{fontSize:13,color:T.text2,lineHeight:1.55,margin:0}}>{r.text}</p>
                  </div>
                ))}
              </div>)}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

// AUTH GATE
function AuthGate({onClose,accent}){
  const{openSignIn}=useClerk();
  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,0.82)',backdropFilter:'blur(20px)',display:'flex',alignItems:'flex-end',justifyContent:'center',animation:'fadeIn 0.2s ease'}}>
      <div onClick={e=>e.stopPropagation()} style={{position:'relative',width:'100%',background:ambient(accent),borderRadius:'24px 24px 0 0',border:`1px solid ${T.hairline}`,borderBottom:'none',padding:'0 24px 48px',animation:'sheetUp 0.32s cubic-bezier(0.22,1,0.36,1)',overflow:'hidden'}}>
        <AccentGlow accent={accent} size={200} style={{left:'50%',top:0,transform:'translateX(-50%)'}}/>
        <div style={{width:32,height:3,borderRadius:2,background:'rgba(255,255,255,0.14)',margin:'14px auto 26px',position:'relative'}}/>
        <div style={{position:'relative',textAlign:'center',marginBottom:26}}>
          <div style={{fontFamily:T.serif,fontSize:21,letterSpacing:'-0.02em',fontWeight:700,color:T.text,marginBottom:9}}>Join CineScroll</div>
          <div style={{fontSize:13,color:T.text2,lineHeight:1.6}}>Sign in to leave reviews, save your watchlist, and discover films with friends.</div>
        </div>
        <button onClick={()=>{openSignIn();onClose();}} style={{position:'relative',width:'100%',background:'#fff',border:'none',borderRadius:14,padding:'14px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:12,marginBottom:10,fontFamily:'inherit'}}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          <span style={{fontSize:14,fontWeight:700,color:'#1a1a1a'}}>Continue with Google</span>
        </button>
        <button onClick={()=>{openSignIn();onClose();}} style={{position:'relative',width:'100%',background:T.surface2,border:`1px solid ${T.hairline}`,borderRadius:14,padding:'14px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:12,fontFamily:'inherit'}}>
          <SvgIcon name="user" size={16} color={T.text2}/>
          <span style={{fontSize:14,fontWeight:600,color:T.text2}}>Sign in with Email</span>
        </button>
      </div>
      <style>{`@keyframes sheetUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  );
}

// USER PROFILE SHEET
// FOLLOW LIST MODAL (shows followers or following for any user, reused from UserProfileSheet)
function FollowListModal({targetUserId,type,accent,onClose,onSelectUser}){
  const[users,setUsers]=useState([]);
  const[loading,setLoading]=useState(true);

  useEffect(()=>{
    setLoading(true);
    fetch(`/api/follows?type=${type}&targetUserId=${targetUserId}`)
      .then(r=>r.json()).then(d=>{setUsers(d.users||[]);setLoading(false);})
      .catch(()=>setLoading(false));
  },[targetUserId,type]);

  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:160,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(12px)',display:'flex',alignItems:'flex-end',animation:'fadeIn 0.2s ease'}}>
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxHeight:'75%',background:ambient(accent),borderRadius:'24px 24px 0 0',border:`1px solid ${T.hairline}`,borderBottom:'none',display:'flex',flexDirection:'column',animation:'sheetUp 0.3s cubic-bezier(0.22,1,0.36,1)'}}>
        <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={{width:32,height:3,borderRadius:2,background:'rgba(255,255,255,0.14)',margin:'14px auto 0',flexShrink:0}}/>
        <div style={{padding:'16px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0,borderBottom:`1px solid ${T.hairline}`}}>
          <span style={{fontFamily:T.serif,fontSize:21,letterSpacing:'-0.02em',fontWeight:700,color:T.text,textTransform:'capitalize'}}>{type}</span>
          <button onClick={onClose} style={{background:'transparent',border:'none',width:28,height:28,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="close" size={13} color={T.text2}/></button>
        </div>
        <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',padding:'4px 18px 24px'}}>
          {loading?(
            <div style={{display:'flex',justifyContent:'center',padding:30}}><div style={{width:20,height:20,border:`2px solid rgba(255,255,255,0.1)`,borderTop:`2px solid ${accent}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/></div>
          ):users.length===0?(
            <div style={{textAlign:'center',padding:'30px 16px',color:T.text3,fontSize:13}}>No {type} yet</div>
          ):(
            <div style={{display:'flex',flexDirection:'column'}}>
              {users.map((u,i)=>(
                <button key={u.user_id} onClick={()=>{onSelectUser(u.user_id);onClose();}} style={{display:'flex',alignItems:'center',gap:12,background:'none',border:'none',borderTop:i>0?`1px solid ${T.hairline}`:'none',padding:'12px 0',cursor:'pointer',textAlign:'left',fontFamily:'inherit',width:'100%',boxSizing:'border-box'}}>
                  <div style={{width:42,height:42,borderRadius:'50%',background:`${accent}18`,border:`1px solid ${accent}38`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:700,color:accent,flexShrink:0,overflow:'hidden'}}>
                    {u.avatar_url?<img src={u.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:(u.display_name||u.username||'U')[0].toUpperCase()}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:700,color:T.text}}>{u.display_name||u.username}</div>
                    <div style={{fontSize:11,color:T.text3}}>@{u.username}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function UserProfileSheet({userId,onClose,accent,onWatchTrailer,onAddToWatchlist}){
  const{user:currentUser}=useUser();
  const[profile,setProfile]=useState(null);
  const[loading,setLoading]=useState(true);
  const[following,setFollowing]=useState(false);
  const[toast,setToast]=useState(null);
  const[coverImg,setCoverImg]=useState(null);
  const[tab,setTab]=useState('activity');
  const[activity,setActivity]=useState([]);
  const[loadingActivity,setLoadingActivity]=useState(false);
  const[reviews,setReviews]=useState([]);
  const[loadingReviews,setLoadingReviews]=useState(false);
  const[userLists,setUserLists]=useState([]);
  const[loadingLists,setLoadingLists]=useState(false);
  const[viewingList,setViewingList]=useState(null);
  const[followListType,setFollowListType]=useState(null);
  const[shareCopied,setShareCopied]=useState(false);
  const[viewingProfile,setViewingProfile]=useState(null);
  const[chatPeer,setChatPeer]=useState(null);
  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(null),3000);};
  const TMDB_KEY=process.env.NEXT_PUBLIC_TMDB_KEY;

  useEffect(()=>{
    if(!userId)return;
    setLoading(true);
    setTab('activity');setActivity([]);setReviews([]);setCoverImg(null);
    fetch(`/api/users/${userId}`)
      .then(r=>r.json())
      .then(d=>{setProfile(d);setFollowing(!!d.isFollowing);setLoading(false);})
      .catch(()=>setLoading(false));
  },[userId]);

  // Cover photo: use the user's custom upload if set, otherwise a randomized backdrop from their #1 genre
  useEffect(()=>{
    if(!profile)return;
    if(profile.cover_url){
      const img=new Image();
      img.onload=()=>setCoverImg(profile.cover_url);
      img.onerror=()=>{};
      img.src=profile.cover_url;
      return;
    }
    if(!TMDB_KEY)return;
    const topGenre=profile.topGenres?.[0];
    const genreId=topGenre?TMDB_GENRE_IDS[topGenre]:null;
    if(!genreId)return;
    fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&with_genres=${genreId}&sort_by=popularity.desc&page=1`)
      .then(r=>r.json())
      .then(d=>{
        const results=(d.results||[]).filter(m=>m.backdrop_path);
        if(results.length>0){
          const pick=results[Math.floor(Math.random()*Math.min(5,results.length))];
          const url=`https://image.tmdb.org/t/p/original${pick.backdrop_path}`;
          // preload so the cover only appears once fully decoded (no blurry pop-in)
          const img=new Image();
          img.onload=()=>setCoverImg(url);
          img.onerror=()=>{};
          img.src=url;
        }
      }).catch(()=>{});
  },[profile,TMDB_KEY]);

  // Load activity tab data
  useEffect(()=>{
    if(tab!=='activity'||!profile||activity.length>0)return;
    setLoadingActivity(true);
    fetch(`/api/activity?type=user&userId=${userId}`)
      .then(r=>r.json())
      .then(d=>{setActivity(d.items||[]);setLoadingActivity(false);})
      .catch(()=>setLoadingActivity(false));
  },[tab,profile,userId]);

  // Load reviews tab data
  useEffect(()=>{
    if(tab!=='reviews'||!profile||reviews.length>0)return;
    setLoadingReviews(true);
    fetch(`/api/reviews?userId=${userId}`)
      .then(r=>r.json())
      .then(d=>{setReviews(d.comments||d.reviews||[]);setLoadingReviews(false);})
      .catch(()=>setLoadingReviews(false));
  },[tab,profile,userId]);

  // Load lists tab data
  useEffect(()=>{
    if(tab!=='lists'||!userId||userLists.length>0)return;
    setLoadingLists(true);
    fetch(`/api/lists?tab=user&userId=${encodeURIComponent(profile?.user_id||userId)}`)
      .then(r=>r.json())
      .then(d=>{
        setUserLists(d.lists||[]);
        setLoadingLists(false);
      })
      .catch(()=>setLoadingLists(false));
  },[tab,userId,userLists.length]);

  const handleFollow=async()=>{
    if(!profile)return;
    if(!currentUser){showToast('Sign in to follow');return;}
    const next=!following;
    setFollowing(next);
    setProfile(p=>p?{...p,followers:next?p.followers+1:Math.max(0,p.followers-1)}:p);
    try{
      const res=await fetch('/api/follows',{method:next?'POST':'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({targetId:userId})});
      if(!res.ok){
        setFollowing(!next);
        setProfile(p=>p?{...p,followers:!next?p.followers+1:Math.max(0,p.followers-1)}:p);
        showToast('Could not update follow');
        return;
      }
      showToast(next?`Now following @${profile.username}`:'Unfollowed');
    }catch{
      setFollowing(!next);
      showToast('Could not update follow');
    }
  };

  const handleMessageRequest=()=>{
    if(!profile)return;
    if(!currentUser){showToast('Sign in to message');return;}
    if(currentUser.id===userId)return;
    setChatPeer({
      user_id:userId,
      username:profile.username,
      display_name:profile.display_name||profile.username,
      avatar_url:profile.avatar_url||null,
    });
  };

  const accentColor=accent;

  const timeAgo=(ts)=>{
    if(!ts)return'';
    const diff=Date.now()-new Date(ts).getTime();const mins=Math.floor(diff/60000);
    if(mins<1)return'just now';if(mins<60)return`${mins}m ago`;
    const hrs=Math.floor(mins/60);if(hrs<24)return`${hrs}h ago`;
    return`${Math.floor(hrs/24)}d ago`;
  };

  const activityIcon=(type)=>{
    if(type==='saved')return{icon:'bookmark',label:'Added to watchlist',color:'#7BFF9E'};
    if(type==='watched')return{icon:'eye',label:'Marked as watched',color:'#7BC8FF'};
    if(type==='reviewed')return{icon:'chat',label:'Left a review',color:'#B07FEF'};
    if(type==='list_follow')return{icon:'list',label:'Followed a list',color:'#F5A623'};
if(type==='arc_complete')return{icon:'flame',label:'Finished a Cine Arc',color:'#FF7A2F'};
    return{icon:'play',label:'Activity',color:accentColor};
  };

  return(
    <>
    {chatPeer&&<ChatWidget peer={chatPeer} onClose={()=>{const back=chatPeer?.fromMessages;setChatPeer(null);if(back)setShowMessages(true);}} accent={accentColor||accent}/>}
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:108,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(10px)',display:'flex',alignItems:'flex-end',animation:'fadeIn 0.2s ease'}}>
      {toast&&<Toast message={toast} accent={accent}/>}
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxHeight:'90vh',background:ambient(accent),borderRadius:'24px 24px 0 0',border:`1px solid ${T.hairline}`,borderBottom:'none',display:'flex',flexDirection:'column',animation:'sheetUp 0.32s cubic-bezier(0.22,1,0.36,1)',overflow:'hidden'}}>
        <style>{`@keyframes sheetUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.profile-scroll::-webkit-scrollbar{display:none}`}</style>

        {loading?(
          <div style={{display:'flex',justifyContent:'center',padding:60}}>
            <div style={{width:24,height:24,border:`2px solid rgba(255,255,255,0.1)`,borderTop:`2px solid ${accentColor}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
          </div>
        ):!profile?(
          <div style={{textAlign:'center',padding:'40px 20px',color:T.text3,fontSize:13}}>Couldn't load this profile</div>
        ):(
          <div className="profile-scroll" style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',scrollbarWidth:'none'}}>
            {/* COVER PHOTO — aspect-ratio matches CoverCropModal's export (2.2:1) so the
                saved crop displays without being re-cropped again by a mismatched container */}
            <div style={{position:'relative',width:'100%',aspectRatio:'2.5',flexShrink:0,background:coverImg?'#0a0a14':`linear-gradient(135deg,${accentColor}30,#0a0a14)`,overflow:'hidden'}}>
              {coverImg&&<img src={coverImg} alt="" decoding="async" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',objectPosition:'center top'}}/>}
              <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(8,8,16,0.05) 0%,rgba(8,8,16,0.4) 65%,rgba(8,8,16,0.98) 100%)'}}/>
              <div style={{width:34,height:4,borderRadius:2,background:'rgba(255,255,255,0.25)',position:'absolute',top:10,left:'50%',transform:'translateX(-50%)'}}/>
              <div style={{position:'absolute',top:14,right:14,display:'flex',gap:8,zIndex:2}}>
                <button onClick={async()=>{
                  const shareUrl=`https://this-scine.vercel.app/u/${profile.username||userId}`;
                  const shareData={title:`${profile.display_name||profile.username} on CineScroll`,text:`Check out ${profile.display_name||profile.username}'s profile on CineScroll`,url:shareUrl};
                  try{
                    if(navigator.share){await navigator.share(shareData);}
                    else{await navigator.clipboard.writeText(shareUrl);setShareCopied(true);showToast('Profile link copied');setTimeout(()=>setShareCopied(false),2000);}
                  }catch{}
                }} style={{background:'rgba(0,0,0,0.4)',backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'50%',width:30,height:30,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name={shareCopied?'check':'share'} size={13} color="rgba(255,255,255,0.8)"/></button>
                <button onClick={onClose} style={{background:'rgba(0,0,0,0.4)',backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'50%',width:30,height:30,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="close" size={13} color="rgba(255,255,255,0.8)"/></button>
              </div>
              {/* Avatar anchored to the bottom of the cover via percentage offset, so the overlap
                  stays proportionally consistent across any screen width */}
              <div style={{position:'absolute',left:'6%',bottom:'-22%',width:'21%',aspectRatio:'1',minWidth:64,maxWidth:84,borderRadius:'50%',background:`${accentColor}25`,border:'3px solid #08080F',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,fontWeight:700,color:accentColor,overflow:'hidden',zIndex:2}}>
                {profile.avatar_url?<img src={profile.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:(profile.display_name||profile.username||'U')[0].toUpperCase()}
              </div>
            </div>

            <div style={{padding:'0 20px 32px',marginTop:'9%'}}>
              {/* HEADER: name + follow */}
              <div style={{display:'flex',alignItems:'flex-start',gap:14,marginBottom:18}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:19,fontWeight:700,color:T.text,fontFamily:T.serif,letterSpacing:'-0.02em',lineHeight:1.2}}>{profile.display_name||profile.username}</div>
                  <div style={{fontSize:12,color:T.text3,marginTop:2}}>@{profile.username}</div>
                  {profile.bio&&<div style={{fontSize:12,color:T.text2,marginTop:6,lineHeight:1.5}}>{profile.bio}</div>}
                </div>
                {!profile.isSelf&&(
                  <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                    {currentUser&&currentUser.id!==userId&&(
                      <button
                        type="button"
                        onClick={handleMessageRequest}
                        title="Send message request"
                        style={{background:T.surface2,border:`1px solid ${T.hairlineStrong}`,borderRadius:20,width:38,height:36,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}
                      >
                        <SvgIcon name="chat" size={15} color={T.text2}/>
                      </button>
                    )}
                    <button onClick={handleFollow} style={{background:following?'transparent':accentColor,border:`1px solid ${following?T.hairlineStrong:accentColor}`,borderRadius:20,padding:'9px 20px',cursor:'pointer',fontSize:12,color:following?T.text2:'#07070F',fontFamily:'inherit',fontWeight:700,flexShrink:0,transition:'all 0.2s ease'}}>
                      {following?'Following':'Follow'}
                    </button>
                  </div>
                )}
              </div>

              {/* STATS */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:1,marginBottom:22,borderTop:`1px solid ${T.hairline}`,borderBottom:`1px solid ${T.hairline}`,borderRadius:0,overflow:'hidden'}}>
                {[
                  {label:'Followers',value:profile.followers,icon:'people',action:()=>setFollowListType('followers')},
                  {label:'Following',value:profile.following,icon:'userPlus',action:()=>setFollowListType('following')},
                  {label:'Watchlist',value:profile.watchlistCount,icon:'bookmark',action:()=>setTab('watchlist')},
                ].map(s=>(
                  <button key={s.label} onClick={s.action} style={{background:'transparent',boxShadow:`-1px 0 0 ${T.hairline}`,border:'none',padding:'13px 8px',display:'flex',flexDirection:'column',alignItems:'center',gap:5,cursor:'pointer',fontFamily:'inherit'}}>
                    <SvgIcon name={s.icon} size={14} color={T.text3}/>
                    <SerifStat size={18}>{s.value}</SerifStat>
                    <Eyebrow style={{fontSize:8.5}}>{s.label}</Eyebrow>
                  </button>
                ))}
              </div>

              {/* TOP GENRES */}
              {profile.topGenres&&profile.topGenres.length>0&&(
                <div style={{marginBottom:22}}>
                  <Eyebrow color={T.text3} style={{marginBottom:10}}>Top Genres</Eyebrow>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {profile.topGenres.map(g=>(<span key={g} style={{fontSize:11,color:accentColor,background:`${accentColor}14`,border:`1px solid ${accentColor}30`,borderRadius:20,padding:'4px 12px',fontWeight:600}}>{g}</span>))}
                  </div>
                </div>
              )}

              {/* TABS */}
              <div style={{display:'flex',gap:20,borderBottom:`1px solid ${T.hairline}`,marginBottom:18}}>
                {[['activity','flame','Activity'],['watchlist','bookmark','Watchlist'],['reviews','star','Reviews'],['lists','folder','Folders']].map(([t,icon,label])=>(
                  <button key={t} onClick={()=>setTab(t)} style={{background:'none',border:'none',cursor:'pointer',padding:'0 0 12px',fontFamily:'inherit',fontSize:12,fontWeight:tab===t?700:500,color:tab===t?accentColor:T.text3,borderBottom:`2px solid ${tab===t?accentColor:'transparent'}`,transition:'all 0.2s ease',display:'flex',alignItems:'center',gap:5}}>
                    <SvgIcon name={icon} size={11} color={tab===t?accentColor:T.text3} filled={t==='activity'&&tab===t}/>
                    {label}
                  </button>
                ))}
              </div>

              {/* ACTIVITY TAB */}
              {tab==='activity'&&(
                loadingActivity?(
                  <div style={{display:'flex',justifyContent:'center',padding:30}}><div style={{width:22,height:22,border:`2px solid rgba(255,255,255,0.1)`,borderTop:`2px solid ${accentColor}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/></div>
                ):activity.length===0?(
                  <div style={{textAlign:'center',padding:'24px 16px',fontSize:12,color:T.text3}}>No activity yet</div>
                ):(
                  <div style={{display:'flex',flexDirection:'column'}}>
                    {activity.map((item,i)=>{
                      const act=activityIcon(item.type);
                      return(
                        <button key={item.id||i} onClick={()=>{if(item.type==='list_follow')return;if(item.movie_id&&onWatchTrailer)onWatchTrailer({id:item.movie_id,title:item.movie_title,poster:item.movie_poster,year:item.movie_year,rating:item.movie_rating,accent:item.movie_accent||accentColor,mediaType:item.is_tv?'tv':'movie',...(item.type==='reviewed'&&item.review_id?{initialTab:'comments',highlightCommentId:item.review_id}:{})});}}
                          style={{display:'flex',gap:12,padding:'13px 0',borderTop:i>0?`1px solid ${T.hairline}`:'none',background:'none',border:'none',cursor:item.movie_id&&item.type!=='list_follow'?'pointer':'default',textAlign:'left',fontFamily:'inherit',width:'100%'}}>
                          {item.movie_poster?(
                            <div style={{width:46,height:64,borderRadius:8,overflow:'hidden',flexShrink:0,background:GRADS[i%GRADS.length]}}><img src={item.movie_poster} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/></div>
                          ):(
                            <div style={{width:46,height:64,borderRadius:8,flexShrink:0,background:`${act.color}14`,border:`1px solid ${act.color}30`,display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name={act.icon} size={18} color={act.color}/></div>
                          )}
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:5}}>
                              <SvgIcon name={act.icon} size={11} color={act.color} filled={act.icon==='bookmark'||act.icon==='eye'}/>
                              <span style={{fontSize:11,color:T.text2}}>{act.label}</span>
                              <span style={{fontSize:10,color:T.text3,marginLeft:'auto'}}>{timeAgo(item.created_at)}</span>
                            </div>
                            <div style={{fontSize:14,fontWeight:700,color:T.text,fontFamily:T.serif,letterSpacing:'-0.02em',marginBottom:3}}>{item.movie_title}</div>
                            {item.movie_year&&<div style={{fontSize:11,color:T.text3}}>{item.movie_year}</div>}
                            {item.type==='reviewed'&&item.movie_rating&&(
                              <div style={{display:'flex',gap:2,marginTop:5}}>{[1,2,3,4,5].map(s=><SvgIcon key={s} name="star" size={10} color={s<=Math.round(item.movie_rating/2)?accentColor:T.hairlineStrong} filled={s<=Math.round(item.movie_rating/2)}/>)}</div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )
              )}

              {/* WATCHLIST TAB */}
              {tab==='watchlist'&&(
                profile.watchlist===null?(
                  <div style={{textAlign:'center',padding:'28px 16px',display:'flex',flexDirection:'column',alignItems:'center',gap:9}}>
                    <SvgIcon name="bookmark" size={22} color={T.hairlineStrong}/>
                    <div style={{fontSize:12.5,color:T.text3}}>This watchlist is private</div>
                  </div>
                ):profile.watchlist.length===0?(
                  <div style={{textAlign:'center',padding:'28px 16px',fontSize:12.5,color:T.text3}}>No titles yet</div>
                ):(
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                    {profile.watchlist.slice(0,12).map((m,i)=>(
                      <button key={m.movie_id||i} onClick={()=>onWatchTrailer&&onWatchTrailer({id:m.movie_id,title:m.title,poster:m.poster,year:m.year,rating:m.rating,genre:m.genre,overview:m.overview,accent:m.accent||accentColor,gradient:m.gradient,mediaType:m.is_tv?'tv':'movie'})}
                        style={{position:'relative',aspectRatio:'2/3',borderRadius:10,overflow:'hidden',background:m.gradient||GRADS[i%GRADS.length],border:'none',cursor:'pointer',padding:0}}>
                        {m.poster&&<img src={m.poster} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
                        {m.watched&&<div style={{position:'absolute',top:4,right:4,width:18,height:18,borderRadius:'50%',background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="check" size={9} color={accentColor}/></div>}
                        {!profile.isSelf&&onAddToWatchlist&&(
                          <div onClick={(e)=>{e.stopPropagation();onAddToWatchlist({id:m.movie_id,title:m.title,year:m.year,rating:m.rating,poster:m.poster,backdrop:m.backdrop,genre:m.genre,overview:m.overview,accent:m.accent||accentColor,gradient:m.gradient,isTV:m.is_tv,certification:m.certification||''});showToast('Added to your watchlist');}}
                            style={{position:'absolute',bottom:5,right:5,width:24,height:24,borderRadius:'50%',background:'rgba(0,0,0,0.65)',backdropFilter:'blur(6px)',border:`1px solid ${accentColor}55`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <SvgIcon name="plus" size={12} color={accentColor}/>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )
              )}

              {/* REVIEWS TAB */}
              {tab==='reviews'&&(
                loadingReviews?(
                  <div style={{display:'flex',justifyContent:'center',padding:30}}><div style={{width:22,height:22,border:`2px solid rgba(255,255,255,0.1)`,borderTop:`2px solid ${accentColor}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/></div>
                ):reviews.length===0?(
                  <div style={{textAlign:'center',padding:'28px 16px',fontSize:12.5,color:T.text3}}>No reviews yet</div>
                ):(
                  <div style={{display:'flex',flexDirection:'column'}}>
                    {reviews.map((r,i)=>(
                      <div key={r.id} style={{padding:'14px 0',borderTop:i>0?`1px solid ${T.hairline}`:'none'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:7}}>
                          <span style={{fontSize:14,fontWeight:700,color:T.text,fontFamily:T.serif}}>{r.movie_title}</span>
                          <span style={{fontSize:11,color:T.text3}}>{timeAgo(r.created_at)}</span>
                        </div>
                        {r.rating>0&&<div style={{display:'flex',gap:2,marginBottom:7}}>{[1,2,3,4,5].map(s=><SvgIcon key={s} name="star" size={11} color={s<=r.rating?accentColor:T.hairlineStrong} filled={s<=r.rating}/>)}</div>}
                        <p style={{fontSize:13,color:T.text2,lineHeight:1.55,margin:0}}>{r.text}</p>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* LISTS TAB */}
              {tab==='lists'&&(
                loadingLists?(
                  <div style={{display:'flex',justifyContent:'center',padding:30}}><div style={{width:22,height:22,border:`2px solid rgba(255,255,255,0.1)`,borderTop:`2px solid ${accentColor}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/></div>
                ):userLists.length===0?(
                  <div style={{textAlign:'center',padding:'28px 16px',display:'flex',flexDirection:'column',alignItems:'center',gap:9}}>
                    <SvgIcon name="list" size={24} color={T.hairlineStrong}/>
                    <div style={{fontSize:13,fontWeight:600,color:T.text2}}>No lists yet</div>
                    <div style={{fontSize:11,color:T.text3}}>{profile.isSelf?'Create your first list from the Lists screen':'This user hasn\'t created any lists yet'}</div>
                  </div>
                ):(
                  <div style={{display:'flex',flexDirection:'column',gap:1,borderBottom:`1px solid ${T.hairline}`,overflow:'hidden'}}>
                    {userLists.map(list=>(
                      <button key={list.id} onClick={()=>setViewingList(list.id)} style={{display:'flex',gap:12,alignItems:'center',background:'transparent',boxShadow:`0 -1px 0 ${T.hairline}`,border:'none',padding:'13px 14px',cursor:'pointer',textAlign:'left',fontFamily:'inherit',width:'100%'}}>
                        <div style={{width:52,height:34,borderRadius:8,overflow:'hidden',flexShrink:0,background:list.cover_poster?`url(${list.cover_poster})`:`linear-gradient(135deg,${list.cover_accent||accentColor}30,${T.surface})`,backgroundSize:'cover',backgroundPosition:'center'}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:700,color:T.text,fontFamily:T.serif,letterSpacing:'-0.02em',marginBottom:2}}>{list.title}</div>
                          <div style={{fontSize:11,color:T.text3,display:'flex',alignItems:'center',gap:6}}>
                            <span>{list.movie_count} film{list.movie_count!==1?'s':''}</span>
                            {list.avg_rating&&<><SvgIcon name="star" size={9} color={accentColor} filled/><span style={{color:accentColor,fontWeight:600}}>{list.avg_rating}</span></>}
                            <span>· {list.follower_count} follower{list.follower_count!==1?'s':''}</span>
                          </div>
                        </div>
                        <SvgIcon name="chevron" size={12} color={T.text3}/>
                      </button>
                    ))}
                  </div>
                )
              )}

              {/* FIND FRIENDS CTA (other profiles only) */}
              {!profile.isSelf&&(
                <div style={{marginTop:24,display:'flex',alignItems:'center',gap:12,paddingTop:20,borderTop:`1px solid ${T.hairline}`}}>
                  <div style={{width:34,height:34,borderRadius:10,background:`${accentColor}14`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><SvgIcon name="people" size={15} color={accentColor}/></div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:accentColor}}>Find Friends</div>
                    <div style={{fontSize:11,color:T.text3,marginTop:1}}>Connect and see what your friends are watching</div>
                  </div>
                  <span style={{display:'flex',transform:'rotate(-90deg)'}}><SvgIcon name="chevron" size={13} color={T.text3}/></span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {followListType&&<FollowListModal targetUserId={userId} type={followListType} accent={accentColor} onClose={()=>setFollowListType(null)} onSelectUser={(id)=>setViewingProfile(id)}/>}
      {viewingProfile&&<UserProfileSheet userId={viewingProfile} onClose={()=>setViewingProfile(null)} accent={accent} onWatchTrailer={onWatchTrailer} onAddToWatchlist={onAddToWatchlist}/>}
      {viewingList&&<ListDetailSheet listId={viewingList} onClose={()=>setViewingList(null)} accent={accentColor} onWatchTrailer={onWatchTrailer} onSave={onAddToWatchlist}/>}
    </div>
    </>
  );
}

// COMMENT PANEL
function CommentPanel({movie,onClose,accent,onAuthRequired,onWatchTrailer,onAddToWatchlist}){
  const{isSignedIn,user}=useUser();
  const[comments,setComments]=useState([]);
  const[loading,setLoading]=useState(true);
  const[input,setInput]=useState('');const[replyingTo,setReplyingTo]=useState(null);const inputRef=useRef(null);
  const[likedLocal,setLikedLocal]=useState({}); // purely cosmetic, not persisted (no likes column)
  const[viewingProfile,setViewingProfile]=useState(null);

  useEffect(()=>{
    if(!movie?.id)return;
    setLoading(true);
    fetch(`/api/reviews?movieId=${movie.id}`)
      .then(r=>r.json())
      .then(d=>{setComments(d.comments||[]);setLoading(false);})
      .catch(()=>setLoading(false));
  },[movie?.id]);

  const toggleLike=id=>setLikedLocal(p=>({...p,[id]:!p[id]}));

  const deleteComment=async(id,parentId)=>{
    // optimistic removal
    if(parentId){
      setComments(p=>p.map(c=>c.id===parentId?{...c,replies:(c.replies||[]).filter(r=>r.id!==id)}:c));
    }else{
      setComments(p=>p.filter(c=>c.id!==id));
    }
    try{
      const res=await fetch('/api/reviews',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
      if(!res.ok){throw new Error('failed');}
    }catch{
      // re-fetch on failure to restore accurate state rather than guessing
      fetch(`/api/reviews?movieId=${movie.id}`).then(r=>r.json()).then(d=>setComments(d.comments||[])).catch(()=>{});
    }
  };

  const startReply=(comment)=>{if(!isSignedIn){onAuthRequired();return;}setReplyingTo(comment);setInput(`@${comment.username} `);setTimeout(()=>inputRef.current?.focus(),100);};

  const post=async()=>{
    if(!isSignedIn){onAuthRequired();return;}
    if(!input.trim())return;
    const text=input;const parentId=replyingTo?replyingTo.id:null;
    setInput('');setReplyingTo(null);
    try{
      const res=await fetch('/api/reviews',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({movieId:movie?.id,movieTitle:movie?.title,text,rating:0,parentId})});
      const data=await res.json();
      if(data.comment){
        if(parentId){
          setComments(p=>p.map(c=>c.id===parentId?{...c,replies:[...(c.replies||[]),data.comment]}:c));
        }else{
          setComments(p=>[data.comment,...p]);
          fetch('/api/activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'reviewed',movieId:movie?.id,movieTitle:movie?.title,moviePoster:movie?.poster,movieYear:movie?.year,movieRating:movie?.rating,movieAccent:movie?.accent,username:user?.username||user?.firstName||'user',avatarUrl:user?.imageUrl||null,reviewId:data.comment.id})}).catch(()=>{});
        }
      }
    }catch{}
  };

  const timeAgo=(ts)=>{
    if(!ts)return'';
    const diff=Date.now()-new Date(ts).getTime();const mins=Math.floor(diff/60000);
    if(mins<1)return'now';if(mins<60)return`${mins}m`;
    const hrs=Math.floor(mins/60);if(hrs<24)return`${hrs}h`;
    return`${Math.floor(hrs/24)}d`;
  };

  return(
    <>
    {viewingProfile&&<UserProfileSheet userId={viewingProfile} onClose={()=>setViewingProfile(null)} accent={accent} onWatchTrailer={onWatchTrailer} onAddToWatchlist={onAddToWatchlist}/>}
    <div onClick={e=>e.stopPropagation()} style={{position:'absolute',bottom:0,left:0,right:0,height:'78%',background:ambient(accent),backdropFilter:'blur(30px)',borderRadius:'24px 24px 0 0',zIndex:50,border:`1px solid ${T.hairline}`,borderBottom:'none',display:'flex',flexDirection:'column',animation:'sheetUp 0.32s cubic-bezier(0.22,1,0.36,1)'}}>
      <style>{`@keyframes sheetUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{width:32,height:3,borderRadius:2,background:'rgba(255,255,255,0.14)',margin:'14px auto 0',flexShrink:0}}/>
      <div style={{padding:'14px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:`1px solid ${T.hairline}`,flexShrink:0}}>
        <div><span style={{fontFamily:T.serif,fontSize:21,letterSpacing:'-0.02em',fontWeight:700,color:T.text}}>Reviews</span><span style={{fontSize:12,color:T.text3,marginLeft:8}}>{movie?.title}</span></div>
        <button onClick={onClose} style={{background:'transparent',border:'none',width:28,height:28,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="close" size={13} color={T.text2}/></button>
      </div>
      <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',padding:'4px 20px',display:'flex',flexDirection:'column',scrollbarWidth:'none',minHeight:0}}>
        {loading?(
          <div style={{display:'flex',justifyContent:'center',padding:30}}>
            <div style={{width:22,height:22,border:`2px solid rgba(255,255,255,0.1)`,borderTop:`2px solid ${accent}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
          </div>
        ):comments.length===0?(
          <div style={{textAlign:'center',padding:'30px 16px',color:T.text3,fontSize:13}}>No reviews yet. Be the first!</div>
        ):comments.map((c,i)=>(
          <div key={c.id} style={{padding:'14px 0',borderTop:i>0?`1px solid ${T.hairline}`:'none'}}>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setViewingProfile(c.user_id)} style={{width:32,height:32,borderRadius:'50%',background:`${accent}18`,border:`1px solid ${accent}38`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:accent,flexShrink:0,overflow:'hidden',padding:0,cursor:'pointer'}}>
                {c.avatar_url?<img src={c.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:(c.username||'U')[0].toUpperCase()}
              </button>
              <div style={{flex:1}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <button onClick={()=>setViewingProfile(c.user_id)} style={{background:'none',border:'none',cursor:'pointer',padding:0,fontFamily:'inherit'}}><span style={{fontSize:12,fontWeight:600,color:T.text}}>@{c.username}</span></button>
                  <span style={{fontSize:11,color:T.text3}}>{timeAgo(c.created_at)}</span>
                </div>
                {c.rating>0&&<div style={{display:'flex',gap:2,marginBottom:5}}>{[1,2,3,4,5].map(s=><SvgIcon key={s} name="star" size={10} color={s<=c.rating?accent:T.hairlineStrong} filled={s<=c.rating}/>)}</div>}
                <p style={{fontSize:13.5,color:T.text2,lineHeight:1.55,margin:'0 0 7px'}}>{c.text}</p>
                <div style={{display:'flex',gap:12,alignItems:'center'}}>
                  <button onClick={()=>toggleLike(c.id)} style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center',gap:4}}>
                    <SvgIcon name="heart" size={12} color={likedLocal[c.id]?'#FF6B8A':T.hairlineStrong} filled={!!likedLocal[c.id]}/>
                  </button>
                  <button onClick={()=>startReply(c)} style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center',gap:4}}>
                    <SvgIcon name="reply" size={12} color={T.text3}/>
                    <span style={{fontSize:11,color:T.text3,fontWeight:500}}>Reply</span>
                  </button>
                  {c.isSelf&&(
                    <button onClick={()=>deleteComment(c.id,null)} style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center',gap:4,marginLeft:'auto'}}>
                      <SvgIcon name="trash" size={12} color={T.text3}/>
                    </button>
                  )}
                </div>
              </div>
            </div>
            {(c.replies||[]).map(r=>(
              <div key={r.id} style={{display:'flex',gap:10,marginTop:10,marginLeft:42}}>
                <button onClick={()=>setViewingProfile(r.user_id)} style={{width:26,height:26,borderRadius:'50%',background:T.surface2,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:T.text2,flexShrink:0,overflow:'hidden',padding:0,cursor:'pointer',border:'none'}}>
                  {r.avatar_url?<img src={r.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:(r.username||'U')[0].toUpperCase()}
                </button>
                <div style={{flex:1}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <button onClick={()=>setViewingProfile(r.user_id)} style={{background:'none',border:'none',cursor:'pointer',padding:0,fontFamily:'inherit'}}><span style={{fontSize:11,fontWeight:600,color:T.text2}}>@{r.username}</span></button>
                    {r.isSelf&&(
                      <button onClick={()=>deleteComment(r.id,c.id)} style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center'}}>
                        <SvgIcon name="trash" size={11} color={T.text3}/>
                      </button>
                    )}
                  </div>
                  <p style={{fontSize:12.5,color:T.text2,lineHeight:1.5,margin:0}}>{r.text}</p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      {replyingTo&&<div style={{padding:'8px 20px',background:T.surface2,borderTop:`1px solid ${T.hairline}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}><span style={{fontSize:11,color:T.text2}}>Replying to <span style={{color:accent}}>@{replyingTo.username}</span></span><button onClick={()=>{setReplyingTo(null);setInput('');}} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,fontSize:14,padding:0}}>×</button></div>}
      {isSignedIn?(<div style={{padding:'10px 16px 34px',borderTop:`1px solid ${T.hairline}`,display:'flex',gap:8,alignItems:'center',flexShrink:0,background:'rgba(6,6,11,0.55)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)'}}><input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&post()} placeholder={replyingTo?`Reply to @${replyingTo.username}...`:'Write a review...'} style={{flex:1,background:T.surface2,border:`1px solid ${replyingTo?accent+'40':T.hairline}`,borderRadius:22,padding:'11px 16px',color:T.text,fontSize:14,outline:'none',fontFamily:'inherit'}}/><button onClick={post} style={{background:accent,border:'none',borderRadius:'50%',width:40,height:40,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><SvgIcon name="send" size={14} color="#07070F"/></button></div>)
      :(<div style={{padding:'14px 20px 34px',borderTop:`1px solid ${T.hairline}`,flexShrink:0,background:'rgba(6,6,11,0.55)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)'}}><button onClick={onAuthRequired} style={{width:'100%',background:`${accent}14`,border:`1px solid ${accent}40`,borderRadius:16,padding:'13px',cursor:'pointer',fontFamily:'inherit',fontSize:14,color:accent,fontWeight:600}}>Sign in to leave a review</button></div>)}
    </div>
    </>
  );
}

// SIMILAR SHEET
export function SimilarSheet({movie,onClose,accent,onSelect,onScrollAll,onTrailer,onSave,savedIds}){
  const[items,setItems]=useState([]);const[source,setSource]=useState(null);const[loading,setLoading]=useState(true);const[err,setErr]=useState(false);
  const contentLabel=getContentLabel(movie);
  const load=useCallback(()=>{
    if(!movie)return;setLoading(true);setErr(false);
    const genreIds=(movie.genreIds||movie.genre_ids||[]).join(',');
    fetch(`/api/movies?similar=${movie.id}&similarType=${movie.mediaType||(movie.isTV?'tv':'movie')}&similarGenres=${genreIds}`)
      .then(r=>r.json()).then(d=>{setItems(d.movies||[]);setSource(d.source||null);setLoading(false);})
      .catch(()=>{setErr(true);setLoading(false);});
  },[movie]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{const prev=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=prev;};},[]);
    const backdrop=source?.backdrop||movie?.backdrop||movie?.poster;
  const play=(m)=>{if(onTrailer){onTrailer(m);}else{onSelect?.(m);onClose();}};
  return(
    <><div onClick={onClose} style={{position:'fixed',inset:0,zIndex:55,background:'rgba(0,0,0,0.72)',backdropFilter:'blur(10px)',animation:'simFade 0.2s ease'}}/>
    <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:60,background:ambient(accent),borderRadius:'26px 26px 0 0',border:`1px solid ${T.hairline}`,borderBottom:'none',height:'90dvh',display:'flex',flexDirection:'column',overflow:'hidden',animation:'sheetUp 0.34s cubic-bezier(0.22,1,0.36,1)'}}>
      <style>{`@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes simFade{from{opacity:0}to{opacity:1}}@keyframes simShimmer{0%{background-position:-200px 0}100%{background-position:200px 0}}@keyframes simIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',scrollbarWidth:'none',overscrollBehavior:'contain'}}>
        {/* Header */}
        <div style={{position:'relative',padding:'0 20px 18px',overflow:'hidden'}}>
          {backdrop&&<div style={{position:'absolute',inset:0,backgroundImage:`url(${backdrop})`,backgroundSize:'cover',backgroundPosition:'center 30%',opacity:0.22,filter:'blur(2px)',WebkitMaskImage:'linear-gradient(to bottom,#000 40%,transparent 100%)',maskImage:'linear-gradient(to bottom,#000 40%,transparent 100%)'}}/>}
          <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(6,6,11,0.35) 0%,rgba(6,6,11,0.85) 70%,transparent 100%)'}}/>
          <div style={{position:'relative'}}>
            <div style={{width:36,height:4,borderRadius:2,background:'rgba(255,255,255,0.22)',margin:'10px auto 14px'}}/>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
              <div style={{minWidth:0}}>
                <div style={{fontSize:12.5,fontWeight:700,color:accent}}>Because you liked</div>
                <div style={{fontFamily:T.serif,fontWeight:700,fontSize:26,letterSpacing:'-0.02em',lineHeight:1.08,color:T.text,marginTop:6,textShadow:'0 2px 18px rgba(0,0,0,0.6)'}}>{movie?.title}</div>
              </div>
              <button onClick={onClose} aria-label="Close" style={{width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.08)',border:`1px solid ${T.hairline}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><SvgIcon name="close" size={14} color="#fff"/></button>
            </div>
            {!!source?.keywords?.length&&(
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:12}}>
                <span style={{fontSize:12,color:'rgba(255,255,255,0.6)',textTransform:'capitalize'}}>{source.keywords.join(' · ')}</span>
              </div>
            )}
            {!loading&&items.length>0&&onScrollAll&&(
              <button onClick={()=>{onScrollAll(items);onClose();}} style={{marginTop:16,width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:8,background:accent,color:'#06060B',border:'none',borderRadius:6,padding:'13px 16px',fontSize:12.5,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                <SvgIcon name="play" size={14} color="#06060B" filled/>Scroll all {items.length} in your feed
              </button>
            )}
          </div>
        </div>

        {loading&&(
          <div style={{padding:'0 20px 24px'}}>
            <div style={{aspectRatio:'16/9',borderRadius:18,background:'linear-gradient(90deg,rgba(255,255,255,0.03),rgba(255,255,255,0.07),rgba(255,255,255,0.03))',backgroundSize:'400px 100%',animation:'simShimmer 1.2s linear infinite'}}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginTop:22}}>
              {[0,1,2,3].map(i=>(<div key={i} style={{aspectRatio:'2/3',borderRadius:14,background:'linear-gradient(90deg,rgba(255,255,255,0.03),rgba(255,255,255,0.07),rgba(255,255,255,0.03))',backgroundSize:'400px 100%',animation:'simShimmer 1.2s linear infinite'}}/>))}
            </div>
          </div>
        )}
        {!loading&&(err||items.length===0)&&(
          <div style={{textAlign:'center',padding:'40px 24px',display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
            <SvgIcon name="similar" size={28} color={T.text3}/>
            <div style={{fontSize:13,color:T.text,fontWeight:700}}>{err?'Couldn’t load matches':`No close matches for this ${contentLabel==='Series'?'series':'film'} yet`}</div>
            <button onClick={load} style={{marginTop:6,background:'transparent',border:`1px solid ${T.hairlineStrong}`,color:T.text,borderRadius:999,padding:'8px 18px',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Try again</button>
          </div>
        )}

        {!loading&&items.length>0&&(
          <div style={{padding:'4px 16px calc(28px + env(safe-area-inset-bottom))'}}>
            <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',padding:'0 4px 10px'}}>
              <span style={{fontWeight:700,fontSize:10.5,letterSpacing:2.2,textTransform:'uppercase',color:accent}}>Closest first</span>
              <span style={{fontSize:12,color:T.text2}}>{items.length} {contentLabel==='Series'?'series':'titles'}</span>
            </div>
            <div>
              {items.map((m,i)=>{
                const saved=savedIds?.has?.(m.id);
                return(
                <div key={m.id} role="button" tabIndex={0} onClick={()=>play(m)} onKeyDown={(e)=>{if(e.key==='Enter')play(m);}}
                  style={{display:'flex',gap:14,padding:'16px 4px',borderTop:`1px solid ${T.hairline}`,cursor:'pointer',animation:`simIn 0.3s ease ${Math.min(i,8)*0.03}s both`}}>
                  <div style={{position:'relative',width:76,aspectRatio:'2/3',borderRadius:4,overflow:'hidden',flexShrink:0,background:m.gradient||GRADS[i%GRADS.length]}}>
                    {m.poster&&<img src={m.poster} alt="" loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:10}}>
                      <div style={{fontFamily:T.serif,letterSpacing:'-0.02em',fontWeight:700,fontSize:15,lineHeight:1.2,color:'#fff',minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.title}</div>
                      <span style={{fontSize:12,fontWeight:700,color:accent,fontVariantNumeric:'tabular-nums',flexShrink:0}}>{m.match||80}%</span>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginTop:4,fontSize:11,color:T.text2,whiteSpace:'nowrap',overflow:'hidden'}}>
                      <span>{m.year}</span><span>·</span>
                      <span style={{display:'inline-flex',alignItems:'center',gap:3,color:'rgba(255,255,255,0.85)'}}><SvgIcon name="star" size={10} color="#FFD166" filled/>{m.rating}</span>
                      {m.genre?.[0]&&<><span>·</span><span style={{overflow:'hidden',textOverflow:'ellipsis'}}>{m.genre.join(', ')}</span></>}
                    </div>
                    {m.overview&&<p style={{fontSize:12,color:'rgba(255,255,255,0.58)',lineHeight:1.5,margin:'7px 0 0',display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{m.overview}</p>}
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:8}}>
                      <span style={{fontSize:11,fontWeight:700,color:accent}}>{m.matchReason}</span>
                      <div style={{display:'flex',alignItems:'center',gap:18}}>
                        <button aria-label={saved?'Saved':'Save'} onClick={(e)=>{e.stopPropagation();onSave?.(m);}} style={{background:'none',border:'none',padding:4,cursor:'pointer',display:'flex'}}><SvgIcon name="bookmark" size={18} color={saved?accent:'rgba(255,255,255,0.7)'} filled={saved}/></button>
                        <span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,fontWeight:700,color:'#fff'}}><SvgIcon name="play" size={11} color="#fff" filled/>Trailer</span>
                      </div>
                    </div>
                  </div>
                </div>
              );})}
            </div>
          </div>
        )}
      </div>
    </div></>
  );
}




// DISCOVER / FILTER SHEET
export function FilterSheet({ show, onClose, activeGenre, activeMood, onGenre, onMood, accent, onSearchSelect, activeProvider, onProvider, onOpenFolder, onOpenFolders }) {
  const [searchQ, setSearchQ] = useState('');
  const [searchRes, setSearchRes] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchMood, setSearchMood] = useState(null);
  const [popular, setPopular] = useState([]);
  const [loadingPopular, setLoadingPopular] = useState(false);
  const [tonight, setTonight] = useState([]);
  const [loadingTonight, setLoadingTonight] = useState(false);
  const [focused, setFocused] = useState(false);
  const [folders, setFolders] = useState([]);

  const MOOD_SIGNALS = [
    ['happy','cheerful','funny','laugh','comedy','light','feel good'],
    ['sad','cry','emotional','heartbreak','tearjerker','melancholy'],
    ['scary','horror','terrifying','creepy','dark','thriller','suspense'],
    ['romantic','love','date night','romance'],
    ['action','exciting','adrenaline','intense','epic','adventure'],
    ['thought provoking','intelligent','deep','mind bending','complex'],
    ['chill','relaxing','easy','calm','comfort','cozy'],
    ['inspiring','uplifting','motivating'],
  ];
  const MOOD_NAMES = ['happy','sad','horror','romance','action','thoughtful','chill','uplifting'];
  const detectMood = (q) => {
    const lower = q.toLowerCase();
    for (let i = 0; i < MOOD_SIGNALS.length; i++) {
      if (MOOD_SIGNALS[i].some(kw => lower.includes(kw))) return MOOD_NAMES[i];
    }
    return null;
  };

  useEffect(() => {
    if (!searchQ.trim()) { setSearchRes([]); setSearching(false); setSearchMood(null); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const detectedMood = detectMood(searchQ);
        setSearchMood(detectedMood);
        const params = new URLSearchParams({ search: searchQ });
        if (detectedMood) params.set('mood', detectedMood);
        const res = await fetch(`/api/movies?${params}`);
        const data = await res.json();
        setSearchRes(data.movies || []);
      } catch {}
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [searchQ]);

  const loadPopular = () => {
    setLoadingPopular(true);
    fetch('/api/movies?popular=1')
      .then(r => r.json())
      .then(d => { setPopular((d.movies || []).slice(0, 6)); setLoadingPopular(false); })
      .catch(() => setLoadingPopular(false));
  };

  // Rotate popular + load the time-of-day picks whenever Discover opens
  useEffect(() => {
    if (!show) return;
    loadPopular();
    fetch('/api/lists?tab=trending').then(r => r.json()).then(d => setFolders((d.lists || []).filter(l => (l.movie_count || 0) > 0).slice(0, 8))).catch(() => {});
    setLoadingTonight(true);
    let preferred = '';
    try { preferred = localStorage.getItem('cine_preferred_provider') || ''; } catch {}
    const params = new URLSearchParams({ mood: 'trending', page: '1' });
    if (preferred) params.set('provider', preferred);
    fetch(`/api/movies?${params}`)
      .then(r => r.json())
      .then(d => {
        const pool = (d.movies || []).filter(m => !m.isUpcoming);
        // Stable daily order so picks feel like "today's", not random every open
        const day = new Date().toISOString().slice(0, 10);
        let seed = 0;
        for (let i = 0; i < day.length; i++) seed = (seed * 31 + day.charCodeAt(i)) >>> 0;
        const ranked = [...pool].sort((a, b) => (((a.id * 2654435761) ^ seed) >>> 0) - (((b.id * 2654435761) ^ seed) >>> 0));
        setTonight(ranked.slice(0, 8));
        setLoadingTonight(false);
      })
      .catch(() => setLoadingTonight(false));
  }, [show]);

  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [show]);

  const pick = (m) => {
    onSearchSelect && onSearchSelect(m);
    setSearchQ(''); setSearchRes([]);
    onClose();
  };

  // One list for "what kind of feed" — moods and quick filters were the same thing in two shapes
  const FEEDS = [
    { label: 'Trending',       apiMood: 'Trending',      icon: 'flame',    desc: 'What everyone is watching right now' },
    { label: 'Top rated',      apiMood: 'Top Rated',     icon: 'star',     desc: 'The highest-rated films and series' },
    { label: 'New this week',  apiMood: 'New',           icon: 'sparkle',  desc: 'Just released and freshly added' },
    { label: 'Coming soon',    apiMood: 'Upcoming',      icon: 'calendar', desc: 'Trailers for what’s about to land' },
    { label: 'Hidden gems',    apiMood: 'Hidden Gems',   icon: 'gem',      desc: 'Loved by few, worth your night' },
    { label: 'International',  apiMood: 'International', icon: 'globe',   desc: 'Great stories beyond Hollywood' },
    { label: 'Award winners',  apiMood: 'Awards',        icon: 'trophy',   desc: 'Oscar, Cannes and festival picks' },
  ];

  const PLATFORMS = [
    { name: 'Netflix',   color: '#E50914' },
    { name: 'Prime',     color: '#00A8E0' },
    { name: 'Disney+',   color: '#3D7BFF' },
    { name: 'Apple TV+', color: '#FFFFFF' },
    { name: 'Max',       color: '#5B7CFF' },
    { name: 'Hulu',      color: '#1CE783' },
  ];

  const moodIs = (m) => (activeMood || 'Trending').toLowerCase() === m.apiMood.toLowerCase();
  const genreLabel = GENRE_OPTIONS.find(g => g.id === activeGenre)?.label;
  const feedLabel = FEEDS.find(moodIs)?.label;
  const hasFilters = (activeMood && activeMood !== 'Trending') || activeGenre || activeProvider;

  const chooseFeed = (m) => { onMood(m.apiMood); onClose(); };
  const chooseGenre = (id) => { onGenre(activeGenre === id ? '' : id); onClose(); };
  const choosePlatform = (p) => {
    const on = activeProvider === p.name;
    if (on) {
      onProvider && onProvider('');
      try { localStorage.removeItem('cine_preferred_provider'); } catch {}
    } else {
      onProvider && onProvider(p.name);
      try { localStorage.setItem('cine_preferred_provider', p.name); } catch {}
    }
    onClose();
  };
  const clearAll = () => {
    onMood('Trending'); onGenre(''); onProvider && onProvider('');
    try { localStorage.removeItem('cine_preferred_provider'); } catch {}
  };

  if (!show) return null;

  const H = ({ children, right }) => (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '30px 0 6px' }}>
      <span style={{  fontSize:10.5,letterSpacing:2.2,textTransform:'uppercase', fontWeight:700, color:accent }}>{children}</span>
      {right}
    </div>
  );
  const Spinner = () => (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.1)', borderTop: `2px solid ${accent}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
  const Row = ({ m, i, rank }) => (
    <div role="button" tabIndex={0} onClick={() => pick(m)} onKeyDown={(e) => e.key === 'Enter' && pick(m)}
      style={{ display: 'flex', gap: 14, padding: '14px 0', borderTop: `1px solid ${T.hairline}`, cursor: 'pointer' }}>
      {rank != null && <div style={{ width: 18, flexShrink: 0, fontFamily: T.serif, fontSize: 16, fontWeight: 700, color: rank === 1 ? accent : 'rgba(255,255,255,0.3)', paddingTop: 1 }}>{rank}</div>}
      <div style={{ width: 56, aspectRatio: '2/3', borderRadius: 3, overflow: 'hidden', flexShrink: 0, background: m.gradient || GRADS[i % GRADS.length] }}>
        {m.poster && <img src={m.poster} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: T.serif, letterSpacing: '-0.02em', fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, fontSize: 11, color:T.text2 }}>
          <span>{m.year}</span>
          {m.rating && m.rating !== 'N/A' && <><span>·</span><span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'rgba(255,255,255,0.85)' }}><SvgIcon name="star" size={10} color="#FFD166" filled />{m.rating}</span></>}
          {m.isTV && <><span>·</span><span>Series</span></>}
        </div>
        {m.overview && <p style={{ fontSize: 12, color:'rgba(255,255,255,0.58)', lineHeight: 1.45, margin: '5px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{m.overview}</p>}
      </div>
    </div>
  );

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }} />
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 91, height: '92dvh', background:ambient(accent), borderRadius: '18px 18px 0 0', borderTop: `1px solid ${T.hairline}`, display: 'flex', flexDirection: 'column', animation: 'sheetUp 0.32s cubic-bezier(0.22,1,0.36,1)' }}>
        <style>{`@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.cs-disc-input::placeholder{color:rgba(255,255,255,0.35)}`}</style>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.18)', margin: '10px auto 0', flexShrink: 0 }} />

        {/* Header + search */}
        <div style={{ position: 'relative', padding: '12px 20px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily:T.serif, fontSize:16,letterSpacing:'-0.02em', fontWeight:700, color:T.text }}>Discover</span>
            <button onClick={onClose} aria-label="Close" style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><SvgIcon name="close" size={14} color="#fff" /></button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, paddingBottom: 10, borderBottom: `1.5px solid ${focused ? accent : 'rgba(255,255,255,0.14)'}`, transition: 'border-color 0.2s ease' }}>
            <SvgIcon name="search" size={18} color={focused ? accent : 'rgba(255,255,255,0.5)'} />
            <input
              className="cs-disc-input"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Search a title, or describe a mood"
              enterKeyHint="search"
              style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 14, fontFamily: 'inherit' }}
            />
            {searchQ && (
              <button onClick={() => setSearchQ('')} aria-label="Clear search" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
                <SvgIcon name="close" size={13} color="rgba(255,255,255,0.6)" />
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px calc(36px + env(safe-area-inset-bottom))', scrollbarWidth: 'none', overscrollBehavior: 'contain' }}>
          {!searchQ.trim() ? (
            <>
              {/* What the feed is showing now */}
              {hasFilters && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 0', borderBottom: `1px solid ${T.hairline}` }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Your feed: <span style={{ color: '#fff', fontWeight: 700 }}>{[feedLabel && feedLabel !== 'Trending' ? feedLabel : null, genreLabel && activeGenre ? genreLabel : null, activeProvider || null].filter(Boolean).join(' · ')}</span>
                  </span>
                  <button onClick={clearAll} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: accent, fontFamily: 'inherit', flexShrink: 0 }}>Clear all</button>
                </div>
              )}

              {/* Time-of-day picks */}
              <H right={<span style={{ fontSize: 12, color:T.text2 }}>{activeProvider ? `On ${activeProvider}` : 'Trending today'}</span>}>{dayPart().title} for you</H>
              {loadingTonight ? <Spinner /> : tonight.length === 0 ? (
                <p style={{ fontSize: 12.5, color:T.text2, lineHeight: 1.5, margin: '6px 0 0' }}>Pick a platform below and we’ll fill this with what you can watch {dayPart().phrase}.</p>
              ) : (
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', margin: '8px -20px 0', padding: '0 20px' }}>
                  {tonight.map((m, i) => (
                    <div key={m.id} role="button" tabIndex={0} onClick={() => pick(m)} onKeyDown={(e) => e.key === 'Enter' && pick(m)} style={{ flexShrink: 0, width: 112, cursor: 'pointer' }}>
                      <div style={{ width: '100%', aspectRatio: '2/3', borderRadius: 3, overflow: 'hidden', background: m.gradient || GRADS[i % GRADS.length] }}>
                        {m.poster && <img src={m.poster} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginTop: 8, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color:T.text2, marginTop: 2 }}>
                        {m.year}{m.rating && m.rating !== 'N/A' && <> · <SvgIcon name="star" size={9} color="#FFD166" filled /><span style={{ color: 'rgba(255,255,255,0.8)' }}>{m.rating}</span></>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Feed type */}
              <H>Browse by</H>
              <div>
                {FEEDS.map((m) => {
                  const on = moodIs(m);
                  return (
                    <div key={m.label} role="button" tabIndex={0} onClick={() => chooseFeed(m)} onKeyDown={(e) => e.key === 'Enter' && chooseFeed(m)}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', borderTop: `1px solid ${T.hairline}`, cursor: 'pointer' }}>
                      <SvgIcon name={m.icon} size={19} color={on ? accent : 'rgba(255,255,255,0.55)'} filled={on && (m.icon === 'flame' || m.icon === 'star')} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: on ? 700 : 600, color: on ? accent : '#fff' }}>{m.label}</div>
                        <div style={{ fontSize: 11, color:T.text2, marginTop: 2 }}>{m.desc}</div>
                      </div>
                      {on && <SvgIcon name="check" size={17} color={accent} />}
                    </div>
                  );
                })}
              </div>

              {/* Genre */}
              <H right={activeGenre ? <button onClick={() => chooseGenre('')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: accent, fontFamily: 'inherit' }}>Any genre</button> : null}>Genre</H>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 22px', paddingTop: 6 }}>
                {GENRE_OPTIONS.filter(g => g.id).map(g => {
                  const on = activeGenre === g.id;
                  return (
                    <button key={g.id} onClick={() => chooseGenre(g.id)}
                      style={{ background: 'none', border: 'none', borderBottom: `2px solid ${on ? accent : 'transparent'}`, padding: '8px 0 6px', cursor: 'pointer', fontSize: 13, fontWeight: on ? 700 : 500, color: on ? accent : 'rgba(255,255,255,0.65)', fontFamily: 'inherit' }}>
                      {g.label}
                    </button>
                  );
                })}
              </div>

              {/* Platforms */}
              <H right={<span style={{ fontSize: 12, color:T.text2 }}>Only show what you can stream</span>}>Platforms</H>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 20 }}>
                {PLATFORMS.map(p => {
                  const on = activeProvider === p.name;
                  return (
                    <div key={p.name} role="button" tabIndex={0} onClick={() => choosePlatform(p)} onKeyDown={(e) => e.key === 'Enter' && choosePlatform(p)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 0', borderTop: `1px solid ${T.hairline}`, cursor: 'pointer' }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: p.color, flexShrink: 0, boxShadow: on ? `0 0 10px ${p.color}` : 'none' }} />
                      <span style={{ flex: 1, fontSize: 13, fontWeight: on ? 700 : 500, color: on ? '#fff' : 'rgba(255,255,255,0.75)' }}>{p.name}</span>
                      {on && <SvgIcon name="check" size={16} color={accent} />}
                    </div>
                  );
                })}
              </div>

              {/* Public folders from the community */}
              {folders.length>0&&(
                <>
                  <H right={onOpenFolders?<button onClick={()=>{onClose();onOpenFolders();}} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: accent, fontWeight: 700, fontFamily: 'inherit', padding: 0 }}>See all</button>:null}>Popular folders</H>
                  <div style={{ display: 'flex', gap: 12, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', margin: '8px -20px 0', padding: '0 20px' }}>
                    {folders.map(f => (
                      <div key={f.id} role="button" tabIndex={0} onClick={() => { onClose(); onOpenFolder && onOpenFolder(f.id); }} style={{ flexShrink: 0, width: 132, cursor: 'pointer' }}>
                        <div style={{ width: 128 }}><FolderCoverFill posters={f.posters?.length ? f.posters : (f.cover_poster ? [f.cover_poster] : [])} accent={f.cover_accent || accent} count={f.movie_count || 0} /></div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.title}</div>
                        <div style={{ fontSize: 11, color:T.text2, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.movie_count || 0} titles · {f.display_name || f.username}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Popular */}
              <H right={<button onClick={loadPopular} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: accent, fontWeight: 700, fontFamily: 'inherit', padding: 0 }}>Refresh</button>}>Popular right now</H>
              {loadingPopular ? <Spinner /> : (
                <div>{popular.map((m, i) => <Row key={`${m.id}-${m.title}`} m={m} i={i} rank={i + 1} />)}</div>
              )}
            </>
          ) : (
            <div>
              {searching ? <Spinner /> : searchRes.length === 0 ? (
                <div style={{ padding: '36px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>Nothing found for “{searchQ}”</div>
                  <div style={{ fontSize: 12.5, color:T.text2, marginTop: 6, lineHeight: 1.5 }}>Check the spelling, or describe a mood instead, like “something scary” or “feel good”.</div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 12, color:T.text2, padding: '16px 0 8px' }}>
                    {searchMood ? <>Showing <span style={{ color: accent, fontWeight: 700 }}>{searchMood}</span> picks for “{searchQ}”</> : <>{searchRes.length} results for “{searchQ}”</>}
                  </div>
                  <div>{searchRes.map((m, i) => <Row key={m.id} m={m} i={i} />)}</div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}


// MOVIE CARD
// HOME PATH — friends activity pulse (retention)
function FriendsPulse({ accent, onOpenFriends, onWatchTrailer, onOpenProfile, activeIndex = 0 }) {
  const { isSignedIn, isLoaded } = useUser();
  const [items, setItems] = useState([]);
  const [hidden, setHidden] = useState(() => {
    try { return sessionStorage.getItem('cine_friends_pulse_dismissed') === '1'; } catch { return false; }
  });
  const [scrollHidden, setScrollHidden] = useState(false);
  const startIndexRef = useRef(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) { setItems([]); return; }
    let cancelled = false;
    fetch('/api/activity?type=feed')
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        const list = (d.items || d.feed || d.activities || []).slice(0, 8);
        // Only surface when there's something new, and at most once every 4 hours
        try {
          const newest = list[0]?.created_at ? new Date(list[0].created_at).getTime() : 0;
          const lastSeen = Number(localStorage.getItem('cine_pulse_seen_at') || 0);
          const lastShown = Number(localStorage.getItem('cine_pulse_shown_at') || 0);
          if (!newest || newest <= lastSeen || Date.now() - lastShown < 4 * 3600000) { setItems([]); return; }
          localStorage.setItem('cine_pulse_shown_at', String(Date.now()));
          localStorage.setItem('cine_pulse_seen_at', String(newest));
        } catch {}
        setItems(list);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn]);

  // Hide after two scrolls so it doesn't fight the feed
  useEffect(() => {
    if (items.length === 0 || hidden) return;
    if (startIndexRef.current == null) startIndexRef.current = activeIndex;
    if (Math.abs(activeIndex - startIndexRef.current) >= 2) {
      setScrollHidden(true);
    }
  }, [activeIndex, items.length, hidden]);

  const dismiss = () => {
    setHidden(true);
    try { sessionStorage.setItem('cine_friends_pulse_dismissed', '1'); } catch {}
  };

  if (!isSignedIn || hidden || scrollHidden || items.length === 0) return null;

  const timeAgo = (ts) => {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  const verb = (type) => {
    if (type === 'watched') return 'watched';
    if (type === 'saved') return 'saved';
    if (type === 'reviewed') return 'reviewed';
    if (type === 'listed') return 'listed';
    if (type === 'list_follow') return 'followed';
    return 'shared';
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 54,
        left: 0,
        right: 0,
        zIndex: 37,
        padding: '0 12px',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          pointerEvents: 'all',
          background: 'rgba(5,5,12,0.88)',
          backdropFilter: 'blur(16px)',
          border: `1px solid ${T.hairline}`,
          borderRadius: 18,
          padding: '8px 10px 8px 12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <SvgIcon name="people" size={12} color={accent} />
            <Eyebrow color={T.text3} style={{ marginBottom: 0 }}>From friends</Eyebrow>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              type="button"
              onClick={onOpenFriends}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: accent, fontFamily: 'inherit', padding: '2px 6px' }}
            >
              See all
            </button>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            >
              <SvgIcon name="close" size={10} color={T.text3} />
            </button>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            paddingBottom: 2,
          }}
        >
          {items.map((item, i) => {
            const title = item.movie_title || item.title || 'a film';
            const poster = item.movie_poster || item.poster;
            const uid = item.user_id || item.userId;
            const canPlay = !!(item.movie_id || item.movieId);
            return (
              <button
                key={item.id || `${uid}-${i}`}
                type="button"
                onClick={() => {
                  if (canPlay && onWatchTrailer) {
                    onWatchTrailer({
                      id: item.movie_id || item.movieId,
                      title,
                      poster,
                      year: item.movie_year || item.year,
                      rating: item.movie_rating || item.rating,
                      accent: item.movie_accent || item.accent || accent,
                      mediaType: item.is_tv || item.mediaType === 'tv' ? 'tv' : 'movie',
                    });
                  } else if (onOpenFriends) {
                    onOpenFriends();
                  }
                }}
                style={{
                  flexShrink: 0,
                  width: 148,
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  textAlign: 'left',
                  background: T.surface2,
                  border: `1px solid ${T.hairline}`,
                  borderRadius: 14,
                  padding: 6,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 52,
                    borderRadius: 8,
                    overflow: 'hidden',
                    background: T.surface,
                    flexShrink: 0,
                  }}
                >
                  {poster ? (
                    <img src={poster} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <SvgIcon name="play" size={12} color={T.text3} />
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10.5, color: T.text3, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ color: accent, fontWeight: 700 }}>@{item.username || 'friend'}</span>
                    {' '}{verb(item.type)}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: T.text,
                      fontFamily: T.serif, letterSpacing: '-0.02em',
                      lineHeight: 1.2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {title}
                  </div>
                  <div style={{ fontSize: 9.5, color: T.text3, marginTop: 2 }}>{timeAgo(item.created_at || item.timestamp)}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function dayPart(){const h=new Date().getHours();if(h>=5&&h<12)return{key:'morning',title:'This morning',phrase:'this morning'};if(h>=12&&h<17)return{key:'afternoon',title:'This afternoon',phrase:'this afternoon'};if(h>=17&&h<22)return{key:'tonight',title:'Tonight',phrase:'tonight'};return{key:'late',title:'Late night',phrase:'late tonight'};}

function ReleaseCountdown({dateStr,accent}){
  const target=dateStr?new Date(dateStr+'T00:00:00').getTime():0;
  const[now,setNow]=useState(()=>Date.now());
  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[]);
  if(!target)return null;
  let diff=Math.max(0,target-now);
  const d=Math.floor(diff/86400000);diff-=d*86400000;
  const h=Math.floor(diff/3600000);diff-=h*3600000;
  const m=Math.floor(diff/60000);diff-=m*60000;
  const sec=Math.floor(diff/1000);
  const cells=[[d,'Days'],[h,'Hrs'],[m,'Min'],[sec,'Sec']];
  return(
    <div style={{display:'flex',gap:6,marginBottom:12}}>
      {cells.map(([v,l],i)=>(
        <div key={l} style={{minWidth:52,padding:'7px 8px 6px',borderRadius:12,background:'rgba(0,0,0,0.38)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',border:`1px solid ${i===0?accent+'40':'rgba(255,255,255,0.08)'}`,textAlign:'center'}}>
          <div style={{fontSize:19,fontWeight:800,color:i===0?accent:'#fff',fontVariantNumeric:'tabular-nums',lineHeight:1}}>{String(v).padStart(2,'0')}</div>
          <div style={{fontSize:8.5,letterSpacing:1.6,textTransform:'uppercase',color:'rgba(255,255,255,0.45)',fontWeight:700,marginTop:4}}>{l}</div>
        </div>
      ))}
    </div>
  );
}

function daysUntil(dateStr){if(!dateStr)return null;const ms=new Date(dateStr+'T00:00:00').setHours(0,0,0,0)-new Date().setHours(0,0,0,0);return Math.round(ms/86400000);}
function formatReleaseCountdown(dateStr){const d=daysUntil(dateStr);if(d===null)return'';if(d<=0)return'Out now';if(d===1)return'Tomorrow';if(d<=30)return`${d} days`;return new Date(dateStr+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});}
function formatReleaseDate(dateStr){if(!dateStr)return'';return new Date(dateStr+'T00:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});}

function MovieCard({movie,isActive,index,onFindSimilar,onAuthRequired,onSave,isSaved,isWatched,onMarkWatched,onTrailer,isReminded,onToggleReminder,onNotInterested}){
  const{isSignedIn}=useUser();
  const isUpcoming=!!movie.isUpcoming;
  const reminderBusyRef=useRef(false);
  const[remindToast,setRemindToast]=useState(null);const remindToastTimer=useRef(null);
  const flashRemind=(msg,ok=true)=>{clearTimeout(remindToastTimer.current);setRemindToast({msg,ok});remindToastTimer.current=setTimeout(()=>setRemindToast(null),2800);};
  useEffect(()=>()=>clearTimeout(remindToastTimer.current),[]);
  const toggleReminder=async()=>{
    if(!isSignedIn){onAuthRequired();return;}
    if(reminderBusyRef.current)return;reminderBusyRef.current=true;
    const next=!isReminded;
    if(navigator.vibrate)navigator.vibrate(15);
    onToggleReminder?.(movie,next);
    try{
      const res=await fetch('/api/reminders',{method:next?'POST':'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({movieId:movie.id,mediaType:movie.mediaType||(movie.isTV?'tv':'movie'),title:movie.title,poster:movie.poster,releaseDate:movie.releaseDate})});
      if(!res.ok)throw new Error('reminder failed');
      if(next){const d=daysUntil(movie.releaseDate);flashRemind(d<=1?"We'll remind you tomorrow":`We'll remind you in ${d} days`);}
      else flashRemind('Reminder removed');
    }catch{onToggleReminder?.(movie,!next);flashRemind("Couldn't set reminder — try again",false);}
    finally{reminderBusyRef.current=false;}
  };
  const[liked,setLiked]=useState(false);const[userRating,setUserRating]=useState(0);const[showComments,setShowComments]=useState(false);const[imgLoaded,setImgLoaded]=useState(false);const[likeCount]=useState(Math.floor(Math.random()*60+8)*100);const[showHint,setShowHint]=useState(false);const[showAddToList,setShowAddToList]=useState(false);
  const longPressTimer=useRef(null);const isPressingRef=useRef(false);
  const fmt=n=>n>=1000?`${(n/1000).toFixed(0)}K`:n;
  const accent=movie.accent||'#F5A623';const bgImage=movie.backdrop||movie.poster;
  const handleLike=()=>{if(!isSignedIn){onAuthRequired();return;}setLiked(p=>!p);};
  const openTrailer=(e)=>{e?.stopPropagation?.();e?.preventDefault?.();if(navigator.vibrate)navigator.vibrate(20);setShowHint(false);try{localStorage.setItem('cine_trailer_tip','1');}catch{}onTrailer(movie);};
  const onPressStart=(e)=>{
    // Don't long-press when interacting with buttons
    if(e?.target?.closest?.('button'))return;
    isPressingRef.current=true;
    longPressTimer.current=setTimeout(()=>{if(isPressingRef.current){if(navigator.vibrate)navigator.vibrate(40);openTrailer();}},600);
  };
  const onPressEnd=()=>{isPressingRef.current=false;clearTimeout(longPressTimer.current);};
  // First-visit tip only (once per device)
  useEffect(()=>{
    if(!isActive){setShowHint(false);return;}
    let seen=false;try{seen=localStorage.getItem('cine_trailer_tip')==='1';}catch{}
    if(seen)return;
    const t=setTimeout(()=>setShowHint(true),900);
    const t2=setTimeout(()=>{setShowHint(false);try{localStorage.setItem('cine_trailer_tip','1');}catch{}},5000);
    return()=>{clearTimeout(t);clearTimeout(t2);};
  },[isActive]);
  return(
    <div style={{position:'relative',width:'100%',height:'100%',overflow:'hidden',background:'#04040A',userSelect:'none',WebkitUserSelect:'none'}} onMouseDown={onPressStart} onMouseUp={onPressEnd} onMouseLeave={onPressEnd} onTouchStart={onPressStart} onTouchEnd={onPressEnd} onTouchCancel={onPressEnd}>
      {bgImage&&(<><div style={{position:'absolute',inset:0,backgroundImage:`url(${bgImage})`,backgroundSize:'cover',backgroundPosition:'center top',opacity:imgLoaded?(isActive?1:0.7):0,transition:'opacity 0.6s ease',filter:accent===NOIR?'grayscale(1) contrast(1.12) brightness(0.92)':'none'}}/><img src={bgImage} alt="" onLoad={()=>setImgLoaded(true)} style={{position:'absolute',opacity:0,width:1,height:1,pointerEvents:'none'}}/></>)}
      <div style={{position:'absolute',inset:0,background:movie.gradient||GRADS[index%GRADS.length],opacity:imgLoaded?0:1,transition:'opacity 0.6s ease'}}/>
      <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 60% 25%, transparent 20%, rgba(0,0,0,0.6) 100%)',pointerEvents:'none'}}/>
      <div style={{position:'absolute',bottom:0,left:0,right:0,height:'75%',background:'linear-gradient(to top,rgba(0,0,0,0.98) 0%,rgba(0,0,0,0.85) 28%,rgba(0,0,0,0.3) 60%,transparent 100%)',pointerEvents:'none'}}/>
      <div style={{position:'absolute',top:0,left:0,right:0,height:'25%',background:'linear-gradient(to bottom,rgba(0,0,0,0.55) 0%,transparent 100%)',pointerEvents:'none'}}/>

      <div style={{position:'absolute',inset:0,opacity:0.15,mixBlendMode:'overlay',pointerEvents:'none',backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")`}}/>
      {/* Always-visible play control on active card */}
      {isActive&&(
        <button
          type="button"
          onClick={openTrailer}
          onMouseDown={(e)=>e.stopPropagation()}
          onTouchStart={(e)=>e.stopPropagation()}
          style={{
            position:'absolute',top:'40%',left:'50%',transform:'translate(-50%,-50%)',zIndex:16,
            width:68,height:68,borderRadius:'50%',cursor:'pointer',padding:0,
            background:'rgba(0,0,0,0.55)',backdropFilter:'blur(12px)',
            border:`2px solid ${accent}66`,
            display:'flex',alignItems:'center',justifyContent:'center',
            boxShadow:`0 8px 28px rgba(0,0,0,0.45),0 0 24px ${accent}22`,
            transition:'transform 0.15s ease, border-color 0.15s ease',
          }}
          title="Play trailer"
        >
          <SvgIcon name="play" size={26} color={accent} filled/>
        </button>
      )}
      {showHint&&isActive&&(
        <div style={{position:'absolute',top:'52%',left:'50%',transform:'translate(-50%,0)',zIndex:15,display:'flex',flexDirection:'column',alignItems:'center',gap:8,pointerEvents:'none',animation:'hintIn 0.4s ease'}}>
          <div style={{background:'rgba(0,0,0,0.72)',backdropFilter:'blur(10px)',borderRadius:20,padding:'6px 14px',border:'1px solid rgba(255,255,255,0.12)'}}>
            <span style={{fontSize:11,color:'rgba(255,255,255,0.75)',fontWeight:600}}>Tap play · or hold anywhere</span>
          </div>
          <style>{`@keyframes hintIn{from{opacity:0;transform:translate(-50%,6px)}to{opacity:1;transform:translate(-50%,0)}}`}</style>
        </div>
      )}
      <div style={{position:'absolute',top:92,left:0,right:0,zIndex:10,padding:'0 16px',display:'flex',justifyContent:'space-between',alignItems:'center',opacity:isActive?1:0.5,transition:'opacity 0.4s ease'}}>
        {isUpcoming
          ?<div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(0,0,0,0.4)',backdropFilter:'blur(16px)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:20,padding:'5px 12px'}}><div style={{width:5,height:5,borderRadius:'50%',background:accent,boxShadow:`0 0 6px ${accent}`,animation:'csPulse 1.6s ease-in-out infinite'}}/><span style={{fontSize:10.5,fontWeight:700,color:'rgba(255,255,255,0.8)',letterSpacing:1.6,textTransform:'uppercase'}}>Coming Soon</span></div>
          :<div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(0,0,0,0.4)',backdropFilter:'blur(16px)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:20,padding:'5px 12px'}}><div style={{width:5,height:5,borderRadius:'50%',background:accent,boxShadow:`0 0 6px ${accent}`}}/><span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.55)',letterSpacing:1}}>{String(index+1).padStart(2,'0')}</span>{movie.isTV&&<span style={{fontSize:9,color:accent,fontWeight:700,marginLeft:2}}>TV</span>}</div>}
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          {movie.certification&&<CertBadge cert={movie.certification}/>}
          {isUpcoming
            ?<div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(0,0,0,0.4)',backdropFilter:'blur(16px)',border:`1px solid ${accent}30`,borderRadius:20,padding:'5px 12px'}}><SvgIcon name="calendar" size={12} color={accent}/><span style={{fontSize:12.5,fontWeight:800,color:'#fff'}}>{formatReleaseCountdown(movie.releaseDate)}</span></div>
            :<div style={{display:'flex',alignItems:'center',gap:5,background:'rgba(0,0,0,0.4)',backdropFilter:'blur(16px)',border:`1px solid ${accent}30`,borderRadius:20,padding:'5px 12px'}}><SvgIcon name="star" size={11} color={accent} filled/><span style={{fontSize:13,fontWeight:800,color:'#fff'}}>{movie.rating}</span><span style={{fontSize:10,color:'rgba(255,255,255,0.25)'}}>/10</span></div>}
        </div>
      </div>
      <div style={{position:'absolute',bottom:0,left:0,right:74,padding:'0 20px calc(14px + env(safe-area-inset-bottom))',zIndex:10,opacity:isActive?1:0.4,transform:isActive?'translateY(0)':'translateY(18px)',transition:'all 0.5s ease'}}>
        {isUpcoming&&isActive&&<ReleaseCountdown dateStr={movie.releaseDate} accent={accent}/>}
        <div style={{display:'flex',gap:6,marginBottom:9,flexWrap:'wrap',alignItems:'center'}}>
          {(movie.genre||[]).map(g=>(<span key={g} style={{fontSize:9,letterSpacing:2.2,color:accent,fontWeight:700,textTransform:'uppercase',padding:'3px 8px',border:`1px solid ${accent}38`,borderRadius:4}}>{g}</span>))}
          {movie.isTV&&<span style={{fontSize:9,color:'rgba(255,255,255,0.35)',fontWeight:600,padding:'3px 8px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:4}}>SERIES</span>}
        </div>
        {isActive&&<StreamingBadges movieId={movie.id} mediaType={movie.mediaType} title={movie.title} year={movie.year}/>}
        <h2 style={{fontFamily:T.serif,letterSpacing:'-0.02em',fontSize:Math.min(50,Math.max(28,54-(movie.title?.length||0)*0.9)),fontWeight:800,color:'#fff',margin:'0 0 7px',lineHeight:1.02,letterSpacing:-0.5,textShadow:`0 0 50px ${accent}28,0 4px 26px rgba(0,0,0,0.8)`}}>{movie.title}</h2>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:13}}>
          <span style={{fontFamily:T.serif,letterSpacing:'-0.02em',fontSize:13,color:`${accent}bb`}}>{movie.year}</span>
          <span style={{width:3,height:3,borderRadius:'50%',background:'rgba(255,255,255,0.18)'}}/>
          {isUpcoming
            ?<div style={{display:'flex',alignItems:'center',gap:5}}><SvgIcon name="calendar" size={11} color="rgba(255,255,255,0.4)"/><span style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>In theaters {formatReleaseDate(movie.releaseDate)}</span></div>
            :<div style={{display:'flex',alignItems:'center',gap:4}}><SvgIcon name="eye" size={11} color="rgba(255,255,255,0.28)"/><span style={{fontSize:12,color:'rgba(255,255,255,0.35)'}}>{movie.votes} ratings</span></div>}
        </div>
        <p style={{fontSize:13.5,color:'rgba(255,255,255,0.55)',lineHeight:1.6,margin:0,fontWeight:400}}>{movie.overview}</p>
      </div>
      <div style={{position:'absolute',right:12,bottom:'calc(16px + env(safe-area-inset-bottom))',zIndex:10,display:'flex',flexDirection:'column',gap:5,alignItems:'center',opacity:isActive?1:0,transform:isActive?'translateX(0)':'translateX(28px)',transition:'all 0.45s ease 0.12s'}}>
        {[{k:'save',icon:isSaved?'check':'plus',label:isSaved?'Saved':'Save',active:isSaved,color:'#7BFF9E',filled:false,fn:()=>{if(!isSignedIn){onAuthRequired();return;}onSave(movie);}},{k:'like',icon:'heart',label:fmt(likeCount+(liked?1:0)),active:liked,color:'#FF6B8A',filled:liked,fn:handleLike},{k:'review',icon:'chat',label:'Review',active:showComments,color:'#7BC8FF',filled:false,fn:()=>setShowComments(true)},(isUpcoming?{k:'remind',icon:'bell',label:isReminded?'Reminded':'Remind',active:!!isReminded,color:'#FFD166',filled:!!isReminded,fn:toggleReminder}:{k:'seen',icon:'eye',label:isWatched?'Seen':'Seen it',active:!!isWatched,color:'#7BFFB0',filled:false,fn:()=>{if(!isSignedIn){onAuthRequired();return;}if(onMarkWatched)onMarkWatched(movie);}}),{k:'similar',icon:'similar',label:'Similar',active:false,color:accent,filled:false,fn:()=>onFindSimilar(movie)},{k:'nope',icon:'notFor',label:'Not for me',active:false,color:'#FF6B8A',filled:false,fn:()=>{if(navigator.vibrate)navigator.vibrate(15);onNotInterested&&onNotInterested(movie);}}].map(btn=>(
          <button key={btn.k} onClick={btn.fn} aria-label={btn.label} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,background:btn.active?`${btn.color}15`:'rgba(0,0,0,0.42)',backdropFilter:'blur(20px)',border:`1px solid ${btn.active?btn.color+'50':'rgba(255,255,255,0.09)'}`,borderRadius:18,padding:'11px 0',cursor:'pointer',width:56,boxSizing:'border-box',transition:'all 0.22s ease',boxShadow:btn.active?`0 0 16px ${btn.color}1f`:'none'}}>
            <SvgIcon name={btn.icon} size={20} color={btn.active?btn.color:'rgba(255,255,255,0.65)'} filled={btn.filled}/>
            <span style={{fontSize:9,color:btn.active?btn.color:'rgba(255,255,255,0.55)',letterSpacing:0.2,fontWeight:700,marginTop:1,textShadow:'0 1px 6px rgba(0,0,0,0.6)',whiteSpace:'nowrap'}}>{btn.label}</span>
          </button>
        ))}
      </div>
      {remindToast&&(
        <div style={{position:'absolute',left:'50%',top:'52%',transform:'translateX(-50%)',zIndex:30,pointerEvents:'none',animation:'fadeUp 0.25s ease'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,whiteSpace:'nowrap',background:'rgba(6,6,11,0.88)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',border:`1px solid ${remindToast.ok?'#FFD16655':'rgba(255,107,138,0.45)'}`,borderRadius:999,padding:'9px 16px',boxShadow:'0 10px 30px rgba(0,0,0,0.45)'}}>
            <SvgIcon name={remindToast.ok?'bell':'close'} size={14} color={remindToast.ok?'#FFD166':'#FF6B8A'} filled={remindToast.ok}/>
            <span style={{fontSize:12.5,fontWeight:700,color:'#fff'}}>{remindToast.msg}</span>
          </div>
        </div>
      )}
      {showComments&&<CommentPanel movie={movie} onClose={()=>setShowComments(false)} accent={accent} onAuthRequired={()=>{setShowComments(false);onAuthRequired();}} onWatchTrailer={onTrailer} onAddToWatchlist={onSave}/>}
      {showAddToList&&<AddToListSheet movie={movie} onClose={()=>setShowAddToList(false)} accent={accent}/>}
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes csPulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>
    </div>
  );
}

// NOTIFICATIONS PANEL


// ─── MESSAGES INBOX ─────────────────────────────────────────────────────────
// ─── Chat themes (cinema-inspired: color + type + sound) ─────────────────────
const CHAT_UNREAD_DOTS = ['#FF6B8A', '#4DA8FF', '#F5C842', '#1CE783', '#B07FEF', '#FF7A2F', '#00A8E0', '#FF6BAE'];

const CHAT_THEMES = {
  classic: {
    id: 'classic', label: 'Classic', emoji: '🎬',
    bg: '#0a0a0f', surface: 'rgba(255,255,255,0.05)',
    bubbleMe: 'rgba(255,255,255,0.12)', bubbleThem: 'rgba(255,255,255,0.05)',
    accent: '#F5C842', text: 'rgba(255,255,255,0.92)', textMuted: 'rgba(255,255,255,0.4)',
    font: "var(--font-display), 'Inter Tight', system-ui, -apple-system, sans-serif", bodyFont: 'inherit',
    radius: 16, sound: { type: 'click', freq: 880, dur: 0.06 },
  },
  batman: {
    id: 'batman', label: 'Batman', emoji: '🦇',
    bg: '#050505', surface: 'rgba(245,200,66,0.07)',
    bubbleMe: 'rgba(245,200,66,0.2)', bubbleThem: 'rgba(30,30,30,0.9)',
    accent: '#F5C842', text: 'rgba(255,255,255,0.95)', textMuted: 'rgba(245,200,66,0.5)',
    font: "var(--font-display), 'Inter Tight', system-ui, -apple-system, sans-serif", bodyFont: 'ui-monospace,monospace',
    radius: 4, sound: { type: 'deep', freq: 120, dur: 0.12 },
  },
  avatar: {
    id: 'avatar', label: 'Avatar', emoji: '🌊',
    bg: '#021018', surface: 'rgba(0,168,224,0.08)',
    bubbleMe: 'rgba(0,168,224,0.25)', bubbleThem: 'rgba(0,40,60,0.7)',
    accent: '#00A8E0', text: 'rgba(230,248,255,0.95)', textMuted: 'rgba(0,168,224,0.55)',
    font: "var(--font-display), 'Inter Tight', system-ui, -apple-system, sans-serif", bodyFont: 'inherit',
    radius: 20, sound: { type: 'wave', freq: 440, dur: 0.15 },
  },
  action: {
    id: 'action', label: 'Action', emoji: '💥',
    bg: '#100808', surface: 'rgba(255,122,47,0.08)',
    bubbleMe: 'rgba(255,122,47,0.28)', bubbleThem: 'rgba(40,20,10,0.85)',
    accent: '#FF7A2F', text: 'rgba(255,245,235,0.95)', textMuted: 'rgba(255,122,47,0.55)',
    font: "var(--font-display), 'Inter Tight', system-ui, -apple-system, sans-serif", bodyFont: 'inherit',
    radius: 8, sound: { type: 'punch', freq: 180, dur: 0.08 },
  },
  love: {
    id: 'love', label: 'Love', emoji: '💕',
    bg: '#120810', surface: 'rgba(255,107,174,0.08)',
    bubbleMe: 'rgba(255,107,174,0.26)', bubbleThem: 'rgba(50,20,35,0.85)',
    accent: '#FF6BAE', text: 'rgba(255,240,248,0.95)', textMuted: 'rgba(255,107,174,0.55)',
    font: "var(--font-display), 'Inter Tight', system-ui, -apple-system, sans-serif", bodyFont: 'inherit',
    radius: 22, sound: { type: 'soft', freq: 660, dur: 0.14 },
  },
  horror: {
    id: 'horror', label: 'Horror', emoji: '🩸',
    bg: '#0a0404', surface: 'rgba(229,9,20,0.08)',
    bubbleMe: 'rgba(229,9,20,0.28)', bubbleThem: 'rgba(30,5,5,0.9)',
    accent: '#E50914', text: 'rgba(255,230,230,0.95)', textMuted: 'rgba(229,9,20,0.5)',
    font: "var(--font-display), 'Inter Tight', system-ui, -apple-system, sans-serif", bodyFont: 'ui-monospace,monospace',
    radius: 2, sound: { type: 'horror', freq: 90, dur: 0.2 },
  },
  scifi: {
    id: 'scifi', label: 'Sci-Fi', emoji: '🛸',
    bg: '#080612', surface: 'rgba(176,127,239,0.1)',
    bubbleMe: 'rgba(176,127,239,0.28)', bubbleThem: 'rgba(25,15,45,0.9)',
    accent: '#B07FEF', text: 'rgba(245,240,255,0.95)', textMuted: 'rgba(176,127,239,0.55)',
    font: "var(--font-display), 'Inter Tight', system-ui, -apple-system, sans-serif", bodyFont: 'ui-monospace,Menlo,monospace',
    radius: 12, sound: { type: 'blip', freq: 1200, dur: 0.07 },
  },
  nature: {
    id: 'nature', label: 'Nature', emoji: '🌿',
    bg: '#06100a', surface: 'rgba(28,231,131,0.08)',
    bubbleMe: 'rgba(28,231,131,0.22)', bubbleThem: 'rgba(10,30,18,0.9)',
    accent: '#1CE783', text: 'rgba(235,255,245,0.95)', textMuted: 'rgba(28,231,131,0.5)',
    font: "var(--font-display), 'Inter Tight', system-ui, -apple-system, sans-serif", bodyFont: 'inherit',
    radius: 18, sound: { type: 'soft', freq: 520, dur: 0.12 },
  },
};

function playChatSound(theme) {
  try {
    const s = theme?.sound;
    if (!s) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    if (s.type === 'deep' || s.type === 'horror') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(s.freq, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, s.freq * 0.4), now + s.dur);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + s.dur);
    } else if (s.type === 'wave' || s.type === 'soft') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(s.freq, now);
      osc.frequency.linearRampToValueAtTime(s.freq * 1.3, now + s.dur);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + s.dur);
    } else if (s.type === 'punch') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(s.freq, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + s.dur);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(s.freq, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + s.dur);
    }
    osc.start(now);
    osc.stop(now + s.dur + 0.02);
    setTimeout(() => { try { ctx.close(); } catch {} }, 400);
  } catch {}
}

function MessagesInbox({ onClose, accent, onOpenChat, onOpenProfile }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [filter, setFilter] = useState('all'); // all | unread | requests | spam
  const [spamIds, setSpamIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cine_msg_spam') || '[]'); } catch { return []; }
  });

  const timeAgo = (ts) => {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    if (days < 30) return `${Math.floor(days / 7)}w`;
    return `${Math.floor(days / 365) || 1}y`;
  };

  const load = () => {
    setLoading(true);
    setError(null);
    fetch('/api/messages')
      .then((r) => r.json())
      .then((d) => {
        if (d.error && !d.conversations) setError(d.error);
        setConversations(d.conversations || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load messages');
        setLoading(false);
      });
  };

  useEffect(() => { load(); }, []);

  const toggleSpam = (peerId) => {
    setSpamIds((prev) => {
      const next = prev.includes(peerId) ? prev.filter((id) => id !== peerId) : [...prev, peerId];
      try { localStorage.setItem('cine_msg_spam', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const counts = {
    all: conversations.filter((c) => !spamIds.includes(c.peer_id)).length,
    unread: conversations.filter((c) => c.unread && !spamIds.includes(c.peer_id)).length,
    requests: conversations.filter((c) => c.is_request && !spamIds.includes(c.peer_id)).length,
    spam: conversations.filter((c) => spamIds.includes(c.peer_id)).length,
  };

  const filtered = conversations.filter((c) => {
    const isSpam = spamIds.includes(c.peer_id);
    if (filter === 'spam') return isSpam;
    if (isSpam) return false;
    if (filter === 'unread') return !!c.unread;
    if (filter === 'requests') return !!c.is_request;
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      return (
        (c.display_name || '').toLowerCase().includes(q) ||
        (c.username || '').toLowerCase().includes(q) ||
        (c.last_text || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filters = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'unread', label: 'Unread', count: counts.unread },
    { id: 'requests', label: 'Requests', count: counts.requests },
    { id: 'spam', label: 'Spam', count: counts.spam },
  ];

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 120,
          background: 'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(12px)',
          animation: 'fadeIn 0.2s ease',
        }}
      />
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 121,
          height: '88vh',
          maxHeight: 780,
          background:ambient(accent),
          borderRadius: '24px 24px 0 0',
          border: `1px solid ${T.hairline}`,
          borderBottom: 'none',
          display: 'flex',
          flexDirection: 'column',
          animation: 'sheetUp 0.32s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <style>{`@keyframes sheetUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)', margin: '10px auto 0', flexShrink: 0 }} />

        {/* Title row */}
        <div style={{ padding: '18px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontFamily:T.serif, fontSize:21,letterSpacing:'-0.02em', fontWeight:700, color:T.text }}>
            Messages
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SvgIcon name="close" size={14} color="rgba(255,255,255,0.55)" />
          </button>
        </div>

        {/* Search — single search entry point, no redundant icon button */}
        <div style={{ padding: '14px 20px 12px', flexShrink: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              background: T.surface2,
              border: `1px solid ${T.hairline}`,
              borderRadius: 14,
              padding: '11px 14px',
            }}
          >
            <SvgIcon name="search" size={15} color="rgba(255,255,255,0.3)" />
            <input
              id="cine-msg-search"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search conversations"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'rgba(255,255,255,0.9)',
                fontSize: 14,
                fontFamily: 'inherit',
              }}
            />
            {searchQ ? (
              <button
                type="button"
                onClick={() => setSearchQ('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
              >
                <SvgIcon name="close" size={13} color="rgba(255,255,255,0.3)" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Filter tabs */}
        <div
          style={{
            padding: '0 20px 14px',
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            flexShrink: 0,
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {filters.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                style={{
                  background: active ? accent : 'transparent',
                  border: `1px solid ${active ? accent : T.hairline}`,
                  borderRadius: 20,
                  padding: '7px 13px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: active ? '#0A0A0F' : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'all 0.15s ease',
                }}
              >
                {f.label}
                {f.count > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: active ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.35)',
                    }}
                  >
                    {f.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 20 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Loading…</div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>{error}</div>
              <button
                type="button"
                onClick={load}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 14,
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: '#fff',
                  fontFamily: 'inherit',
                  fontWeight: 600,
                }}
              >
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '56px 28px' }}>
              <div style={{ fontWeight:700,fontFamily:T.serif, fontSize:17,letterSpacing:'-0.02em', color:T.text, marginBottom: 8 }}>
                {filter === 'spam' ? 'No spam' : filter === 'unread' ? 'All caught up' : filter === 'requests' ? 'No requests' : 'No conversations yet'}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
                {filter === 'all' ? 'Message a friend from their profile to start.' : 'Nothing in this filter.'}
              </div>
            </div>
          ) : (
            filtered.map((c, i) => {
              const dot = CHAT_UNREAD_DOTS[i % CHAT_UNREAD_DOTS.length];
              const isUnread = !!c.unread;
              const isSpam = spamIds.includes(c.peer_id);
              let preview = c.last_text || 'Tap to open';
              if (typeof preview === 'string' && preview.trim().startsWith('{') && preview.includes('"kind"')) {
                try {
                  const p = JSON.parse(preview);
                  preview = p.kind === 'end' ? 'Call ended' : p.kind === 'offer' ? (p.callType === 'video' ? 'Video call' : 'Audio call') : 'Call';
                } catch { preview = 'Call'; }
              }
              return (
                <div
                  key={c.peer_id || i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 20px',
                    borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  }}
                >
                  {/* Avatar → profile */}
                  <button
                    type="button"
                    onClick={() => onOpenProfile && onOpenProfile(c.peer_id)}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      overflow: 'visible',
                      background: 'rgba(255,255,255,0.08)',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      flexShrink: 0,
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: `linear-gradient(145deg, ${dot}55, rgba(255,255,255,0.08))`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontFamily: T.serif, letterSpacing: '-0.02em', fontWeight: 700, fontSize: 18, color: 'rgba(255,255,255,0.85)' }}>
                          {(c.display_name || c.username || 'U')[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    {isUnread && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 2,
                          right: 2,
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: '#22C55E',
                          border: '2px solid #0B0B10',
                        }}
                      />
                    )}
                  </button>

                  {/* Open chat */}
                  <button
                    type="button"
                    onClick={() =>
                      onOpenChat &&
                      onOpenChat({
                        user_id: c.peer_id,
                        username: c.username,
                        display_name: c.display_name,
                        avatar_url: c.avatar_url,
                      })
                    }
                    style={{
                      flex: 1,
                      minWidth: 0,
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3, gap: 8 }}>
                      <span
                        style={{
                          fontFamily: T.serif, letterSpacing: '-0.02em',
                          fontSize: 16,
                          fontWeight: 700,
                          color: 'rgba(255,255,255,0.95)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          minWidth: 0,
                        }}
                      >
                        {c.display_name || c.username || 'Unknown'}
                      </span>
                      <span style={{ fontSize: 11.5, color: isUnread ? accent : 'rgba(255,255,255,0.32)', fontWeight: isUnread ? 700 : 500, flexShrink: 0 }}>
                        {timeAgo(c.last_at)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: isUnread ? 600 : 400,
                          color: isUnread ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.4)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          minWidth: 0,
                        }}
                      >
                        {isSpam ? 'Marked as spam' : c.is_request ? 'Message request' : <>{c.from_me ? 'You: ' : ''}{preview}</>}
                      </span>
                      {isUnread && (
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent, flexShrink: 0 }}/>
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleSpam(c.peer_id)}
                    title={isSpam ? 'Unflag' : 'Flag spam'}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: isSpam ? '#E50914' : 'rgba(255,255,255,0.25)',
                      cursor: 'pointer',
                      fontSize: 16,
                      padding: '4px 2px',
                      flexShrink: 0,
                      lineHeight: 1,
                    }}
                  >
                    ···
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

// ─── CHAT WIDGET (message requests / DMs) ───────────────────────────────────
function ChatWidget({ peer, onClose, accent }) {
  const { user } = useUser();
  const [messages, setMessages] = useState([]);
  const [peerInfo, setPeerInfo] = useState(peer || null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [showStickers, setShowStickers] = useState(false);
  const [callMode, setCallMode] = useState(null); // null | 'audio' | 'video'
  const [callSecs, setCallSecs] = useState(0);
  const [callStatus, setCallStatus] = useState('idle'); // idle | ringing | connecting | connected | incoming
  const [incomingCall, setIncomingCall] = useState(null); // { type, from }
  const [micMuted, setMicMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [camOff, setCamOff] = useState(false);
  // The local preview <video> only exists in the DOM while camOff is false
  // (see the camOff ? placeholder : <video> render below), so its ref is
  // null while turning the camera back on. Re-attach the live stream here
  // once the element actually mounts, instead of relying on the click
  // handler to set srcObject before React has rendered the element.
  useEffect(() => {
    if (!camOff && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.muted = true;
      localVideoRef.current.play?.().catch(() => {});
    }
  }, [camOff]);
  const [remoteSpeaking, setRemoteSpeaking] = useState(false);
  const [upgradePrompt, setUpgradePrompt] = useState(false); // peer asked to go video
  const [remoteStreamTick, setRemoteStreamTick] = useState(0);
  const [facingMode, setFacingMode] = useState('user'); // user | environment
  const [switchingCam, setSwitchingCam] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showAttach, setShowAttach] = useState(false);
  const [mediaTab, setMediaTab] = useState('stickers'); // stickers | gifs
  const [gifQuery, setGifQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [gifsLoading, setGifsLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const mediaRecRef = useRef(null);
  const chunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const fileInputRef = useRef(null);
  const dialToneRef = useRef(null);
  const processedSignalsRef = useRef(new Set());
  const pendingIceCandidatesRef = useRef([]);
  const iceRestartInProgressRef = useRef(false);
  const reconnectTimerRef = useRef(null);
  const isCallerRef = useRef(false);
  const makingOfferRef = useRef(false);
  const callModeRef = useRef(null);
  const callStatusRef = useRef('idle');
  const peerId = peer?.user_id || peer?.id;

  const ICE_SERVERS =
    (typeof globalThis !== 'undefined' && globalThis.CINESCROLL_ICE_SERVERS) || [
      {
        urls: [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302',
        ],
      },
    ];

  const AUDIO_CONSTRAINTS = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };
  const VIDEO_CONSTRAINTS = {
    facingMode: 'user',
    width: { ideal: 1280 },
    height: { ideal: 720 },
  };

  const STICKER_PACKS = {
    Cinema: ['🎬','🍿','🎥','🎞️','📽️','🎦','🏆','⭐','🌟','💫','🔥','💥'],
    Reactions: ['😂','😍','😱','😭','🤯','😎','🤔','😴','🫡','🫠','👀','💯'],
    Love: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','💕','✨','🙌'],
    Fun: ['👻','💀','🎃','👽','🤖','👾','🎮','🎯','🍕','☕','🌙','📱'],
  };
  const [stickerPack, setStickerPack] = useState('Cinema');
  const STICKERS = STICKER_PACKS[stickerPack] || STICKER_PACKS.Cinema;

  const loadGifs = async (q) => {
    setGifsLoading(true);
    try {
      const query = (q || 'movie reaction').trim() || 'movie';
      // Giphy public beta key (client-side ok for discovery apps)
      const url = `https://api.giphy.com/v1/gifs/search?api_key=dc6zaTOxFJmzC&q=${encodeURIComponent(query)}&limit=24&rating=pg-13`;
      const r = await fetch(url);
      const d = await r.json();
      const items = (d.data || []).map((g) => ({
        id: g.id,
        url: g.images?.fixed_height?.url || g.images?.downsized?.url || g.images?.original?.url,
        preview: g.images?.fixed_height_small?.url || g.images?.preview_gif?.url,
      })).filter((x) => x.url);
      setGifs(items);
    } catch {
      setGifs([]);
    }
    setGifsLoading(false);
  };

  useEffect(() => {
    if (showStickers && mediaTab === 'gifs' && gifs.length === 0) loadGifs('cinema');
  }, [showStickers, mediaTab]);

  const sendGif = async (gif) => {
    if (!peerId || sending || !gif?.url) return;
    setShowStickers(false);
    await postMessage(
      { text: 'GIF', msg_type: 'gif', media_url: gif.url },
      {
        id: `tmp-${Date.now()}`,
        text: 'GIF',
        msg_type: 'gif',
        media_url: gif.url,
        created_at: new Date().toISOString(),
        from_me: true,
        read: false,
        delivered: true,
      }
    );
  };

  const formatClock = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const timeAgo = (ts) => {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  const scrollBottom = () => {
    setTimeout(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    }, 50);
  };

  const load = () => {
    if (!peerId) return;
    setError(null);
    fetch(`/api/messages?with=${peerId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error && !d.messages) setError(d.error);
        const list = [];
        for (const m of (d.messages || [])) {
          if (m.msg_type !== 'call_signal') { list.push(m); continue; }
          try {
            const payload = JSON.parse(m.text || '{}');
            if (payload.kind === 'offer') list.push({ ...m, msg_type: 'system', text: payload.callType === 'video' ? 'Video call started' : 'Audio call started' });
            else if (payload.kind === 'end') list.push({ ...m, msg_type: 'system', text: 'Call ended' });
          } catch {}
        }
        setMessages(list);
        if (d.peer) setPeerInfo((p) => ({ ...p, ...d.peer }));
        setLoading(false);
        scrollBottom();
      })
      .catch(() => {
        setError('Could not load conversation');
        setLoading(false);
      });
  };

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerId]);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      try { mediaRecRef.current?.stop(); } catch {}
    };
  }, []);

  const postMessage = async (payload, optimistic) => {
    setSending(true);
    setMessages((p) => [...p, optimistic]);
    scrollBottom();
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: peerId, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((p) => p.filter((m) => m.id !== optimistic.id));
        setError(data.error || 'Failed to send');
        return false;
      }
      if (data.message) {
        setMessages((p) => p.map((m) => (m.id === optimistic.id ? data.message : m)));
      }
      return true;
    } catch {
      setMessages((p) => p.filter((m) => m.id !== optimistic.id));
      setError('Failed to send');
      return false;
    } finally {
      setSending(false);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || !peerId || sending) return;
    setInput('');
    setShowStickers(false);
    playChatSound(CHAT_THEMES.classic);
    await postMessage(
      { text, msg_type: 'text' },
      {
        id: `tmp-${Date.now()}`,
        text,
        msg_type: 'text',
        created_at: new Date().toISOString(),
        from_me: true,
        read: false,
        delivered: true,
      }
    );
    inputRef.current?.focus();
  };

  const sendSticker = async (emoji) => {
    if (!peerId || sending) return;
    setShowStickers(false);
    await postMessage(
      { text: emoji, msg_type: 'sticker' },
      {
        id: `tmp-${Date.now()}`,
        text: emoji,
        msg_type: 'sticker',
        created_at: new Date().toISOString(),
        from_me: true,
        read: false,
        delivered: true,
      }
    );
  };

  const startRecording = async () => {
    if (recording || sending || !peerId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        setRecording(false);
        setRecordSecs(0);
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        if (blob.size < 800) return;
        await uploadAndSendVoice(blob);
      };
      mediaRecRef.current = rec;
      rec.start();
      setRecording(true);
      setRecordSecs(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSecs((s) => {
          if (s >= 59) {
            stopRecording();
            return 59;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setError('Microphone permission needed for voice notes');
    }
  };

  const stopRecording = () => {
    try {
      if (mediaRecRef.current && mediaRecRef.current.state !== 'inactive') {
        mediaRecRef.current.stop();
      }
    } catch {}
  };

  const cancelRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    try {
      if (mediaRecRef.current) {
        mediaRecRef.current.ondataavailable = null;
        mediaRecRef.current.onstop = null;
        if (mediaRecRef.current.state !== 'inactive') mediaRecRef.current.stop();
      }
    } catch {}
    setRecording(false);
    setRecordSecs(0);
    chunksRef.current = [];
  };

  const uploadAndSendVoice = async (blob) => {
    setSending(true);
    try {
      const form = new FormData();
      form.append('file', blob, `voice-${Date.now()}.webm`);
      form.append('kind', 'voice');
      const up = await fetch('/api/upload-chat-media', { method: 'POST', body: form });
      const upData = await up.json().catch(() => ({}));
      if (!up.ok || !upData.url) {
        // Fallback: embed as data URL for short clips (last resort)
        if (blob.size > 180000) {
          setError(upData.error || 'Voice upload failed');
          setSending(false);
          return;
        }
        const dataUrl = await new Promise((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result);
          fr.onerror = reject;
          fr.readAsDataURL(blob);
        });
        await postMessage(
          { text: 'Voice note', msg_type: 'voice', media_url: dataUrl },
          {
            id: `tmp-${Date.now()}`,
            text: 'Voice note',
            msg_type: 'voice',
            media_url: dataUrl,
            created_at: new Date().toISOString(),
            from_me: true,
            read: false,
            delivered: true,
          }
        );
        setSending(false);
        return;
      }
      await postMessage(
        { text: 'Voice note', msg_type: 'voice', media_url: upData.url },
        {
          id: `tmp-${Date.now()}`,
          text: 'Voice note',
          msg_type: 'voice',
          media_url: upData.url,
          created_at: new Date().toISOString(),
          from_me: true,
          read: false,
          delivered: true,
        }
      );
    } catch {
      setError('Could not send voice note');
    }
    setSending(false);
  };

  const statusLabel = (m) => {
    const clock = formatClock(m.created_at) || timeAgo(m.created_at);
    if (!m.from_me) return clock;
    if (m.read) return `Seen ${formatClock(m.read_at) || clock}`;
    if (m.delivered !== false) return `Delivered · ${clock}`;
    return `Sent · ${clock}`;
  };

  const StatusTicks = ({ m }) => {
    if (!m.from_me) return null;
    const color = m.read ? accent : 'rgba(255,255,255,0.35)';
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 4, letterSpacing: -2, fontSize: 11, color, fontWeight: 700 }}>
        {m.read || m.delivered !== false ? '✓✓' : '✓'}
      </span>
    );
  };

  const name = peerInfo?.display_name || peerInfo?.username || 'friend';
  const meBubble = accent || '#F5C842';
  const themBubble = 'rgba(255,255,255,0.08)';

  const formatCallTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const sendSignal = async (payload) => {
    if (!peerId) return false;
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserId: peerId,
          text: JSON.stringify(payload),
          msg_type: 'call_signal',
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        console.error('[call] signal failed', res.status, d);
        return false;
      }
      return true;
    } catch (e) {
      console.error('[call] signal error', e);
      return false;
    }
  };

  const attachRemoteStream = (stream) => {
    if (!stream) return;
    remoteStreamRef.current = stream;
    try {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play?.().catch(() => {});
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.play?.().catch(() => {});
      }
    } catch (e) {
      console.error('[call] attach remote', e);
    }
    setRemoteStreamTick((n) => n + 1);
  };

  const flushIceQueue = async (pc) => {
    if (!pc || !pc.remoteDescription) return;
    const queue = pendingIceCandidatesRef.current.splice(0);
    for (const candidate of queue) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (e) {
        console.warn('[call] addIceCandidate (flush)', e?.message || e);
      }
    }
  };

  const clearReconnectTimer = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  };

  const cleanupCall = () => {
    clearReconnectTimer();
    iceRestartInProgressRef.current = false;
    makingOfferRef.current = false;
    pendingIceCandidatesRef.current = [];
    try {
      const pc = pcRef.current;
      if (pc) {
        pc.onicecandidate = null;
        pc.ontrack = null;
        pc.onconnectionstatechange = null;
        pc.oniceconnectionstatechange = null;
        try {
          pc.getSenders()?.forEach((s) => {
            try { s.track?.stop(); } catch {}
          });
        } catch {}
        try { pc.close(); } catch {}
      }
    } catch {}
    pcRef.current = null;
    try {
      localStreamRef.current?.getTracks?.()?.forEach((tr) => {
        try { tr.stop(); } catch {}
      });
    } catch {}
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    try {
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    } catch {}
    try { dialToneRef.current?.stop?.(); } catch {}
    dialToneRef.current = null;
    isCallerRef.current = false;
    callModeRef.current = null;
    callStatusRef.current = 'idle';
    setCallMode(null);
    setCallStatus('idle');
    setCallSecs(0);
    setIncomingCall(null);
    setMicMuted(false);
    setSpeakerOn(true);
    setCamOff(false);
    setRemoteSpeaking(false);
    setUpgradePrompt(false);
    setFacingMode('user');
    setSwitchingCam(false);
    setControlsVisible(true);
  };

  const attemptIceRestart = async () => {
    const pc = pcRef.current;
    if (!pc || iceRestartInProgressRef.current || !isCallerRef.current) return;
    if (pc.signalingState !== 'stable') return;
    iceRestartInProgressRef.current = true;
    try {
      console.log('[call] ICE restart');
      makingOfferRef.current = true;
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      await sendSignal({ kind: 'restart_offer', sdp: offer });
    } catch (e) {
      console.error('[call] ice restart failed', e);
    } finally {
      makingOfferRef.current = false;
      setTimeout(() => {
        iceRestartInProgressRef.current = false;
      }, 4000);
    }
  };

  const ensurePc = () => {
    if (pcRef.current) return pcRef.current;
    if (typeof RTCPeerConnection === 'undefined') {
      throw new Error('Calling is not supported in this browser');
    }
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendSignal({ kind: 'ice', candidate: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate });
      }
    };

    pc.ontrack = (e) => {
      let stream = remoteStreamRef.current;
      if (!stream) {
        stream = e.streams?.[0] || new MediaStream();
        if (!e.streams?.[0] && e.track) stream.addTrack(e.track);
        remoteStreamRef.current = stream;
      } else if (e.track && !stream.getTracks().includes(e.track)) {
        stream.addTrack(e.track);
      }
      attachRemoteStream(stream);
      setCallStatus('connected');
      clearReconnectTimer();
    };

    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      console.log('[call] connectionState', st);
      if (st === 'connected') {
        setCallStatus('connected');
        clearReconnectTimer();
        iceRestartInProgressRef.current = false;
      } else if (st === 'disconnected') {
        // brief network blip — wait then try ICE restart
        clearReconnectTimer();
        reconnectTimerRef.current = setTimeout(() => {
          if (pcRef.current && pcRef.current.connectionState === 'disconnected') {
            setError('Connection interrupted. Reconnecting…');
            attemptIceRestart();
            setTimeout(() => setError(null), 3000);
          }
        }, 2500);
      } else if (st === 'failed') {
        setError('Unable to connect the call. Retrying…');
        attemptIceRestart();
        setTimeout(() => setError(null), 3000);
      } else if (st === 'closed') {
        // ended
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[call] iceConnectionState', pc.iceConnectionState);
    };

    pcRef.current = pc;
    return pc;
  };

  const getLocalMedia = async (withVideo) => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      throw new Error('Camera/microphone are not available in this browser');
    }
    const constraints = {
      audio: AUDIO_CONSTRAINTS,
      video: withVideo ? VIDEO_CONSTRAINTS : false,
    };
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        throw new Error(withVideo ? 'Camera permission was denied.' : 'Microphone permission was denied.');
      }
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        throw new Error('No camera or microphone was found.');
      }
      if (name === 'NotReadableError') {
        throw new Error('Camera or microphone is already in use.');
      }
      throw new Error(err?.message || 'Could not access media devices.');
    }
  };

  const attachLocal = async (withVideo) => {
    const stream = await getLocalMedia(withVideo);
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.muted = true;
      localVideoRef.current.playsInline = true;
      localVideoRef.current.play?.().catch(() => {});
    }
    const pc = ensurePc();
    const existing = pc.getSenders().map((s) => s.track?.kind).filter(Boolean);
    stream.getTracks().forEach((track) => {
      if (!existing.includes(track.kind)) {
        pc.addTrack(track, stream);
      } else {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === track.kind);
        if (sender) sender.replaceTrack(track).catch(() => {});
      }
    });
    return stream;
  };

  const startCall = async (mode) => {
    if (!peerId || callMode) return;
    if (typeof RTCPeerConnection === 'undefined') {
      setError('Calling is not supported in this browser');
      return;
    }
    try {
      isCallerRef.current = true;
      setCallMode(mode);
      setCallStatus('ringing');
      setCallSecs(0);
      setError(null);
      await attachLocal(mode === 'video');
      const pc = ensurePc();
      makingOfferRef.current = true;
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      const ok = await sendSignal({ kind: 'offer', sdp: pc.localDescription || offer, callType: mode });
      if (!ok) {
        setError('Unable to reach the other person.');
        cleanupCall();
      }
    } catch (err) {
      console.error('[call] startCall', err);
      setError(err?.message || 'Could not start call');
      cleanupCall();
    } finally {
      makingOfferRef.current = false;
    }
  };

  const acceptCall = async (signal) => {
    try {
      const mode = signal.callType === 'video' ? 'video' : 'audio';
      isCallerRef.current = false;
      setIncomingCall(null);
      setCallMode(mode);
      setCallStatus('connecting');
      setError(null);
      await attachLocal(mode === 'video');
      const pc = ensurePc();
      await pc.setRemoteDescription(signal.sdp);
      await flushIceQueue(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal({ kind: 'answer', sdp: pc.localDescription || answer });
      setCallStatus((s) => (s === 'connecting' ? 'connecting' : s));
    } catch (err) {
      console.error('[call] acceptCall', err);
      setError(err?.message || 'Could not accept call');
      await sendSignal({ kind: 'end' });
      cleanupCall();
    }
  };

  const handleSignal = async (signal, fromMe) => {
    if (!signal || !signal.kind) return;
    if (signal.kind === 'end') {
      cleanupCall();
      return;
    }
    if (fromMe) return;

    const pc = pcRef.current;

    if (signal.kind === 'offer') {
      const busy =
        !!callModeRef.current ||
        callStatusRef.current === 'incoming' ||
        callStatusRef.current === 'ringing' ||
        callStatusRef.current === 'connecting' ||
        callStatusRef.current === 'connected';
      if (busy) {
        // already in a call — politely tell peer we're busy
        sendSignal({ kind: 'end', reason: 'busy' });
        return;
      }
      setIncomingCall({
        type: signal.callType || 'audio',
        callType: signal.callType || 'audio',
        sdp: signal.sdp,
      });
      setCallStatus('incoming');
      return;
    }

    if (signal.kind === 'answer') {
      if (!pc) return;
      try {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(signal.sdp);
          await flushIceQueue(pc);
          setCallStatus('connected');
        }
      } catch (e) {
        console.error('[call] answer error', e);
      }
      return;
    }

    if (signal.kind === 'restart_offer') {
      if (!pc) return;
      try {
        await pc.setRemoteDescription(signal.sdp);
        await flushIceQueue(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal({ kind: 'answer', sdp: pc.localDescription || answer });
      } catch (e) {
        console.error('[call] restart_offer', e);
      }
      return;
    }

    if (signal.kind === 'ice') {
      if (!signal.candidate) return;
      try {
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(signal.candidate);
        } else {
          pendingIceCandidatesRef.current.push(signal.candidate);
        }
      } catch (e) {
        console.warn('[call] ice error', e?.message || e);
      }
      return;
    }

    if (signal.kind === 'upgrade_request') {
      if (callModeRef.current === 'audio') setUpgradePrompt(true);
      return;
    }

    if (signal.kind === 'upgrade_offer') {
      try {
        const conn = pc || ensurePc();
        await conn.setRemoteDescription(signal.sdp);
        await flushIceQueue(conn);
        try {
          const vStream = await getLocalMedia(true);
          const vTrack = vStream.getVideoTracks()[0];
          if (vTrack) {
            const existing = conn.getSenders().find((s) => s.track && s.track.kind === 'video');
            if (existing) await existing.replaceTrack(vTrack);
            else conn.addTrack(vTrack, vStream);
            if (localStreamRef.current) {
              localStreamRef.current.getVideoTracks().forEach((tr) => {
                try { tr.stop(); localStreamRef.current.removeTrack(tr); } catch {}
              });
              vStream.getTracks().forEach((tr) => {
                if (tr.kind === 'video') localStreamRef.current.addTrack(tr);
              });
            } else {
              localStreamRef.current = vStream;
            }
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current;
              localVideoRef.current.muted = true;
              localVideoRef.current.play?.().catch(() => {});
            }
          }
        } catch (mediaErr) {
          console.error('[call] upgrade media', mediaErr);
          setError(mediaErr?.message || 'Camera permission was denied.');
          await sendSignal({ kind: 'upgrade_decline' });
          return;
        }
        const answer = await conn.createAnswer();
        await conn.setLocalDescription(answer);
        await sendSignal({ kind: 'upgrade_answer', sdp: conn.localDescription || answer });
        setCallMode('video');
        setUpgradePrompt(false);
        setCamOff(false);
      } catch (e) {
        console.error('[call] upgrade_offer', e);
      }
      return;
    }

    if (signal.kind === 'upgrade_answer') {
      if (!pc) return;
      try {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(signal.sdp);
          await flushIceQueue(pc);
        }
        setCallMode('video');
        setCamOff(false);
      } catch (e) {
        console.error('[call] upgrade_answer', e);
      }
      return;
    }

    if (signal.kind === 'upgrade_decline') {
      setUpgradePrompt(false);
      setError('They declined video');
      setTimeout(() => setError(null), 2500);
      return;
    }

    if (signal.kind === 'downgrade_audio') {
      try {
        const senders = pc?.getSenders?.() || [];
        for (const s of senders) {
          if (s.track && s.track.kind === 'video') {
            try { s.track.stop(); } catch {}
            try { await s.replaceTrack(null); } catch {}
          }
        }
        localStreamRef.current?.getVideoTracks?.()?.forEach((tr) => {
          try {
            tr.stop();
            localStreamRef.current.removeTrack(tr);
          } catch {}
        });
        if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
        setCallMode('audio');
        setCamOff(true);
      } catch (e) {
        console.error('[call] downgrade', e);
      }
    }
  };

  const requestVideoUpgrade = async () => {
    if (callMode !== 'audio' || !pcRef.current) return;
    await sendSignal({ kind: 'upgrade_request' });
  };

  const acceptVideoUpgrade = async () => {
    setUpgradePrompt(false);
    try {
      const pc = ensurePc();
      const vStream = await getLocalMedia(true);
      const vTrack = vStream.getVideoTracks()[0];
      if (!vTrack) throw new Error('Camera permission was denied.');
      const existing = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (existing) await existing.replaceTrack(vTrack);
      else pc.addTrack(vTrack, vStream);
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((tr) => {
          try { tr.stop(); localStreamRef.current.removeTrack(tr); } catch {}
        });
        vStream.getVideoTracks().forEach((tr) => localStreamRef.current.addTrack(tr));
      } else {
        localStreamRef.current = vStream;
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.muted = true;
        localVideoRef.current.play?.().catch(() => {});
      }
      makingOfferRef.current = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal({ kind: 'upgrade_offer', sdp: pc.localDescription || offer });
      setCallMode('video');
      setCamOff(false);
    } catch (e) {
      console.error('[call] acceptVideoUpgrade', e);
      setError(e?.message || 'Could not enable camera');
      await sendSignal({ kind: 'upgrade_decline' });
    } finally {
      makingOfferRef.current = false;
    }
  };

  const declineVideoUpgrade = async () => {
    setUpgradePrompt(false);
    await sendSignal({ kind: 'upgrade_decline' });
  };

  const switchToAudio = async () => {
    try {
      const senders = pcRef.current?.getSenders?.() || [];
      for (const s of senders) {
        if (s.track && s.track.kind === 'video') {
          try { s.track.stop(); } catch {}
          try { await s.replaceTrack(null); } catch {}
        }
      }
      localStreamRef.current?.getVideoTracks?.()?.forEach((tr) => {
        try {
          tr.stop();
          localStreamRef.current.removeTrack(tr);
        } catch {}
      });
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
      setCallMode('audio');
      setCamOff(true);
      await sendSignal({ kind: 'downgrade_audio' });
    } catch (e) {
      console.error('[call] switchToAudio', e);
    }
  };

  const switchCamera = async () => {
    if (callMode !== 'video' || switchingCam) return;
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setSwitchingCam(true);
    try {
      // Stop the current camera track FIRST. On many Android/Chrome devices,
      // requesting a second camera stream while the first is still live
      // either fails outright or silently hands back the same camera again
      // (the hardware can't be opened twice). Releasing it first is what
      // actually lets facingMode select the other physical camera.
      const oldVideoTracks = localStreamRef.current ? localStreamRef.current.getVideoTracks() : [];
      const oldAudioTracks = localStreamRef.current ? localStreamRef.current.getAudioTracks() : [];
      oldVideoTracks.forEach((tr) => { try { tr.stop(); } catch {} });

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { exact: nextFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      }).catch(async (exactErr) => {
        // Some devices reject `exact` if that physical camera genuinely
        // isn't available — fall back to `ideal` so at least something works.
        console.warn('[call] exact facingMode failed, retrying with ideal', exactErr?.name);
        return navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: nextFacing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      });

      const newTrack = stream.getVideoTracks()[0];
      if (!newTrack) throw new Error('No camera track returned');

      // Confirm we actually got a different physical camera, not the same one again
      const newSettings = newTrack.getSettings?.() || {};
      console.log('[call] switchCamera result', { requested: nextFacing, actualFacingMode: newSettings.facingMode, deviceId: newSettings.deviceId });

      const sender = pcRef.current?.getSenders?.()?.find((s) => s.track && s.track.kind === 'video');
      if (sender) {
        await sender.replaceTrack(newTrack);
      } else {
        console.warn('[call] no active video sender yet — camera will be correct once the call connects');
      }

      // Build a genuinely NEW MediaStream object (reusing the same stream
      // reference and just mutating its tracks doesn't reliably force the
      // <video> element to repaint in all browsers — a fresh stream does).
      const freshStream = new MediaStream();
      freshStream.addTrack(newTrack);
      oldAudioTracks.forEach((tr) => {
        if (tr.readyState === 'live') freshStream.addTrack(tr);
      });
      localStreamRef.current = freshStream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = freshStream;
        localVideoRef.current.muted = true;
        await localVideoRef.current.play?.().catch(() => {});
      }
      setFacingMode(nextFacing);
      setCamOff(false);
    } catch (e) {
      console.error('[call] switchCamera failed', e?.name, e?.message);
      setError(e?.name === 'OverconstrainedError' ? 'This device only has one camera.' : 'Unable to switch camera.');
      setTimeout(() => setError(null), 2500);
    }
    setSwitchingCam(false);
  };

  const onPickFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    setShowAttach(false);
    for (const file of files) {
      await sendFile(file);
    }
  };

  const sendFile = async (file) => {
    if (!peerId || !file) return;
    setSending(true);
    try {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      if (typeof dataUrl === 'string' && dataUrl.length > 4_500_000) {
        setError('File too large — try a smaller one');
        setSending(false);
        return;
      }
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserId: peerId,
          text: isVideo ? 'Video' : isImage ? 'Photo' : file.name || 'File',
          msg_type: isVideo ? 'video' : isImage ? 'image' : 'file',
          media_url: dataUrl,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Upload failed');
      if (d.message) setMessages((prev) => [...prev, d.message]);
      else load();
      playChatSound(CHAT_THEMES.classic);
      scrollBottom();
    } catch (err) {
      setError(err.message || 'Could not send file');
    }
    setSending(false);
  };

  // keep refs in sync for signal handlers (avoid stale closures)
  useEffect(() => { callModeRef.current = callMode; }, [callMode]);
  useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);

  // call timer
  useEffect(() => {
    if (!callMode && callStatus !== 'incoming') {
      setCallSecs(0);
      return;
    }
    const id = setInterval(() => setCallSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [callMode, callStatus]);

  // soft dial tone while ringing (caller only)
  useEffect(() => {
    const shouldRing = callStatus === 'ringing' && isCallerRef.current;
    if (!shouldRing) {
      try { dialToneRef.current?.stop?.(); } catch {}
      dialToneRef.current = null;
      return;
    }
    let ctx;
    let osc1;
    let osc2;
    let interval;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playBurst = () => {
        try {
          osc1 = ctx.createOscillator();
          osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          osc1.frequency.value = 440;
          osc2.frequency.value = 480;
          osc1.type = 'sine';
          osc2.type = 'sine';
          gain.gain.value = 0.06;
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);
          osc1.start();
          osc2.start();
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
          setTimeout(() => {
            try { osc1.stop(); osc2.stop(); } catch {}
          }, 1250);
        } catch {}
      };
      playBurst();
      interval = setInterval(playBurst, 2800);
      dialToneRef.current = {
        stop: () => {
          clearInterval(interval);
          try { osc1?.stop(); osc2?.stop(); ctx?.close(); } catch {}
        },
      };
    } catch {}
    return () => {
      clearInterval(interval);
      try { osc1?.stop(); osc2?.stop(); ctx?.close(); } catch {}
      dialToneRef.current = null;
    };
  }, [callStatus]);

  // speech glow — analyse remote audio level during audio calls
  useEffect(() => {
    if (callMode !== 'audio' || callStatus !== 'connected') {
      setRemoteSpeaking(false);
      return;
    }
    const stream = remoteStreamRef.current;
    if (!stream) return;
    let audioCtx;
    let raf;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length;
        setRemoteSpeaking(avg > 22);
        raf = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      console.error('speech detect', e);
    }
    return () => {
      if (raf) cancelAnimationFrame(raf);
      try { audioCtx?.close(); } catch {}
    };
  }, [callMode, callStatus, remoteStreamTick]);

  // auto-hide controls on video after idle
  useEffect(() => {
    if (callMode !== 'video' || !controlsVisible) return;
    if (callStatus !== 'connected') return;
    const id = setTimeout(() => setControlsVisible(false), 4200);
    return () => clearTimeout(id);
  }, [callMode, callStatus, controlsVisible, micMuted, camOff, speakerOn]);

  // poll signals — faster during active call, moderate otherwise
  useEffect(() => {
    if (!peerId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/messages?with=${peerId}`);
        const d = await res.json();
        const list = d.messages || [];
        if (!cancelled) {
          const visible = [];
          // A signal is "resolved" if a later call_signal exists for the same
          // call session — if any later row is an 'end', 'answer', or 'reject',
          // the call already concluded and must never be replayed as fresh.
          const callSignalRows = list.filter((m) => m.msg_type === 'call_signal');
          const resolvedIds = new Set();
          for (let idx = 0; idx < callSignalRows.length; idx++) {
            const row = callSignalRows[idx];
            try {
              const payload = JSON.parse(row.text || '{}');
              if (payload.kind === 'offer') {
                // look ahead for any later signal (end/answer/reject) — if found, this offer is stale
                const hasLaterResolution = callSignalRows.slice(idx + 1).some((later) => {
                  try {
                    const laterPayload = JSON.parse(later.text || '{}');
                    return ['end', 'answer', 'reject'].includes(laterPayload.kind);
                  } catch { return false; }
                });
                // also stale if the offer itself is older than ~45s (a live ring never sits unanswered that long before the UI catches it)
                const ageMs = row.created_at ? Date.now() - new Date(row.created_at).getTime() : 0;
                if (hasLaterResolution || ageMs > 45000) resolvedIds.add(row.id);
              }
            } catch {}
          }

          for (const m of list) {
            if (m.msg_type !== 'call_signal') {
              visible.push(m);
              continue;
            }
            if (!processedSignalsRef.current.has(m.id)) {
              processedSignalsRef.current.add(m.id);
              if (resolvedIds.has(m.id)) {
                // stale/already-resolved offer — mark processed but never act on it
              } else {
                try {
                  const payload = JSON.parse(m.text || '{}');
                  await handleSignal(payload, !!m.from_me);
                } catch (e) {
                  console.warn('[call] bad signal', e);
                }
              }
            }
            try {
              const payload = JSON.parse(m.text || '{}');
              if (payload.kind === 'offer') {
                visible.push({
                  ...m,
                  msg_type: 'system',
                  text: payload.callType === 'video' ? 'Video call started' : 'Audio call started',
                });
              } else if (payload.kind === 'end') {
                visible.push({
                  ...m,
                  msg_type: 'system',
                  text: 'Call ended',
                });
              }
            } catch {}
          }
          setMessages(visible);
          if (d.peer) setPeerInfo((p) => ({ ...p, ...d.peer }));
          setLoading(false);
        }
      } catch {}
    };
    tick();
    const active = !!callMode || callStatus === 'incoming' || callStatus === 'ringing' || callStatus === 'connecting';
    const interval = setInterval(tick, active ? 800 : 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerId, callMode, callStatus]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        if (pcRef.current) {
          sendSignal({ kind: 'end' });
        }
      } catch {}
      cleanupCall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const endingRef = useRef(false);
  const endCall = () => {
    // Guard against rapid repeated taps re-triggering cleanup/signal mid-flight
    if (endingRef.current) return;
    endingRef.current = true;
    // Tear down the call locally and instantly — the UI must never wait on
    // the network for this. The "end" signal to the peer fires in the
    // background and its outcome doesn't affect what the caller sees.
    cleanupCall();
    sendSignal({ kind: 'end' }).catch(() => {});
    setTimeout(() => { endingRef.current = false; }, 1000);
  };


  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 130,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(14px)',
          animation: 'fadeIn 0.2s ease',
        }}
      />
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 131,
          height: '92vh',
          maxHeight: 820,
          background: ambient(accent),
          borderRadius: '24px 24px 0 0',
          border: `1px solid ${T.hairline}`,
          borderBottom: 'none',
          display: 'flex',
          flexDirection: 'column',
          animation: 'sheetUp 0.32s cubic-bezier(0.22,1,0.36,1)',
          overflow: 'hidden',
        }}
      >
        <style>{`@keyframes sheetUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes pulseRec{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>

        {/* Header */}
        <div
          style={{
            padding: '12px 14px 12px',
            paddingTop: 'max(12px, env(safe-area-inset-top))',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ display: 'inline-flex', transform: 'rotate(90deg)' }}>
              <SvgIcon name="chevron" size={18} color="rgba(255,255,255,0.7)" />
            </span>
          </button>

          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                overflow: 'hidden',
                background: `${accent}33`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {peerInfo?.avatar_url ? (
                <img src={peerInfo.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontFamily: T.serif, letterSpacing: '-0.02em', fontWeight: 700, fontSize: 16, color: accent }}>
                  {(name || 'U')[0].toUpperCase()}
                </span>
              )}
            </div>
            <span
              style={{
                position: 'absolute',
                bottom: 1,
                right: 1,
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#22C55E',
                border: '2px solid #0B0B10',
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.95)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {name}
            </div>
          </div>

          <button
            type="button"
            onClick={() => startCall('audio')}
            aria-label="Start audio call"
            title="Audio call"
            disabled={!!callMode || callStatus === 'incoming'}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              cursor: callMode ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: callMode ? 0.4 : 1,
              transition: 'background 0.15s ease, opacity 0.15s ease',
            }}
          >
            <SvgIcon name="phone" size={18} color="rgba(255,255,255,0.88)" />
          </button>
          <button
            type="button"
            onClick={() => startCall('video')}
            aria-label="Start video call"
            title="Video call"
            disabled={!!callMode || callStatus === 'incoming'}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              cursor: callMode ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: callMode ? 0.4 : 1,
              transition: 'background 0.15s ease, opacity 0.15s ease',
            }}
          >
            <SvgIcon name="video" size={18} color="rgba(255,255,255,0.88)" />
          </button>
        </div>

        {/* Incoming call */}
        {callStatus === 'incoming' && incomingCall && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 200,
              background: ambient(accent),
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'max(48px, env(safe-area-inset-top)) 28px max(40px, env(safe-area-inset-bottom))',
              animation: 'fadeIn 0.35s ease',
            }}
          >
            <style>{`
              @keyframes callRipple{0%{transform:scale(1);opacity:0.45}100%{transform:scale(1.55);opacity:0}}
              @keyframes callPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
              @keyframes fadeIn{from{opacity:0}to{opacity:1}}
              @media (prefers-reduced-motion: reduce){
                .cine-call-ripple,.cine-call-pulse{animation:none!important}
              }
            `}</style>
            {/* soft ambient from accent */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(ellipse at 50% 28%, ${accent}33 0%, transparent 55%)`,
                pointerEvents: 'none',
              }}
            />
            <div style={{ textAlign: 'center', zIndex: 1, marginTop: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.4, textTransform: 'uppercase' }}>
                Incoming {incomingCall.type === 'video' ? 'video' : 'audio'} call
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, zIndex: 1 }}>
              <div style={{ position: 'relative', width: 148, height: 148 }}>
                <div className="cine-call-ripple" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1.5px solid ${accent}88`, animation: 'callRipple 2.2s ease-out infinite' }} />
                <div className="cine-call-ripple" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1.5px solid ${accent}55`, animation: 'callRipple 2.2s ease-out 0.7s infinite' }} />
                <div
                  className="cine-call-pulse"
                  style={{
                    width: 148,
                    height: 148,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: `${accent}28`,
                    border: `2px solid ${accent}66`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'callPulse 2.8s ease-in-out infinite',
                    boxShadow: `0 12px 48px ${accent}33`,
                  }}
                >
                  {peerInfo?.avatar_url ? (
                    <img src={peerInfo.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontFamily: T.serif, letterSpacing: '-0.02em', fontSize: 52, fontWeight: 700, color: accent }}>{(name || 'U')[0].toUpperCase()}</span>
                  )}
                </div>
              </div>
              <div style={{ fontFamily: T.serif, letterSpacing: '-0.02em', fontSize: 26, fontWeight: 700, color: '#fff', textAlign: 'center' }}>{name}</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
                {incomingCall.type === 'video' ? 'Video' : 'Audio'} · CineScroll
              </div>
            </div>

            <div style={{ display: 'flex', gap: 48, alignItems: 'center', zIndex: 1, marginBottom: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  aria-label="Decline call"
                  onClick={async () => {
                    await sendSignal({ kind: 'end' });
                    setIncomingCall(null);
                    setCallStatus('idle');
                  }}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    background: '#E50914',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 28px rgba(229,9,20,0.4)',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  <SvgIcon name="phoneEnd" size={26} color="#fff" />
                </button>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Decline</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  aria-label="Answer call"
                  onClick={() => acceptCall(incomingCall)}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    background: '#22C55E',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 28px rgba(34,197,94,0.4)',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  <SvgIcon name={incomingCall.type === 'video' ? 'video' : 'phone'} size={26} color="#fff" />
                </button>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Answer</span>
              </div>
            </div>
          </div>
        )}

        {/* Active call */}
        {callMode && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 200,
              background: callMode === 'audio' ? ambient(accent) : '#050508',
              animation: 'fadeIn 0.3s ease',
              overflow: 'hidden',
            }}
            onClick={() => {
              if (callMode === 'video') setControlsVisible(true);
            }}
          >
            <style>{`
              @keyframes callRipple{0%{transform:scale(1);opacity:0.4}100%{transform:scale(1.5);opacity:0}}
              @keyframes callPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
              @keyframes speakBar{0%{transform:scaleY(0.4)}100%{transform:scaleY(1)}}
              @keyframes fadeIn{from{opacity:0}to{opacity:1}}
              @media (prefers-reduced-motion: reduce){
                .cine-call-ripple,.cine-call-pulse{animation:none!important}
              }
            `}</style>

            {/* Top status — floats over the full-bleed background, never its own solid band */}
            <div
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0,
                padding: '14px 16px',
                paddingTop: 'max(16px, env(safe-area-inset-top))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 6,
                opacity: callMode === 'video' && !controlsVisible ? 0 : 1,
                transition: 'opacity 0.3s ease',
                pointerEvents: callMode === 'video' && !controlsVisible ? 'none' : 'auto',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)',
              }}
            >
              <button
                type="button"
                aria-label="Minimize call"
                onClick={(e) => { e.stopPropagation(); endCall(); }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ display: 'inline-flex', transform: 'rotate(90deg)' }}>
                  <SvgIcon name="chevron" size={16} color="#fff" />
                </span>
              </button>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: T.serif, letterSpacing: '-0.02em', fontSize: 17, fontWeight: 700, color: '#fff' }}>{name}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
                  {callStatus === 'connected'
                    ? formatCallTime(callSecs)
                    : callStatus === 'ringing'
                    ? 'Ringing…'
                    : callStatus === 'connecting'
                    ? 'Connecting…'
                    : 'Calling…'}
                  {error && callStatus === 'connected' ? ' · Reconnecting…' : ''}
                </div>
              </div>
              <div style={{ width: 36 }} />
            </div>

            {/* Stage — fills the entire call screen edge-to-edge; header/controls float above it */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
              {callMode === 'video' ? (
                <>
                  {/* Cinematic placeholder behind the video element, visible until remote video actually paints */}
                  {callStatus !== 'connected' && (
                    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                      {peerInfo?.avatar_url && (
                        <div style={{
                          position: 'absolute', inset: '-20px',
                          backgroundImage: `url(${peerInfo.avatar_url})`,
                          backgroundSize: 'cover', backgroundPosition: 'center',
                          filter: 'blur(36px) saturate(0.6)',
                          transform: 'scale(1.15)',
                          opacity: 0.4,
                        }}/>
                      )}
                      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 35%, rgba(6,6,11,0.25) 0%, rgba(6,6,11,0.9) 100%)' }}/>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', border: `3px solid ${accent}55`, boxShadow: `0 20px 60px rgba(0,0,0,0.5)` }}>
                          {peerInfo?.avatar_url
                            ? <img src={peerInfo.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                            : <div style={{ width: '100%', height: '100%', background: `${accent}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontFamily: T.serif, letterSpacing: '-0.02em', fontSize: 36, fontWeight: 700, color: accent }}>{(name||'U')[0].toUpperCase()}</span>
                              </div>
                          }
                        </div>
                      </div>
                    </div>
                  )}
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      background: 'transparent',
                    }}
                  />
                  {/* local PiP */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 'max(78px, calc(env(safe-area-inset-top) + 66px))',
                      right: 14,
                      width: 108,
                      height: 152,
                      borderRadius: 16,
                      overflow: 'hidden',
                      border: '1.5px solid rgba(255,255,255,0.2)',
                      boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
                      background: '#111',
                      zIndex: 4,
                      opacity: camOff ? 0.4 : 1,
                      transition: 'opacity 0.2s ease',
                    }}
                  >
                    {camOff ? (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a22' }}>
                        <SvgIcon name="videoOff" size={22} color="rgba(255,255,255,0.4)" />
                      </div>
                    ) : (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                        }}
                      />
                    )}
                    {switchingCam && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>Switching…</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                  {/* Full-screen blurred avatar background */}
                  {peerInfo?.avatar_url && (
                    <div style={{
                      position: 'absolute', inset: '-20px',
                      backgroundImage: `url(${peerInfo.avatar_url})`,
                      backgroundSize: 'cover', backgroundPosition: 'center',
                      filter: 'blur(32px) saturate(0.6)',
                      transform: 'scale(1.1)',
                      opacity: 0.35,
                    }}/>
                  )}
                  {/* Dark vignette */}
                  <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 30%, rgba(6,6,11,0.2) 0%, rgba(6,6,11,0.85) 100%)' }}/>
                  {/* Accent glow */}
                  <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 40%, ${accent}22 0%, transparent 65%)` }}/>

                  {/* Content */}
                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 0 }}>
                    {/* Speaking ripple rings */}
                    <div style={{ position: 'relative', marginBottom: 28 }}>
                      {remoteSpeaking && (<>
                        <div className="cine-call-ripple" style={{ position: 'absolute', inset: -22, borderRadius: '50%', border: `1.5px solid ${accent}55`, animation: 'callRipple 2s ease-out infinite' }}/>
                        <div className="cine-call-ripple" style={{ position: 'absolute', inset: -14, borderRadius: '50%', border: `1.5px solid ${accent}77`, animation: 'callRipple 2s ease-out 0.6s infinite' }}/>
                        <div className="cine-call-ripple" style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: `2px solid ${accent}99`, animation: 'callRipple 2s ease-out 1.2s infinite' }}/>
                      </>)}
                      {/* Avatar */}
                      <div style={{
                        width: 136, height: 136, borderRadius: '50%', overflow: 'hidden',
                        border: `3px solid ${remoteSpeaking ? accent : 'rgba(255,255,255,0.15)'}`,
                        boxShadow: remoteSpeaking ? `0 0 60px ${accent}55, 0 20px 60px rgba(0,0,0,0.6)` : '0 20px 60px rgba(0,0,0,0.5)',
                        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                        flexShrink: 0,
                      }}>
                        {peerInfo?.avatar_url
                          ? <img src={peerInfo.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                          : <div style={{ width: '100%', height: '100%', background: `${accent}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontFamily: T.serif, letterSpacing: '-0.02em', fontSize: 48, fontWeight: 700, color: accent }}>{(name||'U')[0].toUpperCase()}</span>
                            </div>
                        }
                      </div>
                    </div>

                    {/* Name */}
                    <div style={{ fontFamily: T.serif, letterSpacing: '-0.02em', fontSize: 30, fontWeight: 700, color: '#fff', letterSpacing: -0.5, marginBottom: 8, textAlign: 'center', textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}>
                      {name}
                    </div>

                    {/* Status */}
                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: 500, letterSpacing: 0.3, textAlign: 'center' }}>
                      {callStatus === 'connected'
                        ? formatCallTime(callSecs)
                        : callStatus === 'ringing' ? 'Ringing…'
                        : callStatus === 'connecting' ? 'Connecting…'
                        : 'Calling…'}
                    </div>

                    {/* Speaking indicator */}
                    {remoteSpeaking && callStatus === 'connected' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 12, background: `${accent}18`, border: `1px solid ${accent}40`, borderRadius: 20, padding: '5px 12px' }}>
                        {[3,5,4,6,3].map((h,i) => (
                          <div key={i} style={{ width: 3, height: h * 2, borderRadius: 2, background: accent, animation: `speakBar 0.6s ease ${i*0.1}s infinite alternate` }}/>
                        ))}
                        <span style={{ fontSize: 11, color: accent, fontWeight: 600, marginLeft: 4 }}>Speaking</span>
                      </div>
                    )}

                    {micMuted && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: '5px 12px' }}>
                        <SvgIcon name="micOff" size={13} color="rgba(255,255,255,0.5)"/>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>You are muted</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Upgrade prompt */}
            {upgradePrompt && (
              <div
                style={{
                  position: 'absolute',
                  left: 16,
                  right: 16,
                  bottom: 130,
                  zIndex: 12,
                  background: 'rgba(15,15,24,0.96)',
                  border: `1px solid ${T.hairlineStrong}`,
                  borderRadius: 18,
                  padding: '16px 18px',
                  textAlign: 'center',
                  backdropFilter: 'blur(12px)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ fontSize: 14, color: '#fff', fontWeight: 600, marginBottom: 6 }}>Switch to video?</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 14 }}>
                  {name} wants to turn on the camera
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={declineVideoUpgrade}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: 14,
                      border: `1px solid ${T.hairline}`,
                      background: 'rgba(255,255,255,0.05)',
                      color: 'rgba(255,255,255,0.7)',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Not now
                  </button>
                  <button
                    type="button"
                    onClick={acceptVideoUpgrade}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: 14,
                      border: 'none',
                      background: accent,
                      color: '#0A0A0F',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Switch
                  </button>
                </div>
              </div>
            )}

            {/* Controls — floats over the full-bleed background, never its own solid band */}
            <div
              style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
                padding: '20px 28px max(32px, env(safe-area-inset-bottom))',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 14,
                zIndex: 6,
                opacity: callMode === 'video' && !controlsVisible ? 0 : 1,
                transform: callMode === 'video' && !controlsVisible ? 'translateY(12px)' : 'translateY(0)',
                transition: 'opacity 0.3s ease, transform 0.3s ease',
                pointerEvents: callMode === 'video' && !controlsVisible ? 'none' : 'auto',
                background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mic mute */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  aria-label={micMuted ? 'Unmute' : 'Mute'}
                  onClick={() => {
                    setMicMuted((v) => {
                      const next = !v;
                      const track = localStreamRef.current?.getAudioTracks()?.[0];
                      if (track) track.enabled = !next;
                      return next;
                    });
                  }}
                  style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: micMuted ? '#fff' : 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(12px)',
                    border: `1px solid ${micMuted ? 'transparent' : 'rgba(255,255,255,0.2)'}`,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <SvgIcon name={micMuted ? 'micOff' : 'mic'} size={22} color={micMuted ? '#0A0A0F' : '#fff'} />
                </button>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{micMuted ? 'Unmute' : 'Mute'}</span>
              </div>

              {/* Camera / Switch to video */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  aria-label={callMode === 'audio' ? 'Switch to video' : camOff ? 'Camera on' : 'Camera off'}
                  onClick={async () => {
                    if (callMode === 'audio') {
                      requestVideoUpgrade();
                      return;
                    }
                    if (camOff) {
                      // Re-enabling: don't trust the old (possibly suspended/dead)
                      // track — request a fresh camera stream and replace it on
                      // the active peer connection sender. The local preview
                      // <video> element doesn't exist yet (it only mounts once
                      // camOff flips to false), so attaching the stream to it
                      // is handled by the effect above once React mounts it —
                      // doing it here would silently fail against a null ref.
                      try {
                        const oldTrack = localStreamRef.current?.getVideoTracks()?.[0];
                        if (oldTrack) { try { oldTrack.stop(); } catch {} }
                        const stream = await navigator.mediaDevices.getUserMedia({
                          audio: false,
                          video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
                        });
                        const newTrack = stream.getVideoTracks()[0];
                        if (!newTrack) throw new Error('No camera track');
                        const sender = pcRef.current?.getSenders?.()?.find((s) => s.track && s.track.kind === 'video');
                        if (sender) await sender.replaceTrack(newTrack);
                        const oldAudioTracks = localStreamRef.current ? localStreamRef.current.getAudioTracks() : [];
                        const freshStream = new MediaStream();
                        freshStream.addTrack(newTrack);
                        oldAudioTracks.forEach((tr) => { if (tr.readyState === 'live') freshStream.addTrack(tr); });
                        localStreamRef.current = freshStream;
                        setCamOff(false);
                      } catch (e) {
                        console.error('[call] camera re-enable failed', e?.name, e?.message);
                        setError('Unable to turn camera back on.');
                        setTimeout(() => setError(null), 2500);
                      }
                    } else {
                      // Turning off: stop the track outright rather than just
                      // disabling it, so the browser fully releases the camera
                      // (and won't silently suspend/kill it in the background).
                      const track = localStreamRef.current?.getVideoTracks()?.[0];
                      if (track) { try { track.stop(); } catch {} }
                      setCamOff(true);
                    }
                  }}
                  style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: (callMode === 'video' && camOff) ? '#fff' : 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(12px)',
                    border: `1px solid ${(callMode === 'video' && camOff) ? 'transparent' : 'rgba(255,255,255,0.2)'}`,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <SvgIcon name={(callMode === 'video' && camOff) ? 'videoOff' : 'video'} size={22} color={(callMode === 'video' && camOff) ? '#0A0A0F' : '#fff'} />
                </button>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                  {callMode === 'audio' ? 'Camera' : camOff ? 'Camera' : 'Camera'}
                </span>
              </div>

              {/* Flip camera (video only) / Speaker (audio only) */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                {callMode === 'video' ? (
                  <>
                    <button
                      type="button"
                      aria-label="Flip camera"
                      disabled={switchingCam || camOff}
                      onClick={switchCamera}
                      style={{
                        width: 56, height: 56, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.15)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        cursor: switchingCam || camOff ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: camOff ? 0.35 : 1,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <SvgIcon name="flipCam" size={22} color="#fff" />
                    </button>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Flip</span>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      aria-label={speakerOn ? 'Speaker off' : 'Speaker on'}
                      onClick={() => {
                        setSpeakerOn((v) => {
                          const next = !v;
                          try {
                            if (remoteVideoRef.current) remoteVideoRef.current.muted = !next;
                            if (remoteAudioRef.current) remoteAudioRef.current.muted = !next;
                          } catch {}
                          return next;
                        });
                      }}
                      style={{
                        width: 56, height: 56, borderRadius: '50%',
                        background: speakerOn ? '#fff' : 'rgba(255,255,255,0.15)',
                        backdropFilter: 'blur(12px)',
                        border: `1px solid ${speakerOn ? 'transparent' : 'rgba(255,255,255,0.2)'}`,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <SvgIcon name={speakerOn ? 'speaker' : 'speakerOff'} size={22} color={speakerOn ? '#0A0A0F' : '#fff'} />
                    </button>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Speaker</span>
                  </>
                )}
              </div>

              {/* End call */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  aria-label="End call"
                  onClick={endCall}
                  style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: '#E50914',
                    border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 6px 24px rgba(229,9,20,0.5)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <SvgIcon name="phoneEnd" size={22} color="#fff" />
                </button>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>End</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding: '8px 16px', background: 'rgba(255,80,80,0.1)', borderBottom: '1px solid rgba(255,80,80,0.15)', flexShrink: 0 }}>
            <div style={{ fontSize: 12, color: '#FF8A8A' }}>{error}</div>
          </div>
        )}

        {/* Messages */}
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '16px 14px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Loading…</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
              Say hello — start the conversation
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 8px' }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>Today</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
              </div>
              {messages.map((m) => {
                if (m.msg_type === 'system') {
                  return (
                    <div key={m.id} style={{ alignSelf: 'center', padding: '6px 0' }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '5px 12px' }}>
                        {m.text}
                      </span>
                    </div>
                  );
                }
                const isSticker = m.msg_type === 'sticker' || (m.text && [...m.text].length <= 3 && !/[a-zA-Z0-9]/.test(m.text || ''));
                const isVoice = m.msg_type === 'voice' || (!!m.media_url && (m.text === 'Voice note' || m.msg_type === 'voice'));
                const isGif = m.msg_type === 'gif' || (m.media_url && (m.text === 'GIF' || m.msg_type === 'gif'));
                const mine = !!m.from_me;
                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      flexDirection: mine ? 'row-reverse' : 'row',
                      alignItems: 'flex-end',
                      gap: 8,
                      alignSelf: mine ? 'flex-end' : 'flex-start',
                      maxWidth: '88%',
                    }}
                  >
                    {!mine && (
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          overflow: 'hidden',
                          background: `${accent}33`,
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {peerInfo?.avatar_url ? (
                          <img src={peerInfo.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 700, color: accent }}>{(name || 'U')[0].toUpperCase()}</span>
                        )}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', gap: 4 }}>
                      {isVoice && m.media_url ? (
                        <div
                          style={{
                            background: mine ? `${accent}33` : themBubble,
                            borderRadius: 18,
                            padding: '10px 12px',
                            minWidth: 180,
                            border: mine ? `1px solid ${accent}44` : '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          <audio controls src={m.media_url} style={{ width: '100%', height: 32, outline: 'none' }} />
                        </div>
                      ) : isGif && m.media_url ? (
                        <div style={{ borderRadius: 14, overflow: 'hidden', maxWidth: 200, border: '1px solid rgba(255,255,255,0.06)' }}>
                          <img src={m.media_url} alt="GIF" style={{ width: '100%', display: 'block' }} />
                        </div>
                      ) : (m.msg_type === 'image' || m.msg_type === 'photo') && m.media_url ? (
                        <div style={{ borderRadius: 14, overflow: 'hidden', maxWidth: 220, border: '1px solid rgba(255,255,255,0.06)' }}>
                          <img src={m.media_url} alt="Photo" style={{ width: '100%', display: 'block' }} />
                        </div>
                      ) : m.msg_type === 'video' && m.media_url ? (
                        <div style={{ borderRadius: 14, overflow: 'hidden', maxWidth: 240, border: '1px solid rgba(255,255,255,0.06)' }}>
                          <video src={m.media_url} controls playsInline style={{ width: '100%', display: 'block', background: '#000' }} />
                        </div>
                      ) : isSticker ? (
                        <div style={{ fontSize: 40, lineHeight: 1.1, padding: '2px' }}>{m.text}</div>
                      ) : (
                        <div
                          style={{
                            background: mine ? accent : themBubble,
                            color: mine ? '#0A0A0F' : 'rgba(255,255,255,0.92)',
                            borderRadius: 18,
                            borderBottomRightRadius: mine ? 6 : 18,
                            borderBottomLeftRadius: mine ? 18 : 6,
                            padding: '10px 14px',
                            fontSize: 14,
                            lineHeight: 1.45,
                            fontWeight: 500,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {m.text}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: 10.5,
                          color: 'rgba(255,255,255,0.3)',
                          padding: '0 4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        {mine && (
                          <span style={{ color: m.read ? accent : 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: -1 }}>
                            {m.read || m.delivered !== false ? '✓✓' : '✓'}
                          </span>
                        )}
                        <span style={{ color: mine && m.read ? accent : 'rgba(255,255,255,0.3)' }}>
                          {statusLabel(m)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Stickers / GIFs panel */}
        {showStickers && (
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(5,5,8,0.55)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              padding: '10px 12px 12px',
              flexShrink: 0,
              maxHeight: 240,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {[
                { id: 'stickers', label: 'Stickers' },
                { id: 'gifs', label: 'GIFs' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMediaTab(tab.id)}
                  style={{
                    background: mediaTab === tab.id ? '#FFFFFF' : 'rgba(255,255,255,0.05)',
                    border: mediaTab === tab.id ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 16,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: mediaTab === tab.id ? '#0A0A0F' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {tab.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowStickers(false)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 18 }}
              >
                ×
              </button>
            </div>
            {mediaTab === 'stickers' ? (
              <>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, overflowX: 'auto' }}>
                  {Object.keys(STICKER_PACKS).map((pack) => (
                    <button
                      key={pack}
                      type="button"
                      onClick={() => setStickerPack(pack)}
                      style={{
                        background: stickerPack === pack ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 12,
                        padding: '5px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                        color: stickerPack === pack ? '#fff' : 'rgba(255,255,255,0.45)',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {pack}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, overflowY: 'auto' }}>
                  {STICKERS.map((s) => (
                    <button
                      key={`${stickerPack}-${s}`}
                      type="button"
                      onClick={() => sendSticker(s)}
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 10,
                        padding: '8px 0',
                        fontSize: 24,
                        cursor: 'pointer',
                        lineHeight: 1,
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <form
                  onSubmit={(e) => { e.preventDefault(); loadGifs(gifQuery); }}
                  style={{ display: 'flex', gap: 8, marginBottom: 8 }}
                >
                  <input
                    value={gifQuery}
                    onChange={(e) => setGifQuery(e.target.value)}
                    placeholder="Search GIFs…"
                    style={{
                      flex: 1,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 16,
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: 13,
                      fontFamily: 'inherit',
                      outline: 'none',
                    }}
                  />
                  <button type="submit" style={{ background: accent, border: 'none', borderRadius: 16, padding: '0 12px', color: '#0A0A0F', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Go
                  </button>
                </form>
                {gifsLoading ? (
                  <div style={{ textAlign: 'center', padding: 16, color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>Loading…</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, overflowY: 'auto', maxHeight: 150 }}>
                    {gifs.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => sendGif(g)}
                        style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 0, overflow: 'hidden', cursor: 'pointer', aspectRatio: '1' }}
                      >
                        <img src={g.preview || g.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Composer */}
        {recording ? (
          <div
            style={{
              padding: '12px 14px',
              paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexShrink: 0,
              background: 'rgba(5,5,8,0.55)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF4D4D', animation: 'pulseRec 1s ease infinite' }} />
            <div style={{ flex: 1, fontSize: 13, color: '#fff', fontWeight: 600 }}>
              Recording… 0:{String(recordSecs).padStart(2, '0')}
            </div>
            <button type="button" onClick={cancelRecording} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '8px 12px', color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
            <button type="button" onClick={stopRecording} style={{ background: accent, border: 'none', borderRadius: 16, padding: '8px 14px', color: '#0A0A0F', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Send
            </button>
          </div>
        ) : (
          <div
            style={{
              padding: '10px 12px',
              paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              flexShrink: 0,
              background: 'rgba(5,5,8,0.55)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            {/* Attachment sheet — WhatsApp-style: Photo, Video, Document, Camera */}
            {showAttach && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 10,
                  padding: '8px 4px 4px',
                }}
              >
                {[
                  { id: 'photo', label: 'Photo', accept: 'image/*', icon: '📷' },
                  { id: 'video', label: 'Video', accept: 'video/*', icon: '🎬' },
                  { id: 'doc', label: 'Document', accept: '*/*', icon: '📄' },
                  { id: 'camera', label: 'Camera', accept: 'image/*', capture: 'environment', icon: '📸' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      const input = fileInputRef.current;
                      if (!input) return;
                      input.accept = item.accept;
                      if (item.capture) input.setAttribute('capture', item.capture);
                      else input.removeAttribute('capture');
                      input.click();
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 16,
                      padding: '14px 6px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      fontFamily: 'inherit',
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{item.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={onPickFiles}
            />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setShowStickers(false);
                  setShowAttach((v) => !v);
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: showAttach ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <SvgIcon name="plus" size={18} color="rgba(255,255,255,0.85)" />
              </button>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'rgba(255,255,255,0.07)',
                  borderRadius: 24,
                  padding: '4px 6px 4px 14px',
                  minHeight: 44,
                }}
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Type a message…"
                  maxLength={1000}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.92)',
                    fontSize: 15,
                    fontFamily: 'inherit',
                    outline: 'none',
                    padding: '8px 0',
                  }}
                />
                {input.trim() ? (
                  <button
                    type="button"
                    onClick={send}
                    disabled={sending}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: accent,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      opacity: sending ? 0.7 : 1,
                    }}
                  >
                    <SvgIcon name="send" size={15} color="#0A0A0F" />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttach(false);
                        setShowStickers((v) => !v);
                        setMediaTab('stickers');
                      }}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: 20,
                        lineHeight: 1,
                      }}
                      title="Emoji & stickers"
                    >
                      🙂
                    </button>
                    <button
                      type="button"
                      onClick={startRecording}
                      onContextMenu={(e) => e.preventDefault()}
                      disabled={sending}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <SvgIcon name="mic" size={18} color="rgba(255,255,255,0.5)" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}


function NotificationsPanel({onClose,accent,notifications,loading,onMarkRead,onFollowBack,onOpenChat}){
  const timeAgo=(ts)=>{const diff=Date.now()-new Date(ts).getTime();const mins=Math.floor(diff/60000);if(mins<1)return'now';if(mins<60)return`${mins}m`;const hrs=Math.floor(mins/60);if(hrs<24)return`${hrs}h`;return`${Math.floor(hrs/24)}d`;};
  const notifIcon=(type)=>{
    if(type==='follow')return{icon:'userPlus',color:'#7BC8FF'};
    if(type==='follow_request')return{icon:'userPlus',color:accent};
    if(type==='like')return{icon:'heart',color:'#FF6B8A'};
    if(type==='message_request'||type==='message')return{icon:'chat',color:'#7BC8FF'};
    if(type==='release_reminder')return{icon:'calendar',color:'#FFD166'};
    return{icon:'bell',color:accent};
  };
  return(
    <>
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:105,background:'rgba(0,0,0,0.65)',backdropFilter:'blur(10px)',animation:'fadeIn 0.2s ease'}}/>
    <div style={{position:'fixed',top:0,left:0,right:0,zIndex:106,background:ambient(accent),borderRadius:'0 0 24px 24px',border:`1px solid ${T.hairline}`,borderTop:'none',maxHeight:'70vh',display:'flex',flexDirection:'column',animation:'notifDrop 0.32s cubic-bezier(0.22,1,0.36,1)',paddingTop:'env(safe-area-inset-top,0px)'}}>
      <style>{`@keyframes notifDrop{from{transform:translateY(-100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{padding:'18px 18px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:`1px solid ${T.hairline}`,flexShrink:0}}>
        <span style={{fontFamily:T.serif,fontSize:21,letterSpacing:'-0.02em',fontWeight:700,color:T.text}}>Notifications</span>
        <button onClick={onClose} style={{background:'transparent',border:'none',width:28,height:28,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="close" size={13} color={T.text2}/></button>
      </div>
      <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',scrollbarWidth:'none'}}>
        {loading?(
          <div style={{display:'flex',justifyContent:'center',padding:36}}><div style={{width:22,height:22,border:`2px solid rgba(255,255,255,0.1)`,borderTop:`2px solid ${accent}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/></div>
        ):notifications.length===0?(
          <div style={{textAlign:'center',padding:'40px 24px',display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
            <SvgIcon name="inbox" size={28} color={T.hairlineStrong}/>
            <div style={{fontSize:13.5,color:T.text2,fontWeight:600}}>No notifications yet</div>
            <div style={{fontSize:11.5,color:T.text3}}>New followers and activity will show up here</div>
          </div>
        ):(
          <div style={{padding:'4px 18px 16px'}}>
            {notifications.map((n,i)=>{
              const ni=notifIcon(n.type);
              return(
                <div key={n.id||i} onClick={()=>{if(!n.read)onMarkRead(n.id);if((n.type==='message_request'||n.type==='message')&&onOpenChat){onOpenChat({user_id:n.user_id,username:n.username,avatar_url:n.avatar_url});onClose();}}} style={{display:'flex',gap:12,alignItems:'center',padding:'12px 0',borderBottom:i<notifications.length-1?`1px solid ${T.hairline}`:'none',cursor:n.read?'default':'pointer',opacity:n.read?0.5:1,transition:'opacity 0.2s ease'}}>
                  <div style={{width:38,height:38,borderRadius:'50%',background:`${ni.color}16`,border:`1px solid ${ni.color}38`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,position:'relative',overflow:'hidden'}}>
                    {n.type==='release_reminder'&&n.data?.poster?<img src={n.data.poster} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:n.avatar_url&&n.type!=='release_reminder'?<img src={n.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<SvgIcon name={ni.icon} size={16} color={ni.color}/>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    {n.type==='release_reminder'?(
                    <div style={{fontSize:13,color:T.text,lineHeight:1.4}}>
                      <span style={{fontFamily:T.serif,letterSpacing:'-0.02em',fontWeight:700}}>{n.data?.title||'A film you saved'}</span>{' '}
                      {n.data?.when==='tomorrow'?'releases tomorrow':'is out today'}
                    </div>
                    ):(
                    <div style={{fontSize:13,color:T.text,lineHeight:1.4}}>
                      <span style={{fontWeight:700}}>@{n.username||'someone'}</span>{' '}
                      {n.type==='follow'?'started following you':n.type==='follow_request'?'requested to follow you':n.type==='message_request'?'sent you a message request':n.type==='message'?'sent you a message':n.type==='like'?'liked your review':'sent a notification'}
                    </div>
                    )}
                    <div style={{fontSize:11,color:T.text3,marginTop:2}}>{timeAgo(n.created_at)} ago</div>
                  </div>
                  {n.type==='follow'&&!n.followedBack&&(
                    <button onClick={(e)=>{e.stopPropagation();onFollowBack(n);}} style={{background:accent,border:'none',borderRadius:18,padding:'6px 14px',cursor:'pointer',fontSize:11,fontWeight:700,color:'#07070F',fontFamily:'inherit',flexShrink:0}}>Follow back</button>
                  )}
                  {(n.type==='message_request'||n.type==='message')&&onOpenChat&&(
                    <button onClick={(e)=>{e.stopPropagation();onOpenChat({user_id:n.user_id,username:n.username,avatar_url:n.avatar_url});onClose();}} style={{background:`${accent}18`,border:`1px solid ${accent}44`,borderRadius:18,padding:'6px 14px',cursor:'pointer',fontSize:11,fontWeight:700,color:accent,fontFamily:'inherit',flexShrink:0}}>Reply</button>
                  )}
                  {!n.read&&<div style={{width:6,height:6,borderRadius:'50%',background:accent,flexShrink:0}}/>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </>
  );
}

// ─── FRIENDS SCREEN ───────────────────────────────────────────────────────────
export function FriendsScreen({ onClose, accent, onWatchTrailer, onAddToWatchlist }) {
  const { isSignedIn, user } = useUser();
  const [tab, setTab] = useState('feed'); // feed, following, find
  const [feedItems, setFeedItems] = useState([]);
  const [friends, setFriends] = useState([]);
  const [suggested, setSuggested] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [loadingLeaders, setLoadingLeaders] = useState(true);
  const [stats, setStats] = useState({ following: 0, followers: 0, pending: 0 });
  const [searchQ, setSearchQ] = useState('');
  const [friendsSearchQ, setFriendsSearchQ] = useState('');
  const [searchRes, setSearchRes] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingSuggested, setLoadingSuggested] = useState(true);
  const [activityFilter, setActivityFilter] = useState('all');
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [toast, setToast] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [chatPeer, setChatPeer] = useState(null);
  const [showMessages, setShowMessages] = useState(false);
  const [followListType, setFollowListType] = useState(null);
  const [savedHere, setSavedHere] = useState(() => new Set());
  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!isSignedIn) return;
    fetch('/api/activity?type=feed')
      .then(r => r.json()).then(d => { setFeedItems(d.items || []); setLoadingFeed(false); })
      .catch(() => setLoadingFeed(false));
    fetch('/api/follows?type=following')
      .then(r => r.json()).then(d => { setFriends(d.users || []); setLoadingFriends(false); })
      .catch(() => setLoadingFriends(false));
    fetch('/api/follows?type=stats')
      .then(r => r.json()).then(d => { setStats(p => ({ ...p, following: d.following || 0, followers: d.followers || 0 })); })
      .catch(() => {});
    fetch('/api/messages')
      .then(r => r.json()).then(d => {
        const convs = d.conversations || [];
        setStats(p => ({ ...p, pending: convs.filter(c => c.unread).length }));
      }).catch(() => {});
    fetch('/api/follows?type=suggested')
      .then(r => r.json()).then(d => { setSuggested(d.users || []); setLoadingSuggested(false); })
      .catch(() => setLoadingSuggested(false));
    fetch('/api/leaderboard?type=watchlist')
      .then(r => r.json()).then(d => { setLeaders(d.leaders || []); setLoadingLeaders(false); })
      .catch(() => setLoadingLeaders(false));
    fetch('/api/notifications')
      .then(r => r.json()).then(d => { setNotifications(d.items || []); setLoadingNotifs(false); })
      .catch(() => setLoadingNotifs(false));
  }, [isSignedIn]);

  useEffect(() => {
    if (!searchQ.trim()) { setSearchRes([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/follows?type=search&q=${encodeURIComponent(searchQ)}`);
        const data = await res.json();
        setSearchRes(data.users || []);
      } catch {}
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [searchQ]);

  const handleFollow = async (targetUser) => {
    const isFollowing = targetUser.isFollowing;
    const flip = (u) => u.user_id === targetUser.user_id ? { ...u, isFollowing: !isFollowing } : u;
    setSearchRes(p => p.map(flip));
    setSuggested(p => p.map(flip));
    setLeaders(p => p.map(flip));
    if (isFollowing) {
      setFriends(p => p.filter(f => f.user_id !== targetUser.user_id));
      setStats(p => ({ ...p, following: Math.max(0, p.following - 1) }));
      await fetch('/api/follows', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId: targetUser.user_id }) }).catch(() => {});
      showToast('Unfollowed');
    } else {
      setFriends(p => [{ ...targetUser, isFollowing: true }, ...p]);
      setStats(p => ({ ...p, following: p.following + 1 }));
      await fetch('/api/follows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId: targetUser.user_id }) }).catch(() => {});
      showToast(`Now following @${targetUser.username}`);
      // Pull their activity into the feed right away
      fetch('/api/activity?type=feed').then(r => r.json()).then(d => setFeedItems(d.items || [])).catch(() => {});
    }
  };

  const handleMarkRead = async (id) => {
    setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n));
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => {});
  };

  const handleFollowBack = async (notif) => {
    setNotifications(p => p.map(n => n.id === notif.id ? { ...n, followedBack: true } : n));
    setStats(p => ({ ...p, following: p.following + 1 }));
    await fetch('/api/follows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId: notif.user_id }) }).catch(() => {});
    showToast(`Now following @${notif.username}`);
  };

  const timeAgo = (ts) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return days < 7 ? `${days}d` : new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const VERB = {
    saved: 'saved', watched: 'watched', reviewed: 'reviewed',
    list_follow: 'followed the folder', arc_complete: 'finished the arc',
  };
  const isTitle = (t) => t === 'saved' || t === 'watched' || t === 'reviewed';

  const FILTERS = [
    { id: 'all', label: 'Everything' },
    { id: 'reviewed', label: 'Reviews' },
    { id: 'watched', label: 'Watched' },
    { id: 'saved', label: 'Saved' },
    { id: 'list_follow', label: 'Folders' },
    { id: 'arc_complete', label: 'Arcs' },
  ];

  // Friends who did something in the last 24h get a ring around their avatar
  const activeRecently = useMemo(() => {
    const cut = Date.now() - 86400000;
    const s = new Set();
    feedItems.forEach(i => { if (new Date(i.created_at).getTime() > cut) s.add(i.user_id); });
    return s;
  }, [feedItems]);

  // "Buzzing in your circle": titles more than one friend touched this week
  const buzzing = useMemo(() => {
    const cut = Date.now() - 7 * 86400000;
    const map = new Map();
    feedItems.forEach(i => {
      if (!isTitle(i.type) || !i.movie_id || new Date(i.created_at).getTime() < cut) return;
      const cur = map.get(i.movie_id) || { item: i, people: new Map() };
      if (!cur.people.has(i.user_id)) cur.people.set(i.user_id, i);
      map.set(i.movie_id, cur);
    });
    return [...map.values()].filter(x => x.people.size >= 2).sort((a, b) => b.people.size - a.people.size).slice(0, 10);
  }, [feedItems]);

  // Collapse bursts (same person, same action, within 3h) into one post with a poster strip
  const posts = useMemo(() => {
    const list = activityFilter === 'all' ? feedItems : feedItems.filter(i => i.type === activityFilter);
    const out = [];
    list.forEach(i => {
      const last = out[out.length - 1];
      if (last && last.user_id === i.user_id && last.type === i.type && i.type !== 'reviewed' && isTitle(i.type)
        && Math.abs(new Date(last.items[0].created_at) - new Date(i.created_at)) < 3 * 3600000) {
        last.items.push(i);
      } else {
        out.push({ key: i.id || `${i.user_id}-${i.created_at}`, user_id: i.user_id, type: i.type, items: [i] });
      }
    });
    return out;
  }, [feedItems, activityFilter]);

  const dayLabel = (ts) => {
    const d = new Date(ts); const today = new Date();
    const diff = Math.floor((new Date(today.toDateString()) - new Date(d.toDateString())) / 86400000);
    if (diff <= 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return 'This week';
    return 'Earlier';
  };

  const toMovie = (it) => ({ id: it.movie_id, title: it.movie_title, poster: it.movie_poster, year: it.movie_year, rating: it.movie_rating, accent: it.movie_accent || accent, mediaType: 'movie' });
  const saveFromFeed = (it) => {
    onAddToWatchlist && onAddToWatchlist(toMovie(it));
    setSavedHere(p => new Set([...p, it.movie_id]));
    showToast(`Saved ${it.movie_title}`);
  };
  const openChat = (it) => setChatPeer({ user_id: it.user_id, username: it.username, avatar_url: it.avatar_url });

  const filteredFriends = friends.filter(f => !friendsSearchQ.trim() || `${f.username || ''} ${f.display_name || ''}`.toLowerCase().includes(friendsSearchQ.toLowerCase()));

  /* ── small building blocks ── */
  const Avatar = ({ u, size = 40, ring = false }) => (
    <div style={{ width: size, height: size, borderRadius: '50%', padding: ring ? 2 : 0, background: ring ? accent : 'transparent', flexShrink: 0, boxSizing: 'border-box' }}>
      <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', borderRadius: '50%', overflow: 'hidden', background: T.surface, border: ring ? `2px solid ${T.bg}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: '#fff' }}>
        {u?.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (u?.display_name || u?.username || 'U')[0].toUpperCase()}
      </div>
    </div>
  );
  const Spinner = () => (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
      <div style={{ width: 22, height: 22, border: '2px solid rgba(255,255,255,0.1)', borderTop: `2px solid ${accent}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
  const H = ({ children, right, top = 28 }) => (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: `${top}px 0 8px` }}>
      <span style={{  fontSize:10.5,letterSpacing:2.2,textTransform:'uppercase', fontWeight:700, color:accent }}>{children}</span>
      {right}
    </div>
  );
  const friendIds = new Set(friends.map(f => f.user_id));
  const FollowBtn = ({ u: raw }) => { const u = { ...raw, isFollowing: raw.isFollowing ?? friendIds.has(raw.user_id) }; return isSignedIn ? (
    <button onClick={(e) => { e.stopPropagation(); handleFollow(u); }}
      style={{ background: u.isFollowing ? 'transparent' : accent, border: `1px solid ${u.isFollowing ? 'rgba(255,255,255,0.2)' : accent}`, borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 12, color: u.isFollowing ? 'rgba(255,255,255,0.75)' : '#06060B', fontFamily: 'inherit', fontWeight: 700, flexShrink: 0 }}>
      {u.isFollowing ? 'Following' : 'Follow'}
    </button>
  ) : null; };
  const PersonRow = ({ u, meta, right }) => (
    <div role="button" tabIndex={0} onClick={() => setViewingProfile(u.user_id)} onKeyDown={(e) => e.key === 'Enter' && setViewingProfile(u.user_id)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: `1px solid ${T.hairline}`, cursor: 'pointer' }}>
      <Avatar u={u} size={44} ring={activeRecently.has(u.user_id)} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.display_name || u.username || 'User'}</span>
          {u.verified && <SvgIcon name="badgeCheck" size={13} color="#4DA8FF" filled />}
        </div>
        <div style={{ fontSize: 11, color:T.text2, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta || `@${u.username || 'user'}`}</div>
      </div>
      {right}
    </div>
  );
  // plain function (not a component) so the input keeps focus while typing
  const underlineInput = (value, onChange, placeholder, autoFocus) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: '1.5px solid rgba(255,255,255,0.14)' }}>
      <SvgIcon name="search" size={17} color="rgba(255,255,255,0.5)" />
      <input autoFocus={autoFocus} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 13.5, fontFamily: 'inherit' }} />
      {value && <button onClick={() => onChange('')} aria-label="Clear" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}><SvgIcon name="close" size={13} color="rgba(255,255,255,0.6)" /></button>}
    </div>
  );

  /* ── one post in the feed ── */
  const Post = ({ p }) => {
    const first = p.items[0];
    const many = p.items.length > 1;
    const who = { user_id: first.user_id, username: first.username, avatar_url: first.avatar_url, display_name: first.display_name };
    const name = first.display_name || first.username || 'Someone';
    return (
      <div style={{ display: 'flex', gap: 12, padding: '16px 0', borderTop: `1px solid ${T.hairline}` }}>
        <button onClick={() => setViewingProfile(first.user_id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', alignSelf: 'flex-start' }} aria-label={`Open ${name}'s profile`}>
          <Avatar u={who} size={40} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, color:'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
            <button onClick={() => setViewingProfile(first.user_id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: '#fff' }}>{name}</button>
            {' '}{VERB[p.type] || 'shared'}{' '}
            {many ? <span style={{ color: '#fff', fontWeight: 600 }}>{p.items.length} titles</span> : <span style={{ color: '#fff', fontWeight: 600 }}>{first.movie_title}</span>}
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>  {timeAgo(first.created_at)}</span>
          </div>

          {/* Review text reads like a post */}
          {first.review_text && (
            <p style={{ fontSize: 13, color: '#fff', lineHeight: 1.5, margin: '8px 0 0', paddingLeft: 12, borderLeft: `2px solid ${first.movie_accent || accent}` }}>{first.review_text}</p>
          )}

          {many ? (
            <div style={{ display: 'flex', gap: 6, marginTop: 10, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {p.items.slice(0, 8).map(it => (
                <button key={it.id || it.movie_id} onClick={() => onWatchTrailer(toMovie(it))} aria-label={`Trailer for ${it.movie_title}`}
                  style={{ flexShrink: 0, width: 72, aspectRatio: '2/3', borderRadius: 3, overflow: 'hidden', background: T.surface, border: 'none', padding: 0, cursor: 'pointer' }}>
                  {it.movie_poster && <img src={it.movie_poster} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                </button>
              ))}
            </div>
          ) : first.movie_title && (
            <div role="button" tabIndex={0} onClick={() => isTitle(p.type) && onWatchTrailer({ ...toMovie(first), ...(p.type === 'reviewed' && first.review_id ? { initialTab: 'comments', highlightCommentId: first.review_id } : {}) })}
              style={{ display: 'flex', gap: 12, marginTop: 10, cursor: isTitle(p.type) ? 'pointer' : 'default' }}>
              <div style={{ width: 64, aspectRatio: '2/3', borderRadius: 3, overflow: 'hidden', flexShrink: 0, background: T.surface }}>
                {first.movie_poster && <img src={first.movie_poster} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                <div style={{ fontFamily: T.serif, letterSpacing: '-0.02em', fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{first.movie_title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color:T.text2, marginTop: 4 }}>
                  {first.movie_year && <span>{first.movie_year}</span>}
                  {first.movie_rating && <><span>·</span><SvgIcon name="star" size={10} color="#FFD166" filled /><span style={{ color: 'rgba(255,255,255,0.85)' }}>{first.movie_rating}</span></>}
                </div>
              </div>
            </div>
          )}

          {/* Actions: everything here does something real */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 12 }}>
            {isTitle(p.type) && !many && (
              <>
                <button onClick={() => onWatchTrailer(toMovie(first))} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                  <SvgIcon name="play" size={12} color="#fff" filled />Trailer
                </button>
                <button onClick={() => saveFromFeed(first)} disabled={savedHere.has(first.movie_id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: savedHere.has(first.movie_id) ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: savedHere.has(first.movie_id) ? accent : 'rgba(255,255,255,0.75)' }}>
                  <SvgIcon name="bookmark" size={14} color={savedHere.has(first.movie_id) ? accent : 'rgba(255,255,255,0.75)'} filled={savedHere.has(first.movie_id)} />{savedHere.has(first.movie_id) ? 'Saved' : 'Save'}
                </button>
              </>
            )}
            <button onClick={() => openChat(first)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>
              <SvgIcon name="chat" size={14} color="rgba(255,255,255,0.75)" />{p.type === 'reviewed' ? 'Reply' : 'Message'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  let lastDay = null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, background:ambient(accent), display: 'flex', flexDirection: 'column', animation: 'playerSlideUp 0.4s cubic-bezier(0.22,1,0.36,1)' }}>
      <style>{`@keyframes playerSlideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}div::-webkit-scrollbar{display:none}input::placeholder{color:rgba(255,255,255,0.35)}`}</style>
      {toast && <Toast message={toast} accent={accent} />}
      {showNotifs && <NotificationsPanel onClose={() => setShowNotifs(false)} accent={accent} notifications={notifications} loading={loadingNotifs} onMarkRead={handleMarkRead} onFollowBack={handleFollowBack} onOpenChat={(p) => setChatPeer(p)} />}
      {chatPeer && <ChatWidget peer={chatPeer} onClose={() => { const back = chatPeer?.fromMessages; setChatPeer(null); if (back) setShowMessages(true); }} accent={accent} />}
      {showMessages && (
        <MessagesInbox onClose={() => setShowMessages(false)} accent={accent}
          onOpenChat={(p) => { setShowMessages(false); setChatPeer({ ...p, fromMessages: true }); }}
          onOpenProfile={(id) => { setShowMessages(false); setViewingProfile(id); }} />
      )}
      {followListType && (
        <FollowListModal targetUserId={user?.id} type={followListType} onClose={() => setFollowListType(null)} accent={accent}
          onSelectUser={(id) => { setFollowListType(null); setViewingProfile(id); }} />
      )}
      {viewingProfile && <UserProfileSheet userId={viewingProfile} onClose={() => setViewingProfile(null)} accent={accent} onWatchTrailer={onWatchTrailer} onAddToWatchlist={onAddToWatchlist} />}

      {/* Header */}
      <div style={{ position: 'relative', padding: 'max(18px, env(safe-area-inset-top)) 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={onClose} aria-label="Back" style={{ background: 'none', border: 'none', width: 36, height: 36, marginLeft: -8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <h1 style={{ flex: 1, fontFamily:T.serif, fontSize:16,letterSpacing:'-0.02em', fontWeight:700, color:T.text, margin: 0 }}>Friends</h1>
          <button onClick={() => setShowMessages(true)} aria-label="Messages" style={{ position: 'relative', background: 'none', border: 'none', width: 40, height: 40, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SvgIcon name="chat" size={20} color="#fff" />
            {stats.pending > 0 && <span style={{ position: 'absolute', top: 4, right: 2, minWidth: 16, height: 16, borderRadius: 8, background: accent, color: '#06060B', fontSize: 10, fontWeight:700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{stats.pending}</span>}
          </button>
          <button onClick={() => setShowNotifs(true)} aria-label="Notifications" style={{ position: 'relative', background: 'none', border: 'none', width: 40, height: 40, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SvgIcon name="bell" size={20} color="#fff" />
            {unreadCount > 0 && <span style={{ position: 'absolute', top: 4, right: 2, minWidth: 16, height: 16, borderRadius: 8, background: accent, color: '#06060B', fontSize: 10, fontWeight:700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{unreadCount}</span>}
          </button>
        </div>
        <div style={{ fontSize: 12, color:T.text2, marginTop: 2 }}>
          <button onClick={() => setFollowListType('followers')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color:T.text2 }}><b style={{ color: '#fff' }}>{stats.followers}</b> followers</button>
          <span style={{ margin: '0 8px' }}>·</span>
          <button onClick={() => setFollowListType('following')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color:T.text2 }}><b style={{ color: '#fff' }}>{stats.following}</b> following</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 24, marginTop: 16, borderBottom: `1px solid ${T.hairline}` }}>
          {[['feed', 'Feed'], ['following', 'Following'], ['find', 'Find people']].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{ background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? accent : 'transparent'}`, marginBottom: -1, padding: '0 0 11px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: tab === t ? 700 : 500, color: tab === t ? accent : 'rgba(255,255,255,0.5)' }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', padding: '0 20px calc(40px + env(safe-area-inset-bottom))' }}>
        {!isSignedIn ? (
          <div style={{ textAlign: 'center', padding: '56px 12px' }}>
            <div style={{ fontFamily:T.serif, fontSize:14,letterSpacing:'-0.02em', fontWeight:700, color:T.text }}>See what your friends are watching</div>
            <div style={{ fontSize: 12.5, color:T.text2, marginTop: 8, lineHeight: 1.5 }}>Sign in to follow people, see their saves and reviews, and message them about a film.</div>
          </div>
        ) : (
          <>
            {/* ─── FEED ─── */}
            {tab === 'feed' && (
              loadingFeed ? <Spinner /> : (
                <>
                  {/* Your circle */}
                  {friends.length > 0 && (
                    <div style={{ display: 'flex', gap: 16, overflowX: 'auto', scrollbarWidth: 'none', margin: '0 -20px', padding: '18px 20px 4px' }}>
                      {[...friends].sort((a, b) => (activeRecently.has(b.user_id) ? 1 : 0) - (activeRecently.has(a.user_id) ? 1 : 0)).map(f => (
                        <button key={f.user_id} onClick={() => setViewingProfile(f.user_id)} style={{ flexShrink: 0, width: 62, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                          <Avatar u={f} size={58} ring={activeRecently.has(f.user_id)} />
                          <span style={{ fontSize: 11, color: activeRecently.has(f.user_id) ? '#fff' : 'rgba(255,255,255,0.6)', width: '100%', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.display_name || f.username}</span>
                        </button>
                      ))}
                      <button onClick={() => setTab('find')} style={{ flexShrink: 0, width: 62, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 58, height: 58, borderRadius: '50%', border: '1.5px dashed rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><SvgIcon name="plus" size={20} color="#fff" /></div>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Add</span>
                      </button>
                    </div>
                  )}

                  {/* Buzzing in your circle */}
                  {buzzing.length > 0 && activityFilter === 'all' && (
                    <>
                      <H right={<span style={{ fontSize: 12, color:T.text2 }}>This week</span>}>Buzzing in your circle</H>
                      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none', margin: '0 -20px', padding: '0 20px' }}>
                        {buzzing.map(({ item, people }) => (
                          <div key={item.movie_id} role="button" tabIndex={0} onClick={() => onWatchTrailer(toMovie(item))} style={{ flexShrink: 0, width: 118, cursor: 'pointer' }}>
                            <div style={{ width: '100%', aspectRatio: '2/3', borderRadius: 3, overflow: 'hidden', background: T.surface }}>
                              {item.movie_poster && <img src={item.movie_poster} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.movie_title}</div>
                            <div style={{ display: 'flex', alignItems: 'center', marginTop: 5 }}>
                              {[...people.values()].slice(0, 3).map((pp, k) => (
                                <div key={pp.user_id} style={{ marginLeft: k ? -7 : 0, border: `2px solid ${T.bg}`, borderRadius: '50%' }}><Avatar u={pp} size={20} /></div>
                              ))}
                              <span style={{ fontSize: 11, color:T.text2, marginLeft: 6 }}>{people.size} friends</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Filters */}
                  <div style={{ display: 'flex', gap: 20, overflowX: 'auto', scrollbarWidth: 'none', marginTop: 26, borderBottom: `1px solid ${T.hairline}` }}>
                    {FILTERS.map(f => (
                      <button key={f.id} onClick={() => setActivityFilter(f.id)} style={{ flexShrink: 0, background: 'none', border: 'none', borderBottom: `2px solid ${activityFilter === f.id ? accent : 'transparent'}`, marginBottom: -1, padding: '0 0 9px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: activityFilter === f.id ? 700 : 500, color: activityFilter === f.id ? accent : 'rgba(255,255,255,0.5)' }}>{f.label}</button>
                    ))}
                  </div>

                  {/* Posts */}
                  {posts.length === 0 ? (
                    stats.following === 0 || friends.length === 0 ? (
                      <div style={{ paddingTop: 22 }}>
                        <div style={{ fontFamily:T.serif, fontSize:14,letterSpacing:'-0.02em', fontWeight:700, color:T.text }}>Your feed fills up when you follow people</div>
                        <div style={{ fontSize: 12.5, color:T.text2, marginTop: 6, lineHeight: 1.5 }}>You’ll see what they save, watch and review here. Start with a few film lovers:</div>
                        <div style={{ marginTop: 12 }}>
                          {loadingSuggested ? <Spinner /> : suggested.slice(0, 6).map(u => <PersonRow key={u.user_id} u={u} meta={u.mutualCount > 0 ? `${u.mutualCount} mutual friend${u.mutualCount === 1 ? '' : 's'}` : `@${u.username}`} right={<FollowBtn u={u} />} />)}
                        </div>
                        <button onClick={() => setTab('find')} style={{ marginTop: 14, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: accent }}>Search for people</button>
                      </div>
                    ) : (
                      <div style={{ padding: '28px 0', fontSize: 12.5, color:T.text2 }}>
                        {activityFilter === 'all' ? 'Quiet for now. When the people you follow save or review something, it shows up here.' : 'Nothing like this from your friends yet.'}
                      </div>
                    )
                  ) : (
                    posts.map((p) => {
                      const label = dayLabel(p.items[0].created_at);
                      const showDay = label !== lastDay; lastDay = label;
                      return (
                        <div key={p.key}>
                          {showDay && <div style={{ fontSize: 12, fontWeight: 700, color:T.text2, padding: '18px 0 2px' }}>{label}</div>}
                          <Post p={p} />
                        </div>
                      );
                    })
                  )}

                  {/* Keep growing the circle */}
                  {posts.length > 0 && suggested.filter(u => !u.isFollowing).length > 0 && (
                    <>
                      <H right={<button onClick={() => setTab('find')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: accent }}>See all</button>}>People you may know</H>
                      {suggested.filter(u => !u.isFollowing).slice(0, 3).map(u => <PersonRow key={u.user_id} u={u} meta={u.mutualCount > 0 ? `${u.mutualCount} mutual friend${u.mutualCount === 1 ? '' : 's'}` : `@${u.username}`} right={<FollowBtn u={u} />} />)}
                    </>
                  )}
                </>
              )
            )}

            {/* ─── FOLLOWING ─── */}
            {tab === 'following' && (
              <div style={{ paddingTop: 18 }}>
                {underlineInput(friendsSearchQ, setFriendsSearchQ, 'Search people you follow')}
                {loadingFriends ? <Spinner /> : filteredFriends.length === 0 ? (
                  <div style={{ padding: '28px 0' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{friendsSearchQ ? `No one called “${friendsSearchQ}”` : 'You’re not following anyone yet'}</div>
                    {!friendsSearchQ && <button onClick={() => setTab('find')} style={{ marginTop: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: accent }}>Find people to follow</button>}
                  </div>
                ) : (
                  <div style={{ marginTop: 8 }}>
                    {filteredFriends.map(f => (
                      <PersonRow key={f.user_id} u={f}
                        meta={`${f.watchlistCount || 0} saved${f.topGenres?.length ? ` · into ${f.topGenres.slice(0, 2).join(', ')}` : ''}`}
                        right={
                          <button onClick={(e) => { e.stopPropagation(); setChatPeer({ user_id: f.user_id, username: f.username, avatar_url: f.avatar_url }); }}
                            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '7px 12px', cursor: 'pointer', fontSize: 12, color: '#fff', fontFamily: 'inherit', fontWeight: 700, flexShrink: 0 }}>Message</button>
                        } />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── FIND PEOPLE ─── */}
            {tab === 'find' && (
              <div style={{ paddingTop: 18 }}>
                {underlineInput(searchQ, setSearchQ, 'Search by name or username', true)}
                {searching ? <Spinner /> : searchQ ? (
                  searchRes.length === 0 ? (
                    <div style={{ padding: '28px 0', fontSize: 12.5, color:T.text2 }}>No one found for “{searchQ}”. Check the spelling, or try their username.</div>
                  ) : (
                    <div style={{ marginTop: 8 }}>{searchRes.map(u => <PersonRow key={u.user_id} u={u} right={<FollowBtn u={u} />} />)}</div>
                  )
                ) : (
                  <>
                    <H top={24}>Suggested for you</H>
                    {loadingSuggested ? <Spinner /> : suggested.length === 0 ? (
                      <div style={{ fontSize: 12.5, color:T.text2, padding: '6px 0' }}>No suggestions right now.</div>
                    ) : suggested.map(u => <PersonRow key={u.user_id} u={u} meta={u.mutualCount > 0 ? `${u.mutualCount} mutual friend${u.mutualCount === 1 ? '' : 's'}` : `@${u.username}`} right={<FollowBtn u={u} />} />)}

                    <H right={<span style={{ fontSize: 12, color:T.text2 }}>Biggest watchlists</span>}>Top curators</H>
                    {loadingLeaders ? <Spinner /> : leaders.length === 0 ? (
                      <div style={{ fontSize: 12.5, color:T.text2, padding: '6px 0' }}>No watchlists yet. Save a few titles and you could be first.</div>
                    ) : leaders.map(u => (
                      <div key={u.user_id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 22, fontFamily: T.serif, fontSize: 14, fontWeight: 700, color: u.rank === 1 ? accent : 'rgba(255,255,255,0.35)' }}>{u.rank}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <PersonRow u={u} meta={`${u.watchlistCount} saved · @${u.username}`} right={u.user_id !== user?.id ? <FollowBtn u={u} /> : null} />
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// MAIN APP
// ─── COMMUNITY LISTS ────────────────────────────────────────────────────────

function CreateListSheet({onClose,accent,onCreated}){
  const{isSignedIn}=useUser();
  const[title,setTitle]=useState('');
  const[description,setDescription]=useState('');
  const[isPublic,setIsPublic]=useState(false);
  const[saving,setSaving]=useState(false);
  const[error,setError]=useState('');

  const handleCreate=async()=>{
    if(!title.trim()){setError('Give your folder a name');return;}
    setSaving(true);setError('');
    try{
      const res=await fetch('/api/lists',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,description,is_public:isPublic})});
      const data=await res.json();
      if(!res.ok||data.error){throw new Error(data.error||'Couldn’t create the folder');}
      onCreated(data.list);
      onClose();
    }catch(err){setError(err.message);}
    setSaving(false);
  };

  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:170,background:'rgba(0,0,0,0.82)',backdropFilter:'blur(20px)',display:'flex',alignItems:'flex-end',animation:'fadeIn 0.2s ease'}}>
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',background:ambient(accent),borderRadius:'24px 24px 0 0',border:`1px solid ${T.hairline}`,borderBottom:'none',padding:'0 20px 48px',animation:'sheetUp 0.32s cubic-bezier(0.22,1,0.36,1)',position:'relative',overflow:'hidden'}}>
        <AccentGlow accent={accent} size={180} style={{right:-20,top:-60}}/>
        <div style={{width:32,height:3,borderRadius:2,background:'rgba(255,255,255,0.14)',margin:'14px auto 22px',position:'relative'}}/>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22,position:'relative'}}>
          <span style={{fontFamily:T.serif,fontSize:21,letterSpacing:'-0.02em',fontWeight:700,color:T.text}}>New folder</span>
          <button onClick={onClose} style={{background:'transparent',border:'none',cursor:'pointer',padding:4}}><SvgIcon name="close" size={14} color={T.text2}/></button>
        </div>
        <div style={{position:'relative',marginBottom:14}}>
          <Eyebrow color={accent} style={{marginBottom:8}}>Folder name</Eyebrow>
          <input autoFocus value={title} onChange={e=>{setTitle(e.target.value);setError('');}} maxLength={60} placeholder="e.g. Date night, Crime series, Cartoons for the kids" style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${error?'#FF6B6B44':T.hairline}`,borderRadius:12,padding:'13px 14px',color:T.text,fontSize:15,outline:'none',fontFamily:'inherit'}}/>
          <div style={{fontSize:10,color:T.text3,marginTop:5,textAlign:'right'}}>{title.length}/60</div>
        </div>
        <div style={{marginBottom:22}}>
          <Eyebrow color={T.text3} style={{marginBottom:8}}>Description <span style={{color:T.text3,fontWeight:400,fontSize:9,letterSpacing:0}}>(optional)</span></Eyebrow>
          <textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={200} placeholder="What's in this folder?" rows={2} style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${T.hairline}`,borderRadius:12,padding:'13px 14px',color:T.text,fontSize:14,outline:'none',fontFamily:'inherit',resize:'none',lineHeight:1.5}}/>
        </div>
        <div style={{marginBottom:18}}>
          <Eyebrow color={T.text3} style={{marginBottom:10}}>Visibility</Eyebrow>
          <div style={{display:'flex',gap:8}}>
            <button type="button" onClick={()=>setIsPublic(true)} style={{flex:1,background:isPublic?`${accent}18`:T.surface2,border:`1px solid ${isPublic?accent+'55':T.hairline}`,borderRadius:12,padding:'12px 10px',cursor:'pointer',fontFamily:'inherit',textAlign:'left'}}>
              <div style={{fontSize:13,fontWeight:700,color:isPublic?accent:T.text}}>Public</div>
              <div style={{fontSize:11,color:T.text3,marginTop:3}}>Anyone can find, follow and rate it</div>
            </button>
            <button type="button" onClick={()=>setIsPublic(false)} style={{flex:1,background:!isPublic?`${accent}18`:T.surface2,border:`1px solid ${!isPublic?accent+'55':T.hairline}`,borderRadius:12,padding:'12px 10px',cursor:'pointer',fontFamily:'inherit',textAlign:'left'}}>
              <div style={{fontSize:13,fontWeight:700,color:!isPublic?accent:T.text}}>Private</div>
              <div style={{fontSize:10,color:T.text3,marginTop:3}}>Only you can see it</div>
            </button>
          </div>
        </div>
        {error&&<div style={{fontSize:12,color:'#FF6B6B',marginBottom:14}}>{error}</div>}
        <button onClick={handleCreate} disabled={saving||!title.trim()} style={{width:'100%',background:saving||!title.trim()?'rgba(255,255,255,0.08)':accent,border:'none',borderRadius:16,padding:'15px',cursor:saving||!title.trim()?'default':'pointer',fontSize:15,fontWeight:700,color:saving||!title.trim()?T.text3:'#07070F',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8,transition:'all 0.2s ease'}}>
          {saving&&<div style={{width:14,height:14,border:'2px solid rgba(7,7,15,0.3)',borderTop:'2px solid #07070F',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>}
          {saving?'Creating…':(isPublic?'Create public folder':'Create private folder')}
        </button>
      </div>
      <style>{`@keyframes sheetUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
function ListPlaylistPlayer({ listId, movies, startIndex = 0, onClose, accent, onSave, watchlistIds }) {
  const { isSignedIn, user } = useUser();
  const [currentIdx, setCurrentIdx] = useState(startIndex);
  const [trailerKey, setTrailerKey] = useState(null);
  const [loadingTrailer, setLoadingTrailer] = useState(true);
  const [showQueue, setShowQueue] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [shareToast, setShareToast] = useState(null);
  const [iframeReady, setIframeReady] = useState(false);
  const current = movies[currentIdx];

  useEffect(() => {
    if (!current?.movie_id) return;
    setLoadingTrailer(true);
    setTrailerKey(null);
    setIframeReady(false);
    const mediaType = current.is_tv ? 'tv' : 'movie';
    fetch(`/api/trailer?id=${current.movie_id}&type=${mediaType}`)
      .then((r) => r.json())
      .then((d) => {
        setTrailerKey(d.trailerKey || null);
        setLoadingTrailer(false);
      })
      .catch(() => setLoadingTrailer(false));
  }, [currentIdx, current?.movie_id]);

  useEffect(() => {
    if (!listId) return;
    setLoadingComments(true);
    fetch(`/api/reviews?listId=${listId}`)
      .then((r) => r.json())
      .then((d) => {
        setComments(d.comments || []);
        setLoadingComments(false);
      })
      .catch(() => setLoadingComments(false));
  }, [listId]);

  const goNext = () => {
    if (currentIdx < movies.length - 1) setCurrentIdx((p) => p + 1);
    else onClose();
  };
  const goPrev = () => {
    if (currentIdx > 0) setCurrentIdx((p) => p - 1);
  };

  const timeAgo = (ts) => {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  const postComment = async () => {
    if (!commentInput.trim() || !isSignedIn || !listId) return;
    setPostingComment(true);
    const parentId = replyingTo ? replyingTo.id : null;
    const text = commentInput.trim();
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId, text, rating: 0, parentId }),
      });
      const data = await res.json();
      if (data.comment) {
        const comment = { ...data.comment, isSelf: true };
        if (parentId) {
          setComments((p) =>
            p.map((c) =>
              c.id === parentId
                ? { ...c, replies: [...(c.replies || []), comment] }
                : c
            )
          );
        } else {
          setComments((p) => [comment, ...p]);
        }
        setCommentInput('');
        setReplyingTo(null);
      }
    } catch {}
    setPostingComment(false);
  };

  const deleteComment = async (id, parentId) => {
    setComments((p) => {
      if (parentId) {
        return p.map((c) =>
          c.id === parentId
            ? { ...c, replies: (c.replies || []).filter((r) => r.id !== id) }
            : c
        );
      }
      return p.filter((c) => c.id !== id);
    });
    try {
      await fetch('/api/reviews', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch {}
  };

  const startReply = (c) => {
    if (!isSignedIn) return;
    setReplyingTo(c);
  };

  const handleShare = async () => {
    const title = current?.movie_title || 'CineScroll';
    const url = typeof window !== 'undefined' ? window.location.href : 'https://this-scine.vercel.app';
    const text = listId
      ? `Watching "${title}" on a CineScroll list`
      : `Check out "${title}" on CineScroll`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setShareToast('Link copied');
        setTimeout(() => setShareToast(null), 2000);
      }
    } catch {}
  };

    if (!current) return null;
  const accent2 = current.movie_accent || accent;

  // YouTube always shows some chrome; this is as clean as their embed API allows
  const origin = typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : '';
  const embedSrc = trailerKey
    ? `https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1&playsinline=1&controls=1&iv_load_policy=3&fs=1&color=white&origin=${origin}`
    : null;
  const showSpinner = loadingTrailer || (!!trailerKey && !iframeReady);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: ambient(accent),
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'playerSlideUp 0.38s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      <style>{`@keyframes playerSlideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>

      {shareToast && (
        <div
          style={{
            position: 'fixed',
            top: 72,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 220,
            background: 'rgba(5,5,12,0.96)',
            border: `1px solid ${accent2}44`,
            borderRadius: 20,
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 600,
            color: T.text,
            whiteSpace: 'nowrap',
          }}
        >
          {shareToast}
        </div>
      )}

      {/* VIDEO AREA — sticky so playback continues while queue/comments scroll */}
      <div style={{ position: 'relative', zIndex: 12, width: '100%', paddingBottom: '56.25%', background: '#000', flexShrink: 0, overflow: 'hidden', boxShadow: '0 10px 28px rgba(0,0,0,0.5)' }}>
        {embedSrc && (
          <iframe
            key={trailerKey}
            src={embedSrc}
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            frameBorder="0"
            onLoad={() => setIframeReady(true)}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              border: 'none',
              opacity: iframeReady ? 1 : 0,
              transition: 'opacity 0.15s ease',
            }}
            title={current.movie_title}
          />
        )}
        {showSpinner && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 10,
              background: '#000',
              zIndex: 2,
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                border: `2px solid rgba(255,255,255,0.1)`,
                borderTop: `2px solid ${accent2}`,
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Loading...</span>
          </div>
        )}
        {!loadingTrailer && !trailerKey && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <SvgIcon name="play" size={32} color="rgba(255,255,255,0.2)" filled />
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>No trailer available</div>
            <button
              onClick={goNext}
              style={{
                background: accent2,
                border: 'none',
                borderRadius: 20,
                padding: '8px 20px',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                color: '#07070F',
                fontFamily: 'inherit',
                marginTop: 6,
              }}
            >
              Next film →
            </button>
          </div>
        )}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '50%',
            width: 32,
            height: 32,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4, zIndex: 5 }}>
          {movies.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIdx(i)}
              style={{
                height: 3,
                width: i === currentIdx ? 18 : 6,
                borderRadius: 2,
                background: i === currentIdx ? accent2 : i < currentIdx ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
      </div>

      {/* CONTROLS + COMMENTS — scrolls under sticky player */}
      <div style={{ flex: 1, minHeight: 0, background: 'transparent', display: 'flex', flexDirection: 'column', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ padding: '16px 18px 12px', position: 'relative', overflow: 'hidden' }}>
          <AccentGlow accent={accent2} size={150} style={{ right: -30, top: -40 }} />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
            <div style={{ width: 48, height: 68, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: T.surface2 }}>
              {current.movie_poster && (
                <img src={current.movie_poster} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: T.text,
                  fontFamily: T.serif, letterSpacing: '-0.02em',
                  marginBottom: 4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {current.movie_title}
              </div>
              <div style={{ fontSize: 12, color: T.text3, marginBottom: 8 }}>
                {current.movie_year}
                {current.movie_rating ? `  ★ ${current.movie_rating}` : ''}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() =>
                    onSave &&
                    onSave({
                      id: current.movie_id,
                      title: current.movie_title,
                      poster: current.movie_poster,
                      year: current.movie_year,
                      rating: current.movie_rating,
                      accent: current.movie_accent,
                      isTV: current.is_tv,
                    })
                  }
                  style={{
                    background: watchlistIds?.has(current.movie_id) ? `${accent2}18` : T.surface2,
                    border: `1px solid ${watchlistIds?.has(current.movie_id) ? accent2 + '40' : T.hairline}`,
                    borderRadius: 20,
                    padding: '6px 12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontFamily: 'inherit',
                  }}
                >
                  <SvgIcon
                    name={watchlistIds?.has(current.movie_id) ? 'check' : 'plus'}
                    size={10}
                    color={watchlistIds?.has(current.movie_id) ? accent2 : T.text2}
                  />
                  <span style={{ fontSize: 11, fontWeight: 600, color: watchlistIds?.has(current.movie_id) ? accent2 : T.text2 }}>
                    {watchlistIds?.has(current.movie_id) ? 'Saved' : 'Save'}
                  </span>
                </button>
                <button
                  onClick={handleShare}
                  style={{
                    background: T.surface2,
                    border: `1px solid ${T.hairline}`,
                    borderRadius: 20,
                    padding: '6px 12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontFamily: 'inherit',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.text2} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
                  </svg>
                  <span style={{ fontSize: 11, fontWeight: 600, color: T.text2 }}>Share</span>
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={goPrev}
              disabled={currentIdx === 0}
              style={{
                flex: 1,
                background: T.surface2,
                border: `1px solid ${T.hairline}`,
                borderRadius: 14,
                padding: '11px',
                cursor: currentIdx === 0 ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                opacity: currentIdx === 0 ? 0.35 : 1,
                fontFamily: 'inherit',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.text2} strokeWidth="2" strokeLinecap="round">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.text2 }}>Prev</span>
            </button>
            <button
              onClick={() => setShowQueue((p) => !p)}
              style={{
                background: showQueue ? `${accent2}18` : T.surface2,
                border: `1px solid ${showQueue ? accent2 + '40' : T.hairline}`,
                borderRadius: 14,
                padding: '11px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontFamily: 'inherit',
              }}
            >
              <SvgIcon name="list" size={14} color={showQueue ? accent2 : T.text2} />
              <span style={{ fontSize: 11, fontWeight: 600, color: showQueue ? accent2 : T.text2 }}>
                {currentIdx + 1}/{movies.length}
              </span>
            </button>
            <button
              onClick={goNext}
              disabled={currentIdx === movies.length - 1}
              style={{
                flex: 1,
                background: currentIdx < movies.length - 1 ? accent2 : T.surface2,
                border: 'none',
                borderRadius: 14,
                padding: '11px',
                cursor: currentIdx === movies.length - 1 ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                opacity: currentIdx === movies.length - 1 ? 0.35 : 1,
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: currentIdx < movies.length - 1 ? '#07070F' : T.text2 }}>
                Next
              </span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={currentIdx < movies.length - 1 ? '#07070F' : T.text2}
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {showQueue && (
          <div style={{ padding: '0 18px 16px', animation: 'fadeIn 0.2s ease' }}>
            <Eyebrow color={T.text3} style={{ marginBottom: 10, paddingTop: 4 }}>
              Up Next
            </Eyebrow>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {movies.map((m, i) => (
                <button
                  key={m.movie_id}
                  onClick={() => setCurrentIdx(i)}
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    borderTop: i > 0 ? `1px solid ${T.hairline}` : 'none',
                    padding: '11px 0',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    opacity: i < currentIdx ? 0.4 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: i === currentIdx ? accent2 : i < currentIdx ? T.hairlineStrong : 'transparent',
                      border: i === currentIdx ? 'none' : `1px solid ${T.hairlineStrong}`,
                      transition: 'all 0.2s',
                    }}
                  />
                  <div style={{ width: 38, height: 52, borderRadius: 7, overflow: 'hidden', flexShrink: 0, background: T.surface2 }}>
                    {m.movie_poster && (
                      <img
                        src={m.movie_poster}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: i < currentIdx ? 0.4 : 1 }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: i === currentIdx ? 700 : 500,
                        color: i === currentIdx ? accent2 : T.text,
                        fontFamily: T.serif, letterSpacing: '-0.02em',
                        marginBottom: 2,
                      }}
                    >
                      {m.movie_title}
                    </div>
                    <div style={{ fontSize: 10, color: T.text3 }}>
                      {m.movie_year}
                      {m.movie_rating ? ` · ★${m.movie_rating}` : ''}
                    </div>
                  </div>
                  {i === currentIdx && <SvgIcon name="play" size={12} color={accent2} filled />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* DISCUSSION: comments list first, input pinned at bottom */}
        <div
          style={{
            marginTop: 'auto',
            borderTop: `1px solid ${T.hairline}`,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 180,
          }}
        >
          <div style={{ padding: '12px 18px 8px' }}>
            <Eyebrow color={T.text3}>Discussion</Eyebrow>
          </div>

          <div style={{ flex: 1, padding: '0 18px', maxHeight: 220, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {loadingComments ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    border: `2px solid rgba(255,255,255,0.1)`,
                    borderTop: `2px solid ${accent2}`,
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
              </div>
            ) : comments.length === 0 ? (
              <div style={{ fontSize: 12.5, color: T.text3, textAlign: 'center', padding: '16px 0 8px' }}>
                No comments yet — start the discussion!
              </div>
            ) : (
              comments.map((c, i) => {
                const isSelf = c.isSelf || (user && c.user_id === user.id);
                return (
                  <div
                    key={c.id}
                    style={{
                      padding: '12px 0',
                      borderTop: i > 0 ? `1px solid ${T.hairline}` : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: `${accent2}18`,
                          border: `1px solid ${accent2}38`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          color: accent2,
                          flexShrink: 0,
                          overflow: 'hidden',
                        }}
                      >
                        {c.avatar_url ? (
                          <img src={c.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          (c.username || 'U')[0].toUpperCase()
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Comment body ABOVE username */}
                        <p style={{ fontSize: 13.5, color: T.text, lineHeight: 1.5, margin: '0 0 5px' }}>{c.text}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: T.text2 }}>@{c.username}</span>
                          <span style={{ fontSize: 10, color: T.text3 }}>{timeAgo(c.created_at)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => startReply(c)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <SvgIcon name="reply" size={12} color={T.text3} />
                            <span style={{ fontSize: 11, color: T.text3, fontWeight: 500 }}>Reply</span>
                          </button>
                          {isSelf && (
                            <button
                              type="button"
                              onClick={() => deleteComment(c.id, null)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', marginLeft: 'auto' }}
                            >
                              <SvgIcon name="trash" size={12} color={T.text3} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    {(c.replies || []).map((r) => {
                      const rSelf = r.isSelf || (user && r.user_id === user.id);
                      return (
                        <div key={r.id} style={{ display: 'flex', gap: 10, marginTop: 10, marginLeft: 38 }}>
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              background: T.surface2,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 10,
                              fontWeight: 700,
                              color: T.text2,
                              flexShrink: 0,
                              overflow: 'hidden',
                            }}
                          >
                            {r.avatar_url ? (
                              <img src={r.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              (r.username || 'U')[0].toUpperCase()
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12.5, color: T.text, lineHeight: 1.45, margin: '0 0 4px' }}>{r.text}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: T.text2 }}>@{r.username}</span>
                              <span style={{ fontSize: 10, color: T.text3 }}>{timeAgo(r.created_at)}</span>
                              {rSelf && (
                                <button
                                  type="button"
                                  onClick={() => deleteComment(r.id, c.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 'auto' }}
                                >
                                  <SvgIcon name="trash" size={11} color={T.text3} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          {/* Comment box at the very bottom */}
          <div
            style={{
              padding: '10px 18px calc(12px + env(safe-area-inset-bottom, 0px))',
              borderTop: `1px solid ${T.hairline}`,
              background: 'rgba(6,6,11,0.55)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              flexShrink: 0,
            }}
          >
            {replyingTo && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 11, color: T.text2 }}>
                <span>
                  Replying to <span style={{ color: accent2 }}>@{replyingTo.username}</span>
                </span>
                <button
                  type="button"
                  onClick={() => { setReplyingTo(null); setCommentInput(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text3, fontSize: 14, padding: 0 }}
                >
                  ×
                </button>
              </div>
            )}
            {isSignedIn ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && postComment()}
                  placeholder={replyingTo ? `Reply to @${replyingTo.username}...` : 'Add a comment...'}
                  style={{
                    flex: 1,
                    background: T.surface2,
                    border: `1px solid ${replyingTo ? accent2 + '40' : T.hairline}`,
                    borderRadius: 12,
                    padding: '12px 14px',
                    color: T.text,
                    fontSize: 13,
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={postComment}
                  disabled={postingComment || !commentInput.trim()}
                  style={{
                    background: accent2,
                    border: 'none',
                    borderRadius: 12,
                    padding: '0 16px',
                    fontWeight: 700,
                    fontSize: 12,
                    color: '#07070F',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    opacity: postingComment || !commentInput.trim() ? 0.5 : 1,
                  }}
                >
                  Post
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: T.text3, textAlign: 'center', padding: '6px 0' }}>
                Sign in to join the discussion
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


function ListDetailSheet({listId,onClose,accent,onWatchTrailer,onSave,watchlistIds,watchedIds,watchlist=[],onFillFromFeed}){
  const{isSignedIn,user}=useUser();
  const[list,setList]=useState(null);
  const[movies,setMovies]=useState([]);
  const[loading,setLoading]=useState(true);
  const[following,setFollowing]=useState(false);
  const[userRating,setUserRating]=useState(null);
  const[hoverStar,setHoverStar]=useState(0);
  const[savingFollow,setSavingFollow]=useState(false);
  const[toast,setToast]=useState(null);
  const[showPlaylist,setShowPlaylist]=useState(false);
  const[playlistStartIdx,setPlaylistStartIdx]=useState(0);
  const[comments,setComments]=useState([]);
  const[loadingComments,setLoadingComments]=useState(false);
  const[commentInput,setCommentInput]=useState('');
  const[postingComment,setPostingComment]=useState(false);
  const[replyingTo,setReplyingTo]=useState(null);
  const[activeTab,setActiveTab]=useState('films');
  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(null),3000);};
  const[showPicker,setShowPicker]=useState(false);const[pickerBusy,setPickerBusy]=useState(null);
  const addFromWatchlist=async(w)=>{
    if(pickerBusy)return;setPickerBusy(w.movie_id);
    const movie={id:w.movie_id,title:w.title,poster:w.poster,year:w.year,rating:w.rating,accent:w.accent,isTV:!!w.is_tv};
    try{
      const r=await fetch(`/api/lists/${listId}/movies`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({movie})});
      if(!r.ok)throw new Error();
      setMovies(p=>[...p,{movie_id:w.movie_id,movie_title:w.title,movie_poster:w.poster,movie_year:w.year,movie_rating:w.rating,movie_accent:w.accent,is_tv:!!w.is_tv}]);
      setList(p=>p?{...p,movie_count:(p.movie_count||0)+1}:p);
    }catch{showToast('Couldn’t add that one — try again');}
    setPickerBusy(null);
  };
  const[savingPrivacy,setSavingPrivacy]=useState(false);
  const togglePrivacy=async()=>{
    if(!list||savingPrivacy)return;
    const next=list.is_public===false;
    setSavingPrivacy(true);
    setList(p=>({...p,is_public:next}));
    try{
      const r=await fetch(`/api/lists/${listId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({is_public:next})});
      if(!r.ok)throw new Error();
      showToast(next?'Folder is public — anyone can find it':'Folder is private — only you can see it');
    }catch{setList(p=>({...p,is_public:!next}));showToast('Couldn’t change privacy — try again');}
    setSavingPrivacy(false);
  };

  const[loadError,setLoadError]=useState(false);
  const reloadList=()=>{
    if(!listId)return;
    setLoading(true);setLoadError(false);
    fetch(`/api/lists/${listId}`)
      .then(async r=>{
        const d=await r.json().catch(()=>({}));
        if(!r.ok||!d.list){ setList(null); setMovies([]); setLoadError(true); setLoading(false); return; }
        setList(d.list);setMovies(Array.isArray(d.movies)?d.movies:[]);
        setFollowing(d.list?.is_following||false);
        setUserRating(d.list?.viewer_rating||null);
        setLoading(false);
      })
      .catch(()=>{ setLoadError(true); setLoading(false); });
  };
  useEffect(()=>{ reloadList(); },[listId]);

  useEffect(()=>{
    if(activeTab!=='discussion'||!listId)return;
    setLoadingComments(true);
    fetch(`/api/reviews?listId=${listId}`)
      .then(r=>r.json())
      .then(d=>{setComments(d.comments||[]);setLoadingComments(false);})
      .catch(()=>setLoadingComments(false));
  },[activeTab,listId]);

  const postComment=async()=>{
    if(!commentInput.trim()||!isSignedIn)return;
    setPostingComment(true);
    const parentId=replyingTo?replyingTo.id:null;
    const text=commentInput.trim();
    try{
      const res=await fetch('/api/reviews',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({listId,text,rating:0,parentId})});
      const data=await res.json();
      if(data.comment){
        const comment={...data.comment,isSelf:true};
        if(parentId){
          setComments(p=>p.map(c=>c.id===parentId?{...c,replies:[...(c.replies||[]),comment]}:c));
        }else{
          setComments(p=>[comment,...p]);
        }
        setCommentInput('');
        setReplyingTo(null);
      }
    }catch{}
    setPostingComment(false);
  };
  const deleteListComment=async(id,parentId)=>{
    setComments(p=>{
      if(parentId)return p.map(c=>c.id===parentId?{...c,replies:(c.replies||[]).filter(r=>r.id!==id)}:c);
      return p.filter(c=>c.id!==id);
    });
    try{await fetch('/api/reviews',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});}catch{}
  };

  const timeAgo=(ts)=>{
    if(!ts)return'';
    const diff=Date.now()-new Date(ts).getTime();
    const mins=Math.floor(diff/60000);
    if(mins<1)return'now';if(mins<60)return`${mins}m`;
    const hrs=Math.floor(mins/60);if(hrs<24)return`${hrs}h`;
    return`${Math.floor(hrs/24)}d`;
  };

  const handleFollow=async()=>{
    if(!isSignedIn){return;}
    setSavingFollow(true);
    try{
      const res=await fetch(`/api/lists/${listId}/follow`,{method:'POST'});
      const data=await res.json();
      setFollowing(data.following);
      setList(p=>p?{...p,follower_count:p.follower_count+(data.following?1:-1)}:p);
      showToast(data.following?'List followed':'Unfollowed');
      if(data.following){
        fetch('/api/activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
          type:'list_follow',
          listId,
          listTitle:list?.title||'a list',
          listPoster:list?.cover_poster||list?.cover_url||null,
          listAccent:list?.cover_accent||accentColor||accent,
          username:user?.username||user?.firstName||'user',
          avatarUrl:user?.imageUrl||null,
        })}).catch(()=>{});
      }
    }catch{showToast('Something went wrong');}
    setSavingFollow(false);
  };

  const handleRate=async(rating)=>{
    if(!isSignedIn)return;
    setUserRating(rating);
    try{
      await fetch(`/api/lists/${listId}/rate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rating})});
      setList(p=>{
        if(!p)return p;
        const oldTotal=(p.avg_rating||0)*(p.rating_count||0);
        const wasRated=!!p.viewer_rating;
        const newCount=wasRated?p.rating_count:p.rating_count+1;
        const newTotal=wasRated?oldTotal-p.viewer_rating+rating:oldTotal+rating;
        return{...p,avg_rating:Math.round(newTotal/newCount*10)/10,rating_count:newCount,viewer_rating:rating};
      });
      showToast(`Rated ${rating}/5`);
    }catch{showToast('Failed to rate');}
  };

  const handleRemoveMovie=async(movieId)=>{
    setMovies(p=>p.filter(m=>m.movie_id!==movieId));
    try{
      await fetch(`/api/lists/${listId}/movies`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({movieId})});
    }catch{
      fetch(`/api/lists/${listId}`).then(r=>r.json()).then(d=>setMovies(d.movies||[]));
    }
  };

  const handleShareList=async()=>{
    const title=list?.title||'CineScroll list';
    const text=list?.description?`${title} — ${list.description}`:`Check out "${title}" on CineScroll`;
    const url=typeof window!=='undefined'
      ? `${window.location.origin}${window.location.pathname}?list=${listId}`
      : `https://this-scine.vercel.app?list=${listId}`;
    try{
      if(navigator.share){
        await navigator.share({title,text,url});
      }else if(navigator.clipboard){
        await navigator.clipboard.writeText(`${text}\n${url}`);
        showToast('Link copied');
      }
    }catch{}
  };

  const accentColor=list?.cover_accent||accent;

  return(
    <>
    {toast&&<Toast message={toast} accent={accentColor}/>}
    {showPicker&&(
      <div onClick={()=>setShowPicker(false)} style={{position:'fixed',inset:0,zIndex:240,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(12px)',display:'flex',alignItems:'flex-end'}}>
        <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxHeight:'78vh',background:ambient(accentColor),borderRadius:'22px 22px 0 0',borderTop:`1px solid ${T.hairline}`,display:'flex',flexDirection:'column',animation:'sheetUp 0.3s cubic-bezier(0.22,1,0.36,1)'}}>
          <div style={{width:36,height:4,borderRadius:2,background:'rgba(255,255,255,0.18)',margin:'10px auto 0'}}/>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px 10px'}}>
            <div><div style={{fontFamily:T.serif,letterSpacing:'-0.02em',fontSize:18,fontWeight:700,color:T.text}}>Add from your watchlist</div><div style={{fontSize:11,color:T.text2,marginTop:2}}>Into {list?.title}</div></div>
            <button onClick={()=>setShowPicker(false)} style={{background:'none',border:'none',padding:4,cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:700,color:accentColor}}>Done</button>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'0 20px calc(24px + env(safe-area-inset-bottom))'}}>
            {watchlist.map(w=>{const inIt=movies.some(m=>m.movie_id===w.movie_id);return(
              <div key={w.movie_id} role="button" tabIndex={0} onClick={()=>!inIt&&addFromWatchlist(w)} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 0',borderTop:`1px solid ${T.hairline}`,cursor:inIt?'default':'pointer',opacity:pickerBusy===w.movie_id?0.5:1}}>
                <div style={{width:40,aspectRatio:'2/3',borderRadius:3,overflow:'hidden',background:T.surface,flexShrink:0}}>{w.poster&&<img src={w.poster} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}</div>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{w.title}</div><div style={{fontSize:11,color:T.text2,marginTop:2}}>{w.year}{w.watched?' · Watched':''}</div></div>
                <span style={{width:22,height:22,borderRadius:'50%',border:`1.5px solid ${inIt?accentColor:'rgba(255,255,255,0.3)'}`,background:inIt?accentColor:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{inIt?<SvgIcon name="check" size={12} color="#06060B"/>:<SvgIcon name="plus" size={11} color="rgba(255,255,255,0.7)"/>}</span>
              </div>
            );})}
          </div>
        </div>
      </div>
    )}
    {showPlaylist&&movies.length>0&&<ListPlaylistPlayer listId={listId} movies={movies} startIndex={playlistStartIdx} onClose={()=>setShowPlaylist(false)} accent={accentColor} onSave={onSave} watchlistIds={watchlistIds}/>}
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:130,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(14px)'}}/>
    <div style={{position:'fixed',inset:0,zIndex:131,overflowY:'auto',WebkitOverflowScrolling:'touch',animation:'playerSlideUp 0.38s cubic-bezier(0.22,1,0.36,1)'}}>
      <style>{`@keyframes playerSlideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
      <div style={{minHeight:'100%',background:ambient(accent),paddingBottom:48}}>
        {/* COVER HEADER */}
        <div style={{position:'relative',width:'100%',aspectRatio:'2.2',background:list?.cover_poster?`url(${list.cover_poster})`:`linear-gradient(135deg,${accentColor}30,${T.surface})`,backgroundSize:'cover',backgroundPosition:'center',flexShrink:0}}>
          <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(6,6,11,0.2) 0%,rgba(6,6,11,0.98) 100%)'}}/>
          <AccentGlow accent={accentColor} size={200} style={{right:0,top:0}}/>
          <button onClick={onClose} style={{position:'absolute',top:14,left:14,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'50%',width:32,height:32,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <button onClick={handleShareList} style={{position:'absolute',top:14,right:14,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'50%',width:32,height:32,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2}} title="Share list">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
          </button>
          {loading&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:24,height:24,border:`2px solid rgba(255,255,255,0.1)`,borderTop:`2px solid ${accentColor}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/></div>}
        </div>

        {!loading&&loadError&&(
          <div style={{padding:'48px 24px',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
            <SvgIcon name="list" size={28} color={T.hairlineStrong}/>
            <div style={{fontSize:17,letterSpacing:'-0.02em',fontWeight:700,color:T.text,fontFamily:T.serif}}>Couldn't load this folder</div>
            <div style={{fontSize:13,color:T.text3,lineHeight:1.5}}>Check your connection and try again.</div>
            <button onClick={reloadList} style={{marginTop:6,background:accentColor,border:'none',borderRadius:20,padding:'11px 22px',cursor:'pointer',fontSize:13,fontWeight:700,color:'#07070F',fontFamily:'inherit'}}>Try again</button>
          </div>
        )}

        {!loading&&!loadError&&list&&(
          <div style={{padding:'0 20px'}}>
            {/* TITLE + META */}
            <div style={{marginTop:-32,position:'relative',zIndex:2,marginBottom:18}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                <div style={{width:30,height:30,borderRadius:'50%',background:`${accentColor}20`,border:`1px solid ${accentColor}40`,overflow:'hidden',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:accentColor}}>
                  {list.avatar_url?<img src={list.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:(list.display_name||'U')[0].toUpperCase()}
                </div>
                <span style={{fontSize:12,color:T.text2}}>by <span style={{color:accentColor,fontWeight:600}}>{list.display_name}</span></span>
              </div>
              <h1 style={{fontFamily:T.serif,fontSize:26,letterSpacing:'-0.02em',fontWeight:700,color:T.text,margin:'0 0 8px',lineHeight:1.15}}>{list.title}</h1>
              {list.description&&<p style={{fontSize:13.5,color:T.text2,lineHeight:1.6,margin:'0 0 14px'}}>{list.description}</p>}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:1,borderTop:`1px solid ${T.hairline}`,borderBottom:`1px solid ${T.hairline}`,borderRadius:0,overflow:'hidden',marginBottom:18}}>
                {(list.is_public===false?[{label:'Titles',value:list.movie_count},{label:'Watched',value:movies.filter(m=>watchedIds?.has(m.movie_id)).length},{label:'To watch',value:movies.filter(m=>!watchedIds?.has(m.movie_id)).length}]:[{label:'Titles',value:list.movie_count},{label:'Followers',value:list.follower_count},{label:'Rating',value:list.avg_rating?`${list.avg_rating}/5`:'—'}]).map(s=>(
                  <div key={s.label} style={{background:'transparent',boxShadow:`-1px 0 0 ${T.hairline}`,padding:'12px 6px',textAlign:'center'}}>
                    <SerifStat size={18} color={s.label==='Rating'&&list.avg_rating?accentColor:T.text}>{s.value}</SerifStat>
                    <Eyebrow style={{marginTop:3,fontSize:8.5}}>{s.label}</Eyebrow>
                  </div>
                ))}
              </div>

              {/* OWNER: privacy switch */}
              {list.is_owner&&(
                <div role="button" tabIndex={0} onClick={togglePrivacy} onKeyDown={e=>e.key==='Enter'&&togglePrivacy()} style={{display:'flex',alignItems:'center',gap:12,padding:'4px 0 18px',cursor:'pointer'}}>
                  <SvgIcon name={list.is_public===false?'lock':'people'} size={18} color={accentColor}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#fff'}}>{list.is_public===false?'Private folder':'Public folder'}</div>
                    <div style={{fontSize:11,color:T.text2,marginTop:2}}>{list.is_public===false?'Only you can see it. Make it public to let people follow and rate it.':'Anyone can find, follow and rate it.'}</div>
                  </div>
                  <span style={{width:42,height:24,borderRadius:12,background:list.is_public===false?'rgba(255,255,255,0.15)':accentColor,position:'relative',transition:'background 0.2s ease',flexShrink:0,opacity:savingPrivacy?0.6:1}}>
                    <span style={{position:'absolute',top:2,left:list.is_public===false?2:20,width:20,height:20,borderRadius:'50%',background:'#fff',transition:'left 0.2s ease'}}/>
                  </span>
                </div>
              )}

              {/* ACTIONS */}
              {(list.is_public!==false)&&<div style={{display:'flex',gap:9,marginBottom:22}}>
                {!list.is_owner&&(
                  <button onClick={handleFollow} disabled={savingFollow} style={{flex:1,background:following?'transparent':accentColor,border:`1px solid ${following?T.hairlineStrong:accentColor}`,borderRadius:14,padding:'12px',cursor:'pointer',fontSize:13,fontWeight:700,color:following?T.text2:'#07070F',fontFamily:'inherit',transition:'all 0.2s ease',display:'flex',alignItems:'center',justifyContent:'center',gap:7}}>
                    <SvgIcon name={following?'check':'plus'} size={14} color={following?T.text2:'#07070F'}/>
                    {following?'Following':'Follow'}
                  </button>
                )}
                <div style={{flex:1,background:T.surface2,border:`1px solid ${T.hairline}`,borderRadius:14,padding:'12px',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
                  <Eyebrow style={{marginRight:4}}>Rate:</Eyebrow>
                  {[1,2,3,4,5].map(s=>(
                    <button key={s} onMouseEnter={()=>setHoverStar(s)} onMouseLeave={()=>setHoverStar(0)} onClick={()=>handleRate(s)} style={{background:'none',border:'none',cursor:'pointer',padding:1,transition:'transform 0.1s ease',transform:hoverStar===s?'scale(1.25)':'scale(1)'}}>
                      <SvgIcon name="star" size={16} color={s<=(hoverStar||userRating||0)?accentColor:T.hairlineStrong} filled={s<=(hoverStar||userRating||0)}/>
                    </button>
                  ))}
                </div>
                <button onClick={handleShareList} style={{background:T.surface2,border:`1px solid ${T.hairline}`,borderRadius:14,padding:'12px 14px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,fontFamily:'inherit',flexShrink:0}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.text2} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
                  <span style={{fontSize:12,fontWeight:600,color:T.text2}}>Share</span>
                </button>
              </div>}
            </div>

            {/* TABS + PLAY ALL */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{display:'flex',gap:20,borderBottom:`1px solid ${T.hairline}`}}>
                {[['films','Films'],['discussion','Discussion']].map(([t,label])=>(
                  <button key={t} onClick={()=>setActiveTab(t)} style={{background:'none',border:'none',cursor:'pointer',padding:'0 0 12px',fontFamily:'inherit',fontSize:13,fontWeight:activeTab===t?700:500,color:activeTab===t?accentColor:T.text3,borderBottom:`2px solid ${activeTab===t?accentColor:'transparent'}`,transition:'all 0.2s ease'}}>
                    {label}{t==='films'?` (${movies.length})`:''}
                  </button>
                ))}
              </div>
              {list.is_owner&&movies.length>0&&activeTab==='films'&&(
                <button onClick={()=>setShowPicker(true)} style={{marginLeft:'auto',marginRight:12,display:'flex',alignItems:'center',gap:5,background:'none',border:'none',padding:0,cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,color:'#fff'}}><SvgIcon name="plus" size={12} color="#fff"/>Add</button>
              )}
              {movies.length>0&&activeTab==='films'&&(
                <button onClick={()=>{setPlaylistStartIdx(0);setShowPlaylist(true);}} style={{display:'flex',alignItems:'center',gap:6,background:accentColor,border:'none',borderRadius:20,padding:'8px 16px',cursor:'pointer',fontSize:12,fontWeight:700,color:'#07070F',fontFamily:'inherit',flexShrink:0}}>
                  <SvgIcon name="play" size={12} color="#07070F" filled/>Play All
                </button>
              )}
            </div>

            {activeTab==='films'&&(
              movies.length===0?(
                <div style={{textAlign:'center',padding:'32px 0',display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
                  <SvgIcon name="bookmark" size={24} color={T.hairlineStrong}/>
                  <div style={{fontSize:17,letterSpacing:'-0.02em',fontWeight:700,color:T.text,fontFamily:T.serif}}>{list.is_owner?'This folder is empty':'No titles yet'}</div>
                  <div style={{fontSize:13,color:T.text3}}>{list.is_owner?'Fill it from what you’ve already saved, or go find something new.':'Nothing has been added yet.'}</div>
                  {list.is_owner&&(
                    <div style={{display:'flex',flexDirection:'column',gap:8,width:'100%',maxWidth:300,marginTop:8}}>
                      <button onClick={()=>{onClose();onFillFromFeed&&onFillFromFeed(list);}} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,background:accentColor,border:'none',borderRadius:8,padding:'12px 14px',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:800,color:'#06060B'}}><SvgIcon name="play" size={12} color="#06060B" filled/>Find films in the feed</button>
                      {watchlist.length>0&&<button onClick={()=>setShowPicker(true)} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,background:'transparent',border:'1px solid rgba(255,255,255,0.2)',borderRadius:8,padding:'11px 14px',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:700,color:'#fff'}}><SvgIcon name="plus" size={13} color="#fff"/>Add from your watchlist</button>}
                    </div>
                  )}
                </div>
              ):(
                <div style={{display:'flex',flexDirection:'column'}}>
                  {movies.map((m,i)=>(
                    <div key={m.movie_id} style={{display:'flex',gap:12,padding:'13px 0',borderTop:i>0?`1px solid ${T.hairline}`:'none',alignItems:'flex-start'}}>
                      <button onClick={()=>{setPlaylistStartIdx(i);setShowPlaylist(true);}}
                        style={{width:52,height:72,borderRadius:10,flexShrink:0,overflow:'hidden',background:T.surface2,border:'none',cursor:'pointer',padding:0,position:'relative'}}>
                        {m.movie_poster&&<img src={m.movie_poster} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
                        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.3)'}}><SvgIcon name="play" size={14} color="#fff" filled/></div>
                        <div style={{position:'absolute',bottom:3,left:'50%',transform:'translateX(-50%)',fontSize:8,fontWeight:800,color:'rgba(255,255,255,0.6)',background:'rgba(0,0,0,0.5)',borderRadius:4,padding:'1px 4px',whiteSpace:'nowrap'}}>{i+1}</div>
                      </button>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:14,fontWeight:700,color:watchedIds?.has(m.movie_id)?'rgba(255,255,255,0.6)':T.text,fontFamily:T.serif,letterSpacing:'-0.02em',marginBottom:4,lineHeight:1.2,display:'flex',alignItems:'center',gap:6}}>{m.movie_title}{watchedIds?.has(m.movie_id)&&<span style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:11,fontWeight:700,color:accentColor,fontFamily:'inherit',letterSpacing:0}}><SvgIcon name="check" size={11} color={accentColor}/>Watched</span>}</div>
                        <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:8}}>
                          <span style={{fontSize:11,color:T.text3}}>{m.movie_year}</span>
                          {m.movie_rating&&<><SvgIcon name="star" size={10} color={m.movie_accent||accentColor} filled/><span style={{fontSize:11,color:m.movie_accent||accentColor,fontWeight:600}}>{m.movie_rating}</span></>}
                          {m.is_tv&&<span style={{fontSize:9,color:'#7BC8FF',border:'1px solid #7BC8FF44',borderRadius:4,padding:'1px 4px',fontWeight:700}}>TV</span>}
                        </div>
                        <div style={{display:'flex',gap:6}}>
                          <button onClick={()=>onSave&&onSave({id:m.movie_id,title:m.movie_title,poster:m.movie_poster,year:m.movie_year,rating:m.movie_rating,accent:m.movie_accent,isTV:m.is_tv})}
                            style={{display:'flex',alignItems:'center',gap:4,background:watchlistIds?.has(m.movie_id)?`${accentColor}14`:'transparent',border:`1px solid ${watchlistIds?.has(m.movie_id)?accentColor+'40':T.hairlineStrong}`,borderRadius:20,padding:'4px 10px',cursor:'pointer',fontSize:10,color:watchlistIds?.has(m.movie_id)?accentColor:T.text2,fontFamily:'inherit',fontWeight:600}}>
                            <SvgIcon name={watchlistIds?.has(m.movie_id)?'check':'plus'} size={9} color={watchlistIds?.has(m.movie_id)?accentColor:T.text2}/>
                            {watchlistIds?.has(m.movie_id)?'Saved':'Add'}
                          </button>
                          {list.is_owner&&(
                            <button onClick={()=>handleRemoveMovie(m.movie_id)} style={{display:'flex',alignItems:'center',gap:4,background:'transparent',border:`1px solid ${T.hairline}`,borderRadius:20,padding:'4px 8px',cursor:'pointer',fontSize:10,color:T.text3,fontFamily:'inherit'}}>
                              <SvgIcon name="trash" size={9} color={T.text3}/>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeTab==='discussion'&&(
              <div style={{display:'flex',flexDirection:'column',minHeight:280}}>
                <div style={{flex:1}}>
                  {loadingComments?(
                    <div style={{display:'flex',justifyContent:'center',padding:24}}><div style={{width:20,height:20,border:`2px solid rgba(255,255,255,0.1)`,borderTop:`2px solid ${accentColor}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/></div>
                  ):comments.length===0?(
                    <div style={{textAlign:'center',padding:'24px 0',display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
                      <SvgIcon name="chat" size={22} color={T.hairlineStrong}/>
                      <div style={{fontSize:12.5,color:T.text3}}>No comments yet — start the discussion!</div>
                    </div>
                  ):(
                    <div style={{display:'flex',flexDirection:'column'}}>
                      {comments.map((c,i)=>(
                        <div key={c.id} style={{display:'flex',gap:10,padding:'13px 0',borderTop:i>0?`1px solid ${T.hairline}`:'none'}}>
                          <div style={{width:32,height:32,borderRadius:'50%',background:`${accentColor}18`,border:`1px solid ${accentColor}38`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:accentColor,flexShrink:0,overflow:'hidden'}}>
                            {c.avatar_url?<img src={c.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:(c.username||'U')[0].toUpperCase()}
                          </div>
                          <div style={{flex:1}}>
                            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                              <span style={{fontSize:12,fontWeight:600,color:T.text}}>@{c.username}</span>
                              <span style={{fontSize:10,color:T.text3}}>{timeAgo(c.created_at)}</span>
                            </div>
                            <p style={{fontSize:13.5,color:T.text2,lineHeight:1.55,margin:0}}>{c.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {isSignedIn?(
                  <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:16,paddingTop:14,borderTop:`1px solid ${T.hairline}`}}>
                    {replyingTo&&(
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:11,color:T.text2}}>
                        <span>Replying to <span style={{color:accentColor}}>@{replyingTo.username}</span></span>
                        <button type="button" onClick={()=>{setReplyingTo(null);setCommentInput('');}} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,fontSize:14,padding:0}}>×</button>
                      </div>
                    )}
                    <div style={{display:'flex',gap:9,alignItems:'center'}}>
                    <input value={commentInput} onChange={e=>setCommentInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&postComment()} placeholder={replyingTo?`Reply to @${replyingTo.username}...`:'Share your thoughts on this list...'} style={{flex:1,background:T.surface2,border:`1px solid ${replyingTo?accentColor+'40':T.hairline}`,borderRadius:22,padding:'11px 16px',color:T.text,fontSize:13.5,outline:'none',fontFamily:'inherit'}}/>
                    <button onClick={postComment} disabled={postingComment||!commentInput.trim()} style={{background:postingComment||!commentInput.trim()?T.surface2:accentColor,border:`1px solid ${postingComment||!commentInput.trim()?T.hairline:accentColor}`,borderRadius:'50%',width:42,height:42,cursor:postingComment||!commentInput.trim()?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.2s ease'}}>
                      {postingComment?<div style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.2)',borderTop:'2px solid #fff',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>:<SvgIcon name="send" size={14} color={!commentInput.trim()?T.text3:'#07070F'}/>}
                    </button>
                    </div>
                  </div>
                ):(
                  <div style={{textAlign:'center',padding:'16px 0',marginTop:12,borderTop:`1px solid ${T.hairline}`}}>
                    <div style={{fontSize:13,color:T.text3}}>Sign in to join the discussion</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
}

// Folder: a tinted back panel with a tab, the newest title's poster tucked inside like a photo,
// and a solid dark-glass pocket in front carrying the count and lock. Portrait 3:4, scales to any width.
function FolderArt({poster,accent,locked,count,small=false}){
  const r=small?4:12;
  return(
    <div style={{position:'relative',width:'100%',aspectRatio:'3/4'}}>
      {/* tab + back panel */}
      <div style={{position:'absolute',left:0,top:0,width:'42%',height:'12%',borderRadius:`${r}px ${r}px 0 0`,background:`linear-gradient(180deg,${accent}66,${accent}40)`,clipPath:'polygon(0 0, 84% 0, 100% 100%, 0 100%)'}}/>
      <div style={{position:'absolute',left:0,right:0,top:'7%',bottom:0,borderRadius:r,background:`linear-gradient(170deg,${accent}55 0%,${accent}22 60%,rgba(255,255,255,0.04) 100%)`,border:`1px solid ${accent}40`,boxShadow:'0 12px 28px rgba(0,0,0,0.4)'}}/>
      {/* the title inside */}
      {poster?(
        <div style={{position:'absolute',left:'10%',right:'10%',top:small?'13%':'12%',bottom:'22%',borderRadius:small?2:6,overflow:'hidden',boxShadow:'0 6px 18px rgba(0,0,0,0.45)',transform:'rotate(-2deg)'}}>
          <img src={poster} alt="" loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
        </div>
      ):(
        <div style={{position:'absolute',left:0,right:0,top:'14%',bottom:'40%',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="folder" size={small?12:26} color={accent}/></div>
      )}
      {/* pocket */}
      <div style={{position:'absolute',left:0,right:0,bottom:0,height:'38%',borderRadius:r,background:`linear-gradient(180deg,${accent}30,${accent}0d), #14141B`,borderTop:`1.5px solid ${accent}aa`,boxShadow:'inset 0 1px 0 rgba(255,255,255,0.08), 0 -8px 18px rgba(0,0,0,0.35)'}}>
        {!small&&count!=null&&<div style={{position:'absolute',left:12,bottom:11,fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.85)'}}>{count} title{count===1?'':'s'}</div>}
        {locked&&<div style={{position:'absolute',right:small?3:10,bottom:small?3:9,width:small?13:20,height:small?13:20,borderRadius:'50%',background:'rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="lock" size={small?7:10} color="rgba(255,255,255,0.8)"/></div>}
      </div>
    </div>
  );
}

function FolderCover({posters=[],accent,size=56,locked=false}){
  return(<div style={{width:size*0.8,flexShrink:0}}><FolderArt poster={(posters||[]).filter(Boolean)[0]} accent={accent} locked={locked} small/></div>);
}

// Pick which folders a title lives in. Tapping a folder adds or removes it; you can also make a new folder here.
function AddToListSheet({movie,onClose,accent,isSaved,onEnsureSaved}){
  const{isSignedIn}=useUser();
  const[lists,setLists]=useState([]);
  const[loading,setLoading]=useState(true);
  const[busy,setBusy]=useState(null);
  const[toast,setToast]=useState(null);
  const[showCreate,setShowCreate]=useState(false);
  const[newTitle,setNewTitle]=useState('');
  const[newPublic,setNewPublic]=useState(false);
  const[creating,setCreating]=useState(false);
  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(null),2200);};
  const movieId=movie?.id||movie?.movie_id||movie?.tmdb_id;

  const moviePayload=()=>{
    if(!movieId)return null;
    return{
      id:movieId,
      title:movie.title||movie.movie_title||'Untitled',
      poster:movie.poster||movie.movie_poster||null,
      year:movie.year||movie.movie_year||null,
      rating:movie.rating||movie.movie_rating||null,
      accent:movie.accent||movie.movie_accent||accent,
      isTV:!!(movie.isTV||movie.is_tv||movie.mediaType==='tv'||movie.media_type==='tv'),
    };
  };

  useEffect(()=>{
    if(!isSignedIn){setLoading(false);return;}
    fetch(`/api/lists?tab=mine${movieId?`&movieId=${movieId}`:''}`).then(r=>r.json()).then(d=>{setLists(d.lists||[]);setLoading(false);}).catch(()=>setLoading(false));
  },[isSignedIn,movieId]);

  const toggle=async(list)=>{
    if(busy)return;
    const payload=moviePayload();
    if(!payload){showToast('Missing title info');return;}
    setBusy(list.id);
    const adding=!list.contains;
    setLists(p=>p.map(l=>l.id===list.id?{...l,contains:adding,movie_count:Math.max(0,(l.movie_count||0)+(adding?1:-1)),posters:adding&&payload.poster?[payload.poster,...(l.posters||[])].slice(0,4):(l.posters||[]).filter(x=>x!==payload.poster)}:l));
    try{
      const res=adding
        ?await fetch(`/api/lists/${list.id}/movies`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({movie:payload})})
        :await fetch(`/api/lists/${list.id}/movies`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({movieId:payload.id})});
      if(!res.ok)throw new Error();
      if(adding&&!isSaved&&onEnsureSaved)onEnsureSaved(movie);
      showToast(adding?`Added to ${list.title}`:`Removed from ${list.title}`);
    }catch{
      setLists(p=>p.map(l=>l.id===list.id?{...l,contains:!adding,movie_count:Math.max(0,(l.movie_count||0)+(adding?-1:1))}:l));
      showToast('Couldn’t update that folder — try again');
    }
    setBusy(null);
  };

  const createAndAdd=async()=>{
    if(!newTitle.trim()||creating)return;
    const payload=moviePayload();
    setCreating(true);
    try{
      const res=await fetch('/api/lists',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:newTitle.trim(),description:'',is_public:newPublic})});
      const data=await res.json();
      if(!res.ok||data.error){showToast(data.error||'Couldn’t create the folder');setCreating(false);return;}
      const list=data.list;
      let added=false;
      if(payload){
        const addRes=await fetch(`/api/lists/${list.id}/movies`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({movie:payload})});
        added=addRes.ok;
        if(added&&!isSaved&&onEnsureSaved)onEnsureSaved(movie);
      }
      setLists(p=>[{...list,is_public:newPublic,contains:added,movie_count:added?1:0,posters:added&&payload?.poster?[payload.poster]:[]},...p]);
      showToast(added?`Created ${list.title} and added it`:`Created ${list.title}`);
      setShowCreate(false);setNewTitle('');setNewPublic(false);
    }catch{showToast('Something went wrong');}
    setCreating(false);
  };

  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(14px)',display:'flex',alignItems:'flex-end',animation:'fadeIn 0.2s ease'}}>
      {toast&&<Toast message={toast} accent={accent}/>}
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxHeight:'80vh',background:ambient(accent),borderRadius:'22px 22px 0 0',borderTop:`1px solid ${T.hairline}`,display:'flex',flexDirection:'column',animation:'sheetUp 0.32s cubic-bezier(0.22,1,0.36,1)'}}>
        <style>{`@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={{width:36,height:4,borderRadius:2,background:'rgba(255,255,255,0.18)',margin:'10px auto 0',flexShrink:0}}/>
        <div style={{padding:'14px 20px 12px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div style={{minWidth:0,flex:1}}>
            <div style={{fontFamily:T.serif,fontSize:16,letterSpacing:'-0.02em',fontWeight:700,color:T.text}}>Add to folder</div>
            <div style={{fontSize:12,color:T.text2,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{movie?.title||movie?.movie_title}</div>
          </div>
          <button onClick={onClose} aria-label="Done" style={{background:'none',border:'none',cursor:'pointer',padding:4,fontFamily:'inherit',fontSize:12.5,fontWeight:700,color:accent,flexShrink:0}}>Done</button>
        </div>
        <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',padding:'0 20px calc(28px + env(safe-area-inset-bottom))'}}>
          {!isSignedIn?(
            <div style={{padding:'24px 0',color:T.text2,fontSize:12.5}}>Sign in to organise your watchlist into folders.</div>
          ):loading?(
            <div style={{display:'flex',justifyContent:'center',padding:24}}><div style={{width:20,height:20,border:'2px solid rgba(255,255,255,0.1)',borderTop:`2px solid ${accent}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/></div>
          ):(
            <>
              {!showCreate?(
                <div role="button" tabIndex={0} onClick={()=>setShowCreate(true)} onKeyDown={e=>e.key==='Enter'&&setShowCreate(true)} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 0',borderTop:`1px solid ${T.hairline}`,cursor:'pointer'}}>
                  <div style={{width:48,height:48,borderRadius:6,border:`1.5px dashed ${accent}88`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><SvgIcon name="plus" size={18} color={accent}/></div>
                  <div style={{fontSize:13,fontWeight:700,color:accent}}>New folder</div>
                </div>
              ):(
                <div style={{padding:'14px 0',borderTop:`1px solid ${T.hairline}`}}>
                  <input autoFocus value={newTitle} onChange={e=>setNewTitle(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')createAndAdd();}} maxLength={60} placeholder="Folder name, e.g. Slow-burn thrillers"
                    style={{width:'100%',boxSizing:'border-box',background:'transparent',border:'none',borderBottom:`1.5px solid ${accent}`,padding:'8px 2px',color:'#fff',fontSize:13.5,fontFamily:'inherit',outline:'none'}}/>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:14,gap:12}}>
                    <button type="button" onClick={()=>setNewPublic(p=>!p)} style={{display:'flex',alignItems:'center',gap:10,background:'none',border:'none',padding:0,cursor:'pointer',fontFamily:'inherit'}}>
                      <span style={{width:38,height:22,borderRadius:11,background:newPublic?accent:'rgba(255,255,255,0.15)',position:'relative',transition:'background 0.2s ease',flexShrink:0}}>
                        <span style={{position:'absolute',top:2,left:newPublic?18:2,width:18,height:18,borderRadius:'50%',background:'#fff',transition:'left 0.2s ease'}}/>
                      </span>
                      <span style={{textAlign:'left'}}>
                        <span style={{display:'block',fontSize:12.5,fontWeight:700,color:'#fff'}}>{newPublic?'Public':'Private'}</span>
                        <span style={{display:'block',fontSize:11,color:T.text2}}>{newPublic?'Anyone can find and follow it':'Only you can see it'}</span>
                      </span>
                    </button>
                    <div style={{display:'flex',gap:14,alignItems:'center',flexShrink:0}}>
                      <button type="button" onClick={()=>{setShowCreate(false);setNewTitle('');}} style={{background:'none',border:'none',padding:0,cursor:'pointer',fontSize:12.5,fontWeight:600,color:'rgba(255,255,255,0.6)',fontFamily:'inherit'}}>Cancel</button>
                      <button type="button" onClick={createAndAdd} disabled={creating||!newTitle.trim()} style={{background:accent,border:'none',borderRadius:6,padding:'9px 14px',cursor:creating||!newTitle.trim()?'default':'pointer',fontSize:12.5,fontWeight:700,color:'#06060B',fontFamily:'inherit',opacity:creating||!newTitle.trim()?0.5:1}}>{creating?'Creating…':'Create'}</button>
                    </div>
                  </div>
                </div>
              )}
              {lists.map(list=>(
                <div key={list.id} role="button" tabIndex={0} onClick={()=>toggle(list)} onKeyDown={e=>e.key==='Enter'&&toggle(list)} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 0',borderTop:`1px solid ${T.hairline}`,cursor:'pointer',opacity:busy===list.id?0.6:1}}>
                  <FolderCover posters={list.posters||(list.cover_poster?[list.cover_poster]:[])} accent={accent} size={48} locked={list.is_public===false}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{list.title}</div>
                    <div style={{fontSize:11,color:T.text2,marginTop:2}}>{list.movie_count||0} title{(list.movie_count||0)===1?'':'s'} · {list.is_public===false?'Private':'Public'}</div>
                  </div>
                  <span style={{width:24,height:24,borderRadius:'50%',border:`1.5px solid ${list.contains?accent:'rgba(255,255,255,0.3)'}`,background:list.contains?accent:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    {list.contains&&<SvgIcon name="check" size={13} color="#06060B"/>}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


// WATCHLIST — everything you've saved, organised into folders (private by default, public when you choose).
// Replaces the old Community Lists screen; public folders are what lists used to be.
const STARTER_FOLDERS = ['Date night', 'Weekend binge'];

export function ListsScreen({onClose,accent,onWatchTrailer,onSave,watchlistIds,watchlist=[],onMarkWatched,onOpenList,openListId,onOpenArcs}){
  const{isSignedIn}=useUser();
  const[tab,setTab]=useState('mine'); // mine | following | trending
  const[lists,setLists]=useState([]);
  const[loading,setLoading]=useState(true);
  const[showCreate,setShowCreate]=useState(false);
  const[filingMovie,setFilingMovie]=useState(null);
  const[view,setView]=useState('home'); // home | all
  const[allFilter,setAllFilter]=useState('towatch');
  const[toast,setToast]=useState(null);
  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(null),2600);};

  const fetchLists=useCallback(async(t)=>{
    setLoading(true);
    try{
      const res=await fetch(`/api/lists?tab=${t}`);
      const data=await res.json();
      let got=data.lists||[];
      // First visit: give people two empty starter folders so the idea is obvious
      if(t==='mine'&&isSignedIn&&got.length===0){
        let done=false;try{done=localStorage.getItem('cine_starter_folders')==='1';}catch{}
        if(!done){
          try{localStorage.setItem('cine_starter_folders','1');}catch{}
          const made=await Promise.all(STARTER_FOLDERS.map(title=>fetch('/api/lists',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,is_public:false})}).then(r=>r.json()).catch(()=>null)));
          got=made.filter(m=>m&&m.list).map(m=>({...m.list,is_public:false,movie_count:0,posters:[]}));
        }
      }
      setLists(got);
    }catch{}
    setLoading(false);
  },[isSignedIn]);

  useEffect(()=>{fetchLists(tab);},[tab,fetchLists]);
  // Refresh folder covers/counts when coming back from a folder
  useEffect(()=>{if(!openListId&&tab==='mine')fetchLists('mine');},[openListId]);

  const saved=watchlist||[];
  const toWatch=saved.filter(m=>!m.watched);
  const watchedList=saved.filter(m=>m.watched);
  const asMovie=(m)=>({id:m.movie_id,title:m.title,poster:m.poster,backdrop:m.backdrop,year:m.year,rating:m.rating,accent:m.accent||accent,overview:m.overview,genre:m.genre,isTV:!!m.is_tv,mediaType:m.is_tv?'tv':'movie'});

  const Tabs=()=>(
    <div style={{display:'flex',gap:24,borderBottom:`1px solid ${T.hairline}`,marginTop:16}}>
      {[['mine','My watchlist'],['following','Following'],['trending','Popular folders']].map(([t,label])=>(
        <button key={t} onClick={()=>{setTab(t);setView('home');}} style={{background:'none',border:'none',borderBottom:`2px solid ${tab===t?accent:'transparent'}`,marginBottom:-1,padding:'0 0 11px',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:tab===t?700:500,color:tab===t?accent:'rgba(255,255,255,0.5)',whiteSpace:'nowrap'}}>{label}</button>
      ))}
    </div>
  );
  const Label=({children,right})=>(
    <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',margin:'26px 0 10px'}}>
      <span style={{fontSize:10.5,letterSpacing:2.2,textTransform:'uppercase',fontWeight:700,color:accent}}>{children}</span>{right}
    </div>
  );
  const Spinner=()=>(<div style={{display:'flex',justifyContent:'center',padding:32}}><div style={{width:22,height:22,border:'2px solid rgba(255,255,255,0.1)',borderTop:`2px solid ${accent}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/></div>);

  const SavedRow=({m})=>(
    <div style={{display:'flex',gap:14,padding:'14px 0',borderTop:`1px solid ${T.hairline}`}}>
      <div role="button" tabIndex={0} onClick={()=>onWatchTrailer(asMovie(m))} style={{width:58,aspectRatio:'2/3',borderRadius:3,overflow:'hidden',flexShrink:0,background:m.gradient||T.surface,cursor:'pointer'}}>
        {m.poster&&<img src={m.poster} alt="" loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',display:'block',opacity:m.watched?0.55:1}}/>}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontFamily:T.serif,letterSpacing:'-0.02em',fontSize:14,fontWeight:700,color:m.watched?'rgba(255,255,255,0.6)':'#fff',lineHeight:1.25,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.title}</div>
        <div style={{display:'flex',alignItems:'center',gap:6,marginTop:3,fontSize:11,color:T.text2}}>
          {m.year&&<span>{m.year}</span>}
          {m.rating&&m.rating!=='N/A'&&<><span>·</span><SvgIcon name="star" size={10} color="#FFD166" filled/><span style={{color:'rgba(255,255,255,0.85)'}}>{m.rating}</span></>}
          {m.is_tv&&<><span>·</span><span>Series</span></>}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:18,marginTop:10}}>
          <button onClick={()=>onWatchTrailer(asMovie(m))} style={{display:'inline-flex',alignItems:'center',gap:5,background:'none',border:'none',padding:0,cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,color:'#fff'}}><SvgIcon name="play" size={11} color="#fff" filled/>Trailer</button>
          <button onClick={()=>setFilingMovie(asMovie(m))} style={{display:'inline-flex',alignItems:'center',gap:5,background:'none',border:'none',padding:0,cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.75)'}}><SvgIcon name="folder" size={14} color="rgba(255,255,255,0.75)"/>Folder</button>
          <button onClick={()=>onMarkWatched&&onMarkWatched(asMovie(m))} style={{display:'inline-flex',alignItems:'center',gap:5,background:'none',border:'none',padding:0,cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,color:m.watched?accent:'rgba(255,255,255,0.75)'}}><SvgIcon name="check" size={14} color={m.watched?accent:'rgba(255,255,255,0.75)'}/>{m.watched?'Watched':'Mark watched'}</button>
        </div>
      </div>
    </div>
  );

  const FolderTile=({title,sub,posters,locked,onClick,dashed,count})=>(
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={e=>e.key==='Enter'&&onClick()} style={{cursor:'pointer',minWidth:0}}>
      {dashed?(
        <div style={{position:'relative',width:'100%',aspectRatio:'3/4'}}>
          <div style={{position:'absolute',left:0,top:0,width:'40%',height:'10%',borderRadius:'10px 10px 0 0',border:`1.5px dashed ${accent}77`,borderBottom:'none'}}/>
          <div style={{position:'absolute',left:0,right:0,top:'7%',bottom:0,borderRadius:12,border:`1.5px dashed ${accent}77`,display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="plus" size={26} color={accent}/></div>
        </div>
      ):(
        <FolderCoverFill posters={posters} accent={accent} locked={locked} count={count}/>
      )}
      <div style={{fontSize:13,fontWeight:700,color:dashed?accent:'#fff',marginTop:9,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{title}</div>
      {sub&&<div style={{fontSize:11,color:T.text2,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sub}</div>}
    </div>
  );

  const PublicRow=({l})=>(
    <div role="button" tabIndex={0} onClick={()=>onOpenList&&onOpenList(l.id)} onKeyDown={e=>e.key==='Enter'&&onOpenList&&onOpenList(l.id)} style={{display:'flex',gap:14,alignItems:'center',padding:'13px 0',borderTop:`1px solid ${T.hairline}`,cursor:'pointer'}}>
      <FolderCover posters={l.posters?.length?l.posters:(l.cover_poster?[l.cover_poster]:[])} accent={l.cover_accent||accent} size={60}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontFamily:T.serif,letterSpacing:'-0.02em',fontSize:14,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.title}</div>
        <div style={{fontSize:11,color:T.text2,marginTop:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>by {l.display_name||l.username} · {l.movie_count||0} titles{l.follower_count?` · ${l.follower_count} following`:''}</div>
        {l.description&&<div style={{fontSize:12,color:'rgba(255,255,255,0.58)',marginTop:4,lineHeight:1.4,display:'-webkit-box',WebkitLineClamp:1,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{l.description}</div>}
      </div>
      {l.avg_rating!=null&&<span style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:12,fontWeight:700,color:'#fff',flexShrink:0}}><SvgIcon name="star" size={11} color="#FFD166" filled/>{l.avg_rating}</span>}
    </div>
  );

  return(
    <div style={{position:'fixed',inset:0,zIndex:120,background:ambient(accent),display:'flex',flexDirection:'column',animation:'playerSlideUp 0.38s cubic-bezier(0.22,1,0.36,1)',visibility:openListId?'hidden':'visible'}}>
      <style>{`@keyframes playerSlideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      {toast&&<Toast message={toast} accent={accent}/>}
      {showCreate&&<CreateListSheet onClose={()=>setShowCreate(false)} accent={accent} onCreated={(l)=>{showToast(`Created ${l?.title||'folder'}`);fetchLists('mine');}}/>}
      {filingMovie&&<AddToListSheet movie={filingMovie} onClose={()=>{setFilingMovie(null);fetchLists('mine');}} accent={accent} isSaved={watchlistIds?.has(filingMovie.id)} onEnsureSaved={onSave}/>}

      {/* Header */}
      <div style={{padding:'max(18px, env(safe-area-inset-top)) 20px 0',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <button onClick={view==='all'?()=>setView('home'):onClose} aria-label="Back" style={{background:'none',border:'none',width:36,height:36,marginLeft:-8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h1 style={{flex:1,fontFamily:T.serif,letterSpacing:'-0.02em',fontSize:16,fontWeight:700,color:T.text,margin:0}}>{view==='all'?'All saved':'Watchlist'}</h1>
          {view==='home'&&onOpenArcs&&<button onClick={onOpenArcs} style={{background:'none',border:'none',padding:0,cursor:'pointer',fontFamily:'inherit',fontSize:12.5,fontWeight:700,color:accent}}>Cine Arcs</button>}
        </div>
        <div style={{fontSize:12,color:T.text2,marginTop:2}}>
          {view==='all'?`${toWatch.length} to watch · ${watchedList.length} watched`:`${saved.length} saved · ${tab==='mine'?lists.length:'—'} folders`}
        </div>
        {view==='home'?<Tabs/>:(
          <div style={{display:'flex',gap:24,borderBottom:`1px solid ${T.hairline}`,marginTop:16}}>
            {[['towatch',`To watch (${toWatch.length})`],['watched',`Watched (${watchedList.length})`]].map(([t,label])=>(
              <button key={t} onClick={()=>setAllFilter(t)} style={{background:'none',border:'none',borderBottom:`2px solid ${allFilter===t?accent:'transparent'}`,marginBottom:-1,padding:'0 0 11px',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:allFilter===t?700:500,color:allFilter===t?accent:'rgba(255,255,255,0.5)'}}>{label}</button>
            ))}
          </div>
        )}
      </div>

      <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',scrollbarWidth:'none',padding:'0 20px calc(40px + env(safe-area-inset-bottom))'}}>
        {!isSignedIn?(
          <div style={{padding:'48px 0'}}>
            <div style={{fontFamily:T.serif,letterSpacing:'-0.02em',fontSize:16,fontWeight:700,color:'#fff'}}>Your watchlist lives here</div>
            <div style={{fontSize:12.5,color:T.text2,marginTop:6,lineHeight:1.5}}>Sign in to save films and sort them into folders like “Date night” or “Weekend binge”.</div>
          </div>
        ):view==='all'?(
          (allFilter==='towatch'?toWatch:watchedList).length===0?(
            <div style={{padding:'28px 0',fontSize:12.5,color:T.text2}}>{allFilter==='towatch'?'Nothing waiting. Tap Save on any film in your feed to add it here.':'Films you mark as watched show up here.'}</div>
          ):(allFilter==='towatch'?toWatch:watchedList).map(m=><SavedRow key={m.movie_id} m={m}/>)
        ):tab==='mine'?(
          <>
            <Label right={<span style={{fontSize:12,color:T.text2}}>Private unless you share them</span>}>Folders</Label>
            {loading?<Spinner/>:(
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px 14px'}}>
                <FolderTile title="All saved" sub="Everything you've saved" count={saved.length} posters={[...saved].sort((a,b)=>(b.saved_at||0)-(a.saved_at||0)).map(m=>m.poster).filter(Boolean).slice(0,1)} onClick={()=>setView('all')}/>
                {lists.map(l=>(
                  <FolderTile key={l.id} title={l.title} sub={l.is_public===false?'Private':'Public'} count={l.movie_count||0} posters={l.cover_url?[l.cover_url]:(l.posters||[])} locked={l.is_public===false} onClick={()=>onOpenList&&onOpenList(l.id)}/>
                ))}
                <FolderTile title="New folder" dashed onClick={()=>setShowCreate(true)}/>
              </div>
            )}

            <Label right={saved.length>6?<button onClick={()=>setView('all')} style={{background:'none',border:'none',padding:0,cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,color:accent}}>See all</button>:null}>Recently saved</Label>
            {toWatch.length===0?(
              <div style={{fontSize:12.5,color:T.text2,lineHeight:1.5,padding:'4px 0'}}>Tap Save on any film in your feed. It lands here, and you can file it into a folder.</div>
            ):[...toWatch].sort((a,b)=>(b.saved_at||0)-(a.saved_at||0)).slice(0,6).map(m=><SavedRow key={m.movie_id} m={m}/>)}
          </>
        ):(
          <>
            <div style={{fontSize:12,color:T.text2,padding:'16px 0 6px',lineHeight:1.5}}>
              {tab==='following'?'Public folders you follow. They update when their owners add titles.':'The most-followed and best-rated public folders right now.'}
            </div>
            {loading?<Spinner/>:lists.length===0?(
              <div style={{padding:'20px 0',fontSize:12.5,color:T.text2}}>{tab==='following'?'You’re not following any folders yet. Browse Popular folders to find some.':'No public folders yet. Make one of yours public to be the first.'}</div>
            ):lists.map(l=><PublicRow key={l.id} l={l}/>)}
          </>
        )}
      </div>
    </div>
  );
}

function FolderCoverFill({posters=[],accent,locked,count}){
  return(<FolderArt poster={(posters||[]).filter(Boolean)[0]} accent={accent} locked={locked} count={count}/>);
}

export default function CineScroll(){
  const{isSignedIn,user,isLoaded}=useUser();
  const{openSignIn}=useClerk();
  const[movies,setMovies]=useState([]);const[loading,setLoading]=useState(true);const[loadingMore,setLoadingMore]=useState(false);const[activeIndex,setActiveIndex]=useState(0);const[activeGenre,setActiveGenre]=useState('');const[activeMood,setActiveMood]=useState('Trending');const[activeProvider,setActiveProvider]=useState('');const[showFilter,setShowFilter]=useState(false);const[showAuth,setShowAuth]=useState(false);const[showProfile,setShowProfile]=useState(false);const[showLists,setShowLists]=useState(false);const[showArcs,setShowArcs]=useState(false);const[topLevelList,setTopLevelList]=useState(null);const[showFriends,setShowFriends]=useState(false);const[friendsNotifCount,setFriendsNotifCount]=useState(0);const[trailerMovie,setTrailerMovie]=useState(null);const[similarMovie,setSimilarMovie]=useState(null);const[watchlistIds,setWatchlistIds]=useState(new Set());const[reminderIds,setReminderIds]=useState(new Set());const[watchlist,setWatchlist]=useState([]);const[userReviews,setUserReviews]=useState([]);const[loadingProfileData,setLoadingProfileData]=useState(false);
  const[showTonightNudge,setShowTonightNudge]=useState(false);const[feedToast,setFeedToast]=useState(null);
  const containerRef=useRef(null);const pageRef=useRef(1);const loadingMoreRef=useRef(false);const profileLoadedRef=useRef(false);

  useEffect(()=>{
    if(!isLoaded)return;
    if(!isSignedIn){setWatchlist([]);setUserReviews([]);setWatchlistIds(new Set());setReminderIds(new Set());profileLoadedRef.current=false;return;}
    if(profileLoadedRef.current)return;
    profileLoadedRef.current=true;
    const load=async()=>{setLoadingProfileData(true);try{const[wRes,rRes]=await Promise.all([fetch('/api/watchlist'),fetch('/api/reviews')]);const[wData,rData]=await Promise.all([wRes.json(),rRes.json()]);const items=wData.items||[];setWatchlist(items);setWatchlistIds(new Set(items.map(m=>m.movie_id)));setUserReviews(rData.items||[]);}catch(e){console.error(e);}setLoadingProfileData(false);fetch('/api/reminders').then(r=>r.ok?r.json():{items:[]}).then(d=>setReminderIds(new Set((d.items||[]).map(r=>r.movie_id)))).catch(()=>{});};
    load();
  },[isLoaded,isSignedIn]);

  // Once per day: gentle nudge toward Tonight / Discover
  useEffect(()=>{
    if(!isLoaded||!isSignedIn)return;
    try{
      const day=new Date().toISOString().slice(0,10);
      if(localStorage.getItem('cine_tonight_nudge')===day)return;
      const t=setTimeout(()=>{setShowTonightNudge(true);try{localStorage.setItem('cine_tonight_nudge',day);}catch{}},2200);
      // Auto-hide after a few seconds so it never lingers
      const t2=setTimeout(()=>setShowTonightNudge(false),9000);
      return()=>{clearTimeout(t);clearTimeout(t2);};
    }catch{}
  },[isLoaded,isSignedIn]);

  // Friends / activity notification count for header badge
  useEffect(()=>{
    if(!isLoaded||!isSignedIn){setFriendsNotifCount(0);return;}
    let cancelled=false;
    const load=()=>{
      Promise.all([
        fetch('/api/notifications').then(r=>r.json()).catch(()=>({items:[]})),
        fetch('/api/activity?type=feed').then(r=>r.json()).catch(()=>({items:[]})),
      ]).then(([notifData,feedData])=>{
        if(cancelled)return;
        const unread=(notifData.items||[]).filter(n=>!n.read).length;
        // Count recent feed items (last 24h) as soft activity pings
        const dayAgo=Date.now()-24*60*60*1000;
        const recentFeed=(feedData.items||feedData.feed||[]).filter(i=>{
          const t=new Date(i.created_at||i.timestamp||0).getTime();
          return t>=dayAgo;
        }).length;
        setFriendsNotifCount(unread+Math.min(recentFeed,9));
      }).catch(()=>{});
    };
    load();
    const interval=setInterval(load,120000);
    return()=>{cancelled=true;clearInterval(interval);};
  },[isLoaded,isSignedIn]);

  const[targetFolder,setTargetFolder]=useState(null);
  const[savePrompt,setSavePrompt]=useState(null);const[folderMovie,setFolderMovie]=useState(null);const savePromptTimer=useRef(null);
  const handleSave=async(movie)=>{
    const already=watchlistIds.has(movie.id);
    if(!already){
      if(targetFolder){
        // Filling a folder from the feed: every Save also drops the title into that folder
        fetch(`/api/lists/${targetFolder.id}/movies`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({movie:{id:movie.id,title:movie.title,poster:movie.poster,year:movie.year,rating:movie.rating,accent:movie.accent,isTV:!!movie.isTV}})}).catch(()=>{});
        setTargetFolder(t=>t?{...t,added:(t.added||0)+1}:t);
      }else{clearTimeout(savePromptTimer.current);setSavePrompt(movie);savePromptTimer.current=setTimeout(()=>setSavePrompt(null),4500);}
    }
    if(already){setWatchlistIds(p=>{const n=new Set(p);n.delete(movie.id);return n;});setWatchlist(p=>p.filter(m=>m.movie_id!==movie.id));await fetch('/api/watchlist',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({movieId:movie.id})});}
    else{
      setWatchlistIds(p=>new Set([...p,movie.id]));setWatchlist(p=>[{movie_id:movie.id,title:movie.title,year:movie.year,rating:movie.rating,poster:movie.poster,backdrop:movie.backdrop,genre:movie.genre,overview:movie.overview,accent:movie.accent,gradient:movie.gradient,is_tv:movie.isTV||false,watched:false,saved_at:Date.now(),certification:movie.certification||''},...p]);
      await fetch('/api/watchlist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(movie)});
      fetch('/api/activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'saved',movieId:movie.id,movieTitle:movie.title,moviePoster:movie.poster,movieYear:movie.year,movieRating:movie.rating,movieAccent:movie.accent,username:user?.username||user?.firstName||'user',avatarUrl:user?.imageUrl||null})}).catch(()=>{});
    }
  };

  const handleMarkWatched=async(movie)=>{
    if(!isSignedIn){setShowAuth(true);return;}
    const existing=watchlist.find(m=>m.movie_id===movie.id);
    const currentlyWatched=!!existing?.watched;
    const next=!currentlyWatched;

    if(!existing){
      // Save + mark watched in one flow
      setWatchlistIds(p=>new Set([...p,movie.id]));
      setWatchlist(p=>[{movie_id:movie.id,title:movie.title,year:movie.year,rating:movie.rating,poster:movie.poster,backdrop:movie.backdrop,genre:movie.genre,overview:movie.overview,accent:movie.accent,gradient:movie.gradient,is_tv:movie.isTV||movie.is_tv||false,watched:true,saved_at:Date.now(),certification:movie.certification||''},...p]);
      try{
        await fetch('/api/watchlist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(movie)});
        await fetch('/api/watchlist',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({movieId:movie.id,watched:true})});
      }catch{}
    }else{
      setWatchlist(p=>p.map(m=>m.movie_id===movie.id?{...m,watched:next}:m));
      try{
        await fetch('/api/watchlist',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({movieId:movie.id,watched:next})});
      }catch{}
    }

    if(next){
      fetch('/api/activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'watched',movieId:movie.id,movieTitle:movie.title,moviePoster:movie.poster,movieYear:movie.year,movieRating:movie.rating,movieAccent:movie.accent,username:user?.username||user?.firstName||'user',avatarUrl:user?.imageUrl||null})}).catch(()=>{});
      setFeedToast(`Marked "${movie.title}" as seen`);
    }else{
      setFeedToast(`Unmarked "${movie.title}"`);
    }
    setTimeout(()=>setFeedToast(null),2500);
  };

  // "Not for me": titles the viewer dismissed never come back on this device
  const hiddenIdsRef=useRef(new Set());
  useEffect(()=>{try{hiddenIdsRef.current=new Set(JSON.parse(localStorage.getItem('cine_hidden')||'[]'));}catch{}},[]);
  const[hiddenToast,setHiddenToast]=useState(null);const hiddenToastTimer=useRef(null);
  const saveHidden=()=>{try{localStorage.setItem('cine_hidden',JSON.stringify([...hiddenIdsRef.current].slice(-500)));}catch{}};
  const handleNotInterested=(movie)=>{
    const idx=movies.findIndex(m=>m.id===movie.id);
    hiddenIdsRef.current.add(movie.id);saveHidden();
    setMovies(p=>p.filter(m=>m.id!==movie.id));
    clearTimeout(hiddenToastTimer.current);setHiddenToast({movie,idx});hiddenToastTimer.current=setTimeout(()=>setHiddenToast(null),4000);
  };
  const undoNotInterested=()=>{
    if(!hiddenToast)return;const{movie,idx}=hiddenToast;
    hiddenIdsRef.current.delete(movie.id);saveHidden();
    setMovies(p=>{const n=[...p];n.splice(Math.max(0,idx),0,movie);return n;});
    clearTimeout(hiddenToastTimer.current);setHiddenToast(null);
  };
  const fetchMovies=useCallback(async(mood,genre,search='',page=1,append=false,provider='')=>{
    if(loadingMoreRef.current&&append)return;
    if(append){loadingMoreRef.current=true;setLoadingMore(true);}else setLoading(true);
    try{
      const params=new URLSearchParams({mood:(mood||'trending').toLowerCase(),genre:genre||'',search:search||'',page:String(page)});
      if(provider) params.set('provider', provider);
      const res=await fetch(`/api/movies?${params}`);
      const data=await res.json();
      const hidden=hiddenIdsRef.current;
      const batch=(data.movies||[]).filter(m=>!hidden.has(m.id));
      if(append){setMovies(p=>[...p,...batch]);}
      else{
        setMovies(batch);
        setActiveIndex(0);
        pageRef.current=1;
        setTimeout(()=>containerRef.current?.scrollTo({top:0,behavior:'instant'}),30);
      }
    }catch(e){console.error(e);}
    if(append){loadingMoreRef.current=false;setLoadingMore(false);}else setLoading(false);
  },[]);

  useEffect(()=>{fetchMovies(activeMood,activeGenre,'',1,false,activeProvider);},[activeMood,activeGenre,activeProvider]);

  useEffect(()=>{
    const el=containerRef.current;if(!el)return;
    const fn=()=>{const idx=Math.round(el.scrollTop/el.clientHeight);setActiveIndex(idx);setMovies(prev=>{[idx+1,idx+2].forEach(i=>{if(prev[i]?.backdrop){const img=new Image();img.src=prev[i].backdrop;}if(prev[i]?.poster){const img=new Image();img.src=prev[i].poster;}});if(idx>=prev.length-5&&!loadingMoreRef.current){pageRef.current+=1;fetchMovies(activeMood,activeGenre,'',pageRef.current,true,activeProvider);}return prev;});};
    el.addEventListener('scroll',fn,{passive:true});return()=>el.removeEventListener('scroll',fn);
  },[activeMood,activeGenre,activeProvider,fetchMovies]);

  useEffect(()=>{if(movies.length>0){movies.slice(0,3).forEach(m=>{if(m.backdrop){const img=new Image();img.src=m.backdrop;}if(m.poster){const img=new Image();img.src=m.poster;}});}},[movies.length]);

  const scrollTo=i=>{containerRef.current?.scrollTo({top:i*containerRef.current.clientHeight,behavior:'smooth'});setActiveIndex(i);};
  const handleSimilarSelect=m=>{setMovies(p=>[m,...p]);setTimeout(()=>scrollTo(0),50);};
  // Drop the whole similar set right after the current card and jump to it
  const handleSimilarScrollAll=list=>{const at=activeIndex+1;setMovies(p=>{const ids=new Set(list.map(x=>x.id));const before=p.slice(0,at);const after=p.slice(at).filter(x=>!ids.has(x.id));return[...before,...list,...after];});setTimeout(()=>scrollTo(at),80);};
  const accent=movies[activeIndex]?.accent||'#F5A623';
  const activeGenreLabel=GENRE_OPTIONS.find(g=>g.id===activeGenre)?.label||'All';

  return(
    <div style={{position:'fixed',inset:0,background:'#04040A',fontFamily:"var(--font-sans), 'Inter', system-ui, -apple-system, sans-serif",color:'#fff',overflow:'hidden'}}>
      {feedToast&&<Toast message={feedToast} accent={accent}/>}
      <div style={{position:'fixed',top:0,left:0,right:0,zIndex:40,padding:'18px 16px 0',background:'linear-gradient(to bottom,rgba(4,4,10,0.9) 0%,transparent 100%)',display:'flex',justifyContent:'space-between',alignItems:'center',pointerEvents:'none'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,pointerEvents:'all'}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:accent,boxShadow:`0 0 12px ${accent}`,transition:'all 0.5s ease'}}/>
          <span style={{fontFamily:T.serif,letterSpacing:'-0.02em',fontSize:20,fontWeight:700,letterSpacing:-0.5,color:T.text}}>CineScroll</span>
        </div>
        <div style={{display:'flex',gap:8,pointerEvents:'all',alignItems:'center'}}>
          <button onClick={()=>{if(!isSignedIn){setShowAuth(true);return;}setShowFriends(true);setFriendsNotifCount(0);}} style={{position:'relative',background:'rgba(0,0,0,0.55)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,width:38,height:38,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(12px)'}}>
            <SvgIcon name="friends" size={18} color="rgba(255,255,255,0.75)"/>
            {friendsNotifCount>0&&(
              <span style={{
                position:'absolute',top:-4,right:-4,minWidth:16,height:16,borderRadius:8,
                background:accent,color:'#07070F',fontSize:9,fontWeight:800,
                display:'flex',alignItems:'center',justifyContent:'center',
                padding:'0 4px',border:'1.5px solid #04040A',lineHeight:1,
              }}>
                {friendsNotifCount>9?'9+':friendsNotifCount}
              </span>
            )}
          </button>
          <button onClick={()=>setShowLists(true)} aria-label="Watchlist" style={{background:'rgba(0,0,0,0.55)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,width:38,height:38,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(12px)'}}>
            <SvgIcon name="folder" size={17} color="rgba(255,255,255,0.75)"/>
          </button>
          <button onClick={()=>setShowFilter(p=>!p)} style={{background:showFilter?`${accent}18`:'rgba(0,0,0,0.55)',border:`1px solid ${showFilter?accent+'44':'rgba(255,255,255,0.1)'}`,borderRadius:12,width:38,height:38,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(12px)',transition:'all 0.2s ease'}}>
            <SvgIcon name="sliders" size={17} color={showFilter?accent:'rgba(255,255,255,0.7)'}/>
          </button>
          {isSignedIn?(
            <button onClick={()=>setShowProfile(true)} style={{width:36,height:36,borderRadius:'50%',background:`${accent}22`,border:`2px solid ${accent}55`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0,position:'relative'}}>
              {user?.imageUrl?<img src={user.imageUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:13,fontWeight:700,color:accent}}>{(user?.firstName||user?.username||'?')[0].toUpperCase()}</span>}
              {watchlistIds.size>0&&<div style={{position:'absolute',top:-2,right:-2,width:14,height:14,borderRadius:'50%',background:accent,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid #04040A'}}><span style={{fontSize:7,fontWeight:800,color:'#04040A'}}>{watchlistIds.size}</span></div>}
            </button>
          ):(
            <button onClick={()=>setShowAuth(true)} style={{background:`${accent}18`,border:`1px solid ${accent}44`,borderRadius:22,padding:'6px 12px',cursor:'pointer',fontSize:12,color:accent,fontWeight:700,fontFamily:'inherit',whiteSpace:'nowrap'}}>Sign in</button>
          )}
        </div>
      </div>

      {!showFilter&&!showProfile&&!showLists&&!showFriends&&!trailerMovie&&!showTonightNudge&&(
        <FriendsPulse
          accent={accent}
          activeIndex={activeIndex}
          onOpenFriends={()=>setShowFriends(true)}
          onWatchTrailer={setTrailerMovie}
        />
      )}

      {showTonightNudge&&!showFilter&&!showProfile&&!showLists&&!trailerMovie&&(
        <div style={{position:'fixed',top:58,left:16,right:16,zIndex:45,display:'flex',justifyContent:'center',pointerEvents:'none'}}>
          <div
            role="button"
            tabIndex={0}
            onClick={()=>{
              setShowTonightNudge(false);
              try{localStorage.setItem('cine_tonight_nudge',new Date().toISOString().slice(0,10));}catch{}
              setShowFilter(true);
            }}
            onKeyDown={(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setShowTonightNudge(false);try{localStorage.setItem('cine_tonight_nudge',new Date().toISOString().slice(0,10));}catch{}setShowFilter(true);}}}
            style={{
              pointerEvents:'all',display:'flex',alignItems:'center',gap:10,
              background:'rgba(5,5,12,0.92)',backdropFilter:'blur(16px)',
              border:`1px solid ${accent}44`,borderRadius:22,padding:'10px 14px 10px 12px',
              cursor:'pointer',fontFamily:'inherit',boxShadow:`0 8px 28px rgba(0,0,0,0.4)`,
              animation:'toastIn 0.35s cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            <div style={{width:28,height:28,borderRadius:14,background:`${accent}22`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <SvgIcon name="sparkle" size={14} color={accent}/>
            </div>
            <div style={{textAlign:'left',flex:1}}>
              <div style={{fontSize:12.5,fontWeight:700,color:T.text}}>{dayPart().title} for you</div>
              <div style={{fontSize:10.5,color:T.text3,marginTop:1}}>Fresh picks from your platforms</div>
            </div>
            <button
              type="button"
              onClick={(e)=>{e.stopPropagation();setShowTonightNudge(false);try{localStorage.setItem('cine_tonight_nudge',new Date().toISOString().slice(0,10));}catch{}}}
              style={{background:'none',border:'none',padding:4,cursor:'pointer',marginLeft:4,flexShrink:0}}
              aria-label="Dismiss"
            >
              <SvgIcon name="close" size={11} color={T.text3}/>
            </button>
          </div>
          <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}`}</style>
        </div>
      )}

      {(activeGenre||activeProvider||(activeMood&&activeMood!=='Trending'))&&!showFilter&&(
        <div style={{position:'fixed',top:58,left:16,zIndex:38,display:'flex',gap:6,flexWrap:'wrap',maxWidth:'70%'}}>
          {activeMood&&activeMood!=='Trending'&&(
            <div onClick={()=>setActiveMood('Trending')} style={{background:'rgba(0,0,0,0.55)',backdropFilter:'blur(10px)',border:`1px solid ${accent}33`,borderRadius:20,padding:'3px 10px',fontSize:10,color:accent,fontWeight:700,cursor:'pointer'}}>{activeMood} ×</div>
          )}
          {activeGenre&&(
            <div onClick={()=>setActiveGenre('')} style={{background:'rgba(0,0,0,0.55)',backdropFilter:'blur(10px)',border:`1px solid ${accent}33`,borderRadius:20,padding:'3px 10px',fontSize:10,color:accent,fontWeight:700,cursor:'pointer'}}>{activeGenreLabel} ×</div>
          )}
          {activeProvider&&(
            <div onClick={()=>setActiveProvider('')} style={{background:'rgba(0,0,0,0.55)',backdropFilter:'blur(10px)',border:`1px solid ${accent}33`,borderRadius:20,padding:'3px 10px',fontSize:10,color:accent,fontWeight:700,cursor:'pointer'}}>{activeProvider} ×</div>
          )}
        </div>
      )}

      <div ref={containerRef} style={{position:'fixed',inset:0,height:'100%',overflowY:'scroll',overscrollBehavior:'none',scrollSnapType:'y mandatory',WebkitOverflowScrolling:'touch',scrollbarWidth:'none',msOverflowStyle:'none'}}>
        <style>{`div::-webkit-scrollbar{display:none}*{-webkit-tap-highlight-color:transparent;box-sizing:border-box}::-webkit-scrollbar{display:none}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        {loading?(
          <div style={{height:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',scrollSnapAlign:'start',flexDirection:'column',gap:12}}>
            <div style={{fontFamily:T.serif,letterSpacing:'-0.02em',fontSize:38,fontWeight:700,color:T.text}}>CineScroll</div>
            <div style={{fontSize:11,color:T.text3,letterSpacing:3}}>LOADING FILMS...</div>
          </div>
        ):(
          movies.map((m,i)=>(
            <div key={`${m.id}-${i}`} style={{width:'100%',height:'100%',scrollSnapAlign:'start',scrollSnapStop:'always',position:'relative',flexShrink:0}}>
              <MovieCard movie={m} isActive={i===activeIndex} index={i} onFindSimilar={setSimilarMovie} onNotInterested={handleNotInterested} onAuthRequired={()=>setShowAuth(true)} onSave={handleSave} isSaved={watchlistIds.has(m.id)} isWatched={!!watchlist.find(w=>w.movie_id===m.id&&w.watched)} onMarkWatched={handleMarkWatched} onTrailer={setTrailerMovie} isReminded={reminderIds.has(m.id)} onToggleReminder={(mv,next)=>setReminderIds(p=>{const n=new Set(p);if(next)n.add(mv.id);else n.delete(mv.id);return n;})}/>
            </div>
          ))
        )}
      </div>


      <FilterSheet show={showFilter} onClose={()=>setShowFilter(false)} onOpenFolder={id=>setTopLevelList(id)} onOpenFolders={()=>setShowLists(true)} activeGenre={activeGenre} activeMood={activeMood} onGenre={setActiveGenre} onMood={setActiveMood} accent={accent} activeProvider={activeProvider} onProvider={setActiveProvider} onSearchSelect={m=>{setMovies(p=>[m,...p.filter(x=>x.id!==m.id)]);scrollTo(0);}}/>
      {similarMovie&&<SimilarSheet movie={similarMovie} onClose={()=>setSimilarMovie(null)} accent={accent} onSelect={handleSimilarSelect} onScrollAll={handleSimilarScrollAll} onTrailer={setTrailerMovie} onSave={handleSave} savedIds={watchlistIds}/>}
      {showAuth&&<AuthGate onClose={()=>setShowAuth(false)} accent={accent}/>}
      {showProfile&&<ProfileSheet onClose={()=>setShowProfile(false)} accent={accent} watchlist={watchlist} setWatchlist={setWatchlist} userReviews={userReviews} loadingData={loadingProfileData} onWatchTrailer={(m)=>{setShowProfile(false);setTrailerMovie(m);}} onDiscover={()=>{setShowProfile(false);setTimeout(()=>setShowFilter(true),50);}}/>}
      {showArcs&&<CineArcs onClose={()=>setShowArcs(false)} accent={accent} onWatchTrailer={setTrailerMovie} watchlist={watchlist} user={user}/>}
      {showLists&&<ListsScreen onClose={()=>setShowLists(false)} accent={accent} onWatchTrailer={setTrailerMovie} onSave={handleSave} watchlistIds={watchlistIds} watchlist={watchlist} onMarkWatched={handleMarkWatched} onOpenList={id=>setTopLevelList(id)} openListId={topLevelList} onOpenArcs={()=>{setShowLists(false);setShowArcs(true);}}/>}
      {topLevelList&&<ListDetailSheet listId={topLevelList} onClose={()=>setTopLevelList(null)} accent={accent} onWatchTrailer={setTrailerMovie} onSave={handleSave} watchlistIds={watchlistIds} watchlist={watchlist} onFillFromFeed={(l)=>{setTargetFolder({id:l.id,title:l.title});setShowLists(false);setTopLevelList(null);}} watchedIds={new Set(watchlist.filter(w=>w.watched).map(w=>w.movie_id))}/>}
      {folderMovie&&<AddToListSheet movie={folderMovie} onClose={()=>setFolderMovie(null)} accent={folderMovie.accent||accent} isSaved={watchlistIds.has(folderMovie.id)} onEnsureSaved={handleSave}/>}
      {targetFolder&&!showLists&&!topLevelList&&(
        <div style={{position:'fixed',left:16,right:16,bottom:'calc(16px + env(safe-area-inset-bottom))',zIndex:299,display:'flex',justifyContent:'center',pointerEvents:'none'}}>
          <div style={{pointerEvents:'all',display:'flex',alignItems:'center',gap:12,maxWidth:420,width:'100%',background:'rgba(12,12,18,0.85)',backdropFilter:'blur(18px)',WebkitBackdropFilter:'blur(18px)',border:`1px solid ${accent}55`,borderRadius:14,padding:'10px 10px 10px 14px',boxShadow:'0 12px 36px rgba(0,0,0,0.5)'}}>
            <SvgIcon name="folder" size={18} color={accent}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12.5,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>Filling “{targetFolder.title}”</div>
              <div style={{fontSize:11,color:T.text2}}>{targetFolder.added?`${targetFolder.added} added · tap Save to add more`:'Tap Save on any film to add it'}</div>
            </div>
            <button onClick={()=>{const id=targetFolder.id;setTargetFolder(null);setTopLevelList(id);}} style={{background:accent,border:'none',borderRadius:8,padding:'9px 14px',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:800,color:'#06060B',flexShrink:0}}>Done</button>
          </div>
        </div>
      )}
      {hiddenToast&&(
        <div style={{position:'fixed',left:16,right:16,bottom:'calc(20px + env(safe-area-inset-bottom))',zIndex:301,display:'flex',justifyContent:'center',pointerEvents:'none'}}>
          <div style={{pointerEvents:'all',display:'flex',alignItems:'center',gap:12,maxWidth:420,width:'100%',background:'rgba(12,12,18,0.82)',backdropFilter:'blur(18px)',WebkitBackdropFilter:'blur(18px)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:14,padding:'12px 12px 12px 14px',boxShadow:'0 12px 36px rgba(0,0,0,0.5)'}}>
            <SvgIcon name="notFor" size={16} color="rgba(255,255,255,0.7)"/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12.5,fontWeight:700,color:'#fff'}}>Got it — you won't see this again</div>
              <div style={{fontSize:11,color:T.text2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{hiddenToast.movie.title}</div>
            </div>
            <button onClick={undoNotInterested} style={{background:'none',border:'none',padding:'6px 4px',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:800,color:accent,flexShrink:0}}>Undo</button>
          </div>
        </div>
      )}
      {savePrompt&&!folderMovie&&(
        <div style={{position:'fixed',left:16,right:16,bottom:'calc(20px + env(safe-area-inset-bottom))',zIndex:300,display:'flex',justifyContent:'center',pointerEvents:'none'}}>
          <div style={{pointerEvents:'all',display:'flex',alignItems:'center',gap:12,maxWidth:420,width:'100%',background:'rgba(12,12,18,0.82)',backdropFilter:'blur(18px)',WebkitBackdropFilter:'blur(18px)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:14,padding:'10px 10px 10px 12px',boxShadow:'0 12px 36px rgba(0,0,0,0.5)',animation:'toastIn 0.3s cubic-bezier(0.22,1,0.36,1)'}}>
            <div style={{width:30,aspectRatio:'2/3',borderRadius:3,overflow:'hidden',flexShrink:0,background:T.surface}}>{savePrompt.poster&&<img src={savePrompt.poster} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:700,color:'#fff'}}>Saved to your watchlist</div>
              <div style={{fontSize:11,color:T.text2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{savePrompt.title}</div>
            </div>
            <button onClick={()=>{clearTimeout(savePromptTimer.current);setFolderMovie(savePrompt);setSavePrompt(null);}} style={{display:'inline-flex',alignItems:'center',gap:6,background:savePrompt.accent||accent,border:'none',borderRadius:8,padding:'9px 12px',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,color:'#06060B',flexShrink:0}}>
              <SvgIcon name="folder" size={14} color="#06060B"/>Add to folder
            </button>
          </div>
          <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
        </div>
      )}
      {showFriends&&<FriendsScreen onClose={()=>setShowFriends(false)} accent={accent} onWatchTrailer={setTrailerMovie} onAddToWatchlist={handleSave}/>}
      {trailerMovie&&<InlinePlayer movie={trailerMovie} onClose={()=>setTrailerMovie(null)} accent={trailerMovie.accent||accent} onSave={handleSave} isSaved={watchlistIds.has(trailerMovie.id)} initialTab={trailerMovie.initialTab} highlightCommentId={trailerMovie.highlightCommentId}/>}

      <style>{`@keyframes bob{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-8px)}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
