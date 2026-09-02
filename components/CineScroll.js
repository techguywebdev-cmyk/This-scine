'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';

// ─── DESIGN TOKENS ──────────────────────────────────────────────────────────
// Neutrals carry the visual weight since the accent color is dynamic (shifts per
// movie/mood). Borders are quiet hairlines, not boxes; separation comes from
// whitespace and the serif/sans type pairing rather than bordered containers.
const T = {
  bg:        '#06060B',            // near-black base, cinematic dim-theater feel
  surface:   '#0F0F18',            // elevated cards / sheets
  surface2:  'rgba(255,255,255,0.025)', // subtler inline surface (list rows, inputs)
  hairline:  'rgba(255,255,255,0.06)',  // default border
  hairlineStrong: 'rgba(255,255,255,0.1)',
  text:      'rgba(255,255,255,0.92)',  // primary text, off-white not pure white
  text2:     'rgba(255,255,255,0.45)',  // secondary text
  text3:     'rgba(255,255,255,0.25)',  // tertiary / caption / placeholder
  serif:     "'Playfair Display',serif",
};

// Tracked-out uppercase eyebrow label, used above stats/sections instead of bordered headers
const Eyebrow = ({ children, color = T.text3, style = {} }) => (
  <div style={{ fontSize: 9.5, letterSpacing: 2.2, color, fontWeight: 700, textTransform: 'uppercase', ...style }}>{children}</div>
);

// Large serif numeral, the hero treatment for stats/scores/counts throughout the app
const SerifStat = ({ children, size = 20, color = T.text, style = {} }) => (
  <div style={{ fontFamily: T.serif, fontSize: size, fontWeight: 800, color, lineHeight: 1.1, ...style }}>{children}</div>
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
  ctx.fillStyle='#ffffff';ctx.font='italic bold 32px Georgia, serif';ctx.textAlign='left';ctx.fillText('CineScroll',66,76);
  if(type==='score'){
    ctx.fillStyle='rgba(255,255,255,0.35)';ctx.font='600 13px sans-serif';ctx.textAlign='center';ctx.letterSpacing='4px';ctx.fillText('CINEPHILE PROFILE',W/2,152);ctx.letterSpacing='0px';
    ctx.fillStyle='#ffffff';ctx.font='italic bold 60px Georgia, serif';ctx.fillText(data.name,W/2,224);
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
    ctx.fillStyle='#ffffff';ctx.font='italic bold 54px Georgia, serif';ctx.fillText(data.name,W/2,210);
    const items=data.items.slice(0,6);const CARD_H=118,POSTER_W=72,POSTER_H=102,startY=296;
    for(let idx=0;idx<items.length;idx++){
      const m=items[idx];const cardY=startY+idx*(CARD_H+8);
      ctx.fillStyle='rgba(255,255,255,0.04)';ctx.beginPath();ctx.roundRect(36,cardY,W-72,CARD_H,16);ctx.fill();
      ctx.strokeStyle=accent+'22';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(36,cardY,W-72,CARD_H,16);ctx.stroke();
      const posterX=50,posterY=cardY+8;
      if(m.poster){const img=await loadCanvasImage(m.poster);if(img){ctx.save();ctx.beginPath();ctx.roundRect(posterX,posterY,POSTER_W,POSTER_H,10);ctx.clip();const scale=Math.max(POSTER_W/img.width,POSTER_H/img.height);ctx.drawImage(img,posterX+(POSTER_W-img.width*scale)/2,posterY+(POSTER_H-img.height*scale)/2,img.width*scale,img.height*scale);ctx.restore();}}
      const textX=50+POSTER_W+28;const title=m.title.length>22?m.title.slice(0,22)+'...':m.title;
      ctx.fillStyle='#ffffff';ctx.font='italic bold 21px Georgia, serif';ctx.textAlign='left';ctx.fillText(title,textX,cardY+36);
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
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:900,color:'#fff',lineHeight:1}}>{score}</div>
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

function StreamingBadges({movieId,mediaType}){
  const[providers,setProviders]=useState([]);
  const TMDB_KEY=process.env.NEXT_PUBLIC_TMDB_KEY;
  useEffect(()=>{
    if(!movieId||!TMDB_KEY)return;
    fetch(`https://api.themoviedb.org/3/${mediaType||'movie'}/${movieId}/watch/providers?api_key=${TMDB_KEY}`)
      .then(r=>r.json()).then(data=>{const results=data.results||{};const regionData=results['US']||results['GB']||results['CA']||Object.values(results)[0];if(!regionData)return;setProviders((regionData.flatrate||[]).slice(0,4));}).catch(()=>{});
  },[movieId,TMDB_KEY]);
  if(providers.length===0)return null;
  return(
    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
      <span style={{fontSize:9,letterSpacing:1.5,color:'rgba(255,255,255,0.35)',fontWeight:600,textTransform:'uppercase'}}>Stream on</span>
      <div style={{display:'flex',gap:5}}>
        {providers.map(p=>(<div key={p.provider_id} style={{width:24,height:24,borderRadius:6,overflow:'hidden',border:'1px solid rgba(255,255,255,0.15)'}}><img src={`https://image.tmdb.org/t/p/original${p.logo_path}`} alt={p.provider_name} style={{width:'100%',height:'100%',objectFit:'cover'}}/></div>))}
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
  const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_KEY;

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
    if (!movie || !TMDB_KEY) { setNotFound(true); setLoading(false); return; }
    const mediaType = movie.mediaType || 'movie';
    Promise.all([
      fetch(`https://api.themoviedb.org/3/${mediaType}/${movie.id}/videos?api_key=${TMDB_KEY}`).then(r=>r.json()),
      fetch(`https://api.themoviedb.org/3/${mediaType}/${movie.id}?api_key=${TMDB_KEY}&append_to_response=credits,release_dates,content_ratings`).then(r=>r.json()),
    ]).then(([videoData, detailData]) => {
      const videos = videoData.results || [];
      const trailer = videos.find(v=>v.type==='Trailer'&&v.site==='YouTube') || videos.find(v=>v.type==='Teaser'&&v.site==='YouTube') || videos.find(v=>v.site==='YouTube');
      if (trailer) setTrailerKey(trailer.key); else setNotFound(true);
      setMovieDetails(detailData);
      setCast((detailData.credits?.cast || []).slice(0, 10));
      setLoading(false);
    }).catch(() => { setNotFound(true); setLoading(false); });
  }, [movie, TMDB_KEY]);

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
  const director = (movieDetails?.credits?.crew || []).find(c => c.job === 'Director');
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
    <div style={{position:'fixed',inset:0,zIndex:90,background:T.bg,display:'flex',flexDirection:'column',animation:'playerSlideUp 0.4s cubic-bezier(0.22,1,0.36,1)',overflowY:'auto',WebkitOverflowScrolling:'touch'}}>
      <style>{`@keyframes playerSlideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}div::-webkit-scrollbar{display:none}.cast-scroll::-webkit-scrollbar{display:none}`}</style>
      <div style={{position:'relative',background:'#000',flexShrink:0}}>
        {loading&&<div style={{height:220,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12}}><div style={{width:30,height:30,border:`2.5px solid rgba(255,255,255,0.1)`,borderTop:`2.5px solid ${accent}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/><span style={{fontSize:12.5,color:T.text3}}>Loading trailer...</span></div>}
        {!loading&&notFound&&<div style={{height:180,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:8}}><SvgIcon name="play" size={28} color={T.hairlineStrong}/><div style={{fontSize:13.5,color:T.text2}}>No trailer available</div></div>}
        {!loading&&trailerKey&&<div style={{position:'relative',width:'100%',paddingBottom:'56.25%'}}><iframe src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1&playsinline=1`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen style={{position:'absolute',inset:0,width:'100%',height:'100%',border:'none'}} title={`${movie?.title} Trailer`}/></div>}
        <button onClick={onClose} style={{position:'absolute',top:12,left:12,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(10px)',border:'1px solid rgba(255,255,255,0.14)',borderRadius:10,width:32,height:32,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:5}}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
      </div>
      <div style={{padding:'18px 18px 0',flexShrink:0}}>
        <h1 style={{fontFamily:T.serif,fontSize:'clamp(20px,5vw,27px)',fontWeight:800,fontStyle:'italic',color:T.text,margin:'0 0 9px',lineHeight:1.15,letterSpacing:-0.3}}>{movie?.title}</h1>
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
          <div style={{position:'relative',display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,background:T.hairline,borderRadius:14,overflow:'hidden',marginBottom:18}}>
            <AccentGlow accent={accent} size={140} style={{right:-30,top:-50}}/>
            <div style={{position:'relative',background:T.bg,padding:'15px'}}>
              <Eyebrow style={{marginBottom:9}}>TMDB Rating</Eyebrow>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}><SvgIcon name="star" size={16} color={accent} filled/><SerifStat size={22}>{movie?.rating}</SerifStat><span style={{fontSize:12,color:T.text3}}>/10</span></div>
              <div style={{fontSize:11,color:T.text3}}>{voteCountStr} votes</div>
            </div>
            <div style={{position:'relative',background:T.bg,padding:'15px'}}>
              <Eyebrow style={{marginBottom:9}}>Your Rating</Eyebrow>
              <div style={{display:'flex',gap:4,marginBottom:4}}>
                {[1,2,3,4,5].map(s=>(<button key={s} onMouseEnter={()=>setHoverStar(s)} onMouseLeave={()=>setHoverStar(0)} onClick={()=>setUserRating(s)} style={{background:'none',border:'none',cursor:'pointer',padding:0,transition:'transform 0.1s ease',transform:hoverStar===s?'scale(1.2)':'scale(1)'}}><SvgIcon name="star" size={17} color={s<=(hoverStar||userRating)?accent:T.hairlineStrong} filled={s<=(hoverStar||userRating)}/></button>))}
              </div>
              <div style={{fontSize:11,color:T.text3}}>{userRating>0?`${userRating}/5 stars`:'Rate this movie'}</div>
            </div>
          </div>
          {showAddToList&&<AddToListSheet movie={movie} onClose={()=>setShowAddToList(false)} accent={accent}/>}
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
          <StreamingBadges movieId={movie?.id} mediaType={movie?.mediaType}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,background:T.hairline,borderRadius:14,overflow:'hidden',marginBottom:20,marginTop:8}}>
            {[
              {icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="7" width="4" height="10"/><path d="M6 7l4-4 4 4M14 7v10M18 7l2 2v6l-2 2"/></svg>,label:'Director',value:director?.name||'—'},
              {icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,label:'Release Date',value:releaseDateFormatted||'—'},
              {icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg>,label:'Runtime',value:runtimeStr||'—'},
              {icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>,label:'Language',value:language||'—'},
            ].map((m,i)=>(
              <div key={i} style={{background:T.bg,padding:'14px',display:'flex',alignItems:'center',gap:12}}>
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
                <span style={{fontSize:17,fontWeight:800,color:T.text,fontFamily:T.serif,fontStyle:'italic'}}>Cast</span>
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
          {viewingProfile&&<UserProfileSheet userId={viewingProfile} onClose={()=>setViewingProfile(null)} accent={accent} onWatchTrailer={()=>{}} onAddToWatchlist={onSave}/>}
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
                    <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:5}}>
                      <button onClick={()=>setViewingProfile(c.user_id)} style={{background:'none',border:'none',cursor:'pointer',padding:0,fontFamily:'inherit'}}><span style={{fontSize:13,fontWeight:600,color:T.text}}>@{c.username}</span></button>
                      {c.time&&(<span style={{fontSize:10,color:accent,background:`${accent}16`,border:`1px solid ${accent}2e`,borderRadius:10,padding:'1px 8px',fontWeight:700,display:'inline-flex',alignItems:'center',gap:3}}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg>{c.time}</span>)}
                      <span style={{fontSize:10,color:T.text3,marginLeft:'auto'}}>{timeAgo(c.created_at)}</span>
                    </div>
                    <p style={{fontSize:13.5,color:T.text2,lineHeight:1.55,margin:'0 0 7px'}}>{c.text}</p>
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
  );
}
// PROFILE SHEET
// COVER CROP MODAL (Twitter-style drag-to-reposition + zoom, exports a compressed JPEG)
function CoverCropModal({file,onCancel,onSave,accent,aspect=2.2,title='Adjust Cover Photo',outputWidth=1200,roundPreview=false}){
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
      ctx.drawImage(fullResImg,srcX,srcY,srcW,srcH,0,0,OUT_W,OUT_H);
      canvas.toBlob(blob=>{setSaving(false);if(blob)onSave(blob);},'image/jpeg',0.9);
    };
    fullResImg.onerror=()=>{
      // fall back to the already-rendered element if a fresh decode fails for any reason
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
          <input type="range" min="1" max="3" step="0.01" value={scale} onChange={onZoomChange} style={{flex:1,accentColor:accent}}/>
          <SvgIcon name="search" size={17} color="rgba(255,255,255,0.4)"/>
        </div>
      </div>
    </div>
  );
}

function ProfileSheet({onClose,accent,watchlist,setWatchlist,userReviews,loadingData}){
  const{user}=useUser();const{signOut}=useClerk();
  const[tab,setTab]=useState('profile');const[signingOut,setSigningOut]=useState(false);const[signedOut,setSignedOut]=useState(false);const[sharing,setSharing]=useState(false);const[toast,setToast]=useState(null);const[watchlistSearch,setWatchlistSearch]=useState('');const[watchlistFilter,setWatchlistFilter]=useState('all');const[watchlistSort,setWatchlistSort]=useState('date');const[playerMovie,setPlayerMovie]=useState(null);
  const[watchlistPublic,setWatchlistPublic]=useState(true);const[loadingSettings,setLoadingSettings]=useState(true);
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
    fetch('/api/settings').then(r=>r.json()).then(d=>{setWatchlistPublic(d.watchlist_public!==false);setBio(d.bio||'');setBioInput(d.bio||'');setCoverUrl(d.cover_url||null);setNickname(d.nickname||'');setNicknameInput(d.nickname||'');setLoadingSettings(false);}).catch(()=>setLoadingSettings(false));
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
  const filteredWatchlist=watchlist.filter(m=>{if(watchlistFilter==='movies'&&m.is_tv)return false;if(watchlistFilter==='tv'&&!m.is_tv)return false;if(watchlistSearch&&!m.title?.toLowerCase().includes(watchlistSearch.toLowerCase()))return false;return true;}).sort((a,b)=>{if(watchlistSort==='rating')return parseFloat(b.rating||0)-parseFloat(a.rating||0);if(watchlistSort==='title')return(a.title||'').localeCompare(b.title||'');return(b.saved_at||0)-(a.saved_at||0);});
  const handleWatchlistItemClick=(item)=>{setPlayerMovie({id:item.movie_id,title:item.title,year:item.year,rating:item.rating,poster:item.poster,backdrop:item.backdrop,genre:item.genre,overview:item.overview,accent:item.accent||accent,mediaType:item.is_tv?'tv':'movie',certification:item.certification||''});};
  return(
    <>
    {playerMovie&&<InlinePlayer movie={playerMovie} onClose={()=>setPlayerMovie(null)} accent={playerMovie.accent||accent}/>}
    {cropFile&&<CoverCropModal file={cropFile} accent={accent} onCancel={handleCropCancel} onSave={handleCropSave}/>}
    {avatarCropFile&&<CoverCropModal file={avatarCropFile} accent={accent} onCancel={handleAvatarCropCancel} onSave={handleAvatarCropSave} aspect={1} title="Adjust Profile Photo" outputWidth={600} roundPreview/>}
    {showOwnPreview&&user&&<UserProfileSheet userId={user.id} onClose={()=>setShowOwnPreview(false)} accent={accent} onWatchTrailer={setPlayerMovie}/>}
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,0.82)',backdropFilter:'blur(20px)',display:'flex',alignItems:'flex-end',animation:'fadeIn 0.2s ease'}}>
      {toast&&<Toast message={toast} accent={accent}/>}
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',height:'92%',background:T.bg,borderRadius:'28px 28px 0 0',border:`1px solid ${T.hairline}`,borderBottom:'none',display:'flex',flexDirection:'column',animation:'sheetUp 0.35s cubic-bezier(0.22,1,0.36,1)'}}>
        <style>{`@keyframes sheetUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={{width:32,height:3,borderRadius:2,background:'rgba(255,255,255,0.14)',margin:'14px auto 0',flexShrink:0}}/>
        <div style={{padding:'16px 18px 0',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <span style={{fontFamily:T.serif,fontSize:21,fontWeight:800,fontStyle:'italic',color:T.text}}>My Profile</span>
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            <button onClick={()=>setShowOwnPreview(true)} title="Preview public profile" style={{background:'transparent',border:'none',width:30,height:30,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="eye" size={15} color={T.text2}/></button>
            <button onClick={()=>{bioRef.current?.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>bioRef.current?.focus(),300);}} title="Edit Profile" style={{background:'transparent',border:'none',width:30,height:30,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="edit" size={15} color={T.text2}/></button>
            <button onClick={onClose} style={{background:'transparent',border:'none',width:30,height:30,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="close" size={15} color={T.text2}/></button>
          </div>
        </div>
        <div style={{display:'flex',padding:'18px 18px 0',gap:24,flexShrink:0,borderBottom:`1px solid ${T.hairline}`}}>
          {['profile','watchlist','reviews'].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{background:'none',border:'none',cursor:'pointer',padding:'0 0 14px',fontFamily:'inherit',fontSize:13,fontWeight:tab===t?700:500,color:tab===t?accent:T.text3,borderBottom:`2px solid ${tab===t?accent:'transparent'}`,transition:'all 0.2s ease',textTransform:'capitalize',letterSpacing:0.2}}>
              {t}{t==='watchlist'&&watchlist.length>0?` (${watchlist.length})`:''}
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
              <button onClick={()=>coverInputRef.current?.click()} disabled={uploadingCover} style={{position:'relative',width:'100%',aspectRatio:'2.2',borderRadius:18,overflow:'hidden',border:`1px solid ${T.hairline}`,background:coverUrl?`url(${coverUrl})`:`linear-gradient(150deg,${accent}1f,${T.surface})`,backgroundSize:'cover',backgroundPosition:'center',cursor:'pointer',padding:0,display:'block'}}>
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
                  <div style={{fontSize:19,fontWeight:800,color:T.text,fontFamily:T.serif,fontStyle:'italic',lineHeight:1.2}}>{nickname||user?.firstName||user?.username||'Cinephile'}</div>
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
                    <div style={{fontSize:12,color:T.text2,lineHeight:1.5,marginBottom:9}}>{cineScore<100?'Just getting started!':cineScore<300?'Casual viewer.':cineScore<600?'Dedicated cinephile.':'Elite connoisseur.'}</div>
                    <button onClick={async()=>{setSharing(true);try{const d=await generateShareCard('score',{score:cineScore,name:user?.firstName||user?.username||'Cinephile',watched,reviews,saved},accent);await shareImage(d,'My CineScore',`My CineScore is ${cineScore}!`);showToast('Share card ready!');}catch(e){console.error(e);}setSharing(false);}} disabled={sharing} style={{background:'none',border:'none',padding:0,cursor:'pointer',fontSize:11,color:accent,fontWeight:600,fontFamily:'inherit',display:'flex',alignItems:'center',gap:5,opacity:sharing?0.6:1}}>
                      <SvgIcon name="share" size={11} color={accent}/>{sharing?'Preparing…':'Share Score'}
                    </button>
                  </div>
                </div>
                <div style={{position:'relative',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:1,background:T.hairline,borderRadius:14,overflow:'hidden'}}>
                  {[{label:'Titles',value:saved},{label:'Watched',value:watched},{label:'Reviews',value:reviews}].map(s=>(
                    <div key={s.label} style={{background:T.bg,padding:'14px 6px',textAlign:'center'}}>
                      <SerifStat size={21}>{s.value}</SerifStat>
                      <Eyebrow style={{marginTop:4,fontSize:8.5}}>{s.label}</Eyebrow>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,marginBottom:26,background:T.hairline,borderRadius:14,overflow:'hidden'}}>
                {[{label:'Avg Rating',value:avgRating,icon:'star'},{label:'Genres Explored',value:Object.keys(topGenres).length,icon:'gem'}].map(s=>(
                  <div key={s.label} style={{background:T.bg,padding:'14px'}}>
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
              <button onClick={handleSignOut} disabled={signingOut||signedOut} style={{width:'100%',background:signedOut?`${accent}10`:'rgba(255,255,255,0.03)',border:`1px solid ${signedOut?accent+'44':'rgba(255,255,255,0.07)'}`,borderRadius:14,padding:'13px',cursor:signingOut||signedOut?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,fontFamily:'inherit',transition:'all 0.3s ease'}}>
                {signedOut?(<><div style={{width:16,height:16,borderRadius:'50%',background:accent,display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="check" size={10} color="#000"/></div><span style={{fontSize:13,color:accent,fontWeight:600}}>Signed out</span></>):signingOut?(<><div style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.1)',borderTop:'2px solid rgba(255,255,255,0.6)',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/><span style={{fontSize:13,color:'rgba(255,255,255,0.5)'}}>Signing out...</span></>):(<><SvgIcon name="logout" size={15} color="rgba(255,255,255,0.4)"/><span style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>Sign out</span></>)}
              </button>
            </div>
          )}
          {tab==='watchlist'&&(
            <div>
              <div style={{margin:'16px 18px 0',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:1,background:T.hairline,borderRadius:14,overflow:'hidden'}}>
                <div style={{background:T.bg,padding:'13px 8px',textAlign:'center'}}><SerifStat size={18}>{watchlist.length}</SerifStat><Eyebrow style={{marginTop:3,fontSize:8.5}}>Titles</Eyebrow></div>
                <div style={{background:T.bg,padding:'13px 8px',textAlign:'center'}}><SerifStat size={18} color={accent}>{avgRating}</SerifStat><Eyebrow style={{marginTop:3,fontSize:8.5}}>Avg Rating</Eyebrow></div>
                <div style={{background:T.bg,padding:'13px 8px',textAlign:'center'}}><SerifStat size={18} color="#7BC8FF">{watched}</SerifStat><Eyebrow style={{marginTop:3,fontSize:8.5}}>Watched</Eyebrow></div>
              </div>
              <div style={{padding:'14px 18px 6px',display:'flex',flexDirection:'column',gap:9}}>
                <div style={{position:'relative'}}><div style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)'}}><SvgIcon name="search" size={13} color={T.text3}/></div><input value={watchlistSearch} onChange={e=>setWatchlistSearch(e.target.value)} placeholder="Search watchlist..." style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${T.hairline}`,borderRadius:12,padding:'9px 12px 9px 34px',color:T.text,fontSize:13,outline:'none',fontFamily:'inherit'}}/></div>
                <div style={{display:'flex',gap:5,alignItems:'center'}}>
                  <div style={{display:'flex',gap:4,flex:1}}>{[['all','All'],['movies','Movies'],['tv','TV']].map(([val,label])=>(<button key={val} onClick={()=>setWatchlistFilter(val)} style={{flex:1,background:watchlistFilter===val?accent:'transparent',border:`1px solid ${watchlistFilter===val?accent:T.hairlineStrong}`,borderRadius:20,padding:'5px 6px',cursor:'pointer',fontSize:11,fontWeight:watchlistFilter===val?700:500,color:watchlistFilter===val?'#07070F':T.text2,fontFamily:'inherit',transition:'all 0.2s ease'}}>{label}</button>))}</div>
                  <select value={watchlistSort} onChange={e=>setWatchlistSort(e.target.value)} style={{background:T.surface2,border:`1px solid ${T.hairline}`,borderRadius:20,padding:'5px 8px',color:T.text2,fontSize:11,outline:'none',fontFamily:'inherit',cursor:'pointer'}}><option value="date">Date added</option><option value="rating">Rating</option><option value="title">A-Z</option></select>
                </div>
              </div>
              {loadingData?(<div style={{textAlign:'center',padding:24,color:T.text3,fontSize:13,display:'flex',flexDirection:'column',alignItems:'center',gap:8}}><div style={{width:20,height:20,border:`2px solid rgba(255,255,255,0.1)`,borderTop:`2px solid ${accent}`,borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>Loading...</div>)
              :filteredWatchlist.length===0?(<div style={{textAlign:'center',padding:'24px 20px',display:'flex',flexDirection:'column',alignItems:'center',gap:10}}><SvgIcon name="bookmark" size={26} color={T.hairlineStrong}/><div style={{fontSize:13.5,color:T.text3}}>{watchlistSearch?'No matches':'Your watchlist is empty'}</div></div>)
              :(
                <div style={{display:'flex',flexDirection:'column',padding:'0 18px 12px'}}>
                  {filteredWatchlist.map((m,i)=>(
                    <div key={m.movie_id} style={{display:'flex',gap:10,alignItems:'flex-start',padding:'13px 0',borderTop:i>0?`1px solid ${T.hairline}`:'none'}}>
                      <div style={{width:18,textAlign:'center',flexShrink:0,marginTop:5}}><span style={{fontSize:11,fontWeight:800,fontFamily:T.serif,color:i<3?accent:T.text3}}>{i+1}</span></div>
                      <button onClick={()=>handleWatchlistItemClick(m)} style={{width:52,height:72,borderRadius:10,flexShrink:0,overflow:'hidden',background:m.gradient||GRADS[i%GRADS.length],position:'relative',border:'none',cursor:'pointer',padding:0}}>
                        {m.poster&&<img src={m.poster} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
                        {m.watched&&<div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="check" size={14} color={accent}/></div>}
                        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:22,height:22,borderRadius:'50%',background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="play" size={10} color="#fff" filled/></div></div>
                      </button>
                      <div style={{flex:1,minWidth:0}}>
                        <button onClick={()=>handleWatchlistItemClick(m)} style={{background:'none',border:'none',cursor:'pointer',padding:0,textAlign:'left',width:'100%'}}>
                          <div style={{display:'flex',alignItems:'flex-start',gap:5,marginBottom:3}}><span style={{fontSize:14,fontWeight:700,color:m.watched?T.text3:T.text,fontFamily:T.serif,fontStyle:'italic',lineHeight:1.2,textDecoration:m.watched?'line-through':'none'}}>{m.title}</span>{m.is_tv&&<span style={{fontSize:9,color:'#7BC8FF',border:'1px solid #7BC8FF44',borderRadius:4,padding:'1px 4px',flexShrink:0,marginTop:2,fontWeight:700}}>TV</span>}</div>
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
                  <div style={{display:'flex',alignItems:'center',gap:10,padding:'16px 0 4px',justifyContent:'center',marginTop:4,borderTop:`1px solid ${T.hairline}`}}>
                    <SvgIcon name="plus" size={13} color={T.text3}/>
                    <div><div style={{fontSize:12,color:T.text2,fontWeight:500}}>Add something to your watchlist</div><div style={{fontSize:10,color:T.text3,marginTop:1}}>Find your next great watch</div></div>
                  </div>
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
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><span style={{fontSize:14,fontWeight:700,color:T.text,fontFamily:T.serif,fontStyle:'italic'}}>{r.movie_title}</span><span style={{fontSize:11,color:T.text3}}>{r.time}</span></div>
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
      <div onClick={e=>e.stopPropagation()} style={{position:'relative',width:'100%',background:T.bg,borderRadius:'24px 24px 0 0',border:`1px solid ${T.hairline}`,borderBottom:'none',padding:'0 24px 48px',animation:'sheetUp 0.32s cubic-bezier(0.22,1,0.36,1)',overflow:'hidden'}}>
        <AccentGlow accent={accent} size={200} style={{left:'50%',top:0,transform:'translateX(-50%)'}}/>
        <div style={{width:32,height:3,borderRadius:2,background:'rgba(255,255,255,0.14)',margin:'14px auto 26px',position:'relative'}}/>
        <div style={{position:'relative',textAlign:'center',marginBottom:26}}>
          <div style={{fontFamily:T.serif,fontSize:25,fontWeight:800,fontStyle:'italic',color:T.text,marginBottom:9}}>Join CineScroll</div>
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
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxHeight:'75%',background:T.bg,borderRadius:'24px 24px 0 0',border:`1px solid ${T.hairline}`,borderBottom:'none',display:'flex',flexDirection:'column',animation:'sheetUp 0.3s cubic-bezier(0.22,1,0.36,1)'}}>
        <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={{width:32,height:3,borderRadius:2,background:'rgba(255,255,255,0.14)',margin:'14px auto 0',flexShrink:0}}/>
        <div style={{padding:'16px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0,borderBottom:`1px solid ${T.hairline}`}}>
          <span style={{fontFamily:T.serif,fontSize:17,fontWeight:800,fontStyle:'italic',color:T.text,textTransform:'capitalize'}}>{type}</span>
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
 
