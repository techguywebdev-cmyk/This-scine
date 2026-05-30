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
    award:    ['M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14z','M8.21 13.89L7 23l5-3 5 3-1.21-9.12'],
    share:    ['M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8','M16 6l-4-4-4 4','M12 2v13'],
    loader:   ['M12 2v4','M12 18v4','M4.93 4.93l2.83 2.83','M16.24 16.24l2.83 2.83','M2 12h4','M18 12h4','M4.93 19.07l2.83-2.83','M16.24 7.76l2.83-2.83'],
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

const GENRE_OPTIONS = [
  {label:'All',id:''},{label:'Action',id:'28'},{label:'Drama',id:'18'},
  {label:'Horror',id:'27'},{label:'Sci-Fi',id:'878'},{label:'Comedy',id:'35'},
  {label:'Thriller',id:'53'},{label:'Romance',id:'10749'},
  {label:'Animation',id:'16'},{label:'Documentary',id:'99'},
];

const MOODS = [
  {label:'Trending',icon:'flame'},{label:'Top Rated',icon:'star'},
  {label:'New',icon:'sparkle'},{label:'Hidden Gems',icon:'gem'},
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

// ─── Share Card Generator ─────────────────────────────────────────────────────
function generateShareCard(type, data, accent) {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 450;
  const ctx = canvas.getContext('2d');

  // Background
  const bg = ctx.createLinearGradient(0, 0, 800, 450);
  bg.addColorStop(0, '#04040A');
  bg.addColorStop(1, '#0a0a18');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 800, 450);

  // Accent glow
  const glow = ctx.createRadialGradient(400, 225, 0, 400, 225, 400);
  glow.addColorStop(0, accent + '22');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 800, 450);

  // Border
  ctx.strokeStyle = accent + '44';
  ctx.lineWidth = 2;
  ctx.roundRect(10, 10, 780, 430, 20);
  ctx.stroke();

  // Logo
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(50, 50, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'italic bold 22px Georgia, serif';
  ctx.fillText('CineScroll', 68, 57);

  if (type === 'score') {
    // CineScore card
    ctx.fillStyle = accent;
    ctx.font = 'bold 100px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(data.score, 400, 230);

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CINESCORE', 400, 270);

    ctx.fillStyle = '#fff';
    ctx.font = 'italic 24px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(data.name, 400, 320);

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '14px sans-serif';
    ctx.fillText(`${data.watched} watched · ${data.reviews} reviews · ${data.saved} saved`, 400, 355);

    ctx.fillStyle = accent + '88';
    ctx.font = '13px sans-serif';
    ctx.fillText('this-scine.vercel.app', 400, 420);

  } else if (type === 'watchlist') {
    // Watchlist card
    ctx.fillStyle = '#fff';
    ctx.font = 'italic bold 28px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${data.name}'s Watchlist`, 40, 115);

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '14px sans-serif';
    ctx.fillText(`${data.total} films · ${data.watched} watched`, 40, 140);

    // Show up to 5 movie titles
    const items = data.items.slice(0, 5);
    items.forEach((m, i) => {
      const y = 175 + i * 44;
      ctx.fillStyle = accent + '22';
      ctx.roundRect(40, y - 22, 720, 36, 8);
      ctx.fill();
      ctx.fillStyle = m.watched ? 'rgba(255,255,255,0.3)' : '#fff';
      ctx.font = m.watched ? '14px sans-serif' : 'bold 14px sans-serif';
      ctx.fillText(`${i + 1}. \( {m.title} ( \){m.year})`, 58, y);
      ctx.fillStyle = accent;
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`★ ${m.rating}`, 750, y);
      ctx.textAlign = 'left';
    });

    if (data.total > 5) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = '13px sans-serif';
      ctx.fillText(`+ ${data.total - 5} more`, 40, 175 + 5 * 44);
    }

    ctx.fillStyle = accent + '88';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('this-scine.vercel.app', 400, 420);
  }

  return canvas.toDataURL('image/png');
}

async function shareImage(dataUrl, title, text) {
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], 'cinescroll-share.png', { type: 'image/png' });
  if (navigator.share && navigator.canShare({ files: [file] })) {
    await navigator.share({ title, text, files: [file], url: 'https://this-scine.vercel.app' });
  } else {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'cinescroll-share.png';
    a.click();
  }
}

// ─── CineScore Ring ───────────────────────────────────────────────────────────
function calcCineScore(watched, reviews, saved, ratings) {
  return Math.min(999, (watched * 3) + (reviews * 8) + (saved * 2) + (ratings * 4));
}

function CineScoreRing({ score, accent }) {
  const r = 38, circ = 2 * Math.PI * r;
  const dash = (score / 999) * circ;
  return (
    <div style={{position:'relative',width:100,height:100,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <svg width="100" height="100" style={{position:'absolute',inset:0,transform:'rotate(-90deg)'}}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"/>
        <circle cx="50" cy="50" r={r} fill="none" stroke={accent} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{transition:'stroke-dasharray 1s ease'}}/>
      </svg>
      <div style={{textAlign:'center',zIndex:1}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:900,color:'#fff',lineHeight:1}}>{score}</div>
        <div style={{fontSize:8,letterSpacing:2,color:'rgba(255,255,255,0.35)',fontWeight:700,marginTop:2}}>SCORE</div>
      </div>
    </div>
  );
}

// ─── Profile Sheet ────────────────────────────────────────────────────────────
function ProfileSheet({ onClose, accent }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [tab, setTab] = useState('profile');
  const [watchlist, setWatchlist] = useState([]);
  const [userReviews, setUserReviews] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoadingData(true);
      try {
        const [wRes, rRes] = await Promise.all([
          fetch('/api/watchlist'),
          fetch('/api/reviews'),
        ]);
        const wData = await wRes.json();
        const rData = await rRes.json();
        setWatchlist(wData.items || []);
        setUserReviews(rData.items || []);
      } catch {}
      setLoadingData(false);
    };
    load();
  }, []);

  const toggleWatched = async (item) => {
    const next = !item.watched;
    setWatchlist(p => p.map(m => m.movie_id === item.movie_id ? {...m, watched: next} : m));
    await fetch('/api/watchlist', {
      method: 'PATCH',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ movieId: item.movie_id, watched: next }),
    });
  };

  const removeFromWatchlist = async (item) => {
    setWatchlist(p => p.filter(m => m.movie_id !== item.movie_id));
    await fetch('/api/watchlist', {
      method: 'DELETE',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ movieId: item.movie_id }),
    });
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut({ redirectUrl: '/' });
    } catch {
      await signOut();
    }
    setSigningOut(false);
  };

  const watched = watchlist.filter(m => m.watched).length;
  const saved = watchlist.length;
  const reviews = userReviews.length;
  const cineScore = calcCineScore(watched, reviews, saved, 0);

  const topGenres = watchlist
    .flatMap(m => m.genre || [])
    .reduce((acc, g) => { acc[g] = (acc[g] || 0) + 1; return acc; }, {});
  const sortedGenres = Object.entries(topGenres).sort((a,b) => b[1]-a[1]).slice(0,3);

  const avgRating = userReviews.filter(r=>r.rating>0).length > 0
    ? (userReviews.filter(r=>r.rating>0).reduce((s,r)=>s+r.rating,0) / userReviews.filter(r=>r.rating>0).length).toFixed(1)
    : '—';

  const handleShareScore = async () => {
    setSharing(true);
    try {
      const dataUrl = generateShareCard('score', {
        score: cineScore,
        name: user?.firstName || user?.username || 'Cinephile',
        watched, reviews, saved,
      }, accent);
      await shareImage(dataUrl, 'My CineScore', `My CineScore is ${cineScore}! Check out CineScroll`);
    } catch(e) { console.error(e); }
    setSharing(false);
  };

  const handleShareWatchlist = async () => {
    setSharing(true);
    try {
      const dataUrl = generateShareCard('watchlist', {
        name: user?.firstName || user?.username || 'Cinephile',
        total: watchlist.length,
        watched,
        items: watchlist.map(m => ({ title: m.title, year: m.year, rating: m.rating, watched: m.watched })),
      }, accent);
      await shareImage(dataUrl, 'My CineScroll Watchlist', `Check out my watchlist on CineScroll!`);
    } catch(e) { console.error(e); }
    setSharing(false);
  };

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(12px)',display:'flex',alignItems:'flex-end',animation:'fadeIn 0.2s ease'}}>
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',height:'88%',background:'rgba(5,5,12,0.98)',borderRadius:'24px 24px 0 0',border:'1px solid rgba(255,255,255,0.08)',borderBottom:'none',display:'flex',flexDirection:'column',animation:'sheetUp 0.35s cubic-bezier(0.22,1,0.36,1)'}}>
        <style>{`
          @keyframes sheetUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
          @keyframes fadeIn{from{opacity:0}to{opacity:1}}
          @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        `}</style>

        <div style={{width:34,height:4,borderRadius:2,background:'rgba(255,255,255,0.1)',margin:'12px auto 0',flexShrink:0}}/>

        <div style={{padding:'16px 20px 0',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:900,fontStyle:'italic',color:'#fff'}}>My Profile</span>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'50%',width:30,height:30,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <SvgIcon name="close" size={13} color="rgba(255,255,255,0.4)"/>
          </button>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',padding:'14px 20px 0',flexShrink:0,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          {['profile','watchlist','reviews'].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,background:'none',border:'none',cursor:'pointer',padding:'8px 0 12px',fontFamily:'inherit',fontSize:13,fontWeight:tab===t?700:400,color:tab===t?accent:'rgba(255,255,255,0.35)',borderBottom:`2px solid ${tab===t?accent:'transparent'}`,transition:'all 0.2s ease',textTransform:'capitalize'}}>
              {t}{t==='watchlist'&&watchlist.length>0?` (${watchlist.length})`:''}
            </button>
          ))}
        </div>

        <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',scrollbarWidth:'none'}}>

          {/* ── PROFILE TAB ── */}
          {tab==='profile'&&(
            <div style={{padding:'20px'}}>
              {/* Avatar + name */}
              <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:24}}>
                <div style={{width:64,height:64,borderRadius:'50%',background:`${accent}22`,border:`2px solid ${accent}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}>
                  {user?.imageUrl
                    ? <img src={user.imageUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    : <span style={{fontSize:26,fontWeight:700,color:accent,fontFamily:"'Playfair Display',serif"}}>{(user?.firstName||user?.username||'?')[0].toUpperCase()}</span>
                  }
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:18,fontWeight:700,color:'#fff',fontFamily:"'Playfair Display',serif",fontStyle:'italic'}}>{user?.firstName||user?.username||'Cinephile'}</div>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginTop:2}}>{user?.primaryEmailAddress?.emailAddress}</div>
                  <div style={{display:'flex',alignItems:'center',gap:4,marginTop:6}}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:accent}}/>
                    <span style={{fontSize:11,color:accent,fontWeight:600}}>Active Member</span>
                  </div>
                </div>
              </div>

              {/* CineScore */}
              <div style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${accent}22`,borderRadius:20,padding:'20px',marginBottom:16,display:'flex',alignItems:'center',gap:20}}>
                <CineScoreRing score={cineScore} accent={accent}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,letterSpacing:2,color:'rgba(255,255,255,0.35)',fontWeight:700,marginBottom:6,textTransform:'uppercase'}}>CineScore</div>
                  <div style={{fontSize:13,color:'rgba(255,255,255,0.6)',lineHeight:1.6,marginBottom:10}}>
                    {cineScore<100?'Just getting started. Watch more films!':
                     cineScore<300?'Casual viewer. Keep exploring.':
                     cineScore<600?'Dedicated cinephile. Impressive.':'Elite film connoisseur. Legendary.'}
                  </div>
                  <button onClick={handleShareScore} disabled={sharing} style={{background:'none',border:`1px solid ${accent}44`,borderRadius:20,padding:'5px 14px',cursor:'pointer',fontSize:11,color:accent,fontWeight:600,fontFamily:'inherit',display:'flex',alignItems:'center',gap:6,opacity:sharing?0.6:1}}>
                    {sharing ? <span style={{animation:'spin 0.8s linear infinite',display:'inline-block'}}>◌</span> : <SvgIcon name="share" size={11} color={accent}/>}
                    {sharing ? 'Preparing...' : 'Share Score'}
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
                {[
                  {label:'Films Watched',value:watched,icon:'eye'},
                  {label:'Reviews Written',value:reviews,icon:'chat'},
                  {label:'Saved',value:saved,icon:'bookmark'},
                  {label:'Avg Rating',value:avgRating,icon:'star'},
                ].map(s=>(
                  <div key={s.label} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:'14px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
                      <SvgIcon name={s.icon} size={13} color="rgba(255,255,255,0.3)"/>
                      <span style={{fontSize:10,color:'rgba(255,255,255,0.3)',letterSpacing:0.5}}>{s.label}</span>
                    </div>
                    <div style={{fontSize:26,fontWeight:800,color:accent,fontFamily:"'Playfair Display',serif"}}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Top genres */}
              {sortedGenres.length>0&&(
                <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:'16px',marginBottom:16}}>
                  <div style={{fontSize:10,letterSpacing:2,color:'rgba(255,255,255,0.3)',fontWeight:700,marginBottom:12,textTransform:'uppercase'}}>Top Genres</div>
                  {sortedGenres.map(([genre,count])=>(
                    <div key={genre} style={{marginBottom:8}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                        <span style={{fontSize:13,color:'rgba(255,255,255,0.7)',fontWeight:500}}>{genre}</span>
                        <span style={{fontSize:12,color:'rgba(255,255,255,0.3)'}}>{count}</span>
                      </div>
                      <div style={{height:3,borderRadius:2,background:'rgba(255,255,255,0.06)'}}>
                        <div style={{height:'100%',borderRadius:2,background:accent,width:`${(count/sortedGenres[0][1])*100}%`,transition:'width 0.8s ease'}}/>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {sortedGenres.length===0&&!loadingData&&(
                <div style={{textAlign:'center',padding:'20px 0',color:'rgba(255,255,255,0.2)',fontSize:13}}>Save movies to build your taste profile</div>
              )}

              {/* Sign out */}
              <button onClick={handleSignOut} disabled={signingOut} style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:'14px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,fontFamily:'inherit',marginTop:8,opacity:signingOut?0.7:1}}>
                {signingOut ? (
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:accent,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}></div>
                    <span style={{fontSize:14,color:'rgba(255,255,255,0.4)',fontWeight:500}}>Signing out…</span>
                  </div>
                ) : (
                  <><SvgIcon name="logout" size={16} color="rgba(255,255,255,0.4)"/><span style={{fontSize:14,color:'rgba(255,255,255,0.4)',fontWeight:500}}>Sign out</span></>
                )}
              </button>
            </div>
          )}

          {/* Other tabs remain the same... (watchlist, reviews) */}
          {/* ... (truncated for brevity - the rest of the file is unchanged except for SimilarSheet) */}

          {/* ── REVIEWS TAB ── */}
          {tab==='reviews'&&(
            <div style={{padding:'16px 20px'}}>
              {/* ... existing reviews tab content ... */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ... (AuthGate, CommentPanel remain the same)

// ─── Similar Sheet ────────────────────────────────────────────────────────────
function SimilarSheet({ movie, onClose, accent, onSelect }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!movie) return;
    setLoading(true);
    const genreIds = (movie.genreIds || movie.genre_ids || []).join(',');
    fetch(`/api/movies?similar=\( {movie.id}&similarType= \){movie.mediaType||'movie'}&similarGenres=${genreIds}`)
      .then(r=>r.json())
      .then(d=>{setItems(d.movies||[]);setLoading(false);})
      .catch(()=>setLoading(false));
  }, [movie]);

  return (
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:55,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(6px)'}}/>
      <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:60,background:'rgba(5,5,10,0.98)',backdropFilter:'blur(32px)',borderRadius:'24px 24px 0 0',border:'1px solid rgba(255,255,255,0.07)',borderBottom:'none',maxHeight:'70vh',display:'flex',flexDirection:'column',animation:'sheetUp 0.32s cubic-bezier(0.22,1,0.36,1)'}}>
        <style>{`@keyframes sheetUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
        <div style={{width:34,height:4,borderRadius:2,background:'rgba(255,255,255,0.1)',margin:'12px auto 0',flexShrink:0}}/>
        <div style={{padding:'14px 20px 12px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,0.05)',flexShrink:0}}>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:'#fff'}}>{movie?.isTV ? 'Similar Series' : 'Similar Movies'}</div>
            <div style={{fontSize:12,color:accent,marginTop:1,fontStyle:'italic',fontFamily:"'Playfair Display',serif"}}>{movie?.title}</div>
          </div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'50%',width:28,height:28,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <SvgIcon name="close" size={12} color="rgba(255,255,255,0.4)"/>
          </button>
        </div>
        {/* Rest of SimilarSheet remains the same */}
        <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',padding:'12px 20px',display:'flex',flexDirection:'column',gap:8,scrollbarWidth:'none'}}>
          {loading&&<div style={{textAlign:'center',padding:30,color:'rgba(255,255,255,0.3)',fontSize:13}}>Finding similar titles…</div>}
          {!loading&&items.length===0&&<div style={{textAlign:'center',padding:30,color:'rgba(255,255,255,0.3)',fontSize:13}}>No similar titles found</div>}
          {items.map((m,i)=>(
            <button key={m.id} onClick={()=>{onSelect(m);onClose();}} style={{display:'flex',gap:12,alignItems:'center',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:'10px 14px',cursor:'pointer',textAlign:'left',fontFamily:'inherit'}}>
              <div style={{width:44,height:60,borderRadius:8,flexShrink:0,overflow:'hidden',background:m.gradient||GRADS[i%GRADS.length]}}>
                {m.poster&&<img src={m.poster} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
              </div>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                  <span style={{fontSize:14,fontWeight:700,color:'#fff',fontFamily:"'Playfair Display',serif",fontStyle:'italic'}}>{m.title}</span>
                  {m.isTV&&<span style={{fontSize:9,color:m.accent,border:`1px solid ${m.accent}44`,borderRadius:3,padding:'1px 5px',letterSpacing:1,fontWeight:700}}>TV</span>}
                </div>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.28)',display:'flex',alignItems:'center',gap:5}}>
                  <span>{m.year}</span><span>·</span>
                  <SvgIcon name="star" size={10} color={m.accent} filled/>
                  <span style={{color:m.accent,fontWeight:600}}>{m.rating}</span>
                </div>
                <p style={{fontSize:11.5,color:'rgba(255,255,255,0.35)',lineHeight:1.4,margin:'4px 0 0',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{m.overview}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// The rest of the file (MovieCard, FilterSheet, Main CineScroll component) remains unchanged.
