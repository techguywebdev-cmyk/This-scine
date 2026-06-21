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
          {onSave&&(
            <button onClick={()=>onSave(movie)} style={{width:'100%',background:isSaved?`${accent}16`:T.surface2,border:`1px solid ${isSaved?accent+'4a':T.hairline}`,borderRadius:14,padding:'14px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,fontFamily:'inherit',marginBottom:18,transition:'all 0.2s ease'}}>
              <SvgIcon name={isSaved?'check':'plus'} size={16} color={isSaved?accent:T.text2}/>
              <span style={{fontSize:13.5,fontWeight:600,color:isSaved?accent:T.text2}}>{isSaved?'Saved to Watchlist':'Add to Watchlist'}</span>
            </button>
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

function MoodScreen({onClose,onMoodSelect,accent}){
  const[activeMood,setActiveMood]=useState(null);const[loading,setLoading]=useState(false);const[moodInput,setMoodInput]=useState('');const[showInput,setShowInput]=useState(false);const[timeGreeting,setTimeGreeting]=useState('tonight');
  useEffect(()=>{const h=new Date().getHours();if(h>=5&&h<12)setTimeGreeting('this morning');else if(h>=12&&h<17)setTimeGreeting('this afternoon');else if(h>=17&&h<21)setTimeGreeting('this evening');else setTimeGreeting('tonight');},[]);
  const handleSelect=async(mood)=>{setActiveMood(mood.label);setLoading(true);await onMoodSelect(mood);setLoading(false);onClose();};
  const handleSurprise=()=>handleSelect(FEEL_MOODS[Math.floor(Math.random()*FEEL_MOODS.length)]);
  const handleTextMood=async()=>{
    if(!moodInput.trim())return;
    const lower=moodInput.toLowerCase();
    const keywords={Inspired:['triumph','courage','motivat','inspir','uplifting','hope'],Thrilled:['thrill','action','suspense','tension','adrenaline'],Scared:['scar','horror','creep','ghost','monster','terrif'],Romantic:['love','romanc','relationship','couple','sweet'],'Mind-blown':['mind','twist','complex','thought','sci-fi','confus'],Laugh:['laugh','fun','comedy','funny','humor'],Emotional:['cry','sad','emotion','moving','tears','feel'],Epic:['epic','adventure','grand','hero','battle','quest'],Dark:['dark','crime','noir','gritty','bleak'],Nostalgic:['nostalg','classic','old','vintage','retro','childhood']};
    let best=null,bestScore=0;
    for(const[label,words]of Object.entries(keywords)){const score=words.filter(w=>lower.includes(w)).length;if(score>bestScore){bestScore=score;best=label;}}
    handleSelect(FEEL_MOODS.find(m=>m.label===best)||FEEL_MOODS[0]);
  };
  const moodBgs={Inspired:'https://image.tmdb.org/t/p/w780/mDfJG3LC3Dqb67AZ52x3Z0jU0uB.jpg',Thrilled:'https://image.tmdb.org/t/p/w780/qNBAXBIQlnOThrVvA6mA2B5ggV6.jpg',Scared:'https://image.tmdb.org/t/p/w780/xazWoLealQwEgqZ89MLZklLZD3k.jpg',Romantic:'https://image.tmdb.org/t/p/w780/yFihWxQcmqcaBR31QM6Y8gT6aYV.jpg','Mind-blown':'https://image.tmdb.org/t/p/w780/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',Laugh:'https://image.tmdb.org/t/p/w780/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',Emotional:'https://image.tmdb.org/t/p/w780/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',Epic:'https://image.tmdb.org/t/p/w780/2u7zbn8EudG6kLlBzUYqP8RyFU4.jpg',Dark:'https://image.tmdb.org/t/p/w780/eFMHFX0EopqOdwGqJTg1vJ2EsON.jpg',Nostalgic:'https://image.tmdb.org/t/p/w780/qJ2tW6WMQbzezjXI3LCOedfRGGV.jpg'};
  const heroBg='https://image.tmdb.org/t/p/w1280/rAiYTfKGqDCRIIqo664sY9XMIfl.jpg';
  return(
    <div style={{position:'fixed',inset:0,zIndex:90,background:'linear-gradient(160deg,#07070F 0%,#0A0A18 60%,#060610 100%)',overflowY:'auto',WebkitOverflowScrolling:'touch',scrollbarWidth:'none',animation:'moodFadeIn 0.3s ease'}}>
      <style>{`@keyframes moodFadeIn{from{opacity:0}to{opacity:1}}@keyframes cardIn{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.mood-btn:active{transform:scale(0.96)!important}div::-webkit-scrollbar{display:none}`}</style>
      <div style={{position:'relative',minHeight:340,display:'flex',flexDirection:'column',justifyContent:'flex-end',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,backgroundImage:`url(${heroBg})`,backgroundSize:'cover',backgroundPosition:'center 30%'}}/>
        <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(7,7,15,0.4) 0%,rgba(7,7,15,0.2) 30%,rgba(7,7,15,0.85) 70%,rgba(7,7,15,1) 100%)'}}/>
        <div style={{position:'absolute',inset:0,background:'linear-gradient(to right,rgba(7,7,15,0.6) 0%,transparent 60%)'}}/>
        <button onClick={onClose} style={{position:'absolute',top:52,right:18,background:'rgba(0,0,0,0.4)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:'50%',width:38,height:38,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2}}><SvgIcon name="close" size={14} color="rgba(255,255,255,0.8)"/></button>
        <div style={{position:'relative',zIndex:1,padding:'52px 20px 28px'}}>
          <div style={{fontSize:10,letterSpacing:4,color:accent,fontWeight:700,textTransform:'uppercase',marginBottom:14}}>Mood Discovery</div>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:'clamp(28px,8vw,46px)',fontWeight:900,color:'#fff',margin:'0 0 10px',lineHeight:1.05,letterSpacing:'-0.5px',maxWidth:460,textShadow:'0 2px 20px rgba(0,0,0,0.5)'}}>How do you want<br/>to feel {timeGreeting}?</h1>
          <p style={{fontSize:14,color:'rgba(255,255,255,0.55)',margin:'0 0 22px',lineHeight:1.6,maxWidth:340}}>Pick a mood or describe what you are in the mood for.</p>
          <div style={{marginBottom:18}}>
            {showInput?(
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input autoFocus value={moodInput} onChange={e=>setMoodInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleTextMood()} placeholder="e.g. something that makes me cry..." style={{flex:1,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(12px)',border:`1px solid ${accent}55`,borderRadius:14,padding:'12px 16px',color:'#fff',fontSize:14,outline:'none',fontFamily:'inherit'}}/>
                <button onClick={handleTextMood} style={{background:accent,border:'none',borderRadius:12,width:44,height:44,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#07070F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button>
                <button onClick={()=>{setShowInput(false);setMoodInput('');}} style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,width:44,height:44,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><SvgIcon name="close" size={13} color="rgba(255,255,255,0.5)"/></button>
              </div>
            ):(
              <button onClick={()=>setShowInput(true)} style={{display:'flex',alignItems:'center',gap:8,background:'rgba(0,0,0,0.35)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:14,padding:'12px 16px',cursor:'pointer',fontFamily:'inherit',fontSize:13,color:'rgba(255,255,255,0.45)',width:'100%',textAlign:'left',maxWidth:400}}>
                <SvgIcon name="chat" size={15} color="rgba(255,255,255,0.35)"/>Describe what you are in the mood for...
              </button>
            )}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
            <button onClick={handleSurprise} disabled={loading} style={{display:'flex',alignItems:'center',gap:8,background:`linear-gradient(135deg,${accent},${accent}bb)`,border:'none',borderRadius:28,padding:'12px 22px',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:700,color:'#07070F',boxShadow:`0 4px 18px ${accent}35`,opacity:loading?0.7:1}}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="#07070F"><path d="M8 1l1.5 4.5H14l-3.75 2.75 1.5 4.5L8 10l-3.75 2.75 1.5-4.5L2 5.5h4.5L8 1z"/></svg>Surprise Me
            </button>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{display:'flex'}}>{[{bg:'linear-gradient(135deg,#F5C842,#E8A020)',e:'🎬'},{bg:'linear-gradient(135deg,#B07FEF,#7040C0)',e:'🎭'},{bg:'linear-gradient(135deg,#4DA8FF,#2060C0)',e:'🎞'},{bg:'linear-gradient(135deg,#FF6BAE,#C04070)',e:'📽'}].map((a,i)=>(<div key={i} style={{width:28,height:28,borderRadius:'50%',background:a.bg,border:'2px solid rgba(7,7,15,0.8)',marginLeft:i>0?-9:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,zIndex:4-i,position:'relative'}}>{a.e}</div>))}</div>
              <div><div style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.9)'}}>Join 12K+ film lovers</div><div style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>finding their perfect scene</div></div>
            </div>
          </div>
        </div>
      </div>
      <div style={{padding:'16px 16px 20px'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,155px),1fr))',gap:10}}>
          {FEEL_MOODS.map((mood,i)=>{
            const isActive=activeMood===mood.label;const isLoadingThis=isActive&&loading;const bg=moodBgs[mood.label];
            return(
              <button key={mood.label} className="mood-btn" onClick={()=>handleSelect(mood)} disabled={loading} style={{position:'relative',borderRadius:18,border:`1px solid ${isActive?mood.color+'55':'rgba(255,255,255,0.07)'}`,padding:0,cursor:'pointer',overflow:'hidden',minHeight:160,opacity:loading&&!isActive?0.4:1,animation:`cardIn 0.45s ease ${i*0.04}s both`,boxShadow:isActive?`0 0 28px ${mood.color}30,0 8px 24px rgba(0,0,0,0.5)`:'0 2px 10px rgba(0,0,0,0.3)',transition:'all 0.15s ease',display:'flex',flexDirection:'column',fontFamily:'inherit',textAlign:'left',background:mood.bg}}>
                {bg&&<div style={{position:'absolute',inset:0,backgroundImage:`url(${bg})`,backgroundSize:'cover',backgroundPosition:'center',opacity:0.28}}/>}
                <div style={{position:'absolute',inset:0,background:`linear-gradient(160deg,${mood.bg}ee 0%,${mood.bg}99 40%,rgba(0,0,0,0.2) 100%)`,pointerEvents:'none'}}/>
                <div style={{position:'absolute',inset:0,background:`radial-gradient(circle at 20% 20%,${mood.color}18 0%,transparent 60%)`,pointerEvents:'none'}}/>
                <div style={{position:'relative',zIndex:1,padding:'16px 14px 40px',display:'flex',flexDirection:'column',height:'100%'}}>
                  <div style={{width:44,height:44,borderRadius:12,background:`${mood.color}22`,border:`1px solid ${mood.color}40`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:12,flexShrink:0}}><MoodIcon mood={mood.label} size={22} color={mood.color}/></div>
                  <div style={{fontSize:16,fontWeight:700,color:'#fff',fontFamily:"'DM Sans',sans-serif",marginBottom:5,lineHeight:1.2}}>{mood.label}</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.45)',lineHeight:1.45,flex:1}}>{mood.desc}</div>
                </div>
                <div style={{position:'absolute',right:12,bottom:12,width:28,height:28,borderRadius:'50%',border:`1px solid ${isActive?mood.color+'66':'rgba(255,255,255,0.12)'}`,background:isActive?`${mood.color}18`:'rgba(0,0,0,0.2)',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}}>
                  {isLoadingThis?<div style={{width:10,height:10,border:`1.5px solid ${mood.color}44`,borderTop:`1.5px solid ${mood.color}`,borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>:<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5h6M6 2.5l2.5 2.5L6 7.5" stroke={isActive?mood.color:'rgba(255,255,255,0.45)'} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <div style={{position:'absolute',bottom:0,left:'15%',right:'15%',height:2,borderRadius:1,background:`linear-gradient(to right,transparent,${mood.color},transparent)`,opacity:isActive?0.8:0.25}}/>
              </button>
            );
          })}
        </div>
      </div>
      <div style={{padding:'0 16px 48px'}}>
        <div style={{background:'rgba(255,255,255,0.025)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:20,padding:'22px 16px'}}>
          <div style={{fontSize:10,letterSpacing:3,color:accent,fontWeight:700,marginBottom:18,textTransform:'uppercase',opacity:0.85}}>How it works</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
            {[{icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,title:'Pick your mood',desc:'Choose how you want to feel.'},{icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round"><path d="M12 2l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6l2-6z"/></svg>,title:'We do the magic',desc:'Films curated to your vibe.'},{icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M10 8l6 4-6 4V8z" fill={accent} fillOpacity="0.3"/></svg>,title:'Press play & enjoy',desc:'The perfect scene awaits.'}].map((s,i)=>(
              <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,textAlign:'center'}}>
                <div style={{width:40,height:40,borderRadius:'50%',background:`${accent}12`,border:`1px solid ${accent}28`,display:'flex',alignItems:'center',justifyContent:'center'}}>{s.icon}</div>
                <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.8)',lineHeight:1.3}}>{s.title}</div>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.3)',lineHeight:1.4}}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// AUTH GATE
function AuthGate({onClose,accent}){
  const{openSignIn}=useClerk();
  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(20px)',display:'flex',alignItems:'flex-end',justifyContent:'center',animation:'fadeIn 0.2s ease'}}>
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',background:'rgba(5,5,12,0.98)',borderRadius:'24px 24px 0 0',border:'1px solid rgba(255,255,255,0.08)',borderBottom:'none',padding:'0 24px 48px',animation:'sheetUp 0.32s cubic-bezier(0.22,1,0.36,1)'}}>
        <div style={{width:34,height:4,borderRadius:2,background:'rgba(255,255,255,0.1)',margin:'12px auto 24px'}}/>
        <div style={{textAlign:'center',marginBottom:24}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:900,fontStyle:'italic',color:'#fff',marginBottom:8}}>Join CineScroll</div>
          <div style={{fontSize:13,color:'rgba(255,255,255,0.45)',lineHeight:1.6}}>Sign in to leave reviews, save your watchlist, and discover films with friends.</div>
        </div>
        <button onClick={()=>{openSignIn();onClose();}} style={{width:'100%',background:'#fff',border:'none',borderRadius:14,padding:'14px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:12,marginBottom:10,fontFamily:'inherit'}}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          <span style={{fontSize:14,fontWeight:700,color:'#1a1a1a'}}>Continue with Google</span>
        </button>
        <button onClick={()=>{openSignIn();onClose();}} style={{width:'100%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:14,padding:'14px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:12,fontFamily:'inherit'}}>
          <SvgIcon name="user" size={16} color="rgba(255,255,255,0.7)"/>
          <span style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,0.7)'}}>Sign in with Email</span>
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
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:160,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',display:'flex',alignItems:'flex-end',animation:'fadeIn 0.2s ease'}}>
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxHeight:'75%',background:'rgba(10,10,18,0.99)',borderRadius:'24px 24px 0 0',border:'1px solid rgba(255,255,255,0.08)',borderBottom:'none',display:'flex',flexDirection:'column',animation:'sheetUp 0.3s cubic-bezier(0.22,1,0.36,1)'}}>
        <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={{width:34,height:4,borderRadius:2,background:'rgba(255,255,255,0.1)',margin:'12px auto 0',flexShrink:0}}/>
        <div style={{padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:800,fontStyle:'italic',color:'#fff',textTransform:'capitalize'}}>{type}</span>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,width:30,height:30,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="close" size={13} color="rgba(255,255,255,0.5)"/></button>
        </div>
        <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',padding:'10px 14px 24px'}}>
          {loading?(
            <div style={{display:'flex',justifyContent:'center',padding:30}}><div style={{width:20,height:20,border:`2px solid rgba(255,255,255,0.1)`,borderTop:`2px solid ${accent}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/></div>
          ):users.length===0?(
            <div style={{textAlign:'center',padding:'30px 16px',color:'rgba(255,255,255,0.3)',fontSize:13}}>No {type} yet</div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {users.map(u=>(
                <button key={u.user_id} onClick={()=>{onSelectUser(u.user_id);onClose();}} style={{display:'flex',alignItems:'center',gap:12,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:'10px 12px',cursor:'pointer',textAlign:'left',fontFamily:'inherit',width:'100%',boxSizing:'border-box'}}>
                  <div style={{width:40,height:40,borderRadius:'50%',background:`${accent}20`,border:`1px solid ${accent}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:700,color:accent,flexShrink:0,overflow:'hidden'}}>
                    {u.avatar_url?<img src={u.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:(u.display_name||u.username||'U')[0].toUpperCase()}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:700,color:'#fff'}}>{u.display_name||u.username}</div>
                    <div style={{fontSize:11,color:'rgba(255,255,255,0.3)'}}>@{u.username}</div>
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

  const handleFollow=async()=>{
    if(!profile)return;
    const next=!following;
    setFollowing(next);
    setProfile(p=>p?{...p,followers:next?p.followers+1:Math.max(0,p.followers-1)}:p);
    try{
      await fetch('/api/follows',{method:next?'POST':'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({targetId:userId})});
      showToast(next?`Now following @${profile.username}`:'Unfollowed');
    }catch{}
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
    return{icon:'play',label:'Activity',color:accentColor};
  };

  return(
    <>
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:108,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(10px)',display:'flex',alignItems:'flex-end',animation:'fadeIn 0.2s ease'}}>
      {toast&&<Toast message={toast} accent={accent}/>}
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxHeight:'90vh',background:'rgba(8,8,16,0.99)',borderRadius:'24px 24px 0 0',border:'1px solid rgba(255,255,255,0.08)',borderBottom:'none',display:'flex',flexDirection:'column',animation:'sheetUp 0.32s cubic-bezier(0.22,1,0.36,1)',overflow:'hidden'}}>
        <style>{`@keyframes sheetUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.profile-scroll::-webkit-scrollbar{display:none}`}</style>

        {loading?(
          <div style={{display:'flex',justifyContent:'center',padding:60}}>
            <div style={{width:26,height:26,border:`2px solid rgba(255,255,255,0.1)`,borderTop:`2px solid ${accentColor}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
          </div>
        ):!profile?(
          <div style={{textAlign:'center',padding:'40px 20px',color:'rgba(255,255,255,0.3)',fontSize:13}}>Couldn't load this profile</div>
        ):(
          <div className="profile-scroll" style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',scrollbarWidth:'none'}}>
            {/* COVER PHOTO — aspect-ratio matches CoverCropModal's export (2.2:1) so the
                saved crop displays without being re-cropped again by a mismatched container */}
            <div style={{position:'relative',width:'100%',aspectRatio:'2.2',flexShrink:0,background:coverImg?`url(${coverImg})`:`linear-gradient(135deg,${accentColor}30,#0a0a14)`,backgroundSize:'cover',backgroundPosition:'center',transition:'background-image 0.4s ease'}}>
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
              <div style={{display:'flex',alignItems:'flex-start',gap:14,marginBottom:16}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:19,fontWeight:800,color:'#fff',fontFamily:"'Playfair Display',serif",fontStyle:'italic',lineHeight:1.2}}>{profile.display_name||profile.username}</div>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginTop:2}}>@{profile.username}</div>
                  {profile.bio&&<div style={{fontSize:12,color:'rgba(255,255,255,0.55)',marginTop:5,lineHeight:1.4}}>{profile.bio}</div>}
                </div>
                {!profile.isSelf&&(
                  <button onClick={handleFollow} style={{background:following?'rgba(255,255,255,0.06)':accentColor,border:`1px solid ${following?'rgba(255,255,255,0.1)':accentColor}`,borderRadius:20,padding:'9px 20px',cursor:'pointer',fontSize:12,color:following?'rgba(255,255,255,0.5)':'#07070F',fontFamily:'inherit',fontWeight:700,flexShrink:0,transition:'all 0.2s ease'}}>
                    {following?'Following':'Follow'}
                  </button>
                )}
              </div>

              {/* STATS */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:18}}>
                {[
                  {label:'Followers',value:profile.followers,icon:'people',action:()=>setFollowListType('followers')},
                  {label:'Following',value:profile.following,icon:'userPlus',action:()=>setFollowListType('following')},
                  {label:'Watchlist',value:profile.watchlistCount,icon:'bookmark',action:()=>setTab('watchlist')},
                ].map(s=>(
                  <button key={s.label} onClick={s.action} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:'12px 8px',display:'flex',flexDirection:'column',alignItems:'center',gap:4,cursor:'pointer',fontFamily:'inherit'}}>
                    <SvgIcon name={s.icon} size={15} color={accentColor}/>
                    <div style={{fontSize:18,fontWeight:800,color:'#fff',fontFamily:"'Playfair Display',serif"}}>{s.value}</div>
                    <div style={{fontSize:10,color:'rgba(255,255,255,0.3)',fontWeight:600}}>{s.label}</div>
                  </button>
                ))}
              </div>

              {/* TOP GENRES */}
              {profile.topGenres&&profile.topGenres.length>0&&(
                <div style={{marginBottom:18}}>
                  <div style={{fontSize:10,letterSpacing:2,color:'rgba(255,255,255,0.25)',fontWeight:700,textTransform:'uppercase',marginBottom:8}}>Top Genres</div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {profile.topGenres.map(g=>(<span key={g} style={{fontSize:11,color:accentColor,background:`${accentColor}15`,border:`1px solid ${accentColor}33`,borderRadius:20,padding:'4px 12px',fontWeight:600}}>{g}</span>))}
                  </div>
                </div>
              )}

              {/* TABS */}
              <div style={{display:'flex',borderBottom:'1px solid rgba(255,255,255,0.06)',marginBottom:16}}>
                {[['activity','flame','Activity'],['watchlist','bookmark','Watchlist'],['reviews','star','Reviews'],['lists','list','Lists']].map(([t,icon,label])=>(
                  <button key={t} onClick={()=>setTab(t)} style={{flex:1,background:'none',border:'none',cursor:'pointer',padding:'0 0 10px',fontFamily:'inherit',fontSize:12,fontWeight:tab===t?700:400,color:tab===t?accentColor:'rgba(255,255,255,0.35)',borderBottom:`2px solid ${tab===t?accentColor:'transparent'}`,transition:'all 0.2s ease',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
                    <SvgIcon name={icon} size={12} color={tab===t?accentColor:'rgba(255,255,255,0.35)'} filled={t==='activity'&&tab===t}/>
                    {label}
                  </button>
                ))}
              </div>

              {/* ACTIVITY TAB */}
              {tab==='activity'&&(
                loadingActivity?(
                  <div style={{display:'flex',justifyContent:'center',padding:30}}><div style={{width:22,height:22,border:`2px solid rgba(255,255,255,0.1)`,borderTop:`2px solid ${accentColor}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/></div>
                ):activity.length===0?(
                  <div style={{textAlign:'center',padding:'24px 16px',fontSize:12,color:'rgba(255,255,255,0.25)'}}>No activity yet</div>
                ):(
                  <div style={{display:'flex',flexDirection:'column'}}>
                    {activity.map((item,i)=>{
                      const act=activityIcon(item.type);
                      return(
                        <button key={item.id||i} onClick={()=>item.movie_id&&onWatchTrailer&&onWatchTrailer({id:item.movie_id,title:item.movie_title,poster:item.movie_poster,year:item.movie_year,rating:item.movie_rating,accent:item.movie_accent||accentColor,mediaType:item.is_tv?'tv':'movie',...(item.type==='reviewed'&&item.review_id?{initialTab:'comments',highlightCommentId:item.review_id}:{})})}
                          style={{display:'flex',gap:12,padding:'12px 0',borderBottom:i<activity.length-1?'1px solid rgba(255,255,255,0.04)':'none',background:'none',border:'none',cursor:item.movie_id?'pointer':'default',textAlign:'left',fontFamily:'inherit',width:'100%'}}>
                          {item.movie_poster?(
                            <div style={{width:46,height:64,borderRadius:8,overflow:'hidden',flexShrink:0,background:GRADS[i%GRADS.length]}}><img src={item.movie_poster} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/></div>
                          ):(
                            <div style={{width:46,height:64,borderRadius:8,flexShrink:0,background:`${act.color}15`,border:`1px solid ${act.color}33`,display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name={act.icon} size={18} color={act.color}/></div>
                          )}
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                              <SvgIcon name={act.icon} size={11} color={act.color} filled={act.icon==='bookmark'||act.icon==='eye'}/>
                              <span style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>{act.label}</span>
                              <span style={{fontSize:10,color:'rgba(255,255,255,0.2)',marginLeft:'auto'}}>{timeAgo(item.created_at)}</span>
                            </div>
                            <div style={{fontSize:14,fontWeight:700,color:'#fff',fontFamily:"'Playfair Display',serif",fontStyle:'italic',marginBottom:2}}>{item.movie_title}</div>
                            {item.movie_year&&<div style={{fontSize:11,color:'rgba(255,255,255,0.3)'}}>{item.movie_year}</div>}
                            {item.type==='reviewed'&&item.movie_rating&&(
                              <div style={{display:'flex',gap:2,marginTop:4}}>{[1,2,3,4,5].map(s=><SvgIcon key={s} name="star" size={10} color={s<=Math.round(item.movie_rating/2)?accentColor:'rgba(255,255,255,0.12)'} filled={s<=Math.round(item.movie_rating/2)}/>)}</div>
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
                          <span style={{fontSize:14,fontWeight:700,color:T.text,fontFamily:T.serif,fontStyle:'italic'}}>{r.movie_title}</span>
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
                <div style={{textAlign:'center',padding:'36px 16px',display:'flex',flexDirection:'column',alignItems:'center',gap:9}}>
                  <SvgIcon name="list" size={24} color={T.hairlineStrong}/>
                  <div style={{fontSize:13,fontWeight:600,color:T.text2}}>No lists yet</div>
                  <div style={{fontSize:11,color:T.text3}}>Custom lists are coming soon</div>
                </div>
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
    <div onClick={e=>e.stopPropagation()} style={{position:'absolute',bottom:0,left:0,right:0,height:'78%',background:'rgba(4,4,8,0.98)',backdropFilter:'blur(30px)',borderRadius:'24px 24px 0 0',zIndex:50,border:'1px solid rgba(255,255,255,0.07)',borderBottom:'none',display:'flex',flexDirection:'column',animation:'sheetUp 0.32s cubic-bezier(0.22,1,0.36,1)'}}>
      <style>{`@keyframes sheetUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{width:34,height:4,borderRadius:2,background:'rgba(255,255,255,0.1)',margin:'10px auto 0',flexShrink:0}}/>
      <div style={{padding:'12px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,0.05)',flexShrink:0}}>
        <div><span style={{fontSize:15,fontWeight:700,color:'#fff'}}>Reviews</span><span style={{fontSize:12,color:'rgba(255,255,255,0.3)',marginLeft:8}}>{movie?.title}</span></div>
        <button onClick={onClose} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'50%',width:28,height:28,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="close" size={12} color="rgba(255,255,255,0.4)"/></button>
      </div>
      <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',padding:'12px 20px',display:'flex',flexDirection:'column',gap:14,scrollbarWidth:'none',minHeight:0}}>
        {loading?(
          <div style={{display:'flex',justifyContent:'center',padding:30}}>
            <div style={{width:22,height:22,border:`2px solid rgba(255,255,255,0.1)`,borderTop:`2px solid ${accent}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
          </div>
        ):comments.length===0?(
          <div style={{textAlign:'center',padding:'30px 16px',color:'rgba(255,255,255,0.25)',fontSize:13}}>No reviews yet. Be the first!</div>
        ):comments.map(c=>(
          <div key={c.id}>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setViewingProfile(c.user_id)} style={{width:32,height:32,borderRadius:'50%',background:`${accent}20`,border:`1px solid ${accent}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:accent,flexShrink:0,overflow:'hidden',padding:0,cursor:'pointer'}}>
                {c.avatar_url?<img src={c.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:(c.username||'U')[0].toUpperCase()}
              </button>
              <div style={{flex:1}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                  <button onClick={()=>setViewingProfile(c.user_id)} style={{background:'none',border:'none',cursor:'pointer',padding:0,fontFamily:'inherit'}}><span style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.65)'}}>@{c.username}</span></button>
                  <span style={{fontSize:11,color:'rgba(255,255,255,0.18)'}}>{timeAgo(c.created_at)}</span>
                </div>
                {c.rating>0&&<div style={{display:'flex',gap:2,marginBottom:4}}>{[1,2,3,4,5].map(s=><SvgIcon key={s} name="star" size={10} color={s<=c.rating?accent:'rgba(255,255,255,0.12)'} filled={s<=c.rating}/>)}</div>}
                <p style={{fontSize:13.5,color:'rgba(255,255,255,0.65)',lineHeight:1.55,margin:'0 0 6px'}}>{c.text}</p>
                <div style={{display:'flex',gap:12,alignItems:'center'}}>
                  <button onClick={()=>toggleLike(c.id)} style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center',gap:4}}>
                    <SvgIcon name="heart" size={12} color={likedLocal[c.id]?'#FF6B8A':'rgba(255,255,255,0.2)'} filled={!!likedLocal[c.id]}/>
                  </button>
                  <button onClick={()=>startReply(c)} style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center',gap:4}}>
                    <SvgIcon name="reply" size={12} color="rgba(255,255,255,0.25)"/>
                    <span style={{fontSize:11,color:'rgba(255,255,255,0.25)',fontWeight:500}}>Reply</span>
                  </button>
                  {c.isSelf&&(
                    <button onClick={()=>deleteComment(c.id,null)} style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center',gap:4,marginLeft:'auto'}}>
                      <SvgIcon name="trash" size={12} color="rgba(255,255,255,0.2)"/>
                    </button>
                  )}
                </div>
              </div>
            </div>
            {(c.replies||[]).map(r=>(
              <div key={r.id} style={{display:'flex',gap:10,marginTop:10,marginLeft:42}}>
                <button onClick={()=>setViewingProfile(r.user_id)} style={{width:26,height:26,borderRadius:'50%',background:'rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.4)',flexShrink:0,overflow:'hidden',padding:0,cursor:'pointer',border:'none'}}>
                  {r.avatar_url?<img src={r.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:(r.username||'U')[0].toUpperCase()}
                </button>
                <div style={{flex:1}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <button onClick={()=>setViewingProfile(r.user_id)} style={{background:'none',border:'none',cursor:'pointer',padding:0,fontFamily:'inherit'}}><span style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.5)'}}>@{r.username}</span></button>
                    {r.isSelf&&(
                      <button onClick={()=>deleteComment(r.id,c.id)} style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center'}}>
                        <SvgIcon name="trash" size={11} color="rgba(255,255,255,0.18)"/>
                      </button>
                    )}
                  </div>
                  <p style={{fontSize:12.5,color:'rgba(255,255,255,0.5)',lineHeight:1.5,margin:0}}>{r.text}</p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      {replyingTo&&<div style={{padding:'6px 20px',background:'rgba(255,255,255,0.04)',borderTop:'1px solid rgba(255,255,255,0.05)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}><span style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>Replying to <span style={{color:accent}}>@{replyingTo.username}</span></span><button onClick={()=>{setReplyingTo(null);setInput('');}} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:14,padding:0}}>x</button></div>}
      {isSignedIn?(<div style={{padding:'10px 16px 34px',borderTop:'1px solid rgba(255,255,255,0.05)',display:'flex',gap:8,alignItems:'center',flexShrink:0,background:'rgba(4,4,8,0.98)'}}><input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&post()} placeholder={replyingTo?`Reply to @${replyingTo.username}...`:'Write a review...'} style={{flex:1,background:'rgba(255,255,255,0.06)',border:`1px solid ${replyingTo?accent+'44':'rgba(255,255,255,0.08)'}`,borderRadius:22,padding:'11px 16px',color:'#fff',fontSize:14,outline:'none',fontFamily:'inherit'}}/><button onClick={post} style={{background:accent,border:'none',borderRadius:'50%',width:40,height:40,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><SvgIcon name="send" size={14} color="#000"/></button></div>)
      :(<div style={{padding:'14px 20px 34px',borderTop:'1px solid rgba(255,255,255,0.05)',flexShrink:0,background:'rgba(4,4,8,0.98)'}}><button onClick={onAuthRequired} style={{width:'100%',background:`${accent}18`,border:`1px solid ${accent}44`,borderRadius:16,padding:'13px',cursor:'pointer',fontFamily:'inherit',fontSize:14,color:accent,fontWeight:600}}>Sign in to leave a review</button></div>)}
    </div>
    </>
  );
}

// SIMILAR SHEET
function SimilarSheet({movie,onClose,accent,onSelect}){
  const[items,setItems]=useState([]);const[loading,setLoading]=useState(true);const contentLabel=getContentLabel(movie);
  useEffect(()=>{if(!movie)return;setLoading(true);const genreIds=(movie.genreIds||movie.genre_ids||[]).join(',');fetch(`/api/movies?similar=${movie.id}&similarType=${movie.mediaType||'movie'}&similarGenres=${genreIds}`).then(r=>r.json()).then(d=>{setItems(d.movies||[]);setLoading(false);}).catch(()=>setLoading(false));},[movie]);
  return(
    <><div onClick={onClose} style={{position:'fixed',inset:0,zIndex:55,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(6px)'}}/>
    <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:60,background:'rgba(5,5,10,0.98)',backdropFilter:'blur(32px)',borderRadius:'24px 24px 0 0',border:'1px solid rgba(255,255,255,0.07)',borderBottom:'none',maxHeight:'75vh',display:'flex',flexDirection:'column',animation:'sheetUp 0.32s cubic-bezier(0.22,1,0.36,1)'}}>
      <style>{`@keyframes sheetUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{width:34,height:4,borderRadius:2,background:'rgba(255,255,255,0.1)',margin:'12px auto 0',flexShrink:0}}/>
      <div style={{padding:'14px 20px 12px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,0.05)',flexShrink:0}}>
        <div><div style={{fontSize:15,fontWeight:700,color:'#fff'}}>Similar {contentLabel}</div><div style={{fontSize:12,color:accent,marginTop:1,fontStyle:'italic',fontFamily:"'Playfair Display',serif"}}>{movie?.title}</div></div>
        <button onClick={onClose} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'50%',width:28,height:28,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="close" size={12} color="rgba(255,255,255,0.4)"/></button>
      </div>
      <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',padding:'12px 20px',display:'flex',flexDirection:'column',gap:8,scrollbarWidth:'none'}}>
        {loading&&<div style={{textAlign:'center',padding:24,display:'flex',flexDirection:'column',alignItems:'center',gap:10}}><div style={{width:24,height:24,border:`2px solid rgba(255,255,255,0.1)`,borderTop:`2px solid ${accent}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/><span style={{color:'rgba(255,255,255,0.3)',fontSize:13}}>Finding similar...</span></div>}
        {!loading&&items.length===0&&<div style={{textAlign:'center',padding:24,color:'rgba(255,255,255,0.3)',fontSize:13}}>None found</div>}
        {items.map((m,i)=>(<button key={m.id} onClick={()=>{onSelect(m);onClose();}} style={{display:'flex',gap:12,alignItems:'center',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:'10px 14px',cursor:'pointer',textAlign:'left',fontFamily:'inherit'}}><div style={{width:44,height:60,borderRadius:8,flexShrink:0,overflow:'hidden',background:m.gradient||GRADS[i%GRADS.length]}}>{m.poster&&<img src={m.poster} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}</div><div style={{flex:1}}><div style={{display:'flex',alignItems:'center',gap:5,marginBottom:3}}><span style={{fontSize:13,fontWeight:700,color:'#fff',fontFamily:"'Playfair Display',serif",fontStyle:'italic'}}>{m.title}</span>{m.isTV&&<span style={{fontSize:9,color:m.accent,border:`1px solid ${m.accent}44`,borderRadius:3,padding:'1px 4px',fontWeight:700}}>TV</span>}</div><div style={{fontSize:11,color:'rgba(255,255,255,0.28)',display:'flex',alignItems:'center',gap:4}}><span>{m.year}</span><SvgIcon name="star" size={10} color={m.accent} filled/><span style={{color:m.accent,fontWeight:600}}>{m.rating}</span></div><p style={{fontSize:11,color:'rgba(255,255,255,0.3)',lineHeight:1.4,margin:'4px 0 0',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{m.overview}</p></div></button>))}
      </div>
    </div></>
  );
}




// DISCOVER / FILTER SHEET
          function FilterSheet({ show, onClose, activeGenre, activeMood, onGenre, onMood, accent, onSearchSelect }) {
  const [searchQ, setSearchQ] = useState('');
  const [searchRes, setSearchRes] = useState([]);
  const [searching, setSearching] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState(null);
  const [activePlatform, setActivePlatform] = useState(null);

  useEffect(()=>{
    if(!searchQ.trim()){setSearchRes([]);setSearching(false);return;}
    const t=setTimeout(async()=>{
      setSearching(true);
      try{const res=await fetch(`/api/movies?search=${encodeURIComponent(searchQ)}`);const data=await res.json();setSearchRes(data.movies||[]);}catch{}
      setSearching(false);
    },350);
    return()=>clearTimeout(t);
  },[searchQ]);

  const handleSearchSelect=(m)=>{
    onSearchSelect&&onSearchSelect(m);
    setSearchQ('');setSearchRes([]);
    onClose();
  };

  const MOODS_WITH_DESC = [
    { label:'Trending',    icon:'flame',   desc:"What's hot right now",  color:'#F5A623', apiMood:'trending'     },
    { label:'Top Rated',   icon:'star',    desc:'Highest rated picks',   color:'#FFD700', apiMood:'top rated'    },
    { label:'New',         icon:'sparkle', desc:'Fresh out this week',   color:'#B07FEF', apiMood:'new'          },
    { label:'Hidden Gems', icon:'gem',     desc:'Underrated classics',   color:'#FF6BAE', apiMood:'hidden gems'  },
  ];

  const QUICK_FILTERS = [
    { label:'Recently Added', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M8 18h.01"/></svg>, apiMood:'trending', apiGenre:'' },
    { label:'Coming Soon',    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/><path d="M5.05 5.05l1.41 1.41M17.54 5.05l-1.41 1.41"/></svg>, apiMood:'new', apiGenre:'' },
    { label:'International',  icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>, apiMood:'trending', apiGenre:'10749' },
    { label:'Award Winners',  icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M8 21h8M12 17v4"/><path d="M7 4H4a1 1 0 0 0-1 1v3a4 4 0 0 0 4 4"/><path d="M17 4h3a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4"/><path d="M12 14a5 5 0 0 0 5-5V4H7v5a5 5 0 0 0 5 5z"/></svg>, apiMood:'top rated', apiGenre:'' },
  ];

  const PLATFORMS = [
    { name:'Netflix',   color:'#E50914', bg:'#1a0000', logo:'N' },
    { name:'Prime',     color:'#00A8E0', bg:'#001520', logo:'P' },
    { name:'Disney+',   color:'#0063e5', bg:'#000520', logo:'D+'},
    { name:'Apple TV+', color:'#ffffff', bg:'#1a1a1a', logo:'tv'},
    { name:'Max',       color:'#002BE7', bg:'#000010', logo:'max'},
    { name:'Hulu',      color:'#1CE783', bg:'#001a0a', logo:'hulu'},
  ];

  const POPULAR = [
    { title:'Dune: Part Two', poster:'https://image.tmdb.org/t/p/w300/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg', apiMood:'trending', apiGenre:'878' },
    { title:'The Boys',       poster:'https://image.tmdb.org/t/p/w300/mY7SeH4HFFxW1hiI6cWuwCRKptN.jpg', apiMood:'trending', apiGenre:'28'  },
    { title:'Oppenheimer',    poster:'https://image.tmdb.org/t/p/w300/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', apiMood:'top rated', apiGenre:'18' },
    { title:'Spider-Man',     poster:'https://image.tmdb.org/t/p/w300/qNBAXBIQlnOThrVvA6mA2B5ggV6.jpg', apiMood:'trending', apiGenre:'28'  },
  ];

  const handleQuickFilter = (qf) => {
    const isActive = activeQuickFilter === qf.label;
    setActiveQuickFilter(isActive ? null : qf.label);
    if (!isActive) {
      onMood(qf.apiMood === 'trending' ? 'Trending' : qf.apiMood === 'top rated' ? 'Top Rated' : qf.apiMood === 'new' ? 'New' : 'Hidden Gems');
      onGenre(qf.apiGenre);
      onClose();
    }
  };

  const handlePopular = (p) => {
    onMood(p.apiMood === 'trending' ? 'Trending' : p.apiMood === 'top rated' ? 'Top Rated' : 'New');
    onGenre(p.apiGenre);
    onClose();
  };

  if (!show) return null;

  return (
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:55,background:'rgba(0,0,0,0.78)',backdropFilter:'blur(14px)',animation:'bfade 0.2s ease'}}/>
      <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:60,background:T.bg,borderRadius:'24px 24px 0 0',border:`1px solid ${T.hairline}`,borderBottom:'none',maxHeight:'92vh',display:'flex',flexDirection:'column',animation:'sheetUp 0.38s cubic-bezier(0.22,1,0.36,1)',overflow:'hidden'}}>
        <style>{`@keyframes bfade{from{opacity:0}to{opacity:1}}@keyframes sheetUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}.disc-mood:active{transform:scale(0.97)!important}div::-webkit-scrollbar{display:none}`}</style>
        <div style={{width:32,height:3,borderRadius:2,background:'rgba(255,255,255,0.14)',margin:'14px auto 0',flexShrink:0}}/>
        <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',scrollbarWidth:'none',paddingBottom:32}}>

          {/* Header */}
          <div style={{padding:'18px 18px 16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <h2 style={{fontFamily:T.serif,fontSize:23,fontWeight:800,fontStyle:'italic',color:T.text,margin:0}}>Discover</h2>
              <button onClick={onClose} style={{background:'transparent',border:'none',width:30,height:30,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <SvgIcon name="close" size={15} color={T.text2}/>
              </button>
            </div>
            <div style={{position:'relative'}}>
              <div style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',zIndex:1}}><SvgIcon name="search" size={15} color={T.text3}/></div>
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search movies, shows..."
                style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${T.hairline}`,borderRadius:14,padding:'13px 42px 13px 40px',color:T.text,fontSize:14.5,outline:'none',fontFamily:'inherit'}}
              />
              {searchQ&&(
                <button onClick={()=>setSearchQ('')} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'rgba(255,255,255,0.1)',border:'none',borderRadius:'50%',width:22,height:22,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <SvgIcon name="close" size={10} color={T.text2}/>
                </button>
              )}
            </div>
          </div>

          <div style={{padding:'0 18px 0'}}>

          {!searchQ.trim() ? (<>
            {/* MOOD */}
            <div style={{marginBottom:28}}>
              <Eyebrow color={T.text3} style={{marginBottom:13}}>Mood</Eyebrow>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,background:T.hairline,borderRadius:16,overflow:'hidden'}}>
                {MOODS_WITH_DESC.map(m => {
                  const on = activeMood === m.label;
                  return (
                    <button
                      key={m.label}
                      className="disc-mood"
                      onClick={() => { onMood(m.label); onClose(); }}
                      style={{display:'flex',alignItems:'center',gap:10,background:on?`${m.color}12`:T.bg,border:'none',padding:'14px 12px',cursor:'pointer',fontFamily:'inherit',textAlign:'left',transition:'all 0.18s ease',position:'relative',overflow:'hidden'}}
                    >
                      {on && <AccentGlow accent={m.color} size={90} style={{left:-20,top:-20}}/>}
                      <div style={{position:'relative',width:32,height:32,borderRadius:9,flexShrink:0,background:on?`${m.color}1f`:'rgba(255,255,255,0.05)',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.18s ease'}}>
                        <SvgIcon name={m.icon} size={14} color={on ? m.color : T.text2} filled={on}/>
                      </div>
                      <div style={{position:'relative',flex:1,minWidth:0}}>
                        <div style={{fontSize:13.5,fontWeight:700,color:on?T.text:'rgba(255,255,255,0.75)',marginBottom:1,lineHeight:1.2}}>{m.label}</div>
                        <div style={{fontSize:10.5,color:T.text3,lineHeight:1.3}}>{m.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* GENRE */}
            <div style={{marginBottom:28}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:13}}>
                <Eyebrow color={T.text3}>Genre</Eyebrow>
                <span style={{fontSize:12.5,color:accent,fontWeight:600,cursor:'pointer'}}>See all</span>
              </div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {GENRE_OPTIONS.map(g => {
                  const on = activeGenre === g.id;
                  return (
                    <button key={g.id} onClick={() => { onGenre(g.id); onClose(); }}
                      style={{background:on?accent:'transparent',border:`1px solid ${on?accent:T.hairlineStrong}`,borderRadius:24,padding:'8px 16px',cursor:'pointer',fontFamily:'inherit',fontSize:12.5,color:on?'#0A0A10':T.text2,fontWeight:on?700:500,transition:'all 0.18s ease'}}>
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* QUICK FILTERS */}
            <div style={{marginBottom:28}}>
              <Eyebrow color={T.text3} style={{marginBottom:13}}>Quick Filters</Eyebrow>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:1,background:T.hairline,borderRadius:14,overflow:'hidden'}}>
                {QUICK_FILTERS.map(qf => {
                  const on = activeQuickFilter === qf.label;
                  return (
                    <button key={qf.label} onClick={() => handleQuickFilter(qf)}
                      style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,background:on?`${accent}12`:T.bg,border:'none',padding:'14px 4px',cursor:'pointer',fontFamily:'inherit',transition:'all 0.18s ease'}}>
                      <div style={{color:on?accent:T.text3,transition:'color 0.18s ease'}}>{qf.icon}</div>
                      <span style={{fontSize:9.5,color:on?accent:T.text3,fontWeight:600,textAlign:'center',lineHeight:1.3}}>{qf.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PLATFORMS */}
            <div style={{marginBottom:28}}>
              <Eyebrow color={T.text3} style={{marginBottom:13}}>Platforms</Eyebrow>
              <div style={{display:'flex',gap:10,overflowX:'auto',WebkitOverflowScrolling:'touch',scrollbarWidth:'none',paddingBottom:4}}>
                {PLATFORMS.map(p => {
                  const on = activePlatform === p.name;
                  return (
                    <button key={p.name} onClick={() => { setActivePlatform(on ? null : p.name); if (!on) { onMood('Trending'); onClose(); } }}
                      style={{flexShrink:0,width:54,height:54,borderRadius:14,background:on?p.bg:T.surface2,border:`1px solid ${on?p.color+'55':T.hairline}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:p.logo.length<=2?17:11,fontWeight:800,color:on?p.color:T.text2,fontFamily:'inherit',transition:'all 0.18s ease',letterSpacing:p.logo.length>2?-0.5:0}}>
                      {p.logo}
                    </button>
                  );
                })}
                <button style={{flexShrink:0,width:56,height:56,borderRadius:14,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:1}}>
                  <span style={{fontSize:10,color:'rgba(255,255,255,0.3)',letterSpacing:1}}>...</span>
                  <span style={{fontSize:9,color:'rgba(255,255,255,0.3)',fontWeight:600,fontFamily:'inherit'}}>More</span>
                </button>
              </div>
            </div>

            {/* POPULAR SEARCHES */}
            <div style={{marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:13}}>
                <Eyebrow color={T.text3}>Popular Searches</Eyebrow>
                <span style={{fontSize:12.5,color:accent,fontWeight:600,cursor:'pointer'}}>See all</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
                {POPULAR.map((p, i) => (
                  <button key={i} onClick={() => handlePopular(p)}
                    style={{position:'relative',height:130,borderRadius:14,overflow:'hidden',border:`1px solid ${T.hairline}`,cursor:'pointer',padding:0,background:T.surface}}>
                    <div style={{position:'absolute',inset:0,backgroundImage:`url(${p.poster})`,backgroundSize:'cover',backgroundPosition:'center',opacity:0.85}}/>
                    <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,0.85) 0%,rgba(0,0,0,0.1) 50%,transparent 100%)'}}/>
                    <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'8px 10px'}}>
                      <div style={{fontSize:12,fontWeight:800,color:'#fff',fontFamily:T.serif,fontStyle:'italic',lineHeight:1.2,textShadow:'0 1px 8px rgba(0,0,0,0.8)'}}>{p.title}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </>) : (
            <div>
              {searching ? (
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:'30px 0'}}>
                  <div style={{width:22,height:22,border:`2px solid rgba(255,255,255,0.1)`,borderTop:`2px solid ${accent}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
                  <span style={{fontSize:13,color:'rgba(255,255,255,0.3)'}}>Searching...</span>
                </div>
              ) : searchRes.length===0 ? (
                <div style={{textAlign:'center',padding:'30px 16px',color:'rgba(255,255,255,0.3)',fontSize:13}}>No results for "{searchQ}"</div>
              ) : (
                <>
                  <div style={{fontSize:10,letterSpacing:2,color:'rgba(255,255,255,0.2)',fontWeight:700,marginBottom:10,textTransform:'uppercase'}}>{searchRes.length} results for "{searchQ}"</div>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {searchRes.map((m,i)=>(
                      <button key={m.id} onClick={()=>handleSearchSelect(m)} style={{display:'flex',gap:12,alignItems:'center',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:'11px 14px',cursor:'pointer',textAlign:'left',fontFamily:'inherit'}}>
                        <div style={{width:42,height:58,borderRadius:8,flexShrink:0,overflow:'hidden',background:m.gradient||GRADS[i%GRADS.length]}}>{m.poster&&<img src={m.poster} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}</div>
                        <div style={{flex:1}}>
                          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                            <span style={{fontSize:14,fontWeight:700,color:'#fff',fontFamily:"'Playfair Display',serif",fontStyle:'italic'}}>{m.title}</span>
                            {m.isTV&&<span style={{fontSize:9,color:'#7BC8FF',border:'1px solid #7BC8FF44',borderRadius:3,padding:'1px 4px',fontWeight:700}}>TV</span>}
                          </div>
                          <div style={{fontSize:11,color:'rgba(255,255,255,0.28)',display:'flex',alignItems:'center',gap:4,marginBottom:4}}>
                            <span>{m.year}</span><SvgIcon name="star" size={9} color={m.accent} filled/><span style={{color:m.accent,fontWeight:600}}>{m.rating}</span>
                          </div>
                          {m.genre&&m.genre.length>0&&<div style={{display:'flex',gap:3}}>{m.genre.slice(0,2).map(g=><span key={g} style={{fontSize:9,color:'rgba(255,255,255,0.3)',background:'rgba(255,255,255,0.05)',borderRadius:20,padding:'1px 5px'}}>{g}</span>)}</div>}
                        </div>
                        <SvgIcon name="play" size={13} color="rgba(255,255,255,0.3)" filled/>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          </div>
        </div>
      </div>
    </>
  );
}

// MOVIE CARD
function MovieCard({movie,isActive,index,onFindSimilar,onAuthRequired,onSave,isSaved,onTrailer}){
  const{isSignedIn}=useUser();
  const[liked,setLiked]=useState(false);const[userRating,setUserRating]=useState(0);const[showComments,setShowComments]=useState(false);const[showStars,setShowStars]=useState(false);const[hoverStar,setHoverStar]=useState(0);const[imgLoaded,setImgLoaded]=useState(false);const[likeCount]=useState(Math.floor(Math.random()*60+8)*100);const[showHint,setShowHint]=useState(false);
  const longPressTimer=useRef(null);const isPressingRef=useRef(false);
  const fmt=n=>n>=1000?`${(n/1000).toFixed(0)}K`:n;
  const accent=movie.accent||'#F5A623';const bgImage=movie.backdrop||movie.poster;
  const handleLike=()=>{if(!isSignedIn){onAuthRequired();return;}setLiked(p=>!p);};
  const handleRate=()=>{if(!isSignedIn){onAuthRequired();return;}setShowStars(p=>!p);};
  const onPressStart=()=>{isPressingRef.current=true;longPressTimer.current=setTimeout(()=>{if(isPressingRef.current){if(navigator.vibrate)navigator.vibrate(40);onTrailer(movie);setShowHint(false);}},600);};
  const onPressEnd=()=>{isPressingRef.current=false;clearTimeout(longPressTimer.current);};
  useEffect(()=>{if(!isActive){setShowHint(false);return;}const t=setTimeout(()=>setShowHint(true),1500);const t2=setTimeout(()=>setShowHint(false),4500);return()=>{clearTimeout(t);clearTimeout(t2);};},[isActive]);
  return(
    <div style={{position:'relative',width:'100%',height:'100%',overflow:'hidden',background:'#04040A',userSelect:'none',WebkitUserSelect:'none'}} onMouseDown={onPressStart} onMouseUp={onPressEnd} onMouseLeave={onPressEnd} onTouchStart={onPressStart} onTouchEnd={onPressEnd} onTouchCancel={onPressEnd}>
      {bgImage&&(<><div style={{position:'absolute',inset:0,backgroundImage:`url(${bgImage})`,backgroundSize:'cover',backgroundPosition:'center top',opacity:imgLoaded?(isActive?1:0.7):0,transition:'opacity 0.6s ease'}}/><img src={bgImage} alt="" onLoad={()=>setImgLoaded(true)} style={{position:'absolute',opacity:0,width:1,height:1,pointerEvents:'none'}}/></>)}
      <div style={{position:'absolute',inset:0,background:movie.gradient||GRADS[index%GRADS.length],opacity:imgLoaded?0:1,transition:'opacity 0.6s ease'}}/>
      <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 60% 25%, transparent 20%, rgba(0,0,0,0.6) 100%)',pointerEvents:'none'}}/>
      <div style={{position:'absolute',bottom:0,left:0,right:0,height:'75%',background:'linear-gradient(to top,rgba(0,0,0,0.98) 0%,rgba(0,0,0,0.85) 28%,rgba(0,0,0,0.3) 60%,transparent 100%)',pointerEvents:'none'}}/>
      <div style={{position:'absolute',top:0,left:0,right:0,height:'25%',background:'linear-gradient(to bottom,rgba(0,0,0,0.55) 0%,transparent 100%)',pointerEvents:'none'}}/>
      <div style={{position:'absolute',left:0,top:'22%',bottom:'22%',width:3,background:`linear-gradient(to bottom,transparent,${accent},transparent)`,opacity:isActive?0.55:0,transition:'opacity 0.5s ease',borderRadius:2}}/>
      <div style={{position:'absolute',inset:0,opacity:0.15,mixBlendMode:'overlay',pointerEvents:'none',backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")`}}/>
      {showHint&&isActive&&(
        <div style={{position:'absolute',top:'42%',left:'50%',transform:'translate(-50%,-50%)',zIndex:15,display:'flex',flexDirection:'column',alignItems:'center',gap:10,pointerEvents:'none',animation:'hintIn 0.4s ease'}}>
          <div style={{width:64,height:64,borderRadius:'50%',background:'rgba(0,0,0,0.65)',backdropFilter:'blur(10px)',border:`2px solid ${accent}55`,display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="play" size={24} color={accent} filled/></div>
          <div style={{background:'rgba(0,0,0,0.65)',backdropFilter:'blur(10px)',borderRadius:20,padding:'5px 14px',border:'1px solid rgba(255,255,255,0.1)'}}><span style={{fontSize:11,color:'rgba(255,255,255,0.65)',fontWeight:600}}>Hold for trailer</span></div>
          <style>{`@keyframes hintIn{from{opacity:0;transform:translate(-50%,-44%)}to{opacity:1;transform:translate(-50%,-50%)}}`}</style>
        </div>
      )}
      <div style={{position:'absolute',top:80,left:0,right:0,zIndex:10,padding:'0 16px',display:'flex',justifyContent:'space-between',alignItems:'center',opacity:isActive?1:0.5,transition:'opacity 0.4s ease'}}>
        <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(0,0,0,0.4)',backdropFilter:'blur(16px)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:20,padding:'5px 12px'}}><div style={{width:5,height:5,borderRadius:'50%',background:accent,boxShadow:`0 0 6px ${accent}`}}/><span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.55)',letterSpacing:1}}>{String(index+1).padStart(2,'0')}</span>{movie.isTV&&<span style={{fontSize:9,color:accent,fontWeight:700,marginLeft:2}}>TV</span>}</div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          {movie.certification&&<CertBadge cert={movie.certification}/>}
          <div style={{display:'flex',alignItems:'center',gap:5,background:'rgba(0,0,0,0.4)',backdropFilter:'blur(16px)',border:`1px solid ${accent}30`,borderRadius:20,padding:'5px 12px'}}><SvgIcon name="star" size={11} color={accent} filled/><span style={{fontSize:13,fontWeight:800,color:'#fff'}}>{movie.rating}</span><span style={{fontSize:10,color:'rgba(255,255,255,0.25)'}}>/10</span></div>
        </div>
      </div>
      <div style={{position:'absolute',bottom:0,left:0,right:68,padding:'0 20px 36px',zIndex:10,opacity:isActive?1:0.4,transform:isActive?'translateY(0)':'translateY(18px)',transition:'all 0.5s ease'}}>
        <div style={{display:'flex',gap:6,marginBottom:9,flexWrap:'wrap',alignItems:'center'}}>
          {(movie.genre||[]).map(g=>(<span key={g} style={{fontSize:9,letterSpacing:2.2,color:accent,fontWeight:700,textTransform:'uppercase',padding:'3px 8px',border:`1px solid ${accent}38`,borderRadius:4}}>{g}</span>))}
          {movie.isTV&&<span style={{fontSize:9,color:'rgba(255,255,255,0.35)',fontWeight:600,padding:'3px 8px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:4}}>SERIES</span>}
        </div>
        {isActive&&<StreamingBadges movieId={movie.id} mediaType={movie.mediaType}/>}
        <h2 style={{fontFamily:T.serif,fontSize:Math.min(50,Math.max(28,54-(movie.title?.length||0)*0.9)),fontWeight:800,fontStyle:'italic',color:'#fff',margin:'0 0 7px',lineHeight:1.02,letterSpacing:-0.5,textShadow:`0 0 50px ${accent}28,0 4px 26px rgba(0,0,0,0.8)`}}>{movie.title}</h2>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:13}}>
          <span style={{fontFamily:T.serif,fontSize:13,color:`${accent}bb`,fontStyle:'italic'}}>{movie.year}</span>
          <span style={{width:3,height:3,borderRadius:'50%',background:'rgba(255,255,255,0.18)'}}/>
          <div style={{display:'flex',alignItems:'center',gap:4}}><SvgIcon name="eye" size={11} color="rgba(255,255,255,0.28)"/><span style={{fontSize:12,color:'rgba(255,255,255,0.35)'}}>{movie.votes} ratings</span></div>
        </div>
        <p style={{fontSize:13.5,color:'rgba(255,255,255,0.55)',lineHeight:1.65,margin:'0 0 14px',fontWeight:400}}>{movie.overview}</p>
        {showStars&&(
          <div style={{display:'flex',gap:5,alignItems:'center',marginBottom:10,animation:'fadeUp 0.2s ease'}}>
            {[1,2,3,4,5].map(s=>(<button key={s} onMouseEnter={()=>setHoverStar(s)} onMouseLeave={()=>setHoverStar(0)} onClick={()=>{setUserRating(s);setTimeout(()=>setShowStars(false),700);}} style={{background:'none',border:'none',cursor:'pointer',padding:0,transform:hoverStar===s?'scale(1.35)':'scale(1)',transition:'transform 0.1s ease'}}><SvgIcon name="star" size={26} color={s<=(hoverStar||userRating)?accent:'rgba(255,255,255,0.14)'} filled={s<=(hoverStar||userRating)}/></button>))}
            {userRating>0&&<span style={{fontSize:12,color:accent,marginLeft:6,fontWeight:700}}>Rated {userRating}/5</span>}
          </div>
        )}
      </div>
      <div style={{position:'absolute',right:12,bottom:80,zIndex:10,display:'flex',flexDirection:'column',gap:5,alignItems:'center',opacity:isActive?1:0,transform:isActive?'translateX(0)':'translateX(28px)',transition:'all 0.45s ease 0.12s'}}>
        {[{icon:'heart',label:fmt(likeCount+(liked?1:0)),active:liked,color:'#FF6B8A',filled:liked,fn:handleLike},{icon:'star',label:userRating?`${userRating}/5`:'Rate',active:showStars||userRating>0,color:accent,filled:userRating>0,fn:handleRate},{icon:'chat',label:'Review',active:showComments,color:'#7BC8FF',filled:false,fn:()=>setShowComments(true)},{icon:'similar',label:'Similar',active:false,color:'#B07FEF',filled:false,fn:()=>onFindSimilar(movie)},{icon:'bookmark',label:isSaved?'Saved':'Save',active:isSaved,color:'#7BFF9E',filled:isSaved,fn:()=>{if(!isSignedIn){onAuthRequired();return;}onSave(movie);}}].map(btn=>(
          <button key={btn.icon} onClick={btn.fn} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,background:btn.active?`${btn.color}14`:'rgba(0,0,0,0.38)',backdropFilter:'blur(18px)',border:`1px solid ${btn.active?btn.color+'45':'rgba(255,255,255,0.08)'}`,borderRadius:18,padding:'11px 9px',cursor:'pointer',minWidth:50,transition:'all 0.22s ease',boxShadow:btn.active?`0 0 16px ${btn.color}1f`:'none'}}>
            <SvgIcon name={btn.icon} size={20} color={btn.active?btn.color:'rgba(255,255,255,0.6)'} filled={btn.filled}/>
            <span style={{fontSize:9,color:btn.active?btn.color:'rgba(255,255,255,0.25)',letterSpacing:0.3,fontWeight:700,marginTop:1}}>{btn.label}</span>
          </button>
        ))}
      </div>
      {showComments&&<CommentPanel movie={movie} onClose={()=>setShowComments(false)} accent={accent} onAuthRequired={()=>{setShowComments(false);onAuthRequired();}} onWatchTrailer={onTrailer} onAddToWatchlist={onSave}/>}
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

// NOTIFICATIONS PANEL
function NotificationsPanel({onClose,accent,notifications,loading,onMarkRead,onFollowBack}){
  const timeAgo=(ts)=>{const diff=Date.now()-new Date(ts).getTime();const mins=Math.floor(diff/60000);if(mins<1)return'now';if(mins<60)return`${mins}m`;const hrs=Math.floor(mins/60);if(hrs<24)return`${hrs}h`;return`${Math.floor(hrs/24)}d`;};
  const notifIcon=(type)=>{
    if(type==='follow')return{icon:'userPlus',color:'#7BC8FF'};
    if(type==='follow_request')return{icon:'userPlus',color:accent};
    if(type==='like')return{icon:'heart',color:'#FF6B8A'};
    return{icon:'bell',color:accent};
  };
  return(
    <>
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:105,background:'rgba(0,0,0,0.65)',backdropFilter:'blur(10px)',animation:'fadeIn 0.2s ease'}}/>
    <div style={{position:'fixed',top:0,left:0,right:0,zIndex:106,background:T.bg,borderRadius:'0 0 24px 24px',border:`1px solid ${T.hairline}`,borderTop:'none',maxHeight:'70vh',display:'flex',flexDirection:'column',animation:'notifDrop 0.32s cubic-bezier(0.22,1,0.36,1)',paddingTop:'env(safe-area-inset-top,0px)'}}>
      <style>{`@keyframes notifDrop{from{transform:translateY(-100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{padding:'18px 18px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:`1px solid ${T.hairline}`,flexShrink:0}}>
        <span style={{fontFamily:T.serif,fontSize:18,fontWeight:800,fontStyle:'italic',color:T.text}}>Notifications</span>
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
                <div key={n.id||i} onClick={()=>!n.read&&onMarkRead(n.id)} style={{display:'flex',gap:12,alignItems:'center',padding:'12px 0',borderBottom:i<notifications.length-1?`1px solid ${T.hairline}`:'none',cursor:n.read?'default':'pointer',opacity:n.read?0.5:1,transition:'opacity 0.2s ease'}}>
                  <div style={{width:38,height:38,borderRadius:'50%',background:`${ni.color}16`,border:`1px solid ${ni.color}38`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,position:'relative',overflow:'hidden'}}>
                    {n.avatar_url?<img src={n.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<SvgIcon name={ni.icon} size={16} color={ni.color}/>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,color:T.text,lineHeight:1.4}}>
                      <span style={{fontWeight:700}}>@{n.username||'someone'}</span>{' '}
                      {n.type==='follow'?'started following you':n.type==='follow_request'?'requested to follow you':n.type==='like'?'liked your review':'sent a notification'}
                    </div>
                    <div style={{fontSize:11,color:T.text3,marginTop:2}}>{timeAgo(n.created_at)} ago</div>
                  </div>
                  {n.type==='follow'&&!n.followedBack&&(
                    <button onClick={(e)=>{e.stopPropagation();onFollowBack(n);}} style={{background:accent,border:'none',borderRadius:18,padding:'6px 14px',cursor:'pointer',fontSize:11,fontWeight:700,color:'#07070F',fontFamily:'inherit',flexShrink:0}}>Follow back</button>
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
function FriendsScreen({ onClose, accent, onWatchTrailer, onAddToWatchlist }) {
  const { isSignedIn, user } = useUser();
  const [tab, setTab] = useState('feed'); // feed, friends, discover
  const [feedItems, setFeedItems] = useState([]);
  const [friends, setFriends] = useState([]);
  const [followers, setFollowers] = useState([]);
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
  const [activityFilter, setActivityFilter] = useState('all'); // all, saved, watched, reviewed
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [toast, setToast] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(null);
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
    fetch('/api/follows?type=followers')
      .then(r => r.json()).then(d => { setFollowers(d.users || []); })
      .catch(() => {});
    fetch('/api/follows?type=stats')
      .then(r => r.json()).then(d => { setStats({ following: d.following || 0, followers: d.followers || 0, pending: d.pending || 0 }); })
      .catch(() => {});
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
    setSearchRes(p => p.map(u => u.user_id === targetUser.user_id ? { ...u, isFollowing: !isFollowing } : u));
    setSuggested(p => p.map(u => u.user_id === targetUser.user_id ? { ...u, isFollowing: !isFollowing } : u));
    if (isFollowing) {
      setFriends(p => p.filter(f => f.user_id !== targetUser.user_id));
      setStats(p => ({ ...p, following: Math.max(0, p.following - 1) }));
      await fetch('/api/follows', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId: targetUser.user_id }) });
      showToast('Unfollowed');
    } else {
      setFriends(p => [{ ...targetUser, isFollowing: true }, ...p]);
      setStats(p => ({ ...p, following: p.following + 1 }));
      await fetch('/api/follows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId: targetUser.user_id }) });
      showToast(`Now following @${targetUser.username}`);
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
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const activityIcon = (type) => {
    if (type === 'saved') return { icon: 'bookmark', label: 'saved to watchlist', color: '#7BFF9E' };
    if (type === 'watched') return { icon: 'eye', label: 'marked as watched', color: '#7BC8FF' };
    if (type === 'reviewed') return { icon: 'chat', label: 'left a review', color: '#B07FEF' };
    return { icon: 'play', label: 'interacted with', color: accent };
  };

  const ACTIVITY_FILTERS = [
    { id: 'all', label: 'All activity' },
    { id: 'saved', label: 'Saved' },
    { id: 'watched', label: 'Watched' },
    { id: 'reviewed', label: 'Reviewed' },
  ];

  const filteredFeed = activityFilter === 'all' ? feedItems : feedItems.filter(i => i.type === activityFilter);

  const filteredFriends = friends.filter(f => !friendsSearchQ.trim() || (f.username || '').toLowerCase().includes(friendsSearchQ.toLowerCase()));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, background: T.bg, display: 'flex', flexDirection: 'column', animation: 'playerSlideUp 0.4s cubic-bezier(0.22,1,0.36,1)' }}>
      <style>{`@keyframes playerSlideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes menuIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}div::-webkit-scrollbar{display:none}`}</style>
      {toast && <Toast message={toast} accent={accent} />}
      {showNotifs && <NotificationsPanel onClose={() => setShowNotifs(false)} accent={accent} notifications={notifications} loading={loadingNotifs} onMarkRead={handleMarkRead} onFollowBack={handleFollowBack} />}
      {viewingProfile && <UserProfileSheet userId={viewingProfile} onClose={() => setViewingProfile(null)} accent={accent} onWatchTrailer={onWatchTrailer} onAddToWatchlist={onAddToWatchlist} />}

      {/* Header */}
      <div style={{ padding: '52px 18px 0', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: -6 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.text2} strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 800, fontStyle: 'italic', color: T.text, margin: 0 }}>Friends</h1>
          <p style={{ fontSize: 11.5, color: T.text3, margin: '2px 0 0' }}>{stats.following} following · {stats.followers} followers</p>
        </div>
        <button onClick={() => setTab('discover')} style={{ background: 'transparent', border: 'none', width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <SvgIcon name="userPlus" size={16} color={T.text2} />
        </button>
        <button onClick={() => setShowNotifs(true)} style={{ position: 'relative', background: 'transparent', border: 'none', width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <SvgIcon name="bell" size={16} color={T.text2} />
          {unreadCount > 0 && <div style={{ position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: '50%', background: accent, border: `2px solid ${T.bg}` }} />}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 24, padding: '18px 18px 0', borderBottom: `1px solid ${T.hairline}`, flexShrink: 0 }}>
        {[['feed', 'flame', 'Feed'], ['friends', 'people', 'Friends'], ['discover', 'search', 'Discover']].map(([t, icon, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 14px', fontFamily: 'inherit', fontSize: 13, fontWeight: tab === t ? 700 : 500, color: tab === t ? accent : T.text3, borderBottom: `2px solid ${tab === t ? accent : 'transparent'}`, transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: 6 }}>
            <SvgIcon name={icon} size={13} color={tab === t ? accent : T.text3} filled={t === 'feed' && tab === t} />
            {label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>

        {/* FEED TAB */}
        {tab === 'feed' && (
          <div style={{ padding: '18px' }}>
            {!isSignedIn ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                <SvgIcon name="people" size={36} color={T.hairlineStrong} />
                <div style={{ fontSize: 15.5, fontWeight: 700, color: T.text, fontFamily: T.serif, fontStyle: 'italic' }}>Sign in to see your friends feed</div>
                <div style={{ fontSize: 12.5, color: T.text3 }}>Follow friends to see what they are watching</div>
              </div>
            ) : loadingFeed ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 40 }}>
                <div style={{ width: 22, height: 22, border: `2px solid rgba(255,255,255,0.1)`, borderTop: `2px solid ${accent}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ fontSize: 12.5, color: T.text3 }}>Loading feed...</span>
              </div>
            ) : (
              <div>
                {/* FOLLOW BANNER */}
                {stats.following === 0 && (
                  <div style={{ position: 'relative', borderRadius: 20, padding: '22px 18px', marginBottom: 24, overflow: 'hidden', border: `1px solid ${T.hairline}` }}>
                    <AccentGlow accent={accent} size={150} style={{ right: -40, top: -50 }} />
                    <div style={{ position: 'relative', zIndex: 1, maxWidth: '72%' }}>
                      <div style={{ fontFamily: T.serif, fontSize: 19, fontWeight: 800, fontStyle: 'italic', color: T.text, lineHeight: 1.3, marginBottom: 8 }}>
                        Follow friends to see <span style={{ color: accent }}>what</span> they're watching
                      </div>
                      <div style={{ fontSize: 12, color: T.text3, marginBottom: 14 }}>Search for users in the Discover tab</div>
                      <button onClick={() => setTab('discover')} style={{ background: accent, border: 'none', borderRadius: 20, padding: '10px 22px', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#07070F', fontFamily: 'inherit' }}>Find Friends</button>
                    </div>
                  </div>
                )}

                {/* ACTIVITY HEADER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <Eyebrow color={T.text3}>Activity Feed</Eyebrow>
                  <div style={{ position: 'relative' }}>
                    <button onClick={() => setShowFilterMenu(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11.5, color: T.text2, fontWeight: 600 }}>
                      {ACTIVITY_FILTERS.find(f => f.id === activityFilter)?.label}
                      <SvgIcon name="chevron" size={11} color={T.text3} />
                    </button>
                    {showFilterMenu && (
                      <>
                        <div onClick={() => setShowFilterMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                        <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 11, background: T.surface, border: `1px solid ${T.hairlineStrong}`, borderRadius: 12, padding: 4, minWidth: 130, animation: 'menuIn 0.15s ease', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                          {ACTIVITY_FILTERS.map(f => (
                            <button key={f.id} onClick={() => { setActivityFilter(f.id); setShowFilterMenu(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', background: activityFilter === f.id ? `${accent}15` : 'none', border: 'none', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: activityFilter === f.id ? accent : T.text2, fontWeight: activityFilter === f.id ? 700 : 400 }}>{f.label}</button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* EMPTY STATE */}
                {filteredFeed.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <SvgIcon name="flame" size={26} color={T.hairlineStrong} />
                    <div style={{ fontSize: 12.5, color: T.text3 }}>{stats.following === 0 ? 'No activity yet' : 'Nothing matches this filter'}</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {filteredFeed.map((item, i) => {
                      const act = activityIcon(item.type);
                      return (
                        <div key={item.id || i} style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: i < filteredFeed.length - 1 ? `1px solid ${T.hairline}` : 'none', animation: 'fadeIn 0.3s ease' }}>
                          {/* Activity-type icon avatar */}
                          <button onClick={() => setViewingProfile(item.user_id)} style={{ position: 'relative', flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${act.color}16`, border: `1px solid ${act.color}38`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                              {item.avatar_url ? <img src={item.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 14, fontWeight: 800, color: act.color }}>{(item.username || 'U')[0].toUpperCase()}</span>}
                            </div>
                            <div style={{ position: 'absolute', bottom: -2, right: -2, width: 17, height: 17, borderRadius: '50%', background: act.color, border: `2px solid ${T.bg}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <SvgIcon name={act.icon} size={8} color="#08080F" filled={act.icon === 'bookmark' || act.icon === 'eye'} />
                            </div>
                          </button>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7, flexWrap: 'wrap' }}>
                              <button onClick={() => setViewingProfile(item.user_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}><span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>@{item.username || 'user'}</span></button>
                              <span style={{ fontSize: 11, color: T.text3 }}>{act.label}</span>
                              <span style={{ fontSize: 10, color: T.text3, marginLeft: 'auto' }}>{timeAgo(item.created_at)}</span>
                            </div>
                            {item.movie_title && (
                              <button onClick={() => onWatchTrailer({ id: item.movie_id, title: item.movie_title, poster: item.movie_poster, year: item.movie_year, rating: item.movie_rating, accent: item.movie_accent || accent, mediaType: 'movie', ...(item.type === 'reviewed' && item.review_id ? { initialTab: 'comments', highlightCommentId: item.review_id } : {}) })}
                                style={{ display: 'flex', gap: 10, alignItems: 'center', background: T.surface2, border: `1px solid ${T.hairline}`, borderRadius: 12, padding: '10px 12px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', width: '100%' }}>
                                {item.movie_poster && (
                                  <div style={{ width: 38, height: 52, borderRadius: 7, overflow: 'hidden', flexShrink: 0 }}>
                                    <img src={item.movie_poster} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  </div>
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: T.serif, fontStyle: 'italic', marginBottom: 3 }}>{item.movie_title}</div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ fontSize: 11, color: T.text3 }}>{item.movie_year}</span>
                                    {item.movie_rating && <><SvgIcon name="star" size={9} color={item.movie_accent || accent} filled /><span style={{ fontSize: 11, color: item.movie_accent || accent, fontWeight: 600 }}>{item.movie_rating}</span></>}
                                  </div>
                                  {item.review_text && <p style={{ fontSize: 11, color: T.text2, margin: '8px 0 0', lineHeight: 1.5, background: 'rgba(0,0,0,0.25)', borderRadius: 8, padding: '8px 10px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.review_text}</p>}
                                </div>
                                {item.type === 'saved' ? (
                                  <div style={{ width: 28, height: 28, borderRadius: '50%', border: `1px solid ${accent}44`, background: `${accent}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <SvgIcon name="plus" size={13} color={accent} />
                                  </div>
                                ) : (
                                  <SvgIcon name="play" size={13} color={T.text3} filled />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* BOTTOM FIND FRIENDS BAR */}
                <button onClick={() => setTab('discover')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', background: 'transparent', border: `1px solid ${T.hairline}`, borderRadius: 16, padding: '14px', cursor: 'pointer', fontFamily: 'inherit', marginTop: 18 }}>
                  <SvgIcon name="people" size={15} color={accent} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: accent }}>Find Friends</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* FRIENDS TAB */}
        {tab === 'friends' && (
          <div style={{ padding: '18px' }}>
            {!isSignedIn ? (
              <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                <div style={{ fontSize: 12.5, color: T.text3 }}>Sign in to manage friends</div>
              </div>
            ) : (
              <div>
                {/* SEARCH */}
                <div style={{ position: 'relative', marginBottom: 18 }}>
                  <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
                    <SvgIcon name="search" size={14} color={T.text3} />
                  </div>
                  <input
                    value={friendsSearchQ}
                    onChange={e => setFriendsSearchQ(e.target.value)}
                    placeholder="Search friends..."
                    style={{ width: '100%', boxSizing: 'border-box', background: T.surface2, border: `1px solid ${T.hairline}`, borderRadius: 14, padding: '12px 16px 12px 40px', color: T.text, fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>

                {/* STATS ROW */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, marginBottom: 24, background: T.hairline, borderRadius: 14, overflow: 'hidden' }}>
                  {[
                    { label: 'Followers', value: stats.followers, icon: 'people' },
                    { label: 'Following', value: stats.following, icon: 'userPlus' },
                    { label: 'Requests', value: stats.pending, icon: 'inbox', badge: stats.pending > 0 },
                  ].map(s => (
                    <div key={s.label} style={{ background: T.bg, padding: '16px 8px', textAlign: 'center', position: 'relative' }}>
                      {s.badge && <div style={{ position: 'absolute', top: 10, right: 10, width: 6, height: 6, borderRadius: '50%', background: accent }} />}
                      <SvgIcon name={s.icon} size={13} color={T.text3} />
                      <SerifStat size={19} style={{ marginTop: 8 }}>{s.value}</SerifStat>
                      <Eyebrow style={{ marginTop: 3, fontSize: 8.5 }}>{s.label}</Eyebrow>
                    </div>
                  ))}
                </div>

                {loadingFriends ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <div style={{ width: 22, height: 22, border: `2px solid rgba(255,255,255,0.1)`, borderTop: `2px solid ${accent}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                ) : filteredFriends.length === 0 ? (
                  <div>
                    {/* EMPTY STATE */}
                    <div style={{ textAlign: 'center', padding: '24px 20px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <div style={{ position: 'relative', marginBottom: 6 }}>
                        <AccentGlow accent={accent} size={90} style={{ left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }} />
                        <div style={{ position: 'relative', width: 56, height: 56, borderRadius: '50%', background: T.surface2, border: `1px solid ${T.hairline}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <SvgIcon name="people" size={22} color={T.text2} />
                        </div>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: T.text, fontFamily: T.serif, fontStyle: 'italic' }}>{friendsSearchQ ? 'No matches' : 'No friends yet'}</div>
                      {!friendsSearchQ && (
                        <>
                          <div style={{ fontSize: 12, color: T.text3, lineHeight: 1.6, maxWidth: 260 }}>Find and follow friends to see their activity in your feed.</div>
                          <button onClick={() => setTab('discover')} style={{ marginTop: 10, background: accent, border: 'none', borderRadius: 20, padding: '10px 24px', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#07070F', fontFamily: 'inherit' }}>Discover People</button>
                        </>
                      )}
                    </div>

                    {/* SUGGESTED FOR YOU */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.25)', fontWeight: 700, textTransform: 'uppercase' }}>Suggested for you</div>
                      <button onClick={() => setTab('discover')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: accent, padding: 0 }}>See all</button>
                    </div>
                    {loadingSuggested ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                        <div style={{ width: 20, height: 20, border: `2px solid rgba(255,255,255,0.1)`, borderTop: `2px solid ${accent}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      </div>
                    ) : suggested.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 12, color: T.text3 }}>No suggestions right now</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {suggested.map((u, i) => (
                          <div key={u.user_id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i > 0 ? `1px solid ${T.hairline}` : 'none' }}>
                            <button onClick={() => setViewingProfile(u.user_id)} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', fontFamily: 'inherit' }}>
                              <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${accent}18`, border: `1px solid ${accent}38`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700, color: accent, flexShrink: 0, overflow: 'hidden' }}>
                                {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (u.display_name || u.username || 'U')[0].toUpperCase()}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{u.display_name || u.username}</span>
                                  {u.verified && <SvgIcon name="badgeCheck" size={13} color="#4DA8FF" filled />}
                                </div>
                                <div style={{ fontSize: 11, color: T.text3, marginTop: 1 }}>@{u.username}</div>
                                {u.mutualCount > 0 && <div style={{ fontSize: 10, color: T.text3, marginTop: 2 }}>{u.mutualCount} mutual friend{u.mutualCount === 1 ? '' : 's'}</div>}
                              </div>
                            </button>
                            <button onClick={() => handleFollow(u)}
                              style={{ background: u.isFollowing ? 'transparent' : 'none', border: `1px solid ${u.isFollowing ? T.hairlineStrong : accent}`, borderRadius: 18, padding: '6px 16px', cursor: 'pointer', fontSize: 12, color: u.isFollowing ? T.text2 : accent, fontFamily: 'inherit', fontWeight: 700, flexShrink: 0 }}>
                              {u.isFollowing ? 'Following' : 'Follow'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Eyebrow color={T.text3} style={{ marginBottom: 8 }}>Following {filteredFriends.length}</Eyebrow>
                    {filteredFriends.map((f, i) => (
                      <button key={f.user_id || i} onClick={() => setViewingProfile(f.user_id)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', borderTop: i > 0 ? `1px solid ${T.hairline}` : 'none', padding: '12px 0', width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${accent}18`, border: `1px solid ${accent}38`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700, color: accent, flexShrink: 0, overflow: 'hidden' }}>
                          {f.avatar_url ? <img src={f.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (f.username || 'U')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 2 }}>{f.display_name || f.username || 'User'}</div>
                          <div style={{ fontSize: 11, color: T.text3 }}>@{f.username || 'user'} · {f.watchlistCount || 0} in watchlist{f.topGenres && f.topGenres.length > 0 ? ` · ${f.topGenres.slice(0, 2).join(', ')}` : ''}</div>
                        </div>
                        <span onClick={(e) => { e.stopPropagation(); handleFollow(f); }} style={{ background: 'transparent', border: `1px solid ${T.hairlineStrong}`, borderRadius: 20, padding: '5px 14px', cursor: 'pointer', fontSize: 11, color: T.text2, fontFamily: 'inherit', fontWeight: 600, flexShrink: 0 }}>
                          Following
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* DISCOVER TAB */}
        {tab === 'discover' && (
          <div style={{ padding: '18px' }}>
            <div style={{ position: 'relative', marginBottom: 20 }}>
              <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
                <SvgIcon name="search" size={15} color={T.text3} />
              </div>
              <input
                autoFocus
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search by username..."
                style={{ width: '100%', boxSizing: 'border-box', background: T.surface2, border: `1px solid ${T.hairline}`, borderRadius: 14, padding: '13px 16px 13px 42px', color: T.text, fontSize: 14.5, outline: 'none', fontFamily: 'inherit' }}
              />
              {searchQ && <button onClick={() => setSearchQ('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><SvgIcon name="close" size={13} color={T.text3} /></button>}
            </div>

            {searching && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                <div style={{ width: 22, height: 22, border: `2px solid rgba(255,255,255,0.1)`, borderTop: `2px solid ${accent}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            )}

            {!searching && searchQ && searchRes.length === 0 && (
              <div style={{ textAlign: 'center', padding: 24, color: T.text3, fontSize: 13 }}>No users found for "{searchQ}"</div>
            )}

            {!searching && !searchQ && (
              <div>
                <div style={{ position: 'relative', textAlign: 'center', padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <AccentGlow accent={accent} size={130} style={{ left: '50%', top: 0, transform: 'translateX(-50%)' }} />
                  <div style={{ position: 'relative', width: 58, height: 58, borderRadius: '50%', background: T.surface2, border: `1px solid ${T.hairline}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><SvgIcon name="search" size={22} color={accent} /></div>
                  <div style={{ position: 'relative', fontSize: 16, fontWeight: 700, color: T.text, fontFamily: T.serif, fontStyle: 'italic' }}>Find film lovers</div>
                  <div style={{ position: 'relative', fontSize: 12.5, color: T.text3 }}>Search by username to find and follow friends</div>
                </div>
                <Eyebrow color={T.text3} style={{ marginBottom: 10 }}>Suggested for you</Eyebrow>
                {loadingSuggested ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                    <div style={{ width: 20, height: 20, border: `2px solid rgba(255,255,255,0.1)`, borderTop: `2px solid ${accent}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                ) : suggested.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 12, color: T.text3 }}>No suggestions right now</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {suggested.map((u, i) => (
                      <div key={u.user_id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i > 0 ? `1px solid ${T.hairline}` : 'none' }}>
                        <button onClick={() => setViewingProfile(u.user_id)} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', fontFamily: 'inherit' }}>
                          <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${accent}18`, border: `1px solid ${accent}38`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700, color: accent, flexShrink: 0, overflow: 'hidden' }}>
                            {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (u.display_name || u.username || 'U')[0].toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{u.display_name || u.username}</span>
                              {u.verified && <SvgIcon name="badgeCheck" size={13} color="#4DA8FF" filled />}
                            </div>
                            <div style={{ fontSize: 11, color: T.text3, marginTop: 1 }}>@{u.username}</div>
                            {u.mutualCount > 0 && <div style={{ fontSize: 10, color: T.text3, marginTop: 2 }}>{u.mutualCount} mutual friend{u.mutualCount === 1 ? '' : 's'}</div>}
                          </div>
                        </button>
                        <button onClick={() => handleFollow(u)}
                          style={{ background: u.isFollowing ? 'transparent' : 'none', border: `1px solid ${u.isFollowing ? T.hairlineStrong : accent}`, borderRadius: 18, padding: '6px 16px', cursor: 'pointer', fontSize: 12, color: u.isFollowing ? T.text2 : accent, fontFamily: 'inherit', fontWeight: 700, flexShrink: 0 }}>
                          {u.isFollowing ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* TOP WATCHLISTS LEADERBOARD */}
                <div style={{ marginTop: 28, marginBottom: 10 }}>
                  <Eyebrow color={T.text3} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <SvgIcon name="trophy" size={11} color={accent} /> Top Watchlists
                  </Eyebrow>
                </div>
                {loadingLeaders ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                    <div style={{ width: 20, height: 20, border: `2px solid rgba(255,255,255,0.1)`, borderTop: `2px solid ${accent}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                ) : leaders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 12, color: T.text3 }}>No watchlists saved yet — be the first!</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {leaders.map((u, i) => (
                      <button key={u.user_id} onClick={() => setViewingProfile(u.user_id)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', borderTop: i > 0 ? `1px solid ${T.hairline}` : 'none', padding: '11px 0', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}>
                        <div style={{ width: 20, textAlign: 'center', fontSize: u.rank <= 3 ? 15 : 13, fontWeight: 800, fontFamily: T.serif, color: u.rank === 1 ? '#FFD66B' : u.rank === 2 ? '#D8D8E0' : u.rank === 3 ? '#E0A468' : T.text3, flexShrink: 0 }}>{u.rank}</div>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${accent}18`, border: `1px solid ${accent}38`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: accent, flexShrink: 0, overflow: 'hidden' }}>
                          {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (u.display_name || u.username || 'U')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{u.display_name || u.username}</div>
                          <div style={{ fontSize: 11, color: T.text3 }}>@{u.username}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                          <SvgIcon name="bookmark" size={10} color={accent} filled />
                          <span style={{ fontSize: 12, color: accent, fontWeight: 700 }}>{u.watchlistCount}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!searching && searchRes.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <Eyebrow color={T.text3} style={{ marginBottom: 8 }}>{searchRes.length} users found</Eyebrow>
                {searchRes.map((u, i) => (
                  <div key={u.user_id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i > 0 ? `1px solid ${T.hairline}` : 'none' }}>
                    <button onClick={() => setViewingProfile(u.user_id)} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', fontFamily: 'inherit' }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${accent}18`, border: `1px solid ${accent}38`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700, color: accent, flexShrink: 0, overflow: 'hidden' }}>
                        {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (u.username || 'U')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 2 }}>{u.display_name || u.username || 'User'}</div>
                        <div style={{ fontSize: 11, color: T.text3 }}>@{u.username || 'user'}</div>
                      </div>
                    </button>
                    {isSignedIn ? (
                      <button onClick={() => handleFollow(u)}
                        style={{ background: u.isFollowing ? 'transparent' : accent, border: `1px solid ${u.isFollowing ? T.hairlineStrong : accent}`, borderRadius: 20, padding: '6px 16px', cursor: 'pointer', fontSize: 12, color: u.isFollowing ? T.text2 : '#07070F', fontFamily: 'inherit', fontWeight: 700, transition: 'all 0.2s ease', flexShrink: 0 }}>
                        {u.isFollowing ? 'Following' : 'Follow'}
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: T.text3, flexShrink: 0 }}>Sign in to follow</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// MAIN APP
export default function CineScroll(){
  const{isSignedIn,user,isLoaded}=useUser();
  const{openSignIn}=useClerk();
  const[movies,setMovies]=useState([]);const[loading,setLoading]=useState(true);const[activeIndex,setActiveIndex]=useState(0);const[activeGenre,setActiveGenre]=useState('');const[activeMood,setActiveMood]=useState('Trending');const[showFilter,setShowFilter]=useState(false);const[showAuth,setShowAuth]=useState(false);const[showProfile,setShowProfile]=useState(false);const[showMood,setShowMood]=useState(false);const[showFriends,setShowFriends]=useState(false);const[trailerMovie,setTrailerMovie]=useState(null);const[similarMovie,setSimilarMovie]=useState(null);const[watchlistIds,setWatchlistIds]=useState(new Set());const[watchlist,setWatchlist]=useState([]);const[userReviews,setUserReviews]=useState([]);const[loadingProfileData,setLoadingProfileData]=useState(false);
  const containerRef=useRef(null);const pageRef=useRef(1);const loadingMoreRef=useRef(false);const profileLoadedRef=useRef(false);

  useEffect(()=>{
    if(!isLoaded)return;
    if(!isSignedIn){setWatchlist([]);setUserReviews([]);setWatchlistIds(new Set());profileLoadedRef.current=false;return;}
    if(profileLoadedRef.current)return;
    profileLoadedRef.current=true;
    const load=async()=>{setLoadingProfileData(true);try{const[wRes,rRes]=await Promise.all([fetch('/api/watchlist'),fetch('/api/reviews')]);const[wData,rData]=await Promise.all([wRes.json(),rRes.json()]);const items=wData.items||[];setWatchlist(items);setWatchlistIds(new Set(items.map(m=>m.movie_id)));setUserReviews(rData.items||[]);}catch(e){console.error(e);}setLoadingProfileData(false);};
    load();
  },[isLoaded,isSignedIn]);

  const handleSave=async(movie)=>{
    const already=watchlistIds.has(movie.id);
    if(already){setWatchlistIds(p=>{const n=new Set(p);n.delete(movie.id);return n;});setWatchlist(p=>p.filter(m=>m.movie_id!==movie.id));await fetch('/api/watchlist',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({movieId:movie.id})});}
    else{
      setWatchlistIds(p=>new Set([...p,movie.id]));setWatchlist(p=>[{movie_id:movie.id,title:movie.title,year:movie.year,rating:movie.rating,poster:movie.poster,backdrop:movie.backdrop,genre:movie.genre,overview:movie.overview,accent:movie.accent,gradient:movie.gradient,is_tv:movie.isTV||false,watched:false,saved_at:Date.now(),certification:movie.certification||''},...p]);
      await fetch('/api/watchlist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(movie)});
      fetch('/api/activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'saved',movieId:movie.id,movieTitle:movie.title,moviePoster:movie.poster,movieYear:movie.year,movieRating:movie.rating,movieAccent:movie.accent,username:user?.username||user?.firstName||'user',avatarUrl:user?.imageUrl||null})}).catch(()=>{});
    }
  };

  const handleMoodSelect=async(mood)=>{
    const params=new URLSearchParams({mood:'trending',genre:mood.genres.split(',')[0],page:String(Math.floor(Math.random()*8)+1)});
    try{const res=await fetch(`/api/movies?${params}`);const data=await res.json();setMovies(data.movies||[]);setActiveIndex(0);pageRef.current=1;setTimeout(()=>containerRef.current?.scrollTo({top:0,behavior:'instant'}),30);}catch(e){console.error(e);}
  };

  const fetchMovies=useCallback(async(mood,genre,search='',page=1,append=false)=>{
    if(loadingMoreRef.current&&append)return;
    if(append)loadingMoreRef.current=true;else setLoading(true);
    try{const params=new URLSearchParams({mood:mood.toLowerCase(),genre,search,page:String(page)});const res=await fetch(`/api/movies?${params}`);const data=await res.json();if(append){setMovies(p=>[...p,...(data.movies||[])]);}else{setMovies(data.movies||[]);setActiveIndex(0);pageRef.current=1;setTimeout(()=>containerRef.current?.scrollTo({top:0,behavior:'instant'}),30);}}
    catch(e){console.error(e);}
    if(append)loadingMoreRef.current=false;else setLoading(false);
  },[]);

  useEffect(()=>{fetchMovies(activeMood,activeGenre);},[activeMood,activeGenre]);

  useEffect(()=>{
    const el=containerRef.current;if(!el)return;
    const fn=()=>{const idx=Math.round(el.scrollTop/el.clientHeight);setActiveIndex(idx);setMovies(prev=>{[idx+1,idx+2].forEach(i=>{if(prev[i]?.backdrop){const img=new Image();img.src=prev[i].backdrop;}if(prev[i]?.poster){const img=new Image();img.src=prev[i].poster;}});if(idx>=prev.length-4&&!loadingMoreRef.current){pageRef.current+=1;fetchMovies(activeMood,activeGenre,'',pageRef.current,true);}return prev;});};
    el.addEventListener('scroll',fn,{passive:true});return()=>el.removeEventListener('scroll',fn);
  },[activeMood,activeGenre,fetchMovies]);

  useEffect(()=>{if(movies.length>0){movies.slice(0,3).forEach(m=>{if(m.backdrop){const img=new Image();img.src=m.backdrop;}if(m.poster){const img=new Image();img.src=m.poster;}});}},[movies.length]);

  const scrollTo=i=>{containerRef.current?.scrollTo({top:i*containerRef.current.clientHeight,behavior:'smooth'});setActiveIndex(i);};
  const handleSimilarSelect=m=>{setMovies(p=>[m,...p]);setTimeout(()=>scrollTo(0),50);};
  const accent=movies[activeIndex]?.accent||'#F5A623';
  const activeGenreLabel=GENRE_OPTIONS.find(g=>g.id===activeGenre)?.label||'All';

  return(
    <div style={{position:'fixed',inset:0,background:'#04040A',fontFamily:"'DM Sans',sans-serif",color:'#fff',overflow:'hidden'}}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400;1,700;1,900&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet"/>
      <div style={{position:'fixed',top:0,left:0,right:0,zIndex:40,padding:'18px 16px 0',background:'linear-gradient(to bottom,rgba(4,4,10,0.9) 0%,transparent 100%)',display:'flex',justifyContent:'space-between',alignItems:'center',pointerEvents:'none'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,pointerEvents:'all'}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:accent,boxShadow:`0 0 12px ${accent}`,transition:'all 0.5s ease'}}/>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:900,fontStyle:'italic',letterSpacing:-0.5,color:'#fff'}}>CineScroll</span>
        </div>
        <div style={{display:'flex',gap:8,pointerEvents:'all',alignItems:'center'}}>
          <button onClick={()=>{if(!isSignedIn){setShowAuth(true);return;}setShowFriends(true);}} style={{background:'rgba(0,0,0,0.55)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,width:38,height:38,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(12px)'}}>
            <SvgIcon name="friends" size={18} color="rgba(255,255,255,0.75)"/>
          </button>
          <button onClick={()=>setShowMood(true)} style={{background:'rgba(0,0,0,0.55)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,width:38,height:38,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(12px)',fontSize:17,lineHeight:1}}>🎭</button>
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

      {(activeGenre||activeMood!=='Trending')&&!showFilter&&(
        <div style={{position:'fixed',top:62,left:16,zIndex:38,display:'flex',gap:6,pointerEvents:'none'}}>
          {activeMood!=='Trending'&&<div style={{background:'rgba(0,0,0,0.55)',backdropFilter:'blur(10px)',border:`1px solid ${accent}33`,borderRadius:20,padding:'3px 10px',fontSize:10,color:accent,fontWeight:700}}>{activeMood}</div>}
          {activeGenre&&<div style={{background:'rgba(0,0,0,0.55)',backdropFilter:'blur(10px)',border:`1px solid ${accent}33`,borderRadius:20,padding:'3px 10px',fontSize:10,color:accent,fontWeight:700}}>{activeGenreLabel}</div>}
        </div>
      )}

      <div ref={containerRef} style={{position:'fixed',inset:0,overflowY:'scroll',scrollSnapType:'y mandatory',WebkitOverflowScrolling:'touch',scrollbarWidth:'none'}}>
        <style>{`div::-webkit-scrollbar{display:none}*{-webkit-tap-highlight-color:transparent;box-sizing:border-box}`}</style>
        {loading?(
          <div style={{height:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',scrollSnapAlign:'start',flexDirection:'column',gap:12}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:40,fontWeight:900,fontStyle:'italic',color:'#fff'}}>CineScroll</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.2)',letterSpacing:3}}>LOADING FILMS...</div>
          </div>
        ):(
          movies.map((m,i)=>(
            <div key={`${m.id}-${i}`} style={{width:'100%',height:'100dvh',scrollSnapAlign:'start',scrollSnapStop:'always',position:'relative',flexShrink:0}}>
              <MovieCard movie={m} isActive={i===activeIndex} index={i} onFindSimilar={setSimilarMovie} onAuthRequired={()=>setShowAuth(true)} onSave={handleSave} isSaved={watchlistIds.has(m.id)} onTrailer={setTrailerMovie}/>
            </div>
          ))
        )}
      </div>

      <div style={{position:'fixed',right:5,top:'50%',transform:'translateY(-50%)',display:'flex',flexDirection:'column',gap:4,zIndex:20,pointerEvents:'none'}}>
        {movies.slice(0,12).map((_,i)=>(<div key={i} style={{width:i===activeIndex?3:2,height:i===activeIndex?24:6,borderRadius:2,background:i===activeIndex?accent:'rgba(255,255,255,0.1)',transition:'all 0.3s ease',boxShadow:i===activeIndex?`0 0 8px ${accent}`:'none'}}/>))}
      </div>

      {activeIndex===0&&movies.length>1&&(
        <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',zIndex:20,pointerEvents:'none',display:'flex',flexDirection:'column',alignItems:'center',gap:5,animation:'bob 2.2s ease infinite'}}>
          <div style={{fontSize:9,letterSpacing:3,color:'rgba(255,255,255,0.16)',fontWeight:700}}>SCROLL</div>
          <SvgIcon name="chevron" size={16} color="rgba(255,255,255,0.16)"/>
        </div>
      )}

      <FilterSheet show={showFilter} onClose={()=>setShowFilter(false)} activeGenre={activeGenre} activeMood={activeMood} onGenre={setActiveGenre} onMood={setActiveMood} accent={accent} onSearchSelect={m=>{setMovies(p=>[m,...p.filter(x=>x.id!==m.id)]);scrollTo(0);}}/>
      {similarMovie&&<SimilarSheet movie={similarMovie} onClose={()=>setSimilarMovie(null)} accent={accent} onSelect={handleSimilarSelect}/>}
      {showAuth&&<AuthGate onClose={()=>setShowAuth(false)} accent={accent}/>}
      {showProfile&&<ProfileSheet onClose={()=>setShowProfile(false)} accent={accent} watchlist={watchlist} setWatchlist={setWatchlist} userReviews={userReviews} loadingData={loadingProfileData}/>}
      {showMood&&<MoodScreen onClose={()=>setShowMood(false)} onMoodSelect={handleMoodSelect} accent={accent}/>}
      {showFriends&&<FriendsScreen onClose={()=>setShowFriends(false)} accent={accent} onWatchTrailer={setTrailerMovie} onAddToWatchlist={handleSave}/>}
      {trailerMovie&&<InlinePlayer movie={trailerMovie} onClose={()=>setTrailerMovie(null)} accent={trailerMovie.accent||accent} onSave={handleSave} isSaved={watchlistIds.has(trailerMovie.id)} initialTab={trailerMovie.initialTab} highlightCommentId={trailerMovie.highlightCommentId}/>}

      <style>{`@keyframes bob{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-8px)}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
