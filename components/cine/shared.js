'use client';
import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import ImportSheet from '../ImportSheet';
import dynamic from 'next/dynamic';

// ─── DESIGN TOKENS ──────────────────────────────────────────────────────────
// Neutrals carry the visual weight since the accent color is dynamic (shifts per
// movie/mood). Borders are quiet hairlines, not boxes; separation comes from
// whitespace and the serif/sans type pairing rather than bordered containers.
export const T = {
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
export const NOIR = '#E6E6EA';
export const ambient = (a = '#F5A623') => a === NOIR
  ? 'radial-gradient(120% 70% at 0% 0%, rgba(255,255,255,0.06) 0%, transparent 70%), #000000'
  : `radial-gradient(120% 70% at 0% 0%, ${a}2e 0%, transparent 70%), radial-gradient(120% 70% at 100% 100%, ${a}24 0%, transparent 70%), linear-gradient(165deg, ${a}1f 0%, ${a}12 50%, ${a}1c 100%), #06060B`;
// Tracked-out uppercase eyebrow label, used above stats/sections instead of bordered headers
export const Eyebrow = ({ children, color = T.text3, style = {} }) => (
  <div style={{ fontSize: 9.5, letterSpacing: 2.2, color, fontWeight: 700, textTransform: 'uppercase', ...style }}>{children}</div>
);
// Large serif numeral, the hero treatment for stats/scores/counts throughout the app
export const SerifStat = ({ children, size = 20, color = T.text, style = {} }) => (
  <div style={{ fontFamily: T.serif, letterSpacing: '-0.02em', fontSize: size, fontWeight: 700, color, lineHeight: 1.1, ...style }}>{children}</div>
);
// Hairline divider replacing bordered-box separation
export const Hairline = ({ style = {} }) => (
  <div style={{ height: 1, background: T.hairline, ...style }} />
);
// Soft radial glow in the active accent color, the app's one signature motif -
// the chrome visibly "reacts" to whatever movie/content is currently in focus
export const AccentGlow = ({ accent, size = 140, style = {} }) => (
  <div style={{ position: 'absolute', width: size, height: size, borderRadius: '50%', background: `radial-gradient(circle,${accent}26 0%,transparent 70%)`, pointerEvents: 'none', ...style }} />
);
export const SvgIcon = ({ name, size = 20, color = 'currentColor', filled = false }) => {
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
    flame:    'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z',
    sparkle:  ['M11 3l1.9 5.6L18.5 10.5l-5.6 1.9L11 18l-1.9-5.6L3.5 10.5l5.6-1.9z','M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z'],
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
    image:     ['M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z','M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z','M21 15l-5-5L5 21'],
    camera:    ['M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z','M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
    file:      ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6','M8 13h8','M8 17h5'],
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
export const MoodIcon = ({ mood, size = 24, color = '#fff' }) => {
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
export const GENRE_OPTIONS = [
  {label:'All',id:''},{label:'Action',id:'28'},{label:'Drama',id:'18'},
  {label:'Horror',id:'27'},{label:'Sci-Fi',id:'878'},{label:'Comedy',id:'35'},
  {label:'Thriller',id:'53'},{label:'Romance',id:'10749'},
  {label:'Animation',id:'16'},{label:'Documentary',id:'99'},
];
export const FEED_MOODS = [
  { label:'Trending',    icon:'flame',   desc:"What's hot right now" },
  { label:'Top Rated',   icon:'star',    desc:'Highest rated picks' },
  { label:'New',         icon:'sparkle', desc:'Fresh out this week' },
  { label:'Hidden Gems', icon:'gem',     desc:'Underrated classics' },
];
export const FEEL_MOODS = [
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
export const GRADS = [
  'linear-gradient(170deg,#0a0500 0%,#2e1c00 50%,#7a4800 100%)',
  'linear-gradient(170deg,#080300 0%,#200d00 50%,#6b2800 100%)',
  'linear-gradient(170deg,#060310 0%,#120830 50%,#3d1f7a 100%)',
  'linear-gradient(170deg,#060000 0%,#1c0505 50%,#5c1212 100%)',
  'linear-gradient(170deg,#00060d 0%,#001428 50%,#0a3352 100%)',
  'linear-gradient(170deg,#050300 0%,#150e00 50%,#3d2800 100%)',
  'linear-gradient(170deg,#000600 0%,#081508 50%,#1a4a1a 100%)',
  'linear-gradient(170deg,#080005 0%,#200010 50%,#6b0a35 100%)',
];
export function CertBadge({ cert }) {
  if (!cert) return null;
  const color = cert==='R'||cert==='NC-17'||cert==='18'||cert==='TV-MA' ? '#FF4444'
    : cert==='PG-13'||cert==='TV-14'||cert==='15' ? '#F5A623'
    : 'rgba(255,255,255,0.5)';
  return <span style={{fontSize:9,fontWeight:800,color,border:`1px solid ${color}55`,borderRadius:4,padding:'2px 5px',letterSpacing:0.5,flexShrink:0}}>{cert}</span>;
}
export function Toast({message,accent}){
  return(
    <div style={{position:'fixed',top:80,left:'50%',transform:'translateX(-50%)',zIndex:200,background:'rgba(5,5,12,0.96)',backdropFilter:'blur(20px)',border:`1px solid ${accent}44`,borderRadius:24,padding:'12px 24px',display:'flex',alignItems:'center',gap:10,animation:'toastIn 0.3s cubic-bezier(0.22,1,0.36,1)',whiteSpace:'nowrap'}}>
      <div style={{width:8,height:8,borderRadius:'50%',background:accent}}/>
      <span style={{fontSize:14,fontWeight:600,color:'#fff'}}>{message}</span>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(-16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
    </div>
  );
}
export function StreamingBadges({ movieId, mediaType, title, year }) {
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
  useEffect(() => { if (movie?.id) track('title_open', { id: String(movie.id), tv: !!(movie.isTV || movie.mediaType === 'tv') }); }, [movie?.id]); // eslint-disable-line react-hooks/exhaustive-deps
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
  const [showShare, setShowShare] = useState(false);
  const mentionsRef = useRef([]);
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
      const mentions = mentionsRef.current; mentionsRef.current = [];
      const res = await fetch('/api/reviews', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ movieId: movie?.id, movieTitle: movie?.title, moviePoster: movie?.poster || null, mediaType: movie?.mediaType === 'tv' || movie?.isTV ? 'tv' : 'movie', text, rating:0, parentId, time: ts, mentions }) });
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
      {showShare&&<ShareSheet movie={movie} accent={accent} onClose={()=>setShowShare(false)}/>}
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
        <div style={{display:'flex',alignItems:'flex-start',gap:12,marginBottom:9}}>
          <h1 style={{flex:1,minWidth:0,fontFamily:T.serif,letterSpacing:'-0.02em',fontSize:'clamp(20px,5vw,27px)',fontWeight:700,color:T.text,margin:0,lineHeight:1.15,letterSpacing:-0.3}}>{movie?.title}</h1>
          <button onClick={()=>window.dispatchEvent(new CustomEvent('cine:watch-with',{detail:{movie:movie}}))} aria-label="Watch with a friend" title="Watch with a friend" style={{flexShrink:0,marginTop:2,width:34,height:34,borderRadius:'50%',background:`${accent}1a`,border:`1px solid ${accent}44`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,padding:0}}>🍿</button>
          <button onClick={()=>setShowShare(true)} aria-label="Share" style={{flexShrink:0,marginTop:2,display:'flex',alignItems:'center',gap:6,background:`${accent}1a`,border:`1px solid ${accent}44`,borderRadius:18,height:34,padding:'0 13px',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,color:accent}}>
            <SvgIcon name="share" size={13} color={accent}/>Share
          </button>
        </div>
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
                    <p style={{fontSize:13.5,color:T.text,lineHeight:1.55,margin:'0 0 5px'}}><MentionText text={c.text} accent={accent}/></p>
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
                      <p style={{fontSize:12.5,color:T.text,lineHeight:1.5,margin:'0 0 4px'}}><MentionText text={r.text} accent={accent}/></p>
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
              <div style={{position:'relative',display:'flex',gap:8,alignItems:'center'}}>
                <MentionSuggest value={commentInput} accent={accent} onPick={u=>{mentionsRef.current=[...mentionsRef.current,{user_id:u.user_id,handle:u.username}];setCommentInput(v=>applyMention(v,u));setTimeout(()=>commentInputRef.current?.focus(),0);}}/>
                <input ref={commentInputRef} value={commentInput} onChange={e=>setCommentInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&postComment()} placeholder={replyingTo?`Reply to @${replyingTo.username}...`:'Comment… type @ to tag someone'} style={{flex:1,background:T.surface2,border:`1px solid ${T.hairline}`,borderRadius:22,padding:'12px 16px',color:T.text,fontSize:14,outline:'none',fontFamily:'inherit'}}/>
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
// ── Fast pages: short-lived cache + request de-duplication for read-only API calls ──
// Screens open instantly when their data was fetched in the last minute (or prefetched),
// and two components asking for the same thing share one request. Any write clears it.
export const API_CACHE_TTL=60000;
export const CACHEABLE=/^\/api\/(activity|follows|lists|list-id|users\/|settings|reviews|watchlist|reminders|leaderboard|arcs|providers|trailer|movie-details)/;
// ── Usage tracking (first-party, no third parties): powers the week-2 retention number ──
export function anonId(){try{let id=localStorage.getItem('cs_anon');if(!id){id=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random().toString(36).slice(2)).replace(/[^a-z0-9-]/gi,'');localStorage.setItem('cs_anon',id);}return id;}catch{return null;}}
export function track(name,props){
  if(typeof window==='undefined')return;
  try{
    const body=JSON.stringify({name,props:props||null,anonId:anonId()});
    if(navigator.sendBeacon){navigator.sendBeacon('/api/track',new Blob([body],{type:'text/plain'}));return;}
    (window.__cineOrigFetch||fetch)('/api/track',{method:'POST',body,keepalive:true}).catch(()=>{});
  }catch{}
}
// Crash reporting: browser errors land in the same events table (deduped, max 5 per visit)
if(typeof window!=='undefined'&&!window.__cineErrHooked){
  window.__cineErrHooked=true;
  const seen=new Set();let n=0;
  const report=(msg,src,line,stack)=>{
    try{
      const m=String(msg||'').slice(0,200);if(!m||seen.has(m)||n>=5)return;
      if(/ResizeObserver loop|Script error\.?$|AbortError|The play\(\) request was interrupted/i.test(m))return;
      seen.add(m);n++;
      track('client_error',{msg:m,src:String(src||'').split('?')[0].slice(-80),line:line||null,stack:String(stack||'').slice(0,240),path:location.pathname});
    }catch{}
  };
  window.addEventListener('error',e=>report(e.message,e.filename,e.lineno,e.error&&e.error.stack));
  window.addEventListener('unhandledrejection',e=>{const r=e.reason;report(r&&r.message?r.message:String(r),'promise',null,r&&r.stack);});
}
// Map the app's own write calls to events, so features don't each need tracking code
export const TRACK_MAP=[[/^\/api\/watchlist/,'POST','save'],[/^\/api\/watchlist/,'DELETE','unsave'],[/^\/api\/follows/,'POST','follow'],[/^\/api\/messages/,'POST','message'],[/^\/api\/reviews/,'POST','review'],[/^\/api\/lists(\?|$)/,'POST','folder_create']];
export function trackFromRequest(path,method,init){
  try{
    if(path.startsWith('/api/status')&&method==='POST'){const b=typeof init?.body==='string'?init.body:'';if(b.includes('"view"'))return;track('status_post');return;}
    if(path.startsWith('/api/watchlist')&&method==='PATCH'){const b=typeof init?.body==='string'?init.body:'';if(b.includes('"watched":true'))track('watched');return;}
    const hit=TRACK_MAP.find(([re,m])=>m===method&&re.test(path));
    if(hit)track(hit[2]);
  }catch{}
}
export function installApiCache(){
  if(typeof window==='undefined'||window.__cineFetchPatched)return;
  window.__cineFetchPatched=true;
  const orig=window.fetch.bind(window);window.__cineOrigFetch=orig;
  const store=new Map();const inflight=new Map();
  const toResponse=e=>new Response(e.body,{status:e.status,headers:{'Content-Type':e.type||'application/json'}});
  window.fetch=async(input,init={})=>{
    const url=typeof input==='string'?input:(input&&input.url)||'';
    const method=((init&&init.method)||(input&&input.method)||'GET').toUpperCase();
    let path='';try{const u=new URL(url,window.location.origin);if(u.origin===window.location.origin)path=u.pathname+u.search;}catch{}
    if(!path.startsWith('/api/'))return orig(input,init);
    if(method!=='GET'){store.clear();if(!path.startsWith('/api/track'))trackFromRequest(path,method,init);return orig(input,init);}
    if(!CACHEABLE.test(path)||(init&&init.cache==='no-store'))return orig(input,init);
    const hit=store.get(path);
    if(hit&&Date.now()-hit.at<API_CACHE_TTL)return toResponse(hit);
    if(inflight.has(path))return inflight.get(path).then(toResponse);
    const p=orig(input,init).then(async res=>{
      const body=await res.text();
      const entry={body,status:res.status,type:res.headers.get('content-type'),at:Date.now()};
      if(res.ok)store.set(path,entry);
      return entry;
    }).finally(()=>inflight.delete(path));
    inflight.set(path,p);
    return p.then(toResponse);
  };
  window.__cinePrefetch=(paths)=>paths.forEach(pth=>{window.fetch(pth).catch(()=>{});});
}
if(typeof window!=='undefined')installApiCache();
if(typeof window!=='undefined'){try{if(!sessionStorage.getItem('cs_session')){sessionStorage.setItem('cs_session','1');setTimeout(()=>track('session_start',{path:location.pathname}),1500);}}catch{}}
// ── @mentions ──
// Highlights @handles in comment text
export function MentionText({text,accent}){
  const parts=String(text||'').split(/(@[a-zA-Z0-9_.]{2,32})/g);
  return <>{parts.map((p,i)=>p.startsWith('@')&&i%2===1?<span key={i} style={{color:accent,fontWeight:700}}>{p}</span>:<span key={i}>{p}</span>)}</>;
}
// Suggestions that pop up while typing "@name" — people you follow first, then everyone
export function MentionSuggest({value,onPick,accent}){
  const[list,setList]=useState([]);
  const followingRef=useRef(null);
  const m=/(?:^|\s)@([a-zA-Z0-9_.]{0,30})$/.exec(value||'');
  const q=m?m[1].toLowerCase():null;
  useEffect(()=>{
    if(q===null){setList([]);return;}
    let alive=true;
    const run=async()=>{
      if(!followingRef.current){try{const d=await fetch('/api/follows?type=following').then(r=>r.json());followingRef.current=d.users||[];}catch{followingRef.current=[];}}
      const local=followingRef.current.filter(u=>!q||`${u.username} ${u.display_name||''}`.toLowerCase().includes(q)).slice(0,5);
      if(alive)setList(local);
      if(q.length>=2){
        try{const d=await fetch(`/api/follows?type=search&q=${encodeURIComponent(q)}`).then(r=>r.json());
          if(!alive)return;const seen=new Set(local.map(u=>u.user_id));setList([...local,...(d.users||[]).filter(u=>!seen.has(u.user_id))].slice(0,6));}catch{}
      }
    };
    const t=setTimeout(run,q.length>=2?220:0);
    return()=>{alive=false;clearTimeout(t);};
  },[q]);
  if(q===null||list.length===0)return null;
  return(
    <div style={{position:'absolute',left:0,right:0,bottom:'calc(100% + 8px)',zIndex:20,background:`linear-gradient(160deg, ${accent}2e 0%, ${accent}12 55%, rgba(255,255,255,0.04) 100%), rgba(10,10,16,0.72)`,backdropFilter:'blur(18px) saturate(140%)',WebkitBackdropFilter:'blur(18px) saturate(140%)',border:`1px solid ${accent}38`,borderRadius:12,padding:4,boxShadow:'0 -10px 30px rgba(0,0,0,0.45)',animation:'fadeIn .15s ease'}}>
      {list.map(u=>(
        <button key={u.user_id} type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>onPick(u)} style={{display:'flex',alignItems:'center',gap:10,width:'100%',background:'none',border:'none',padding:'8px 10px',cursor:'pointer',fontFamily:'inherit',textAlign:'left',borderRadius:8}}>
          <span style={{width:28,height:28,borderRadius:'50%',overflow:'hidden',background:`${accent}33`,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:accent}}>{u.avatar_url?<img src={u.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:(u.display_name||u.username||'U')[0].toUpperCase()}</span>
          <span style={{minWidth:0}}>
            <span style={{display:'block',fontSize:13,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.display_name||u.username}</span>
            <span style={{display:'block',fontSize:11,color:T.text2}}>@{u.username}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
export const applyMention=(value,u)=>String(value||'').replace(/@([a-zA-Z0-9_.]{0,30})$/,`@${u.username} `);
export const statusBg=(bg)=>bg==='#E6E6EA'?'radial-gradient(120% 90% at 0% 0%, rgba(255,255,255,0.10), transparent 60%), #000':`radial-gradient(120% 90% at 0% 0%, ${bg}cc, transparent 65%), radial-gradient(120% 90% at 100% 100%, ${bg}99, transparent 65%), linear-gradient(160deg, ${bg}55, #0B0B12)`;
// Web push: register the service worker, subscribe with the server key and store it on the account
export async function subscribePush(){
  if(typeof window==='undefined'||!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))throw new Error('unsupported');
  if(Notification.permission!=='granted'){const perm=await Notification.requestPermission();if(perm!=='granted')throw new Error('denied');}
  await navigator.serviceWorker.register('/sw.js');
  const reg=await navigator.serviceWorker.ready;
  const keyData=await fetch('/api/push-subscribe',{cache:'no-store'}).then(r=>r.json());
  if(!keyData.publicKey)throw new Error('Push is not configured yet');
  const toBytes=b=>{const pad='='.repeat((4-b.length%4)%4);const raw=atob((b+pad).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(raw,c=>c.charCodeAt(0));};
  const key=toBytes(keyData.publicKey);
  let sub=await reg.pushManager.getSubscription();
  // Re-subscribe if the existing subscription was made with a different server key
  if(sub){const cur=sub.options&&sub.options.applicationServerKey?new Uint8Array(sub.options.applicationServerKey):null;if(!cur||cur.length!==key.length||cur.some((v,i)=>v!==key[i])){try{await sub.unsubscribe();}catch{}sub=null;}}
  if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
  const res=await fetch('/api/push-subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subscription:sub.toJSON()})});
  if(!res.ok)throw new Error('Could not save subscription');
  return sub;
}
// Remember cover photo URLs on this device so profiles paint instantly on the next open
export const coverCache={
  get(id){try{return id?(JSON.parse(localStorage.getItem('cine_covers')||'{}')[id]||null):null;}catch{return null;}},
  set(id,url){try{if(!id)return;const m=JSON.parse(localStorage.getItem('cine_covers')||'{}');if(url)m[id]=url;else delete m[id];const keys=Object.keys(m);if(keys.length>60)delete m[keys[0]];localStorage.setItem('cine_covers',JSON.stringify(m));}catch{}},
};
export function CoverImg({src,style}){
  const[ok,setOk]=useState(false);
  useEffect(()=>{setOk(false);},[src]);
  return <img src={src} alt="" decoding="async" fetchpriority="high" onLoad={()=>setOk(true)} ref={el=>{if(el&&el.complete&&el.naturalWidth&&!ok)setOk(true);}} style={{...style,opacity:ok?1:0,transition:'opacity .35s ease'}}/>;
}
// USER PROFILE SHEET
// FOLLOW LIST MODAL (shows followers or following for any user, reused from UserProfileSheet)
export function FollowListModal({targetUserId,type,accent,onClose,onSelectUser}){
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
// MOVIE CARD
// HOME PATH — friends activity pulse (retention)
export function FriendsPulse({ accent, onOpenFriends, onWatchTrailer, onOpenProfile, activeIndex = 0 }) {
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
export function dayPart(){const h=new Date().getHours();if(h>=5&&h<12)return{key:'morning',title:'This morning',phrase:'this morning'};if(h>=12&&h<17)return{key:'afternoon',title:'This afternoon',phrase:'this afternoon'};if(h>=17&&h<22)return{key:'tonight',title:'Tonight',phrase:'tonight'};return{key:'late',title:'Late night',phrase:'late tonight'};}
export function ReleaseCountdown({dateStr,accent}){
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
export function daysUntil(dateStr){if(!dateStr)return null;const ms=new Date(dateStr+'T00:00:00').setHours(0,0,0,0)-new Date().setHours(0,0,0,0);return Math.round(ms/86400000);}
export function formatReleaseCountdown(dateStr){const d=daysUntil(dateStr);if(d===null)return'';if(d<=0)return'Out now';if(d===1)return'Tomorrow';if(d<=30)return`${d} days`;return new Date(dateStr+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});}
export function formatReleaseDate(dateStr){if(!dateStr)return'';return new Date(dateStr+'T00:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});}
export function MovieCard({movie,isActive,index,onFindSimilar,onAuthRequired,onSave,isSaved,isWatched,onMarkWatched,onTrailer,isReminded,onToggleReminder,onNotInterested}){
  const{isSignedIn}=useUser();
  const isUpcoming=!!movie.isUpcoming;
  const reminderBusyRef=useRef(false);
  const[remindToast,setRemindToast]=useState(null);const remindToastTimer=useRef(null);
  const[showShareSheet,setShowShareSheet]=useState(false);
  const shareMovie=async()=>{
    const url=`${typeof window!=='undefined'?window.location.origin:'https://this-scine.vercel.app'}/?m=${movie.isTV?'tv':'movie'}-${movie.id}`;
    const text=`${movie.title}${movie.year?` (${movie.year})`:''} — found it on CineScroll`;
    try{
      if(navigator.share){await navigator.share({title:movie.title,text,url});return;}
      await navigator.clipboard.writeText(`${text} ${url}`);
      flashRemind('Link copied');
    }catch(e){if(e&&e.name==='AbortError')return;try{await navigator.clipboard.writeText(url);flashRemind('Link copied');}catch{flashRemind('Could not share',false);}}
  };
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
        {[{k:'save',icon:isSaved?'check':'plus',label:isSaved?'Saved':'Save',active:isSaved,color:'#7BFF9E',filled:false,fn:()=>{if(!isSignedIn){onAuthRequired();return;}onSave(movie);}},{k:'like',icon:'heart',label:fmt(likeCount+(liked?1:0)),active:liked,color:'#FF6B8A',filled:liked,fn:handleLike},{k:'review',icon:'chat',label:'Review',active:showComments,color:'#7BC8FF',filled:false,fn:()=>setShowComments(true)},(isUpcoming?{k:'remind',icon:'bell',label:isReminded?'Reminded':'Remind',active:!!isReminded,color:'#FFD166',filled:!!isReminded,fn:toggleReminder}:{k:'seen',icon:'eye',label:isWatched?'Seen':'Seen it',active:!!isWatched,color:'#7BFFB0',filled:false,fn:()=>{if(!isSignedIn){onAuthRequired();return;}if(onMarkWatched)onMarkWatched(movie);}}),{k:'similar',icon:'similar',label:'Similar',active:false,color:accent,filled:false,fn:()=>onFindSimilar(movie)},{k:'share',icon:'share',label:'Share',active:false,color:accent,filled:false,fn:()=>setShowShareSheet(true)}].map(btn=>(
          <button key={btn.k} onClick={btn.fn} aria-label={btn.label} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,background:btn.active?`${btn.color}15`:'rgba(0,0,0,0.42)',backdropFilter:'blur(20px)',border:`1px solid ${btn.active?btn.color+'50':'rgba(255,255,255,0.09)'}`,borderRadius:18,padding:'11px 0',cursor:'pointer',width:56,boxSizing:'border-box',transition:'all 0.22s ease',boxShadow:btn.active?`0 0 16px ${btn.color}1f`:'none'}}>
            <SvgIcon name={btn.icon} size={20} color={btn.active?btn.color:'rgba(255,255,255,0.65)'} filled={btn.filled}/>
            <span style={{fontSize:9,color:btn.active?btn.color:'rgba(255,255,255,0.55)',letterSpacing:0.2,fontWeight:700,marginTop:1,textShadow:'0 1px 6px rgba(0,0,0,0.6)',whiteSpace:'nowrap'}}>{btn.label}</span>
          </button>
        ))}
      </div>
      {showShareSheet&&<ShareSheet movie={movie} accent={accent} onClose={()=>setShowShareSheet(false)}/>}
      {remindToast&&(
        <div style={{position:'absolute',left:'50%',top:'52%',transform:'translateX(-50%)',zIndex:30,pointerEvents:'none',animation:'fadeUp 0.25s ease'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,whiteSpace:'nowrap',background:'rgba(6,6,11,0.88)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',border:`1px solid ${remindToast.ok?'#FFD16655':'rgba(255,107,138,0.45)'}`,borderRadius:999,padding:'9px 16px',boxShadow:'0 10px 30px rgba(0,0,0,0.45)'}}>
            <SvgIcon name={!remindToast.ok?'close':/link/i.test(remindToast.msg)?'share':'bell'} size={14} color={remindToast.ok?'#FFD166':'#FF6B8A'} filled={remindToast.ok&&!/link/i.test(remindToast.msg)}/>
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
// Folder: a tinted back panel with a tab, the newest title's poster tucked inside like a photo,
// and a solid dark-glass pocket in front carrying the count and lock. Portrait 3:4, scales to any width.
export function FolderArt({poster,accent,locked,count,small=false}){
  const r=small?4:12;
  return(
    <div style={{position:'relative',width:'100%',aspectRatio:'5/6'}}>
      {/* tab + back panel */}
      <div style={{position:'absolute',left:0,top:0,width:'42%',height:'12%',borderRadius:`${r}px ${r}px 0 0`,background:`linear-gradient(180deg,${accent}66,${accent}40)`,clipPath:'polygon(0 0, 84% 0, 100% 100%, 0 100%)'}}/>
      <div style={{position:'absolute',left:0,right:0,top:'7%',bottom:0,borderRadius:r,background:`linear-gradient(170deg,${accent}55 0%,${accent}22 60%,rgba(255,255,255,0.04) 100%)`,border:`1px solid ${accent}40`,boxShadow:'0 12px 28px rgba(0,0,0,0.4)'}}/>
      {/* the title inside */}
      {poster?(
        <div style={{position:'absolute',left:'10%',right:'10%',top:small?'13%':'12%',bottom:'22%',borderRadius:small?2:6,overflow:'hidden',boxShadow:'0 6px 18px rgba(0,0,0,0.45)',transform:'rotate(-2deg)'}}>
          <img src={poster} alt="" loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
        </div>
      ):(
        <div style={{position:'absolute',left:0,right:0,top:'14%',bottom:'40%',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="folder" size={small?12:22} color={accent}/></div>
      )}
      {/* pocket */}
      <div style={{position:'absolute',left:0,right:0,bottom:0,height:'38%',borderRadius:r,background:`linear-gradient(180deg,${accent}30,${accent}0d), #14141B`,borderTop:`1.5px solid ${accent}aa`,boxShadow:'inset 0 1px 0 rgba(255,255,255,0.08), 0 -8px 18px rgba(0,0,0,0.35)'}}>
        {!small&&count!=null&&<div style={{position:'absolute',left:9,bottom:8,fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.85)'}}>{count} title{count===1?'':'s'}</div>}
        {locked&&<div style={{position:'absolute',right:small?3:7,bottom:small?3:6,width:small?13:18,height:small?13:18,borderRadius:'50%',background:'rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="lock" size={small?7:10} color="rgba(255,255,255,0.8)"/></div>}
      </div>
    </div>
  );
}
export function FolderCover({posters=[],accent,size=56,locked=false}){
  return(<div style={{width:size*0.8,flexShrink:0}}><FolderArt poster={(posters||[]).filter(Boolean)[0]} accent={accent} locked={locked} small/></div>);
}
export function FolderCoverFill({posters=[],accent,locked,count}){
  return(<FolderArt poster={(posters||[]).filter(Boolean)[0]} accent={accent} locked={locked} count={count}/>);
}

// ── Screens & sheets loaded on demand (each lives in its own file/chunk) ──
export const ChatWidget = dynamic(() => import('./Chat').then((m) => m.ChatWidget), { ssr: false, loading: () => null });
export const MessagesInbox = dynamic(() => import('./Messages').then((m) => m.MessagesInbox), { ssr: false, loading: () => null });
export const FriendsScreen = dynamic(() => import('./Friends').then((m) => m.FriendsScreen), { ssr: false, loading: () => null });
export const ListPlaylistPlayer = dynamic(() => import('./ListPlayer').then((m) => m.ListPlaylistPlayer), { ssr: false, loading: () => null });
export const ProfileSheet = dynamic(() => import('./Profile').then((m) => m.ProfileSheet), { ssr: false, loading: () => null });
export const ListDetailSheet = dynamic(() => import('./ListDetail').then((m) => m.ListDetailSheet), { ssr: false, loading: () => null });
export const UserProfileSheet = dynamic(() => import('./UserProfile').then((m) => m.UserProfileSheet), { ssr: false, loading: () => null });
export const StatusComposer = dynamic(() => import('./Status').then((m) => m.StatusComposer), { ssr: false, loading: () => null });
export const StatusViewer = dynamic(() => import('./Status').then((m) => m.StatusViewer), { ssr: false, loading: () => null });
export const ListsScreen = dynamic(() => import('./Lists').then((m) => m.ListsScreen), { ssr: false, loading: () => null });
export const CoverCropModal = dynamic(() => import('./CoverCrop').then((m) => m.CoverCropModal), { ssr: false, loading: () => null });
export const ShareSheet = dynamic(() => import('./Share').then((m) => m.ShareSheet), { ssr: false, loading: () => null });
export const FilterSheet = dynamic(() => import('./Filter').then((m) => m.FilterSheet), { ssr: false, loading: () => null });
export const SimilarSheet = dynamic(() => import('./Similar').then((m) => m.SimilarSheet), { ssr: false, loading: () => null });
export const NotificationsPanel = dynamic(() => import('./Notifications').then((m) => m.NotificationsPanel), { ssr: false, loading: () => null });
export const AddToListSheet = dynamic(() => import('./AddToList').then((m) => m.AddToListSheet), { ssr: false, loading: () => null });
export const CommentPanel = dynamic(() => import('./Comments').then((m) => m.CommentPanel), { ssr: false, loading: () => null });
export const PartyInvite = dynamic(() => import('./PartyInvite').then((m) => m.PartyInvite), { ssr: false, loading: () => null });
export const StartPartySheet = dynamic(() => import('./StartParty').then((m) => m.StartPartySheet), { ssr: false, loading: () => null });
export const PartyRoom = dynamic(() => import('./Party').then((m) => m.PartyRoom), { ssr: false, loading: () => null });
export const Welcome = dynamic(() => import('./Welcome').then((m) => m.Welcome), { ssr: false, loading: () => null });
export const TogetherSheet = dynamic(() => import('./Together').then((m) => m.TogetherSheet), { ssr: false, loading: () => null });
export const CreateListSheet = dynamic(() => import('./CreateList').then((m) => m.CreateListSheet), { ssr: false, loading: () => null });

// Warm the on-demand chunks while the browser is idle so first opens feel instant
export function prefetchScreens() {
  if (typeof window === 'undefined') return;
  const load = () => { import('./Chat'); import('./Messages'); import('./Friends'); import('./ListPlayer'); import('./Profile'); import('./ListDetail'); import('./UserProfile'); import('./Status'); import('./Lists'); import('./CoverCrop'); import('./Share'); import('./Filter'); import('./Similar'); import('./Notifications'); import('./AddToList'); import('./Comments'); import('./CreateList'); import('./Together'); import('./Party'); import('./StartParty'); import('./PartyInvite'); };
  if ('requestIdleCallback' in window) window.requestIdleCallback(load, { timeout: 6000 }); else setTimeout(load, 4000);
}

// ── Time labels for scheduled watch parties ──
export function fmtWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso); const now = new Date();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(d) - day(now)) / 864e5);
  if (diff === 0) return `${d.getHours() >= 17 ? 'Tonight' : 'Today'} ${time}`;
  if (diff === 1) return `Tomorrow ${time}`;
  if (diff > 1 && diff < 7) return `${d.toLocaleDateString([], { weekday: 'short' })} ${time}`;
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
}
export function untilLabel(iso, now = Date.now()) {
  const ms = Date.parse(iso) - now;
  if (!(ms > 0)) return 'now';
  const m = Math.round(ms / 60000);
  if (m < 60) return `in ${Math.max(1, m)} min`;
  const h = Math.floor(m / 60), r = m % 60;
  if (h < 24) return `in ${h}h${r ? ` ${r}m` : ''}`;
  const dd = Math.round(h / 24);
  return `in ${dd} day${dd === 1 ? '' : 's'}`;
}

// ── "Watched together" history: posters from finished watch parties ──
export function PartyHistoryRow({ target = 'me', title = 'Watched together', accent = '#F5A623', style }) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch(`/api/party?history=${encodeURIComponent(target)}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : { history: [] })).then((d) => { if (alive) setItems(d.history || []); }).catch(() => alive && setItems([]));
    return () => { alive = false; };
  }, [target]);
  if (!items || !items.length) return null;
  const open = (h) => window.dispatchEvent(new CustomEvent('cine:open-title', { detail: { id: h.movie?.id, title: h.movie?.title, poster: h.movie?.poster, backdrop: h.movie?.backdrop, year: h.movie?.year, isTV: !!h.movie?.is_tv, mediaType: h.movie?.is_tv ? 'tv' : 'movie' } }));
  return (
    <div style={style}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10.5, letterSpacing: 2.2, textTransform: 'uppercase', fontWeight: 700, color: accent }}>🍿 {title}</span>
        <span style={{ fontSize: 11.5, color: T.text2 }}>{items.length} {items.length === 1 ? 'film' : 'films'}</span>
      </div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none', margin: '12px -20px 0', padding: '0 20px 4px' }}>
        {items.map((h) => (
          <button key={h.id} onClick={() => open(h)} style={{ flexShrink: 0, width: 84, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '2/3', borderRadius: 3, overflow: 'visible' }}>
              <div style={{ width: '100%', height: '100%', borderRadius: 3, overflow: 'hidden', background: T.surface }}>{h.movie?.poster && <img src={h.movie.poster} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}</div>
              {target === 'me' && h.peer && <div style={{ position: 'absolute', right: -5, bottom: -5, width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', boxShadow: '0 0 0 2px #0B0B12', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff' }}>{h.peer.avatar_url ? <img src={h.peer.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (h.peer.display_name || '?')[0]}</div>}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', marginTop: 7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.movie?.title}</div>
            {(h.myRating || h.theirRating) && <div style={{ fontSize: 10.5, color: accent, marginTop: 2 }}>{'★'.repeat(h.myRating || h.theirRating)}</div>}
          </button>
        ))}
      </div>
    </div>
  );
}
