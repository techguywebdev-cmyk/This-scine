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

function AuthGate({ onClose, accent }) {
  const { openSignIn } = useClerk();
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(20px)',display:'flex',alignItems:'flex-end',justifyContent:'center',animation:'fadeIn 0.2s ease'}}>
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',background:'rgba(5,5,12,0.98)',borderRadius:'24px 24px 0 0',border:'1px solid rgba(255,255,255,0.08)',borderBottom:'none',padding:'0 24px 48px',animation:'sheetUp 0.32s cubic-bezier(0.22,1,0.36,1)'}}>
        <div style={{width:34,height:4,borderRadius:2,background:'rgba(255,255,255,0.1)',margin:'12px auto 24px'}}/>
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:900,fontStyle:'italic',color:'#fff',marginBottom:8}}>Join CineScroll</div>
          <div style={{fontSize:14,color:'rgba(255,255,255,0.45)',lineHeight:1.6}}>Sign in to leave reviews, save your watchlist, and discover films with friends.</div>
        </div>
        <button onClick={()=>{openSignIn();onClose();}} style={{width:'100%',background:'#fff',border:'none',borderRadius:16,padding:'16px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:12,marginBottom:12,fontFamily:'inherit'}}>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span style={{fontSize:15,fontWeight:700,color:'#1a1a1a'}}>Continue with Google</span>
        </button>
        <button onClick={()=>{openSignIn();onClose();}} style={{width:'100%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,padding:'16px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:12,fontFamily:'inherit'}}>
          <SvgIcon name="user" size={18} color="rgba(255,255,255,0.7)"/>
          <span style={{fontSize:15,fontWeight:600,color:'rgba(255,255,255,0.7)'}}>Sign in with Email</span>
        </button>
        <p style={{textAlign:'center',fontSize:11,color:'rgba(255,255,255,0.2)',marginTop:16,lineHeight:1.5}}>By signing in you agree to our Terms of Service</p>
      </div>
      <style>{`@keyframes sheetUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  );
}

function UserMenu({ onClose, accent }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(12px)',display:'flex',alignItems:'flex-end',animation:'fadeIn 0.2s ease'}}>
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',background:'rgba(5,5,12,0.98)',borderRadius:'24px 24px 0 0',border:'1px solid rgba(255,255,255,0.08)',borderBottom:'none',padding:'0 24px 48px',animation:'sheetUp 0.32s cubic-bezier(0.22,1,0.36,1)'}}>
        <div style={{width:34,height:4,borderRadius:2,background:'rgba(255,255,255,0.1)',margin:'12px auto 20px'}}/>
        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24,paddingBottom:20,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <div style={{width:52,height:52,borderRadius:'50%',background:`${accent}22`,border:`2px solid ${accent}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}>
            {user?.imageUrl
              ? <img src={user.imageUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              : <span style={{fontSize:20,fontWeight:700,color:accent}}>{(user?.firstName||user?.username||'?')[0].toUpperCase()}</span>
            }
          </div>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:'#fff'}}>{user?.firstName||user?.username||'Cinephile'}</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginTop:2}}>{user?.primaryEmailAddress?.emailAddress}</div>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:24}}>
          {[{label:'Watched',value:42},{label:'Reviews',value:8},{label:'Saved',value:12}].map(s=>(
            <div key={s.label} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:'14px 10px',textAlign:'center'}}>
              <div style={{fontSize:22,fontWeight:800,color:accent,fontFamily:"'Playfair Display',serif"}}>{s.value}</div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.35)',marginTop:3,letterSpacing:0.5}}>{s.label}</div>
            </div>
          ))}
        </div>
        <button onClick={()=>signOut()} style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:'14px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,fontFamily:'inherit'}}>
          <SvgIcon name="logout" size={16} color="rgba(255,255,255,0.4)"/>
          <span style={{fontSize:14,color:'rgba(255,255,255,0.4)',fontWeight:500}}>Sign out</span>
        </button>
      </div>
      <style>{`@keyframes sheetUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  );
}

function CommentPanel({ movie, onClose, accent, onAuthRequired }) {
  const { isSignedIn, user } = useUser();
  const [comments, setComments] = useState([
    {id:1,user:'reelcritic',avatar:'R',text:'One of the defining films of the decade. Absolutely unforgettable.',likes:84,time:'2h',liked:false,replies:[]},
    {id:2,user:'filmbuff_mx',avatar:'F',text:'Slow burn but worth every second. That ending hit different.',likes:31,time:'5h',liked:false,replies:[]},
    {id:3,user:'popcorn.wav',avatar:'P',text:'Gorgeous visually but emotionally hollow.',likes:12,time:'1d',liked:false,replies:[]},
  ]);
  const [input, setInput] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const inputRef = useRef(null);

  const toggleLike = id => setComments(p => p.map(c =>
    c.id===id ? {...c,liked:!c.liked,likes:c.liked?c.likes-1:c.likes+1} : c
  ));

  const startReply = (comment) => {
    if (!isSignedIn) { onAuthRequired(); return; }
    setReplyingTo(comment);
    setInput(`@${comment.user} `);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const post = () => {
    if (!isSignedIn) { onAuthRequired(); return; }
    if (!input.trim()) return;
    const username = user?.username||user?.firstName||'you';
    const avatar = (user?.firstName||user?.username||'Y')[0].toUpperCase();
    if (replyingTo) {
      setComments(p => p.map(c => c.id===replyingTo.id
        ? {...c,replies:[...(c.replies||[]),{id:Date.now(),user:username,avatar,text:input,likes:0,time:'now',liked:false}]}
        : c
      ));
    } else {
      setComments(p => [{id:Date.now(),user:username,avatar,text:input,likes:0,time:'now',liked:false,replies:[]},...p]);
    }
    setInput('');
    setReplyingTo(null);
  };

  return (
    <div onClick={e=>e.stopPropagation()} style={{position:'absolute',bottom:0,left:0,right:0,height:'78%',background:'rgba(4,4,8,0.98)',backdropFilter:'blur(30px)',borderRadius:'24px 24px 0 0',zIndex:50,border:'1px solid rgba(255,255,255,0.07)',borderBottom:'none',display:'flex',flexDirection:'column',animation:'sheetUp 0.32s cubic-bezier(0.22,1,0.36,1)'}}>
      <style>{`@keyframes sheetUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      <div style={{width:34,height:4,borderRadius:2,background:'rgba(255,255,255,0.1)',margin:'10px auto 0',flexShrink:0}}/>
      <div style={{padding:'12px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,0.05)',flexShrink:0}}>
        <div>
          <span style={{fontSize:15,fontWeight:700,color:'#fff'}}>Reviews</span>
          <span style={{fontSize:12,color:'rgba(255,255,255,0.3)',marginLeft:8}}>{movie?.title}</span>
        </div>
        <button onClick={onClose} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'50%',width:28,height:28,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <SvgIcon name="close" size={12} color="rgba(255,255,255,0.4)"/>
        </button>
      </div>

      <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',padding:'12px 20px',display:'flex',flexDirection:'column',gap:14,scrollbarWidth:'none',minHeight:0}}>
        {comments.map(c=>(
          <div key={c.id}>
            <div style={{display:'flex',gap:10}}>
              <div style={{width:32,height:32,borderRadius:'50%',background:`${accent}20`,border:`1px solid ${accent}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:accent,flexShrink:0}}>{c.avatar}</div>
              <div style={{flex:1}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                  <span style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.65)'}}>@{c.user}</span>
                  <span style={{fontSize:11,color:'rgba(255,255,255,0.18)'}}>{c.time}</span>
                </div>
                <p style={{fontSize:13.5,color:'rgba(255,255,255,0.65)',lineHeight:1.55,margin:'0 0 6px'}}>{c.text}</p>
                <div style={{display:'flex',gap:12,alignItems:'center'}}>
                  <button onClick={()=>toggleLike(c.id)} style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center',gap:4}}>
                    <SvgIcon name="heart" size={12} color={c.liked?'#FF6B8A':'rgba(255,255,255,0.2)'} filled={c.liked}/>
                    <span style={{fontSize:11,fontWeight:600,color:c.liked?'#FF6B8A':'rgba(255,255,255,0.2)'}}>{c.likes}</span>
                  </button>
                  <button onClick={()=>startReply(c)} style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center',gap:4}}>
                    <SvgIcon name="reply" size={12} color="rgba(255,255,255,0.25)"/>
                    <span style={{fontSize:11,color:'rgba(255,255,255,0.25)',fontWeight:500}}>Reply</span>
                  </button>
                </div>
              </div>
            </div>
            {(c.replies||[]).map(r=>(
              <div key={r.id} style={{display:'flex',gap:10,marginTop:10,marginLeft:42}}>
                <div style={{width:26,height:26,borderRadius:'50%',background:'rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.4)',flexShrink:0}}>{r.avatar}</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                    <span style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.5)'}}>@{r.user}</span>
                    <span style={{fontSize:10,color:'rgba(255,255,255,0.15)'}}>{r.time}</span>
                  </div>
                  <p style={{fontSize:12.5,color:'rgba(255,255,255,0.5)',lineHeight:1.5,margin:0}}>{r.text}</p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {replyingTo&&(
        <div style={{padding:'6px 20px',background:'rgba(255,255,255,0.04)',borderTop:'1px solid rgba(255,255,255,0.05)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <span style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>Replying to <span style={{color:accent}}>@{replyingTo.user}</span></span>
          <button onClick={()=>{setReplyingTo(null);setInput('');}} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:14,padding:0}}>✕</button>
        </div>
      )}

      {isSignedIn ? (
        <div style={{padding:'10px 16px 34px',borderTop:'1px solid rgba(255,255,255,0.05)',display:'flex',gap:8,alignItems:'center',flexShrink:0,background:'rgba(4,4,8,0.98)'}}>
          <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&post()}
            placeholder={replyingTo?`Reply to @${replyingTo.user}...`:'Write a review...'}
            style={{flex:1,background:'rgba(255,255,255,0.06)',border:`1px solid ${replyingTo?accent+'44':'rgba(255,255,255,0.08)'}`,borderRadius:22,padding:'11px 16px',color:'#fff',fontSize:14,outline:'none',fontFamily:'inherit'}}/>
          <button onClick={post} style={{background:accent,border:'none',borderRadius:'50%',width:40,height:40,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <SvgIcon name="send" size={14} color="#000"/>
          </button>
        </div>
      ) : (
        <div style={{padding:'14px 20px 34px',borderTop:'1px solid rgba(255,255,255,0.05)',flexShrink:0,background:'rgba(4,4,8,0.98)'}}>
          <button onClick={onAuthRequired} style={{width:'100%',background:`${accent}18`,border:`1px solid ${accent}44`,borderRadius:16,padding:'13px',cursor:'pointer',fontFamily:'inherit',fontSize:14,color:accent,fontWeight:600}}>
            Sign in to leave a review
          </button>
        </div>
      )}
    </div>
  );
}

function SimilarSheet({ movie, onClose, accent, onSelect }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!movie) return;
    setLoading(true);
    fetch(`/api/movies?similar=${movie.id}&similarType=${movie.mediaType||'movie'}`)
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
            <div style={{fontSize:15,fontWeight:700,color:'#fff'}}>Similar to</div>
            <div style={{fontSize:12,color:accent,marginTop:1,fontStyle:'italic',fontFamily:"'Playfair Display',serif"}}>{movie?.title}</div>
          </div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'50%',width:28,height:28,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <SvgIcon name="close" size={12} color="rgba(255,255,255,0.4)"/>
          </button>
        </div>
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

function MovieCard({ movie, isActive, index, onFindSimilar, onAuthRequired }) {
  const { isSignedIn } = useUser();
  const [liked,setLiked]=useState(false);
  const [saved,setSaved]=useState(false);
  const [userRating,setUserRating]=useState(0);
  const [showComments,setShowComments]=useState(false);
  const [showStars,setShowStars]=useState(false);
  const [hoverStar,setHoverStar]=useState(0);
  const [imgLoaded,setImgLoaded]=useState(false);
  const [likeCount]=useState(Math.floor(Math.random()*60+8)*100);
  const fmt=n=>n>=1000?`${(n/1000).toFixed(0)}K`:n;
  const accent=movie.accent||'#F5A623';
  const bgImage=movie.backdrop||movie.poster;

  const handleLike=()=>{ if(!isSignedIn){onAuthRequired();return;} setLiked(p=>!p); };
  const handleSave=()=>{ if(!isSignedIn){onAuthRequired();return;} setSaved(p=>!p); };
  const handleRate=()=>{ if(!isSignedIn){onAuthRequired();return;} setShowStars(p=>!p); };

  return (
    <div style={{position:'relative',width:'100%',height:'100%',overflow:'hidden',background:'#04040A'}}>
      {bgImage&&(
        <>
          <div style={{position:'absolute',inset:0,backgroundImage:`url(${bgImage})`,backgroundSize:'cover',backgroundPosition:'center top',opacity:imgLoaded?(isActive?1:0.7):0,transition:'opacity 0.6s ease'}}/>
          <img src={bgImage} alt="" onLoad={()=>setImgLoaded(true)} style={{position:'absolute',opacity:0,width:1,height:1,pointerEvents:'none'}}/>
        </>
      )}
      <div style={{position:'absolute',inset:0,background:movie.gradient||GRADS[index%GRADS.length],opacity:imgLoaded?0:1,transition:'opacity 0.6s ease'}}/>
      <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 60% 25%, transparent 20%, rgba(0,0,0,0.6) 100%)',pointerEvents:'none'}}/>
      <div style={{position:'absolute',bottom:0,left:0,right:0,height:'75%',background:'linear-gradient(to top,rgba(0,0,0,0.98) 0%,rgba(0,0,0,0.85) 28%,rgba(0,0,0,0.3) 60%,transparent 100%)',pointerEvents:'none'}}/>
      <div style={{position:'absolute',top:0,left:0,right:0,height:'25%',background:'linear-gradient(to bottom,rgba(0,0,0,0.55) 0%,transparent 100%)',pointerEvents:'none'}}/>
      <div style={{position:'absolute',left:0,top:'22%',bottom:'22%',width:3,background:`linear-gradient(to bottom,transparent,${accent},transparent)`,opacity:isActive?0.55:0,transition:'opacity 0.5s ease',borderRadius:2}}/>
      <div style={{position:'absolute',inset:0,opacity:0.15,mixBlendMode:'overlay',pointerEvents:'none',backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")`}}/>

      {/* Top bar */}
      <div style={{position:'absolute',top:80,left:0,right:0,zIndex:10,padding:'0 16px',display:'flex',justifyContent:'space-between',alignItems:'center',opacity:isActive?1:0.5,transition:'opacity 0.4s ease'}}>
        <div style={{display:'flex',alignItems:'center',gap:7,background:'rgba(0,0,0,0.45)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:20,padding:'5px 12px'}}>
          <div style={{width:5,height:5,borderRadius:'50%',background:accent,boxShadow:`0 0 6px ${accent}`}}/>
          <span style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.45)',letterSpacing:2.5,textTransform:'uppercase'}}>{String(index+1).padStart(2,'0')}</span>
          {movie.isTV&&<span style={{fontSize:9,color:accent,fontWeight:700,letterSpacing:1,marginLeft:2}}>TV</span>}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:5,background:'rgba(0,0,0,0.45)',backdropFilter:'blur(12px)',border:`1px solid ${accent}35`,borderRadius:20,padding:'5px 12px'}}>
          <SvgIcon name="star" size={11} color={accent} filled/>
          <span style={{fontSize:13,fontWeight:800,color:'#fff',letterSpacing:-0.3}}>{movie.rating}</span>
          <span style={{fontSize:10,color:'rgba(255,255,255,0.28)'}}>/10</span>
        </div>
      </div>

      {/* Bottom content */}
      <div style={{position:'absolute',bottom:0,left:0,right:68,padding:'0 20px 36px',zIndex:10,opacity:isActive?1:0.4,transform:isActive?'translateY(0)':'translateY(18px)',transition:'all 0.5s ease'}}>
        <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap',alignItems:'center'}}>
          {(movie.genre||[]).map(g=>(
            <span key={g} style={{fontSize:9,letterSpacing:2.5,color:accent,fontWeight:800,textTransform:'uppercase',padding:'3px 8px',border:`1px solid ${accent}44`,borderRadius:4}}>{g}</span>
          ))}
          {movie.isTV&&<span style={{fontSize:9,letterSpacing:1.5,color:'rgba(255,255,255,0.4)',fontWeight:600,padding:'3px 8px',border:'1px solid rgba(255,255,255,0.12)',borderRadius:4}}>SERIES</span>}
        </div>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:Math.min(52,Math.max(28,56-(movie.title?.length||0)*0.9)),fontWeight:900,fontStyle:'italic',color:'#fff',margin:'0 0 6px',lineHeight:1.0,letterSpacing:-1,textShadow:`0 0 60px ${accent}30,0 4px 30px rgba(0,0,0,0.8)`}}>{movie.title}</h2>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:13,color:`${accent}bb`,fontStyle:'italic'}}>{movie.year}</span>
          <span style={{width:3,height:3,borderRadius:'50%',background:'rgba(255,255,255,0.2)'}}/>
          <div style={{display:'flex',alignItems:'center',gap:4}}>
            <SvgIcon name="eye" size={11} color="rgba(255,255,255,0.3)"/>
            <span style={{fontSize:12,color:'rgba(255,255,255,0.38)'}}>{movie.votes} ratings</span>
          </div>
        </div>
        <p style={{fontSize:13.5,color:'rgba(255,255,255,0.58)',lineHeight:1.68,margin:'0 0 14px',fontWeight:400}}>{movie.overview}</p>
        {showStars&&(
          <div style={{display:'flex',gap:5,alignItems:'center',marginBottom:10,animation:'fadeUp 0.2s ease'}}>
            {[1,2,3,4,5].map(s=>(
              <button key={s} onMouseEnter={()=>setHoverStar(s)} onMouseLeave={()=>setHoverStar(0)} onClick={()=>{setUserRating(s);setTimeout(()=>setShowStars(false),700);}} style={{background:'none',border:'none',cursor:'pointer',padding:0,transform:hoverStar===s?'scale(1.35)':'scale(1)',transition:'transform 0.1s ease'}}>
                <SvgIcon name="star" size={26} color={s<=(hoverStar||userRating)?accent:'rgba(255,255,255,0.15)'} filled={s<=(hoverStar||userRating)}/>
              </button>
            ))}
            {userRating>0&&<span style={{fontSize:12,color:accent,marginLeft:6,fontWeight:700}}>Rated {userRating}/5</span>}
          </div>
        )}
      </div>

      {/* Side actions */}
      <div style={{position:'absolute',right:12,bottom:80,zIndex:10,display:'flex',flexDirection:'column',gap:5,alignItems:'center',opacity:isActive?1:0,transform:isActive?'translateX(0)':'translateX(28px)',transition:'all 0.45s ease 0.12s'}}>
        {[
          {icon:'heart',   label:fmt(likeCount+(liked?1:0)), active:liked,                  color:'#FF6B8A', filled:liked,        fn:handleLike},
          {icon:'star',    label:userRating?`${userRating}/5`:'Rate', active:showStars||userRating>0, color:accent, filled:userRating>0, fn:handleRate},
          {icon:'chat',    label:'Review',                    active:showComments,           color:'#7BC8FF', filled:false,        fn:()=>setShowComments(true)},
          {icon:'similar', label:'Similar',                   active:false,                  color:'#B07FEF', filled:false,        fn:()=>onFindSimilar(movie)},
          {icon:'bookmark',label:saved?'Saved':'Save',        active:saved,                  color:'#7BFF9E', filled:saved,        fn:handleSave},
        ].map(btn=>(
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

function FilterSheet({ show, onClose, activeGenre, activeMood, onGenre, onMood, accent }) {
  return (
    <>
      {show&&<div onClick={onClose} style={{position:'fixed',inset:0,zIndex:55,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(6px)',animation:'bfade 0.2s ease'}}/>}
      <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:60,background:'rgba(5,5,10,0.98)',backdropFilter:'blur(32px)',borderRadius:'26px 26px 0 0',border:'1px solid rgba(255,255,255,0.07)',borderBottom:'none',padding:'0 20px 44px',transform:show?'translateY(0)':'translateY(110%)',transition:'transform 0.38s cubic-bezier(0.22,1,0.36,1)'}}>
        <div style={{width:34,height:4,borderRadius:2,background:'rgba(255,255,255,0.1)',margin:'12px auto 20px'}}/>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:26}}>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:900,fontStyle:'italic',color:'#fff'}}>Discover</span>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'50%',width:30,height:30,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <SvgIcon name="close" size={13} color="rgba(255,255,255,0.4)"/>
          </button>
        </div>
        <div style={{marginBottom:26}}>
          <div style={{fontSize:9,letterSpacing:3,color:'rgba(255,255,255,0.22)',fontWeight:700,marginBottom:12,textTransform:'uppercase'}}>Mood</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {MOODS.map(m=>{
              const on=activeMood===m.label;
              return <button key={m.label} onClick={()=>{onMood(m.label);onClose();}} style={{display:'flex',alignItems:'center',gap:10,background:on?'rgba(255,255,255,0.09)':'rgba(255,255,255,0.03)',border:`1px solid ${on?'rgba(255,255,255,0.22)':'rgba(255,255,255,0.06)'}`,borderRadius:14,padding:'13px 15px',cursor:'pointer',fontFamily:'inherit',transition:'all 0.2s ease'}}>
                <SvgIcon name={m.icon} size={15} color={on?'#fff':'rgba(255,255,255,0.3)'} filled={on}/>
                <span style={{fontSize:13,color:on?'#fff':'rgba(255,255,255,0.4)',fontWeight:on?600:400}}>{m.label}</span>
              </button>;
            })}
          </div>
        </div>
        <div>
          <div style={{fontSize:9,letterSpacing:3,color:'rgba(255,255,255,0.22)',fontWeight:700,marginBottom:12,textTransform:'uppercase'}}>Genre</div>
          <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
            {GENRE_OPTIONS.map(g=>{
              const on=activeGenre===g.id;
              return <button key={g.id} onClick={()=>{onGenre(g.id);onClose();}} style={{background:on?accent:'rgba(255,255,255,0.04)',border:`1px solid ${on?accent:'rgba(255,255,255,0.07)'}`,borderRadius:22,padding:'7px 15px',cursor:'pointer',fontFamily:'inherit',fontSize:13,color:on?'#06060A':'rgba(255,255,255,0.4)',fontWeight:on?700:400,transition:'all 0.2s ease'}}>{g.label}</button>;
            })}
          </div>
        </div>
      </div>
      <style>{`@keyframes bfade{from{opacity:0}to{opacity:1}}`}</style>
    </>
  );
}

export default function CineScroll() {
  const { isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();
  const [movies,setMovies]=useState([]);
  const [loading,setLoading]=useState(true);
  const [activeIndex,setActiveIndex]=useState(0);
  const [activeGenre,setActiveGenre]=useState('');
  const [activeMood,setActiveMood]=useState('Trending');
  const [showFilter,setShowFilter]=useState(false);
  const [showSearch,setShowSearch]=useState(false);
  const [showAuth,setShowAuth]=useState(false);
  const [showUserMenu,setShowUserMenu]=useState(false);
  const [searchQ,setSearchQ]=useState('');
  const [searchRes,setSearchRes]=useState([]);
  const [searching,setSearching]=useState(false);
  const [similarMovie,setSimilarMovie]=useState(null);
  const containerRef=useRef(null);
  const pageRef=useRef(1);
  const loadingMoreRef=useRef(false);

  const fetchMovies=useCallback(async(mood,genre,search='',page=1,append=false)=>{
    if(loadingMoreRef.current&&append)return;
    if(append)loadingMoreRef.current=true;
    else setLoading(true);
    try{
      const params=new URLSearchParams({mood:mood.toLowerCase(),genre,search,page:String(page)});
      const res=await fetch(`/api/movies?${params}`);
      const data=await res.json();
      if(append){setMovies(p=>[...p,...(data.movies||[])]);}
      else{setMovies(data.movies||[]);setActiveIndex(0);pageRef.current=1;setTimeout(()=>containerRef.current?.scrollTo({top:0,behavior:'instant'}),30);}
    }catch(e){console.error(e);}
    if(append)loadingMoreRef.current=false;
    else setLoading(false);
  },[]);

  useEffect(()=>{fetchMovies(activeMood,activeGenre);},[activeMood,activeGenre]);

  useEffect(()=>{
    if(!searchQ.trim()){setSearchRes([]);return;}
    const t=setTimeout(async()=>{
      setSearching(true);
      try{const res=await fetch(`/api/movies?search=${encodeURIComponent(searchQ)}`);const data=await res.json();setSearchRes(data.movies||[]);}catch{}
      setSearching(false);
    },400);
    return()=>clearTimeout(t);
  },[searchQ]);

  useEffect(()=>{
    const el=containerRef.current;
    if(!el)return;
    const fn=()=>{
      const idx=Math.round(el.scrollTop/el.clientHeight);
      setActiveIndex(idx);
      setMovies(prev=>{
        if(idx>=prev.length-3&&!loadingMoreRef.current){pageRef.current+=1;fetchMovies(activeMood,activeGenre,'',pageRef.current,true);}
        return prev;
      });
    };
    el.addEventListener('scroll',fn,{passive:true});
    return()=>el.removeEventListener('scroll',fn);
  },[activeMood,activeGenre,fetchMovies]);

  const scrollTo=i=>{containerRef.current?.scrollTo({top:i*containerRef.current.clientHeight,behavior:'smooth'});setActiveIndex(i);};
  const handleSimilarSelect=m=>{setMovies(p=>[m,...p]);setTimeout(()=>scrollTo(0),50);};
  const accent=movies[activeIndex]?.accent||'#F5A623';
  const activeGenreLabel=GENRE_OPTIONS.find(g=>g.id===activeGenre)?.label||'All';

  return(
    <div style={{position:'fixed',inset:0,background:'#04040A',fontFamily:"'DM Sans',sans-serif",color:'#fff',overflow:'hidden'}}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400;1,700;1,900&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet"/>

      {/* Top Nav */}
      <div style={{position:'fixed',top:0,left:0,right:0,zIndex:40,padding:'18px 16px 0',background:'linear-gradient(to bottom,rgba(4,4,10,0.9) 0%,transparent 100%)',display:'flex',justifyContent:'space-between',alignItems:'center',pointerEvents:'none'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,pointerEvents:'all'}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:accent,boxShadow:`0 0 12px ${accent}`,transition:'all 0.5s ease'}}/>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:900,fontStyle:'italic',letterSpacing:-0.5,color:'#fff'}}>CineScroll</span>
        </div>
        <div style={{display:'flex',gap:8,pointerEvents:'all',alignItems:'center'}}>
          <button onClick={()=>{setShowSearch(p=>!p);setShowFilter(false);}} style={{background:showSearch?`${accent}18`:'rgba(0,0,0,0.55)',border:`1px solid ${showSearch?accent+'44':'rgba(255,255,255,0.1)'}`,borderRadius:12,width:38,height:38,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(12px)',transition:'all 0.2s ease'}}>
            <SvgIcon name={showSearch?'close':'search'} size={17} color={showSearch?accent:'rgba(255,255,255,0.7)'}/>
          </button>
          <button onClick={()=>{setShowFilter(p=>!p);setShowSearch(false);}} style={{background:showFilter?`${accent}18`:'rgba(0,0,0,0.55)',border:`1px solid ${showFilter?accent+'44':'rgba(255,255,255,0.1)'}`,borderRadius:12,width:38,height:38,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(12px)',transition:'all 0.2s ease'}}>
            <SvgIcon name="sliders" size={17} color={showFilter?accent:'rgba(255,255,255,0.7)'}/>
          </button>
          {isSignedIn ? (
            <button onClick={()=>setShowUserMenu(true)} style={{width:36,height:36,borderRadius:'50%',background:`${accent}22`,border:`2px solid ${accent}55`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0}}>
              {user?.imageUrl
                ? <img src={user.imageUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                : <span style={{fontSize:13,fontWeight:700,color:accent}}>{(user?.firstName||user?.username||'?')[0].toUpperCase()}</span>
              }
            </button>
          ) : (
            <button onClick={()=>setShowAuth(true)} style={{background:`${accent}18`,border:`1px solid ${accent}44`,borderRadius:22,padding:'6px 12px',cursor:'pointer',fontSize:12,color:accent,fontWeight:700,fontFamily:'inherit',whiteSpace:'nowrap'}}>
              Sign in
            </button>
          )}
        </div>
      </div>

      {/* Active filter pills */}
      {(activeGenre||activeMood!=='Trending')&&!showFilter&&!showSearch&&(
        <div style={{position:'fixed',top:62,left:16,zIndex:38,display:'flex',gap:6,pointerEvents:'none'}}>
          {activeMood!=='Trending'&&<div style={{background:'rgba(0,0,0,0.55)',backdropFilter:'blur(10px)',border:`1px solid ${accent}33`,borderRadius:20,padding:'3px 10px',fontSize:10,color:accent,fontWeight:700}}>{activeMood}</div>}
          {activeGenre&&<div style={{background:'rgba(0,0,0,0.55)',backdropFilter:'blur(10px)',border:`1px solid ${accent}33`,borderRadius:20,padding:'3px 10px',fontSize:10,color:accent,fontWeight:700}}>{activeGenreLabel}</div>}
        </div>
      )}

      {/* Search */}
      {showSearch&&(
        <div style={{position:'fixed',inset:0,zIndex:45,background:'rgba(4,4,10,0.97)',backdropFilter:'blur(24px)',padding:'78px 16px 20px',display:'flex',flexDirection:'column',gap:12,animation:'fadeIn 0.2s ease'}}>
          <div style={{position:'relative'}}>
            <div style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)'}}><SvgIcon name="search" size={16} color="rgba(255,255,255,0.28)"/></div>
            <input autoFocus value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search movies & TV shows..." style={{width:'100%',boxSizing:'border-box',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:14,padding:'13px 16px 13px 42px',color:'#fff',fontSize:16,outline:'none',fontFamily:'inherit'}}/>
          </div>
          <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',display:'flex',flexDirection:'column',gap:6,scrollbarWidth:'none'}}>
            {searching&&<div style={{textAlign:'center',padding:20,color:'rgba(255,255,255,0.3)',fontSize:13}}>Searching…</div>}
            {(searchQ?searchRes:movies).map((m,i)=>(
              <button key={m.id} onClick={()=>{if(!searchQ){scrollTo(i);}else{setMovies(p=>[m,...p.filter(x=>x.id!==m.id)]);scrollTo(0);}setShowSearch(false);setSearchQ('');}} style={{display:'flex',gap:12,alignItems:'center',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:'11px 14px',cursor:'pointer',textAlign:'left',fontFamily:'inherit'}}>
                <div style={{width:40,height:54,borderRadius:8,flexShrink:0,overflow:'hidden',background:m.gradient||GRADS[i%GRADS.length]}}>
                  {m.poster&&<img src={m.poster} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
                </div>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                    <span style={{fontSize:14,fontWeight:700,color:'#fff',fontFamily:"'Playfair Display',serif",fontStyle:'italic'}}>{m.title}</span>
                    {m.isTV&&<span style={{fontSize:9,color:m.accent,border:`1px solid ${m.accent}44`,borderRadius:3,padding:'1px 5px',letterSpacing:1,fontWeight:700}}>TV</span>}
                  </div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.28)',display:'flex',alignItems:'center',gap:5}}>
                    <span>{m.year}</span><span>·</span>
                    <SvgIcon name="star" size={10} color={m.accent} filled/>
                    <span style={{color:m.accent,fontWeight:600}}>{m.rating}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Feed — iOS optimised */}
      <div ref={containerRef} style={{position:'fixed',inset:0,overflowY:'scroll',scrollSnapType:'y mandatory',WebkitOverflowScrolling:'touch',scrollbarWidth:'none'}}>
        <style>{`div::-webkit-scrollbar{display:none}*{-webkit-tap-highlight-color:transparent;box-sizing:border-box}@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
        {loading?(
          <div style={{height:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',scrollSnapAlign:'start',flexDirection:'column',gap:12}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:40,fontWeight:900,fontStyle:'italic',color:'#fff'}}>CineScroll</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.2)',letterSpacing:3}}>LOADING FILMS…</div>
          </div>
        ):(
          movies.map((m,i)=>(
            <div key={`${m.id}-${i}`} style={{width:'100%',height:'100dvh',scrollSnapAlign:'start',scrollSnapStop:'always',position:'relative',flexShrink:0}}>
              <MovieCard movie={m} isActive={i===activeIndex} index={i} onFindSimilar={setSimilarMovie} onAuthRequired={()=>setShowAuth(true)}/>
            </div>
          ))
        )}
      </div>

      {/* Progress dots */}
      <div style={{position:'fixed',right:5,top:'50%',transform:'translateY(-50%)',display:'flex',flexDirection:'column',gap:4,zIndex:20,pointerEvents:'none'}}>
        {movies.slice(0,12).map((_,i)=>(
          <div key={i} style={{width:i===activeIndex?3:2,height:i===activeIndex?24:6,borderRadius:2,background:i===activeIndex?accent:'rgba(255,255,255,0.1)',transition:'all 0.3s ease',boxShadow:i===activeIndex?`0 0 8px ${accent}`:'none'}}/>
        ))}
      </div>

      {/* Scroll hint */}
      {activeIndex===0&&movies.length>1&&(
        <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',zIndex:20,pointerEvents:'none',display:'flex',flexDirection:'column',alignItems:'center',gap:5,animation:'bob 2.2s ease infinite'}}>
          <div style={{fontSize:9,letterSpacing:3,color:'rgba(255,255,255,0.16)',fontWeight:700}}>SCROLL</div>
          <SvgIcon name="chevron" size={16} color="rgba(255,255,255,0.16)"/>
        </div>
      )}

      <FilterSheet show={showFilter} onClose={()=>setShowFilter(false)} activeGenre={activeGenre} activeMood={activeMood} onGenre={setActiveGenre} onMood={setActiveMood} accent={accent}/>
      {similarMovie&&<SimilarSheet movie={similarMovie} onClose={()=>setSimilarMovie(null)} accent={accent} onSelect={handleSimilarSelect}/>}
      {showAuth&&<AuthGate onClose={()=>setShowAuth(false)} accent={accent}/>}
      {showUserMenu&&<UserMenu onClose={()=>setShowUserMenu(false)} accent={accent}/>}

      <style>{`@keyframes bob{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-8px)}}`}</style>
    </div>
  );
  }
