'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';

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
    logout:   ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4','M16 17l5-5-5-5','M21 12H9'],
    trash:    ['M3 6h18','M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6','M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2'],
    check:    'M20 6L9 17l-5-5',
    share:    ['M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8','M16 6l-4-4-4 4','M12 2v13'],
    play:     'M5 3l14 9-14 9V3z',
    pause:    ['M6 4h4v16H6z','M14 4h4v16h-4z'],
    volume:   ['M11 5L6 9H2v6h4l5 4V5z','M19.07 4.93a10 10 0 0 1 0 14.14','M15.54 8.46a5 5 0 0 1 0 7.07'],
    mute:     ['M11 5L6 9H2v6h4l5 4V5z','M23 9l-6 6','M17 9l6 6'],
    maximize: ['M8 3H5a2 2 0 0 0-2 2v3','M21 8V5a2 2 0 0 0-2-2h-3','M3 16v3a2 2 0 0 0 2 2h3','M16 21h3a2 2 0 0 0 2-2v-3'],
    settings: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z','M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'],
    list:     ['M8 6h13','M8 12h13','M8 18h13','M3 6h.01','M3 12h.01','M3 18h.01'],
    plus:     ['M12 5v14','M5 12h14'],
    clock:    ['M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z','M12 6v6l4 2'],
  };
  const def = icons[name];
  if (!def) return null;
  const paths = Array.isArray(def) ? def : [def];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
};

const MoodIcon = ({ mood, size = 24, color = '#fff' }) => {
  const icons = {
    Inspired: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L9.5 8.5H3l5.5 4-2 6.5L12 15l5.5 4-2-6.5L21 8.5h-6.5L12 2z"/></svg>,
    Thrilled: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4 14h8l-1 8 9-12h-7l1-8z" fill={color} fillOpacity="0.2"/><path d="M13 2L4 14h8l-1 8 9-12h-7l1-8z"/></svg>,
    Scared: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9-4-9-9-9z"/><path d="M9 10h.01M15 10h.01"/><path d="M9 15c.5-1 1.5-2 3-2s2.5 1 3 2"/><path d="M12 3v3M5.2 5.2l2.1 2.1M18.8 5.2l-2.1 2.1"/></svg>,
    Romantic: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
    'Mind-blown': <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><path d="M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/></svg>,
    Laugh: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 9.5c.5-.5 1-.5 1.5 0M14.5 9.5c.5-.5 1-.5 1.5 0"/><path d="M7 13.5s1.5 3.5 5 3.5 5-3.5 5-3.5" fill={color} fillOpacity="0.15"/><path d="M7 13.5s1.5 3.5 5 3.5 5-3.5 5-3.5"/></svg>,
    Emotional: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01"/><path d="M9 15.5c1-1.5 5-1.5 6 0"/><path d="M10 7l-1-2M14 7l1-2" opacity="0.6"/></svg>,
    Epic: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2.5l-5 5-3-1-4 4 2 1-3 4h4l1 3 4-3 1 2 4-4-1-3 5-5z" fill={color} fillOpacity="0.15"/><path d="M14.5 2.5l-5 5-3-1-4 4 2 1-3 4h4l1 3 4-3 1 2 4-4-1-3 5-5z"/></svg>,
    Dark: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill={color} fillOpacity="0.2"/><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
    Nostalgic: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><circle cx="12" cy="13" r="3"/><path d="M2 10h20" opacity="0.4"/></svg>,
  };
  return icons[mood] || null;
};

const GENRE_OPTIONS = [
  {label:'All',id:''},{label:'Action',id:'28'},{label:'Drama',id:'18'},
  {label:'Horror',id:'27'},{label:'Sci-Fi',id:'878'},{label:'Comedy',id:'35'},
  {label:'Thriller',id:'53'},{label:'Romance',id:'10749'},
  {label:'Animation',id:'16'},{label:'Documentary',id:'99'},
];

const FEED_MOODS = [
  {label:'Trending',icon:'flame'},{label:'Top Rated',icon:'star'},
  {label:'New',icon:'sparkle'},{label:'Hidden Gems',icon:'gem'},
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
  const color = cert === 'R' || cert === 'NC-17' || cert === '18' || cert === 'TV-MA' ? '#FF4444'
    : cert === 'PG-13' || cert === 'TV-14' || cert === '15' ? '#F5A623'
    : 'rgba(255,255,255,0.5)';
  return (
    <span style={{fontSize:9,fontWeight:800,color,border:`1px solid ${color}55`,borderRadius:4,padding:'2px 5px',letterSpacing:0.5,flexShrink:0}}>
      {cert}
    </span>
  );
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
    const cols=[{label:'WATCHED',value:data.watched,icon:'👁'},{label:'REVIEWS',value:data.reviews,icon:'✍️'},{label:'SAVED',value:data.saved,icon:'🔖'}];
    const statY=680;const colW=W/3;
    cols.forEach((s,i)=>{const x=colW*i+colW/2;ctx.fillStyle='rgba(255,255,255,0.04)';ctx.beginPath();ctx.roundRect(colW*i+24,statY-46,colW-48,100,18);ctx.fill();ctx.font='22px sans-serif';ctx.fillStyle='#fff';ctx.fillText(s.icon,x,statY-10);ctx.fillStyle=accent;ctx.font='bold 34px Georgia, serif';ctx.fillText(s.value,x,statY+24);ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='600 11px sans-serif';ctx.letterSpacing='2px';ctx.fillText(s.label,x,statY+44);ctx.letterSpacing='0px';});
    ctx.fillStyle=accent+'15';ctx.beginPath();ctx.roundRect(W/2-155,830,310,50,25);ctx.fill();ctx.fillStyle=accent;ctx.font='bold 16px sans-serif';ctx.fillText('this-scine.vercel.app',W/2,860);
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

// ─── WORLD CLASS INLINE PLAYER ────────────────────────────────────────────────
function InlinePlayer({ movie, onClose, accent }) {
  const [trailerKey, setTrailerKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState('about'); // about, comments
  const [comments, setComments] = useState([
    { id:1, user:'filmcritic99', avatar:'F', text:'The opening sequence is stunning.', time:'2:34', likes:42, liked:false },
    { id:2, user:'cinebuff', avatar:'C', text:'That score at 1:15 gives me chills every time', time:'1:15', likes:31, liked:false },
    { id:3, user:'movieholic', avatar:'M', text:'The cinematography here is world class', time:'0:45', likes:18, liked:false },
  ]);
  const [commentInput, setCommentInput] = useState('');
  const [timestampMode, setTimestampMode] = useState(false);
  const [manualTimestamp, setManualTimestamp] = useState('');
  const { isSignedIn, user } = useUser();
  const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_KEY;
  const panelRef = useRef(null);

  useEffect(() => {
    if (!movie || !TMDB_KEY) { setNotFound(true); setLoading(false); return; }
    fetch(`https://api.themoviedb.org/3/${movie.mediaType||'movie'}/${movie.id}/videos?api_key=${TMDB_KEY}`)
      .then(r => r.json())
      .then(data => {
        const videos = data.results || [];
        const trailer = videos.find(v=>v.type==='Trailer'&&v.site==='YouTube') || videos.find(v=>v.type==='Teaser'&&v.site==='YouTube') || videos.find(v=>v.site==='YouTube');
        if (trailer) setTrailerKey(trailer.key); else setNotFound(true);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [movie, TMDB_KEY]);

  const postComment = () => {
    if (!commentInput.trim()) return;
    const ts = timestampMode && manualTimestamp ? manualTimestamp : null;
    setComments(p => [{
      id: Date.now(),
      user: user?.username || user?.firstName || 'you',
      avatar: (user?.firstName || user?.username || 'Y')[0].toUpperCase(),
      text: commentInput,
      time: ts,
      likes: 0,
      liked: false,
    }, ...p]);
    setCommentInput('');
    setManualTimestamp('');
  };

  const toggleLike = id => setComments(p => p.map(c => c.id===id ? {...c, liked:!c.liked, likes:c.liked?c.likes-1:c.likes+1} : c));

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 90,
      background: '#07070F',
      display: 'flex', flexDirection: 'column',
      animation: 'playerSlideUp 0.4s cubic-bezier(0.22,1,0.36,1)',
    }}>
      <style>{`
        @keyframes playerSlideUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        div::-webkit-scrollbar { display:none; }
      `}</style>

      {/* ── Header ── */}
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'52px 16px 12px',flexShrink:0,background:'linear-gradient(to bottom,rgba(7,7,15,0.95),rgba(7,7,15,0.8))'}}>
        <button onClick={onClose} style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,width:36,height:36,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:16,fontWeight:700,color:'#fff',fontFamily:"'Playfair Display',serif",fontStyle:'italic',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{movie?.title}</div>
          <div style={{display:'flex',alignItems:'center',gap:6,marginTop:2}}>
            <span style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>{movie?.year}</span>
            {movie?.certification && <CertBadge cert={movie.certification}/>}
            {(movie?.genre||[]).slice(0,2).map(g=><span key={g} style={{fontSize:10,color:accent,fontWeight:600}}>{g}</span>).reduce((prev,curr,i)=>i===0?[curr]:[prev,<span key={i} style={{color:'rgba(255,255,255,0.2)',fontSize:10}}> · </span>,curr],[])}
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:4,background:`${accent}18`,border:`1px solid ${accent}33`,borderRadius:8,padding:'4px 8px'}}>
          <SvgIcon name="star" size={10} color={accent} filled/>
          <span style={{fontSize:12,fontWeight:700,color:accent}}>{movie?.rating}</span>
        </div>
      </div>

      {/* ── Video Player ── */}
      <div style={{flexShrink:0,background:'#000',position:'relative'}}>
        {loading && (
          <div style={{height:220,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12}}>
            <div style={{width:32,height:32,border:`3px solid rgba(255,255,255,0.1)`,borderTop:`3px solid ${accent}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
            <span style={{fontSize:13,color:'rgba(255,255,255,0.3)'}}>Loading trailer…</span>
          </div>
        )}
        {!loading && notFound && (
          <div style={{height:180,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:10}}>
            <div style={{fontSize:32}}>🎬</div>
            <div style={{fontSize:14,color:'rgba(255,255,255,0.4)'}}>No trailer available</div>
          </div>
        )}
        {!loading && trailerKey && (
          <div style={{position:'relative',width:'100%',paddingBottom:'56.25%'}}>
            <iframe
              src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              style={{position:'absolute',inset:0,width:'100%',height:'100%',border:'none'}}
              title={`${movie?.title} Trailer`}
            />
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div style={{display:'flex',borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0,background:'rgba(7,7,15,0.95)'}}>
        {[['about','About'],['comments',`Comments (${comments.length})`]].map(([tab,label])=>(
          <button key={tab} onClick={()=>setActiveTab(tab)} style={{flex:1,background:'none',border:'none',cursor:'pointer',padding:'12px 0',fontSize:13,fontWeight:activeTab===tab?700:400,color:activeTab===tab?accent:'rgba(255,255,255,0.35)',borderBottom:`2px solid ${activeTab===tab?accent:'transparent'}`,fontFamily:'inherit',transition:'all 0.2s ease'}}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Scrollable Content ── */}
      <div ref={panelRef} style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',scrollbarWidth:'none',background:'rgba(7,7,15,0.95)'}}>

        {/* About tab */}
        {activeTab==='about'&&(
          <div style={{padding:'16px'}}>
            {/* Streaming */}
            <StreamingBadges movieId={movie?.id} mediaType={movie?.mediaType}/>

            {/* Overview */}
            <p style={{fontSize:14,color:'rgba(255,255,255,0.65)',lineHeight:1.7,margin:'0 0 16px'}}>{movie?.overview}</p>

            {/* Meta pills */}
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
              {movie?.certification&&<CertBadge cert={movie.certification}/>}
              {(movie?.genre||[]).map(g=><span key={g} style={{fontSize:10,color:accent,border:`1px solid ${accent}33`,borderRadius:20,padding:'3px 10px',fontWeight:600}}>{g}</span>)}
              {movie?.isTV&&<span style={{fontSize:10,color:'#7BC8FF',border:'1px solid #7BC8FF44',borderRadius:20,padding:'3px 10px',fontWeight:600}}>TV Series</span>}
            </div>

            {/* Stats */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <div style={{background:'rgba(255,255,255,0.04)',borderRadius:12,padding:'12px'}}>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.3)',letterSpacing:1,marginBottom:4}}>TMDB RATING</div>
                <div style={{fontSize:22,fontWeight:800,color:accent,fontFamily:"'Playfair Display',serif"}}>{movie?.rating}<span style={{fontSize:12,color:'rgba(255,255,255,0.3)'}}>/10</span></div>
              </div>
              <div style={{background:'rgba(255,255,255,0.04)',borderRadius:12,padding:'12px'}}>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.3)',letterSpacing:1,marginBottom:4}}>VOTES</div>
                <div style={{fontSize:22,fontWeight:800,color:'rgba(255,255,255,0.7)',fontFamily:"'Playfair Display',serif"}}>{movie?.votes}</div>
              </div>
            </div>
          </div>
        )}

        {/* Comments tab */}
        {activeTab==='comments'&&(
          <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
            <div style={{flex:1,padding:'12px 16px',display:'flex',flexDirection:'column',gap:12,overflowY:'auto'}}>
              {comments.map(c=>(
                <div key={c.id} style={{display:'flex',gap:10}}>
                  <div style={{width:32,height:32,borderRadius:'50%',background:`${accent}20`,border:`1px solid ${accent}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:accent,flexShrink:0}}>{c.avatar}</div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                      <span style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.7)'}}>@{c.user}</span>
                      {c.time&&(
                        <span style={{fontSize:10,color:accent,background:`${accent}18`,border:`1px solid ${accent}33`,borderRadius:10,padding:'1px 7px',fontWeight:700,display:'flex',alignItems:'center',gap:3}}>
                          <SvgIcon name="clock" size={9} color={accent}/>
                          {c.time}
                        </span>
                      )}
                    </div>
                    <p style={{fontSize:13,color:'rgba(255,255,255,0.6)',lineHeight:1.5,margin:'0 0 6px'}}>{c.text}</p>
                    <button onClick={()=>toggleLike(c.id)} style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center',gap:4}}>
                      <SvgIcon name="heart" size={12} color={c.liked?'#FF6B8A':'rgba(255,255,255,0.2)'} filled={c.liked}/>
                      <span style={{fontSize:11,color:c.liked?'#FF6B8A':'rgba(255,255,255,0.25)'}}>{c.likes}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Comment Input (only on comments tab) ── */}
      {activeTab==='comments'&&(
        <div style={{flexShrink:0,background:'rgba(7,7,15,0.98)',borderTop:'1px solid rgba(255,255,255,0.06)',padding:'10px 16px 32px'}}>
          {/* Timestamp toggle */}
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
            <button onClick={()=>setTimestampMode(p=>!p)} style={{display:'flex',alignItems:'center',gap:5,background:timestampMode?`${accent}18`:'rgba(255,255,255,0.04)',border:`1px solid ${timestampMode?accent+'44':'rgba(255,255,255,0.08)'}`,borderRadius:20,padding:'4px 10px',cursor:'pointer',fontFamily:'inherit',fontSize:11,color:timestampMode?accent:'rgba(255,255,255,0.4)',fontWeight:600}}>
              <SvgIcon name="clock" size={11} color={timestampMode?accent:'rgba(255,255,255,0.4)'}/>
              Timestamp
            </button>
            {timestampMode&&(
              <input value={manualTimestamp} onChange={e=>setManualTimestamp(e.target.value)} placeholder="e.g. 1:23" style={{background:'rgba(255,255,255,0.06)',border:`1px solid ${accent}44`,borderRadius:10,padding:'4px 10px',color:accent,fontSize:12,outline:'none',fontFamily:'inherit',width:70}}/>
            )}
          </div>
          {isSignedIn?(
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <input value={commentInput} onChange={e=>setCommentInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&postComment()} placeholder="Comment on this trailer..." style={{flex:1,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:22,padding:'11px 16px',color:'#fff',fontSize:14,outline:'none',fontFamily:'inherit'}}/>
              <button onClick={postComment} style={{background:accent,border:'none',borderRadius:'50%',width:40,height:40,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <SvgIcon name="send" size={14} color="#000"/>
              </button>
            </div>
          ):(
            <div style={{textAlign:'center',padding:'8px 0',fontSize:13,color:'rgba(255,255,255,0.3)'}}>Sign in to comment</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MOOD SCREEN ──────────────────────────────────────────────────────────────
function MoodScreen({onClose,onMoodSelect,accent}){
  const[activeMood,setActiveMood]=useState(null);const[loading,setLoading]=useState(false);const[moodInput,setMoodInput]=useState('');const[showInput,setShowInput]=useState(false);const[timeGreeting,setTimeGreeting]=useState('tonight');
  useEffect(()=>{const h=new Date().getHours();if(h>=5&&h<12)setTimeGreeting('this morning');else if(h>=12&&h<17)setTimeGreeting('this afternoon');else if(h>=17&&h<21)setTimeGreeting('this evening');else setTimeGreeting('tonight');},[]);
  const handleSelect=async(mood)=>{setActiveMood(mood.label);setLoading(true);await onMoodSelect(mood);setLoading(false);onClose();};
  const handleSurprise=()=>handleSelect(FEEL_MOODS[Math.floor(Math.random()*FEEL_MOODS.length)]);
  const handleTextMood=async()=>{
    if(!moodInput.trim())return;
    const lower=moodInput.toLowerCase();
    const keywords={Inspired:['triumph','courage','motivat','inspir','uplifting','hope','success'],Thrilled:['thrill','action','suspense','tension','excitement','adrenaline'],Scared:['scar','horror','creep','ghost','monster','terrif'],Romantic:['love','romanc','relationship','couple','sweet'],['Mind-blown']:['mind','twist','complex','thought','sci-fi','confus'],Laugh:['laugh','fun','comedy','funny','humor'],Emotional:['cry','sad','emotion','moving','tears','feel'],Epic:['epic','adventure','grand','hero','battle','quest'],Dark:['dark','crime','noir','gritty','bleak'],Nostalgic:['nostalg','classic','old','vintage','retro','childhood']};
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
        <button onClick={onClose} style={{position:'absolute',top:52,right:18,background:'rgba(0,0,0,0.4)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:'50%',width:38,height:38,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2}}>
          <SvgIcon name="close" size={14} color="rgba(255,255,255,0.8)"/>
        </button>
        <div style={{position:'relative',zIndex:1,padding:'52px 20px 28px'}}>
          <div style={{fontSize:10,letterSpacing:4,color:accent,fontWeight:700,textTransform:'uppercase',marginBottom:14}}>Mood Discovery</div>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:'clamp(28px,8vw,46px)',fontWeight:900,color:'#fff',margin:'0 0 10px',lineHeight:1.05,letterSpacing:'-0.5px',maxWidth:460,textShadow:'0 2px 20px rgba(0,0,0,0.5)'}}>How do you want<br/>to feel {timeGreeting}?</h1>
          <p style={{fontSize:14,color:'rgba(255,255,255,0.55)',margin:'0 0 22px',lineHeight:1.6,maxWidth:340}}>Pick a mood or describe what you&apos;re in the mood for.</p>
          <div style={{marginBottom:18}}>
            {showInput?(
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input autoFocus value={moodInput} onChange={e=>setMoodInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleTextMood()} placeholder="e.g. something that makes me cry..." style={{flex:1,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(12px)',border:`1px solid ${accent}55`,borderRadius:14,padding:'12px 16px',color:'#fff',fontSize:14,outline:'none',fontFamily:'inherit'}}/>
                <button onClick={handleTextMood} style={{background:accent,border:'none',borderRadius:12,width:44,height:44,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#07070F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button>
                <button onClick={()=>{setShowInput(false);setMoodInput('');}} style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,width:44,height:44,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><SvgIcon name="close" size={13} color="rgba(255,255,255,0.5)"/></button>
              </div>
            ):(
              <button onClick={()=>setShowInput(true)} style={{display:'flex',alignItems:'center',gap:8,background:'rgba(0,0,0,0.35)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:14,padding:'12px 16px',cursor:'pointer',fontFamily:'inherit',fontSize:13,color:'rgba(255,255,255,0.45)',width:'100%',textAlign:'left',maxWidth:400}}>
                <SvgIcon name="chat" size={15} color="rgba(255,255,255,0.35)"/>
                Describe what you&apos;re in the mood for…
              </button>
            )}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
            <button onClick={handleSurprise} disabled={loading} style={{display:'flex',alignItems:'center',gap:8,background:`linear-gradient(135deg,${accent},${accent}bb)`,border:'none',borderRadius:28,padding:'12px 22px',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:700,color:'#07070F',boxShadow:`0 4px 18px ${accent}35`,opacity:loading?0.7:1}}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="#07070F"><path d="M8 1l1.5 4.5H14l-3.75 2.75 1.5 4.5L8 10l-3.75 2.75 1.5-4.5L2 5.5h4.5L8 1z"/></svg>
              Surprise Me
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
                <div style={{position:'relative',zIndex:1,padding:'16px 14px 40px',display:'flex',flexDirection:'column',gap:0,height:'100%'}}>
                  <div style={{width:44,height:44,borderRadius:12,background:`${mood.color}22`,border:`1px solid ${mood.color}40`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:12,flexShrink:0}}><MoodIcon mood={mood.label} size={22} color={mood.color}/></div>
                  <div style={{fontSize:16,fontWeight:700,color:'#ffffff',fontFamily:"'DM Sans',sans-serif",fontStyle:'normal',marginBottom:5,lineHeight:1.2}}>{mood.label}</div>
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

// ─── PROFILE SHEET ────────────────────────────────────────────────────────────
function ProfileSheet({onClose,accent,watchlist,setWatchlist,userReviews,loadingData,movies,scrollToMovie}){
  const{user}=useUser();const{signOut}=useClerk();
  const[tab,setTab]=useState('profile');const[signingOut,setSigningOut]=useState(false);const[signedOut,setSignedOut]=useState(false);const[sharing,setSharing]=useState(false);const[toast,setToast]=useState(null);const[watchlistSearch,setWatchlistSearch]=useState('');const[watchlistFilter,setWatchlistFilter]=useState('all');const[watchlistSort,setWatchlistSort]=useState('date');const[playerMovie,setPlayerMovie]=useState(null);
  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(null),3000);};
  const toggleWatched=async(item)=>{const next=!item.watched;setWatchlist(p=>p.map(m=>m.movie_id===item.movie_id?{...m,watched:next}:m));await fetch('/api/watchlist',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({movieId:item.movie_id,watched:next})});};
  const removeFromWatchlist=async(item)=>{setWatchlist(p=>p.filter(m=>m.movie_id!==item.movie_id));await fetch('/api/watchlist',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({movieId:item.movie_id})});};
  const handleSignOut=async()=>{setSigningOut(true);try{await signOut();}catch{}setSigningOut(false);setSignedOut(true);showToast('Signed out successfully ✓');setTimeout(()=>onClose(),2000);};
  const watched=watchlist.filter(m=>m.watched).length;const saved=watchlist.length;const reviews=userReviews.length;
  const cineScore=calcCineScore(watched,reviews,saved);
  const avgRating=userReviews.filter(r=>r.rating>0).length>0?(userReviews.filter(r=>r.rating>0).reduce((s,r)=>s+r.rating,0)/userReviews.filter(r=>r.rating>0).length).toFixed(1):'—';
  const topGenres=watchlist.flatMap(m=>m.genre||[]).reduce((acc,g)=>{acc[g]=(acc[g]||0)+1;return acc;},{});
  const sortedGenres=Object.entries(topGenres).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const filteredWatchlist=watchlist.filter(m=>{if(watchlistFilter==='movies'&&m.is_tv)return false;if(watchlistFilter==='tv'&&!m.is_tv)return false;if(watchlistSearch&&!m.title?.toLowerCase().includes(watchlistSearch.toLowerCase()))return false;return true;}).sort((a,b)=>{if(watchlistSort==='rating')return parseFloat(b.rating||0)-parseFloat(a.rating||0);if(watchlistSort==='title')return(a.title||'').localeCompare(b.title||'');return(b.saved_at||0)-(a.saved_at||0);});

  const handleWatchlistItemClick=(item)=>{
    // Build a movie-like object for the player
    const movieObj={id:item.movie_id,title:item.title,year:item.year,rating:item.rating,poster:item.poster,backdrop:item.backdrop,genre:item.genre,overview:item.overview,accent:item.accent||accent,mediaType:item.is_tv?'tv':'movie',certification:item.certification||''};
    setPlayerMovie(movieObj);
  };

  return(
    <>
    {playerMovie&&<InlinePlayer movie={playerMovie} onClose={()=>setPlayerMovie(null)} accent={playerMovie.accent||accent}/>}
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,0.8)',backdropFilter:'blur(16px)',display:'flex',alignItems:'flex-end',animation:'fadeIn 0.2s ease'}}>
      {toast&&<Toast message={toast} accent={accent}/>}
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',height:'92%',background:'rgba(8,8,16,0.99)',borderRadius:'24px 24px 0 0',border:'1px solid rgba(255,255,255,0.08)',borderBottom:'none',display:'flex',flexDirection:'column',animation:'sheetUp 0.35s cubic-bezier(0.22,1,0.36,1)'}}>
        <style>{`@keyframes sheetUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={{width:34,height:4,borderRadius:2,background:'rgba(255,255,255,0.1)',margin:'12px auto 0',flexShrink:0}}/>

        {/* Header — fixed overlap */}
        <div style={{padding:'14px 16px 0',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:900,fontStyle:'italic',color:'#fff'}}>My Profile</span>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <button style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,width:32,height:32,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <SvgIcon name="settings" size={14} color="rgba(255,255,255,0.4)"/>
            </button>
            <button onClick={onClose} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,width:32,height:32,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <SvgIcon name="close" size={14} color="rgba(255,255,255,0.4)"/>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',padding:'12px 16px 0',flexShrink:0,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          {['profile','watchlist','reviews'].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,background:'none',border:'none',cursor:'pointer',padding:'8px 0 12px',fontFamily:'inherit',fontSize:13,fontWeight:tab===t?700:400,color:tab===t?accent:'rgba(255,255,255,0.35)',borderBottom:`2px solid ${tab===t?accent:'transparent'}`,transition:'all 0.2s ease',textTransform:'capitalize'}}>
              {t}{t==='watchlist'&&watchlist.length>0?` (${watchlist.length})`:''}
            </button>
          ))}
        </div>

        <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',scrollbarWidth:'none'}}>

          {/* Profile tab */}
          {tab==='profile'&&(
            <div style={{padding:'16px'}}>
              {loadingData&&<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,padding:'10px 14px',background:'rgba(255,255,255,0.03)',borderRadius:12}}><div style={{width:14,height:14,border:`2px solid rgba(255,255,255,0.1)`,borderTop:`2px solid ${accent}`,borderRadius:'50%',animation:'spin 0.7s linear infinite',flexShrink:0}}/><span style={{fontSize:12,color:'rgba(255,255,255,0.3)'}}>Loading…</span></div>}
              <div style={{background:'linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))',border:'1px solid rgba(255,255,255,0.07)',borderRadius:20,padding:'16px',marginBottom:14,display:'flex',alignItems:'center',gap:14}}>
                <div style={{width:68,height:68,borderRadius:'50%',background:`linear-gradient(135deg,${accent}44,${accent}22)`,border:`2px solid ${accent}66`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}>
                  {user?.imageUrl?<img src={user.imageUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:26,fontWeight:700,color:accent,fontFamily:"'Playfair Display',serif"}}>{(user?.firstName||user?.username||'?')[0].toUpperCase()}</span>}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:18,fontWeight:700,color:'#fff',fontFamily:"'Playfair Display',serif",fontStyle:'italic',marginBottom:2}}>{user?.firstName||user?.username||'Cinephile'}</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginBottom:6}}>{user?.primaryEmailAddress?.emailAddress}</div>
                  <div style={{display:'inline-flex',alignItems:'center',gap:5,background:`${accent}14`,border:`1px solid ${accent}30`,borderRadius:20,padding:'2px 8px'}}><div style={{width:5,height:5,borderRadius:'50%',background:accent}}/><span style={{fontSize:10,color:accent,fontWeight:600}}>Active Member</span></div>
                </div>
              </div>
              <div style={{background:'linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))',border:`1px solid ${accent}20`,borderRadius:20,padding:'16px',marginBottom:14}}>
                <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:14}}>
                  <CineScoreRing score={cineScore} accent={accent}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,letterSpacing:2,color:'rgba(255,255,255,0.35)',fontWeight:700,marginBottom:4,textTransform:'uppercase'}}>CineScore</div>
                    <div style={{fontSize:12,color:'rgba(255,255,255,0.5)',lineHeight:1.5,marginBottom:8}}>{cineScore<100?'Just getting started!':cineScore<300?'Casual viewer.':cineScore<600?'Dedicated cinephile.':'Elite connoisseur. 🏆'}</div>
                    <button onClick={async()=>{setSharing(true);try{const d=await generateShareCard('score',{score:cineScore,name:user?.firstName||user?.username||'Cinephile',watched,reviews,saved},accent);await shareImage(d,'My CineScore',`My CineScore is ${cineScore}!`);showToast('Share card ready!');}catch(e){console.error(e);}setSharing(false);}} disabled={sharing} style={{background:'none',border:`1px solid ${accent}44`,borderRadius:20,padding:'4px 12px',cursor:'pointer',fontSize:10,color:accent,fontWeight:600,fontFamily:'inherit',display:'flex',alignItems:'center',gap:4,opacity:sharing?0.6:1}}>
                      {sharing?'…':<SvgIcon name="share" size={10} color={accent}/>} Share Score
                    </button>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                  {[{label:'TITLES',value:saved,icon:'📚'},{label:'WATCHED',value:watched,icon:'👁'},{label:'REVIEWS',value:reviews,icon:'✍️'}].map(s=>(
                    <div key={s.label} style={{background:'rgba(255,255,255,0.04)',borderRadius:10,padding:'10px 6px',textAlign:'center'}}>
                      <div style={{fontSize:16,marginBottom:3}}>{s.icon}</div>
                      <div style={{fontSize:20,fontWeight:800,color:accent,fontFamily:"'Playfair Display',serif",lineHeight:1}}>{s.value}</div>
                      <div style={{fontSize:9,letterSpacing:1.5,color:'rgba(255,255,255,0.25)',fontWeight:700,marginTop:2}}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
                {[{label:'Avg Rating',value:avgRating,icon:'star'},{label:'Genres Explored',value:Object.keys(topGenres).length,icon:'gem'}].map(s=>(
                  <div key={s.label} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:'12px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:6}}><SvgIcon name={s.icon} size={12} color="rgba(255,255,255,0.3)"/><span style={{fontSize:9,color:'rgba(255,255,255,0.3)',letterSpacing:0.5}}>{s.label}</span></div>
                    <div style={{fontSize:24,fontWeight:800,color:accent,fontFamily:"'Playfair Display',serif"}}>{s.value}</div>
                  </div>
                ))}
              </div>
              {sortedGenres.length>0&&(
                <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:'14px',marginBottom:14}}>
                  <div style={{fontSize:9,letterSpacing:2,color:'rgba(255,255,255,0.3)',fontWeight:700,marginBottom:10,textTransform:'uppercase'}}>Top Genres</div>
                  {sortedGenres.map(([genre,count])=>(
                    <div key={genre} style={{marginBottom:8}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{fontSize:12,color:'rgba(255,255,255,0.65)',fontWeight:500}}>{genre}</span><span style={{fontSize:11,color:'rgba(255,255,255,0.25)'}}>{count} films</span></div>
                      <div style={{height:3,borderRadius:2,background:'rgba(255,255,255,0.06)'}}><div style={{height:'100%',borderRadius:2,background:`linear-gradient(to right,${accent}88,${accent})`,width:`${(count/sortedGenres[0][1])*100}%`,transition:'width 0.8s ease'}}/></div>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={handleSignOut} disabled={signingOut||signedOut} style={{width:'100%',background:signedOut?`${accent}10`:'rgba(255,255,255,0.03)',border:`1px solid ${signedOut?accent+'44':'rgba(255,255,255,0.07)'}`,borderRadius:14,padding:'13px',cursor:signingOut||signedOut?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,fontFamily:'inherit',transition:'all 0.3s ease'}}>
                {signedOut?(<><div style={{width:16,height:16,borderRadius:'50%',background:accent,display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="check" size={10} color="#000"/></div><span style={{fontSize:13,color:accent,fontWeight:600}}>Signed out</span></>):signingOut?(<><div style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.1)',borderTop:'2px solid rgba(255,255,255,0.6)',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/><span style={{fontSize:13,color:'rgba(255,255,255,0.5)'}}>Signing out…</span></>):(<><SvgIcon name="logout" size={15} color="rgba(255,255,255,0.4)"/><span style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>Sign out</span></>)}
              </button>
            </div>
          )}

          {/* Watchlist tab */}
          {tab==='watchlist'&&(
            <div>
              <div style={{margin:'12px 16px 0',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:'12px 14px',display:'flex',alignItems:'center'}}>
                <div style={{flex:1,textAlign:'center',borderRight:'1px solid rgba(255,255,255,0.06)'}}>
                  <div style={{fontSize:18,fontWeight:800,color:'#fff',fontFamily:"'Playfair Display',serif"}}>{watchlist.length}</div>
                  <div style={{fontSize:9,letterSpacing:1.5,color:'rgba(255,255,255,0.3)',fontWeight:700}}>TITLES</div>
                </div>
                <div style={{flex:1,textAlign:'center',borderRight:'1px solid rgba(255,255,255,0.06)'}}>
                  <div style={{fontSize:18,fontWeight:800,color:accent,fontFamily:"'Playfair Display',serif"}}>{avgRating}</div>
                  <div style={{fontSize:9,letterSpacing:1.5,color:'rgba(255,255,255,0.3)',fontWeight:700}}>AVG RATING</div>
                </div>
                <div style={{flex:1,textAlign:'center'}}>
                  <div style={{fontSize:18,fontWeight:800,color:'#7BC8FF',fontFamily:"'Playfair Display',serif"}}>{watched}</div>
                  <div style={{fontSize:9,letterSpacing:1.5,color:'rgba(255,255,255,0.3)',fontWeight:700}}>WATCHED</div>
                </div>
              </div>
              <div style={{padding:'10px 16px 6px',display:'flex',flexDirection:'column',gap:8}}>
                <div style={{position:'relative'}}>
                  <div style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)'}}><SvgIcon name="search" size={14} color="rgba(255,255,255,0.25)"/></div>
                  <input value={watchlistSearch} onChange={e=>setWatchlistSearch(e.target.value)} placeholder="Search watchlist..." style={{width:'100%',boxSizing:'border-box',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:'9px 12px 9px 34px',color:'#fff',fontSize:13,outline:'none',fontFamily:'inherit'}}/>
                </div>
                <div style={{display:'flex',gap:5,alignItems:'center'}}>
                  <div style={{display:'flex',gap:4,flex:1}}>
                    {[['all','All'],['movies','Movies'],['tv','TV']].map(([val,label])=>(
                      <button key={val} onClick={()=>setWatchlistFilter(val)} style={{flex:1,background:watchlistFilter===val?accent:'rgba(255,255,255,0.04)',border:`1px solid ${watchlistFilter===val?accent:'rgba(255,255,255,0.07)'}`,borderRadius:20,padding:'5px 6px',cursor:'pointer',fontSize:11,fontWeight:watchlistFilter===val?700:400,color:watchlistFilter===val?'#07070F':'rgba(255,255,255,0.4)',fontFamily:'inherit',transition:'all 0.2s ease'}}>{label}</button>
                    ))}
                  </div>
                  <select value={watchlistSort} onChange={e=>setWatchlistSort(e.target.value)} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:20,padding:'5px 8px',color:'rgba(255,255,255,0.5)',fontSize:11,outline:'none',fontFamily:'inherit',cursor:'pointer'}}>
                    <option value="date">Date added</option>
                    <option value="rating">Rating</option>
                    <option value="title">A–Z</option>
                  </select>
                </div>
              </div>

              {loadingData?(<div style={{textAlign:'center',padding:30,color:'rgba(255,255,255,0.3)',fontSize:13,display:'flex',flexDirection:'column',alignItems:'center',gap:8}}><div style={{width:20,height:20,border:`2px solid rgba(255,255,255,0.1)`,borderTop:`2px solid ${accent}`,borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>Loading…</div>)
              :filteredWatchlist.length===0?(<div style={{textAlign:'center',padding:'24px 20px',display:'flex',flexDirection:'column',alignItems:'center',gap:10}}><SvgIcon name="bookmark" size={28} color="rgba(255,255,255,0.1)"/><div style={{fontSize:14,color:'rgba(255,255,255,0.3)'}}>{watchlistSearch?'No matches':'Your watchlist is empty'}</div></div>)
              :(
                <div style={{display:'flex',flexDirection:'column',padding:'0 16px 12px'}}>
                  {filteredWatchlist.map((m,i)=>(
                    <div key={m.movie_id} style={{display:'flex',gap:10,alignItems:'flex-start',padding:'12px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <div style={{width:20,height:20,borderRadius:5,background:i<3?`${accent}20`:'rgba(255,255,255,0.04)',border:`1px solid ${i<3?accent+'44':'rgba(255,255,255,0.07)'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:3}}>
                        <span style={{fontSize:9,fontWeight:800,color:i<3?accent:'rgba(255,255,255,0.3)'}}>{i+1}</span>
                      </div>
                      {/* Clickable poster → opens player */}
                      <button onClick={()=>handleWatchlistItemClick(m)} style={{width:52,height:72,borderRadius:10,flexShrink:0,overflow:'hidden',background:m.gradient||GRADS[i%GRADS.length],position:'relative',border:'none',cursor:'pointer',padding:0}}>
                        {m.poster&&<img src={m.poster} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
                        {m.watched&&<div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="check" size={14} color={accent}/></div>}
                        {/* Play overlay */}
                        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0)',display:'flex',alignItems:'center',justifyContent:'center',transition:'background 0.2s'}}>
                          <div style={{width:22,height:22,borderRadius:'50%',background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <SvgIcon name="play" size={10} color="#fff" filled/>
                          </div>
                        </div>
                      </button>
                      <div style={{flex:1,minWidth:0}}>
                        {/* Clickable title → opens player */}
                        <button onClick={()=>handleWatchlistItemClick(m)} style={{background:'none',border:'none',cursor:'pointer',padding:0,textAlign:'left',width:'100%'}}>
                          <div style={{display:'flex',alignItems:'flex-start',gap:5,marginBottom:3}}>
                            <span style={{fontSize:14,fontWeight:700,color:m.watched?'rgba(255,255,255,0.45)':'#fff',fontFamily:"'Playfair Display',serif",fontStyle:'italic',lineHeight:1.2,textDecoration:m.watched?'line-through':'none'}}>{m.title}</span>
                            {m.is_tv&&<span style={{fontSize:9,color:'#7BC8FF',border:'1px solid #7BC8FF44',borderRadius:4,padding:'1px 4px',flexShrink:0,marginTop:2,fontWeight:700}}>TV</span>}
                          </div>
                        </button>
                        <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:5}}>
                          <span style={{fontSize:11,color:'rgba(255,255,255,0.28)'}}>{m.year}</span>
                          <SvgIcon name="star" size={10} color={accent} filled/>
                          <span style={{fontSize:11,color:accent,fontWeight:600}}>{m.rating}</span>
                          {m.watched&&<span style={{fontSize:9,color:accent,background:`${accent}15`,borderRadius:10,padding:'1px 6px',fontWeight:700}}>Watched</span>}
                        </div>
                        {m.genre&&m.genre.length>0&&<div style={{display:'flex',gap:3,flexWrap:'wrap',marginBottom:7}}>{m.genre.slice(0,3).map(g=><span key={g} style={{fontSize:9,color:'rgba(255,255,255,0.3)',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:20,padding:'2px 6px'}}>{g}</span>)}</div>}
                        <div style={{display:'flex',gap:5}}>
                          <button onClick={()=>toggleWatched(m)} style={{display:'flex',alignItems:'center',gap:3,background:m.watched?`${accent}15`:'rgba(255,255,255,0.04)',border:`1px solid ${m.watched?accent+'44':'rgba(255,255,255,0.07)'}`,borderRadius:20,padding:'3px 9px',cursor:'pointer',fontSize:10,color:m.watched?accent:'rgba(255,255,255,0.4)',fontFamily:'inherit',fontWeight:600}}>
                            <SvgIcon name="check" size={9} color={m.watched?accent:'rgba(255,255,255,0.4)'}/>{m.watched?'Watched':'Mark watched'}
                          </button>
                          <button onClick={()=>handleWatchlistItemClick(m)} style={{display:'flex',alignItems:'center',gap:3,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:20,padding:'3px 9px',cursor:'pointer',fontSize:10,color:'rgba(255,255,255,0.4)',fontFamily:'inherit',fontWeight:600}}>
                            <SvgIcon name="play" size={9} color="rgba(255,255,255,0.4)" filled/>Trailer
                          </button>
                          <button onClick={()=>removeFromWatchlist(m)} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:20,padding:'3px 7px',cursor:'pointer',display:'flex',alignItems:'center'}}><SvgIcon name="trash" size={10} color="rgba(255,255,255,0.25)"/></button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div style={{display:'flex',alignItems:'center',gap:10,padding:'14px 0',border:'1px dashed rgba(255,255,255,0.07)',borderRadius:12,justifyContent:'center',marginTop:6}}>
                    <div style={{width:28,height:28,borderRadius:'50%',background:'rgba(255,255,255,0.04)',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="plus" size={14} color="rgba(255,255,255,0.3)"/></div>
                    <div><div style={{fontSize:12,color:'rgba(255,255,255,0.35)',fontWeight:500}}>Add something to your watchlist</div><div style={{fontSize:10,color:'rgba(255,255,255,0.2)'}}>Find your next great watch</div></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reviews tab */}
          {tab==='reviews'&&(
            <div style={{padding:'14px 16px'}}>
              {loadingData?<div style={{textAlign:'center',padding:30,color:'rgba(255,255,255,0.3)',fontSize:13}}>Loading…</div>
              :userReviews.length===0?(<div style={{textAlign:'center',padding:'32px 0',display:'flex',flexDirection:'column',alignItems:'center',gap:10}}><SvgIcon name="chat" size={28} color="rgba(255,255,255,0.1)"/><div style={{fontSize:14,color:'rgba(255,255,255,0.3)'}}>No reviews yet</div></div>)
              :(<div style={{display:'flex',flexDirection:'column',gap:10}}>
                {userReviews.map(r=>(
                  <div key={r.id} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:'14px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><span style={{fontSize:14,fontWeight:700,color:'#fff',fontFamily:"'Playfair Display',serif",fontStyle:'italic'}}>{r.movie_title}</span><span style={{fontSize:11,color:'rgba(255,255,255,0.25)'}}>{r.time}</span></div>
                    {r.rating>0&&<div style={{display:'flex',gap:2,marginBottom:6}}>{[1,2,3,4,5].map(s=><SvgIcon key={s} name="star" size={11} color={s<=r.rating?accent:'rgba(255,255,255,0.12)'} filled={s<=r.rating}/>)}</div>}
                    <p style={{fontSize:13,color:'rgba(255,255,255,0.6)',lineHeight:1.55,margin:0}}>{r.text}</p>
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

function CommentPanel({movie,onClose,accent,onAuthRequired}){
  const{isSignedIn,user}=useUser();
  const[comments,setComments]=useState([{id:1,user:'reelcritic',avatar:'R',text:'One of the defining films of the decade.',likes:84,time:'2h',liked:false,replies:[]},{id:2,user:'filmbuff_mx',avatar:'F',text:'Slow burn but worth every second.',likes:31,time:'5h',liked:false,replies:[]},{id:3,user:'popcorn.wav',avatar:'P',text:'Gorgeous visually but emotionally hollow.',likes:12,time:'1d',liked:false,replies:[]}]);
  const[input,setInput]=useState('');const[replyingTo,setReplyingTo]=useState(null);const inputRef=useRef(null);
  const toggleLike=id=>setComments(p=>p.map(c=>c.id===id?{...c,liked:!c.liked,likes:c.liked?c.likes-1:c.likes+1}:c));
  const startReply=(comment)=>{if(!isSignedIn){onAuthRequired();return;}setReplyingTo(comment);setInput(`@${comment.user} `);setTimeout(()=>inputRef.current?.focus(),100);};
  const post=async()=>{if(!isSignedIn){onAuthRequired();return;}if(!input.trim())return;const username=user?.username||user?.firstName||'you';const avatar=(user?.firstName||user?.username||'Y')[0].toUpperCase();if(replyingTo){setComments(p=>p.map(c=>c.id===replyingTo.id?{...c,replies:[...(c.replies||[]),{id:Date.now(),user:username,avatar,text:input,likes:0,time:'now',liked:false}]}:c));}else{setComments(p=>[{id:Date.now(),user:username,avatar,text:input,likes:0,time:'now',liked:false,replies:[]},...p]);await fetch('/api/reviews',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({movieId:movie?.id,movieTitle:movie?.title,text:input,rating:0})});}setInput('');setReplyingTo(null);};
  return(
    <div onClick={e=>e.stopPropagation()} style={{position:'absolute',bottom:0,left:0,right:0,height:'78%',background:'rgba(4,4,8,0.98)',backdropFilter:'blur(30px)',borderRadius:'24px 24px 0 0',zIndex:50,border:'1px solid rgba(255,255,255,0.07)',borderBottom:'none',display:'flex',flexDirection:'column',animation:'sheetUp 0.32s cubic-bezier(0.22,1,0.36,1)'}}>
      <style>{`@keyframes sheetUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      <div style={{width:34,height:4,borderRadius:2,background:'rgba(255,255,255,0.1)',margin:'10px auto 0',flexShrink:0}}/>
      <div style={{padding:'12px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,0.05)',flexShrink:0}}>
        <div><span style={{fontSize:15,fontWeight:700,color:'#fff'}}>Reviews</span><span style={{fontSize:12,color:'rgba(255,255,255,0.3)',marginLeft:8}}>{movie?.title}</span></div>
        <button onClick={onClose} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'50%',width:28,height:28,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="close" size={12} color="rgba(255,255,255,0.4)"/></button>
      </div>
      <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',padding:'12px 20px',display:'flex',flexDirection:'column',gap:14,scrollbarWidth:'none',minHeight:0}}>
        {comments.map(c=>(<div key={c.id}><div style={{display:'flex',gap:10}}><div style={{width:32,height:32,borderRadius:'50%',background:`${accent}20`,border:`1px solid ${accent}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:accent,flexShrink:0}}>{c.avatar}</div><div style={{flex:1}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}><span style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.65)'}}>@{c.user}</span><span style={{fontSize:11,color:'rgba(255,255,255,0.18)'}}>{c.time}</span></div><p style={{fontSize:13.5,color:'rgba(255,255,255,0.65)',lineHeight:1.55,margin:'0 0 6px'}}>{c.text}</p><div style={{display:'flex',gap:12,alignItems:'center'}}><button onClick={()=>toggleLike(c.id)} style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center',gap:4}}><SvgIcon name="heart" size={12} color={c.liked?'#FF6B8A':'rgba(255,255,255,0.2)'} filled={c.liked}/><span style={{fontSize:11,fontWeight:600,color:c.liked?'#FF6B8A':'rgba(255,255,255,0.2)'}}>{c.likes}</span></button><button onClick={()=>startReply(c)} style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center',gap:4}}><SvgIcon name="reply" size={12} color="rgba(255,255,255,0.25)"/><span style={{fontSize:11,color:'rgba(255,255,255,0.25)',fontWeight:500}}>Reply</span></button></div></div></div>{(c.replies||[]).map(r=>(<div key={r.id} style={{display:'flex',gap:10,marginTop:10,marginLeft:42}}><div style={{width:26,height:26,borderRadius:'50%',background:'rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.4)',flexShrink:0}}>{r.avatar}</div><div style={{flex:1}}><span style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.5)'}}>@{r.user}</span><p style={{fontSize:12.5,color:'rgba(255,255,255,0.5)',lineHeight:1.5,margin:0}}>{r.text}</p></div></div>))}</div>))}
      </div>
      {replyingTo&&<div style={{padding:'6px 20px',background:'rgba(255,255,255,0.04)',borderTop:'1px solid rgba(255,255,255,0.05)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}><span style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>Replying to <span style={{color:accent}}>@{replyingTo.user}</span></span><button onClick={()=>{setReplyingTo(null);setInput('');}} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:14,padding:0}}>✕</button></div>}
      {isSignedIn?(<div style={{padding:'10px 16px 34px',borderTop:'1px solid rgba(255,255,255,0.05)',display:'flex',gap:8,alignItems:'center',flexShrink:0,background:'rgba(4,4,8,0.98)'}}><input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&post()} placeholder={replyingTo?`Reply to @${replyingTo.user}...`:'Write a review...'} style={{flex:1,background:'rgba(255,255,255,0.06)',border:`1px solid ${replyingTo?accent+'44':'rgba(255,255,255,0.08)'}`,borderRadius:22,padding:'11px 16px',color:'#fff',fontSize:14,outline:'none',fontFamily:'inherit'}}/><button onClick={post} style={{background:accent,border:'none',borderRadius:'50%',width:40,height:40,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><SvgIcon name="send" size={14} color="#000"/></button></div>)
      :(<div style={{padding:'14px 20px 34px',borderTop:'1px solid rgba(255,255,255,0.05)',flexShrink:0,background:'rgba(4,4,8,0.98)'}}><button onClick={onAuthRequired} style={{width:'100%',background:`${accent}18`,border:`1px solid ${accent}44`,borderRadius:16,padding:'13px',cursor:'pointer',fontFamily:'inherit',fontSize:14,color:accent,fontWeight:600}}>Sign in to leave a review</button></div>)}
    </div>
  );
}

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
        {loading&&<div style={{textAlign:'center',padding:24,display:'flex',flexDirection:'column',alignItems:'center',gap:10}}><div style={{width:24,height:24,border:`2px solid rgba(255,255,255,0.1)`,borderTop:`2px solid ${accent}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/><span style={{color:'rgba(255,255,255,0.3)',fontSize:13}}>Finding similar…</span></div>}
        {!loading&&items.length===0&&<div style={{textAlign:'center',padding:24,color:'rgba(255,255,255,0.3)',fontSize:13}}>None found</div>}
        {items.map((m,i)=>(<button key={m.id} onClick={()=>{onSelect(m);onClose();}} style={{display:'flex',gap:12,alignItems:'center',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:'10px 14px',cursor:'pointer',textAlign:'left',fontFamily:'inherit'}}><div style={{width:44,height:60,borderRadius:8,flexShrink:0,overflow:'hidden',background:m.gradient||GRADS[i%GRADS.length]}}>{m.poster&&<img src={m.poster} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}</div><div style={{flex:1}}><div style={{display:'flex',alignItems:'center',gap:5,marginBottom:3}}><span style={{fontSize:13,fontWeight:700,color:'#fff',fontFamily:"'Playfair Display',serif",fontStyle:'italic'}}>{m.title}</span>{m.isTV&&<span style={{fontSize:9,color:m.accent,border:`1px solid ${m.accent}44`,borderRadius:3,padding:'1px 4px',fontWeight:700}}>TV</span>}</div><div style={{fontSize:11,color:'rgba(255,255,255,0.28)',display:'flex',alignItems:'center',gap:4}}><span>{m.year}</span><SvgIcon name="star" size={10} color={m.accent} filled/><span style={{color:m.accent,fontWeight:600}}>{m.rating}</span></div><p style={{fontSize:11,color:'rgba(255,255,255,0.3)',lineHeight:1.4,margin:'4px 0 0',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{m.overview}</p></div></button>))}
      </div>
    </div></>
  );
}

function MovieCard({movie,isActive,index,onFindSimilar,onAuthRequired,onSave,isSaved,onTrailer}){
  const{isSignedIn}=useUser();
  const[liked,setLiked]=useState(false);const[userRating,setUserRating]=useState(0);const[showComments,setShowComments]=useState(false);const[showStars,setShowStars]=useState(false);const[hoverStar,setHoverStar]=useState(0);const[imgLoaded,setImgLoaded]=useState(false);const[likeCount]=useState(Math.floor(Math.random()*60+8)*100);const[showHint,setShowHint]=useState(false);
  const longPressTimer=useRef(null);const isPressingRef=useRef(false);
  const fmt=n=>n>=1000?`${(n/1000).toFixed(0)}K`:n;
  const accent=movie.accent||'#F5A623';const bgImage=movie.backdrop||movie.poster;
  const handleLike=()=>{if(!isSignedIn){onAuthRequired();return;}setLiked(p=>!p);};
  const handleSave=()=>{if(!isSignedIn){onAuthRequired();return;}onSave(movie);};
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
        <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(0,0,0,0.45)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:20,padding:'5px 12px'}}>
          <div style={{width:5,height:5,borderRadius:'50%',background:accent,boxShadow:`0 0 6px ${accent}`}}/>
          <span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.6)',letterSpacing:1}}>{String(index+1).padStart(2,'0')}</span>
          {movie.isTV&&<span style={{fontSize:9,color:accent,fontWeight:700,marginLeft:2}}>TV</span>}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          {movie.certification&&<CertBadge cert={movie.certification}/>}
          <div style={{display:'flex',alignItems:'center',gap:5,background:'rgba(0,0,0,0.45)',backdropFilter:'blur(12px)',border:`1px solid ${accent}35`,borderRadius:20,padding:'5px 12px'}}><SvgIcon name="star" size={11} color={accent} filled/><span style={{fontSize:13,fontWeight:800,color:'#fff'}}>{movie.rating}</span><span style={{fontSize:10,color:'rgba(255,255,255,0.28)'}}>/10</span></div>
        </div>
      </div>

      <div style={{position:'absolute',bottom:0,left:0,right:68,padding:'0 20px 36px',zIndex:10,opacity:isActive?1:0.4,transform:isActive?'translateY(0)':'translateY(18px)',transition:'all 0.5s ease'}}>
        <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap',alignItems:'center'}}>
          {(movie.genre||[]).map(g=>(<span key={g} style={{fontSize:9,letterSpacing:2.5,color:accent,fontWeight:800,textTransform:'uppercase',padding:'3px 8px',border:`1px solid ${accent}44`,borderRadius:4}}>{g}</span>))}
          {movie.isTV&&<span style={{fontSize:9,color:'rgba(255,255,255,0.4)',fontWeight:600,padding:'3px 8px',border:'1px solid rgba(255,255,255,0.12)',borderRadius:4}}>SERIES</span>}
        </div>
        {isActive&&<StreamingBadges movieId={movie.id} mediaType={movie.mediaType}/>}
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:Math.min(52,Math.max(28,56-(movie.title?.length||0)*0.9)),fontWeight:900,fontStyle:'italic',color:'#fff',margin:'0 0 6px',lineHeight:1.0,letterSpacing:-1,textShadow:`0 0 60px ${accent}30,0 4px 30px rgba(0,0,0,0.8)`}}>{movie.title}</h2>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:13,color:`${accent}bb`,fontStyle:'italic'}}>{movie.year}</span>
          <span style={{width:3,height:3,borderRadius:'50%',background:'rgba(255,255,255,0.2)'}}/>
          <div style={{display:'flex',alignItems:'center',gap:4}}><SvgIcon name="eye" size={11} color="rgba(255,255,255,0.3)"/><span style={{fontSize:12,color:'rgba(255,255,255,0.38)'}}>{movie.votes} ratings</span></div>
        </div>
        <p style={{fontSize:13.5,color:'rgba(255,255,255,0.58)',lineHeight:1.68,margin:'0 0 14px',fontWeight:400}}>{movie.overview}</p>
        {showStars&&(
          <div style={{display:'flex',gap:5,alignItems:'center',marginBottom:10,animation:'fadeUp 0.2s ease'}}>
            {[1,2,3,4,5].map(s=>(<button key={s} onMouseEnter={()=>setHoverStar(s)} onMouseLeave={()=>setHoverStar(0)} onClick={()=>{setUserRating(s);setTimeout(()=>setShowStars(false),700);}} style={{background:'none',border:'none',cursor:'pointer',padding:0,transform:hoverStar===s?'scale(1.35)':'scale(1)',transition:'transform 0.1s ease'}}><SvgIcon name="star" size={26} color={s<=(hoverStar||userRating)?accent:'rgba(255,255,255,0.15)'} filled={s<=(hoverStar||userRating)}/></button>))}
            {userRating>0&&<span style={{fontSize:12,color:accent,marginLeft:6,fontWeight:700}}>Rated {userRating}/5</span>}
          </div>
        )}
      </div>

      <div style={{position:'absolute',right:12,bottom:80,zIndex:10,display:'flex',flexDirection:'column',gap:5,alignItems:'center',opacity:isActive?1:0,transform:isActive?'translateX(0)':'translateX(28px)',transition:'all 0.45s ease 0.12s'}}>
        {[{icon:'heart',label:fmt(likeCount+(liked?1:0)),active:liked,color:'#FF6B8A',filled:liked,fn:handleLike},{icon:'star',label:userRating?`${userRating}/5`:'Rate',active:showStars||userRating>0,color:accent,filled:userRating>0,fn:handleRate},{icon:'chat',label:'Review',active:showComments,color:'#7BC8FF',filled:false,fn:()=>setShowComments(true)},{icon:'similar',label:'Similar',active:false,color:'#B07FEF',filled:false,fn:()=>onFindSimilar(movie)},{icon:'bookmark',label:isSaved?'Saved':'Save',active:isSaved,color:'#7BFF9E',filled:isSaved,fn:handleSave}].map(btn=>(
          <button key={btn.icon} onClick={btn.fn} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,background:btn.active?`${btn.color}15`:'rgba(0,0,0,0.42)',backdropFilter:'blur(20px)',border:`1px solid ${btn.active?btn.color+'50':'rgba(255,255,255,0.09)'}`,borderRadius:18,padding:'11px 9px',cursor:'pointer',minWidth:50,transition:'all 0.22s ease',boxShadow:btn.active?`0 0 18px ${btn.color}22`:'none'}}>
            <SvgIcon name={btn.icon} size={20} color={btn.active?btn.color:'rgba(255,255,255,0.65)'} filled={btn.filled}/>
            <span style={{fontSize:9,color:btn.active?btn.color:'rgba(255,255,255,0.28)',letterSpacing:0.3,fontWeight:700,marginTop:1}}>{btn.label}</span>
          </button>
        ))}
      </div>
      {showComments&&<CommentPanel movie={movie} onClose={()=>setShowComments(false)} accent={accent} onAuthRequired={()=>{setShowComments(false);onAuthRequired();}}/>}
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

function FilterSheet({show,onClose,activeGenre,activeMood,onGenre,onMood,accent}){
  return(
    <>{show&&<div onClick={onClose} style={{position:'fixed',inset:0,zIndex:55,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(6px)'}}/>}
    <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:60,background:'rgba(5,5,10,0.98)',backdropFilter:'blur(32px)',borderRadius:'26px 26px 0 0',border:'1px solid rgba(255,255,255,0.07)',borderBottom:'none',padding:'0 20px 44px',transform:show?'translateY(0)':'translateY(110%)',transition:'transform 0.38s cubic-bezier(0.22,1,0.36,1)'}}>
      <div style={{width:34,height:4,borderRadius:2,background:'rgba(255,255,255,0.1)',margin:'12px auto 20px'}}/>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <span style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:900,fontStyle:'italic',color:'#fff'}}>Discover</span>
        <button onClick={onClose} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'50%',width:30,height:30,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="close" size={13} color="rgba(255,255,255,0.4)"/></button>
      </div>
      <div style={{marginBottom:24}}>
        <div style={{fontSize:9,letterSpacing:3,color:'rgba(255,255,255,0.22)',fontWeight:700,marginBottom:10,textTransform:'uppercase'}}>Mood</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          {FEED_MOODS.map(m=>{const on=activeMood===m.label;return<button key={m.label} onClick={()=>{onMood(m.label);onClose();}} style={{display:'flex',alignItems:'center',gap:10,background:on?'rgba(255,255,255,0.09)':'rgba(255,255,255,0.03)',border:`1px solid ${on?'rgba(255,255,255,0.22)':'rgba(255,255,255,0.06)'}`,borderRadius:14,padding:'12px 14px',cursor:'pointer',fontFamily:'inherit'}}><SvgIcon name={m.icon} size={14} color={on?'#fff':'rgba(255,255,255,0.3)'} filled={on}/><span style={{fontSize:13,color:on?'#fff':'rgba(255,255,255,0.4)',fontWeight:on?600:400}}>{m.label}</span></button>;})}
        </div>
      </div>
      <div>
        <div style={{fontSize:9,letterSpacing:3,color:'rgba(255,255,255,0.22)',fontWeight:700,marginBottom:10,textTransform:'uppercase'}}>Genre</div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {GENRE_OPTIONS.map(g=>{const on=activeGenre===g.id;return<button key={g.id} onClick={()=>{onGenre(g.id);onClose();}} style={{background:on?accent:'rgba(255,255,255,0.04)',border:`1px solid ${on?accent:'rgba(255,255,255,0.07)'}`,borderRadius:22,padding:'6px 14px',cursor:'pointer',fontFamily:'inherit',fontSize:12,color:on?'#06060A':'rgba(255,255,255,0.4)',fontWeight:on?700:400,transition:'all 0.2s ease'}}>{g.label}</button>;})}
        </div>
      </div>
    </div></>
  );
}

export default function CineScroll(){
  const{isSignedIn,user,isLoaded}=useUser();
  const{openSignIn}=useClerk();
  const[movies,setMovies]=useState([]);const[loading,setLoading]=useState(true);const[activeIndex,setActiveIndex]=useState(0);const[activeGenre,setActiveGenre]=useState('');const[activeMood,setActiveMood]=useState('Trending');const[showFilter,setShowFilter]=useState(false);const[showSearch,setShowSearch]=useState(false);const[showAuth,setShowAuth]=useState(false);const[showProfile,setShowProfile]=useState(false);const[showMood,setShowMood]=useState(false);const[trailerMovie,setTrailerMovie]=useState(null);const[searchQ,setSearchQ]=useState('');const[searchRes,setSearchRes]=useState([]);const[searching,setSearching]=useState(false);const[similarMovie,setSimilarMovie]=useState(null);const[watchlistIds,setWatchlistIds]=useState(new Set());const[watchlist,setWatchlist]=useState([]);const[userReviews,setUserReviews]=useState([]);const[loadingProfileData,setLoadingProfileData]=useState(false);
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
    else{setWatchlistIds(p=>new Set([...p,movie.id]));setWatchlist(p=>[{movie_id:movie.id,title:movie.title,year:movie.year,rating:movie.rating,poster:movie.poster,backdrop:movie.backdrop,genre:movie.genre,overview:movie.overview,accent:movie.accent,gradient:movie.gradient,is_tv:movie.isTV||false,watched:false,saved_at:Date.now(),certification:movie.certification||''},...p]);await fetch('/api/watchlist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(movie)});}
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
    if(!searchQ.trim()){setSearchRes([]);return;}
    const t=setTimeout(async()=>{setSearching(true);try{const res=await fetch(`/api/movies?search=${encodeURIComponent(searchQ)}`);const data=await res.json();setSearchRes(data.movies||[]);}catch{}setSearching(false);},350);
    return()=>clearTimeout(t);
  },[searchQ]);

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
          <button onClick={()=>setShowMood(true)} style={{background:'rgba(0,0,0,0.55)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,width:38,height:38,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(12px)',fontSize:17,lineHeight:1}}>🎭</button>
          <button onClick={()=>{setShowSearch(p=>!p);setShowFilter(false);setSearchQ('');setSearchRes([]);}} style={{background:showSearch?`${accent}18`:'rgba(0,0,0,0.55)',border:`1px solid ${showSearch?accent+'44':'rgba(255,255,255,0.1)'}`,borderRadius:12,width:38,height:38,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(12px)',transition:'all 0.2s ease'}}>
            <SvgIcon name={showSearch?'close':'search'} size={17} color={showSearch?accent:'rgba(255,255,255,0.7)'}/>
          </button>
          <button onClick={()=>{setShowFilter(p=>!p);setShowSearch(false);}} style={{background:showFilter?`${accent}18`:'rgba(0,0,0,0.55)',border:`1px solid ${showFilter?accent+'44':'rgba(255,255,255,0.1)'}`,borderRadius:12,width:38,height:38,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(12px)',transition:'all 0.2s ease'}}>
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

      {(activeGenre||activeMood!=='Trending')&&!showFilter&&!showSearch&&(
        <div style={{position:'fixed',top:62,left:16,zIndex:38,display:'flex',gap:6,pointerEvents:'none'}}>
          {activeMood!=='Trending'&&<div style={{background:'rgba(0,0,0,0.55)',backdropFilter:'blur(10px)',border:`1px solid ${accent}33`,borderRadius:20,padding:'3px 10px',fontSize:10,color:accent,fontWeight:700}}>{activeMood}</div>}
          {activeGenre&&<div style={{background:'rgba(0,0,0,0.55)',backdropFilter:'blur(10px)',border:`1px solid ${accent}33`,borderRadius:20,padding:'3px 10px',fontSize:10,color:accent,fontWeight:700}}>{activeGenreLabel}</div>}
        </div>
      )}

      {showSearch&&(
        <div style={{position:'fixed',inset:0,zIndex:45,background:'rgba(4,4,10,0.97)',backdropFilter:'blur(24px)',padding:'78px 16px 20px',display:'flex',flexDirection:'column',gap:12,animation:'fadeIn 0.2s ease'}}>
          <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <div style={{position:'relative',flex:1}}>
              <div style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)'}}><SvgIcon name="search" size={16} color="rgba(255,255,255,0.28)"/></div>
              <input autoFocus value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search any movie or TV show..." style={{width:'100%',boxSizing:'border-box',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:14,padding:'13px 16px 13px 42px',color:'#fff',fontSize:16,outline:'none',fontFamily:'inherit'}}/>
            </div>
            <button onClick={()=>{setShowSearch(false);setSearchQ('');setSearchRes([]);}} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,width:44,height:44,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <SvgIcon name="close" size={16} color="rgba(255,255,255,0.6)"/>
            </button>
          </div>
          <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',display:'flex',flexDirection:'column',gap:6,scrollbarWidth:'none'}}>
            {searching&&<div style={{textAlign:'center',padding:24,display:'flex',flexDirection:'column',alignItems:'center',gap:8}}><div style={{width:22,height:22,border:`2px solid rgba(255,255,255,0.1)`,borderTop:`2px solid ${accent}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/><span style={{fontSize:13,color:'rgba(255,255,255,0.3)'}}>Searching…</span></div>}
            {!searching&&searchQ&&searchRes.length===0&&<div style={{textAlign:'center',padding:24,color:'rgba(255,255,255,0.3)',fontSize:13}}>No results for &quot;{searchQ}&quot;</div>}
            {!searching&&!searchQ&&(<>
              <div style={{fontSize:10,letterSpacing:2,color:'rgba(255,255,255,0.2)',fontWeight:700,marginBottom:4,textTransform:'uppercase'}}>Currently in feed</div>
              {movies.slice(0,8).map((m,i)=>(<button key={m.id} onClick={()=>{scrollTo(i);setShowSearch(false);}} style={{display:'flex',gap:12,alignItems:'center',background:'transparent',border:'none',borderBottom:'1px solid rgba(255,255,255,0.04)',padding:'10px 0',cursor:'pointer',textAlign:'left',fontFamily:'inherit',width:'100%'}}><div style={{width:36,height:50,borderRadius:8,flexShrink:0,overflow:'hidden',background:m.gradient||GRADS[i%GRADS.length]}}>{m.poster&&<img src={m.poster} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}</div><div><div style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.8)',fontFamily:"'Playfair Display',serif",fontStyle:'italic',marginBottom:2}}>{m.title}</div><div style={{fontSize:11,color:'rgba(255,255,255,0.25)',display:'flex',alignItems:'center',gap:4}}><span>{m.year}</span><SvgIcon name="star" size={9} color={m.accent} filled/><span style={{color:m.accent,fontWeight:600}}>{m.rating}</span>{m.isTV&&<span>· TV</span>}</div></div></button>))}
            </>)}
            {!searching&&searchRes.length>0&&(<>
              <div style={{fontSize:10,letterSpacing:2,color:'rgba(255,255,255,0.2)',fontWeight:700,marginBottom:4,textTransform:'uppercase'}}>{searchRes.length} results for &quot;{searchQ}&quot;</div>
              {searchRes.map((m,i)=>(<button key={m.id} onClick={()=>{setMovies(p=>[m,...p.filter(x=>x.id!==m.id)]);scrollTo(0);setShowSearch(false);setSearchQ('');setSearchRes([]);}} style={{display:'flex',gap:12,alignItems:'center',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:'11px 14px',cursor:'pointer',textAlign:'left',fontFamily:'inherit'}}><div style={{width:42,height:58,borderRadius:8,flexShrink:0,overflow:'hidden',background:m.gradient||GRADS[i%GRADS.length]}}>{m.poster&&<img src={m.poster} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}</div><div style={{flex:1}}><div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}><span style={{fontSize:14,fontWeight:700,color:'#fff',fontFamily:"'Playfair Display',serif",fontStyle:'italic'}}>{m.title}</span>{m.isTV&&<span style={{fontSize:9,color:'#7BC8FF',border:'1px solid #7BC8FF44',borderRadius:3,padding:'1px 4px',fontWeight:700}}>TV</span>}</div><div style={{fontSize:11,color:'rgba(255,255,255,0.28)',display:'flex',alignItems:'center',gap:4,marginBottom:4}}><span>{m.year}</span><SvgIcon name="star" size={9} color={m.accent} filled/><span style={{color:m.accent,fontWeight:600}}>{m.rating}</span></div>{m.genre&&m.genre.length>0&&<div style={{display:'flex',gap:3}}>{m.genre.slice(0,2).map(g=><span key={g} style={{fontSize:9,color:'rgba(255,255,255,0.3)',background:'rgba(255,255,255,0.05)',borderRadius:20,padding:'1px 5px'}}>{g}</span>)}</div>}</div><SvgIcon name="play" size={13} color="rgba(255,255,255,0.3)" filled/></button>))}
            </>)}
          </div>
        </div>
      )}

      <div ref={containerRef} style={{position:'fixed',inset:0,overflowY:'scroll',scrollSnapType:'y mandatory',WebkitOverflowScrolling:'touch',scrollbarWidth:'none'}}>
        <style>{`div::-webkit-scrollbar{display:none}*{-webkit-tap-highlight-color:transparent;box-sizing:border-box}`}</style>
        {loading?(<div style={{height:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',scrollSnapAlign:'start',flexDirection:'column',gap:12}}><div style={{fontFamily:"'Playfair Display',serif",fontSize:40,fontWeight:900,fontStyle:'italic',color:'#fff'}}>CineScroll</div><div style={{fontSize:11,color:'rgba(255,255,255,0.2)',letterSpacing:3}}>LOADING FILMS…</div></div>)
        :(movies.map((m,i)=>(<div key={`${m.id}-${i}`} style={{width:'100%',height:'100dvh',scrollSnapAlign:'start',scrollSnapStop:'always',position:'relative',flexShrink:0}}><MovieCard movie={m} isActive={i===activeIndex} index={i} onFindSimilar={setSimilarMovie} onAuthRequired={()=>setShowAuth(true)} onSave={handleSave} isSaved={watchlistIds.has(m.id)} onTrailer={setTrailerMovie}/></div>)))}
      </div>

      <div style={{position:'fixed',right:5,top:'50%',transform:'translateY(-50%)',display:'flex',flexDirection:'column',gap:4,zIndex:20,pointerEvents:'none'}}>
        {movies.slice(0,12).map((_,i)=>(<div key={i} style={{width:i===activeIndex?3:2,height:i===activeIndex?24:6,borderRadius:2,background:i===activeIndex?accent:'rgba(255,255,255,0.1)',transition:'all 0.3s ease',boxShadow:i===activeIndex?`0 0 8px ${accent}`:'none'}}/>))}
      </div>

      {activeIndex===0&&movies.length>1&&(<div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',zIndex:20,pointerEvents:'none',display:'flex',flexDirection:'column',alignItems:'center',gap:5,animation:'bob 2.2s ease infinite'}}><div style={{fontSize:9,letterSpacing:3,color:'rgba(255,255,255,0.16)',fontWeight:700}}>SCROLL</div><SvgIcon name="chevron" size={16} color="rgba(255,255,255,0.16)"/></div>)}

      <FilterSheet show={showFilter} onClose={()=>setShowFilter(false)} activeGenre={activeGenre} activeMood={activeMood} onGenre={setActiveGenre} onMood={setActiveMood} accent={accent}/>
      {similarMovie&&<SimilarSheet movie={similarMovie} onClose={()=>setSimilarMovie(null)} accent={accent} onSelect={handleSimilarSelect}/>}
      {showAuth&&<AuthGate onClose={()=>setShowAuth(false)} accent={accent}/>}
      {showProfile&&<ProfileSheet onClose={()=>setShowProfile(false)} accent={accent} watchlist={watchlist} setWatchlist={setWatchlist} userReviews={userReviews} loadingData={loadingProfileData} movies={movies} scrollToMovie={scrollTo}/>}
      {showMood&&<MoodScreen onClose={()=>setShowMood(false)} onMoodSelect={handleMoodSelect} accent={accent}/>}
      {trailerMovie&&<InlinePlayer movie={trailerMovie} onClose={()=>setTrailerMovie(null)} accent={trailerMovie.accent||accent}/>}

      <style>{`@keyframes bob{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-8px)}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
      }
