'use client';
import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import ImportSheet from './ImportSheet';
import { SafetySheet, Welcome, fmtWhen, PartyInvite, StartPartySheet, PartyRoom, AccentGlow, AddToListSheet, ChatWidget, FilterSheet, FriendsPulse, FriendsScreen, GENRE_OPTIONS, InlinePlayer, ListDetailSheet, ListsScreen, MovieCard, ProfileSheet, SimilarSheet, SvgIcon, T, Toast, ambient, coverCache, dayPart, installApiCache, prefetchScreens, subscribePush, track } from './cine/shared';

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
        <div style={{position:'relative',textAlign:'center',fontSize:11.5,color:T.text3,lineHeight:1.5,marginTop:14}}>By continuing you agree to our <a href={`/terms?a=${String(accent||'').replace('#','')}`} target="_blank" rel="noopener" style={{color:T.text2}}>Terms</a> and <a href={`/privacy?a=${String(accent||'').replace('#','')}`} target="_blank" rel="noopener" style={{color:T.text2}}>Privacy policy</a>.</div>
      </div>
      <style>{`@keyframes sheetUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  );
}
export default function CineScroll(){
  const{isSignedIn,user,isLoaded}=useUser();
  const{openSignIn}=useClerk();
  const[movies,setMovies]=useState([]);const[loading,setLoading]=useState(true);const[loadingMore,setLoadingMore]=useState(false);const[activeIndex,setActiveIndex]=useState(0);const[activeGenre,setActiveGenre]=useState('');const[activeMood,setActiveMood]=useState('Trending');const[activeProvider,setActiveProvider]=useState('');const[showFilter,setShowFilter]=useState(false);const[showAuth,setShowAuth]=useState(false);const[showProfile,setShowProfile]=useState(false);const[showLists,setShowLists]=useState(false);const[showArcs,setShowArcs]=useState(false);const[topLevelList,setTopLevelList]=useState(null);const[showFriends,setShowFriends]=useState(false);const[friendsNotifCount,setFriendsNotifCount]=useState(0);const[trailerMovie,setTrailerMovie]=useState(null);const[similarMovie,setSimilarMovie]=useState(null);const[watchlistIds,setWatchlistIds]=useState(new Set());const[reminderIds,setReminderIds]=useState(new Set());const[watchlist,setWatchlist]=useState([]);const[userReviews,setUserReviews]=useState([]);const[loadingProfileData,setLoadingProfileData]=useState(false);const[profileReady,setProfileReady]=useState(false);
  const[showTonightNudge,setShowTonightNudge]=useState(false);const[feedToast,setFeedToast]=useState(null);
  const containerRef=useRef(null);const pageRef=useRef(1);const loadingMoreRef=useRef(false);const profileLoadedRef=useRef(false);

  useEffect(()=>{
    if(!isLoaded)return;
    if(!isSignedIn){setProfileReady(false);setWatchlist([]);setUserReviews([]);setWatchlistIds(new Set());setReminderIds(new Set());profileLoadedRef.current=false;return;}
    if(profileLoadedRef.current)return;
    profileLoadedRef.current=true;
    const load=async()=>{setLoadingProfileData(true);try{const[wRes,rRes]=await Promise.all([fetch('/api/watchlist'),fetch('/api/reviews')]);const[wData,rData]=await Promise.all([wRes.json(),rRes.json()]);const items=wData.items||[];setWatchlist(items);setWatchlistIds(new Set(items.map(m=>m.movie_id)));setUserReviews(rData.items||[]);setProfileReady(true);}catch(e){console.error(e);}setLoadingProfileData(false);fetch('/api/reminders').then(r=>r.ok?r.json():{items:[]}).then(d=>setReminderIds(new Set((d.items||[]).map(r=>r.movie_id)))).catch(()=>{});};
    load();
  },[isLoaded,isSignedIn]);

  // Shared link (?m=movie-123 / ?m=tv-456): put that title first in the feed
  const sharedRef=useRef(null);const pendingActRef=useRef(null);const[sharedReady,setSharedReady]=useState(0);
  useEffect(()=>{
    if(typeof window==='undefined')return;
    const u=new URL(window.location.href);const m=u.searchParams.get('m');
    if(!m)return;
    const [type,id]=m.split('-');if(!id)return;
    const act=u.searchParams.get('act');if(act==='save'||act==='party')pendingActRef.current=act;
    u.searchParams.delete('m');u.searchParams.delete('act');window.history.replaceState(null,'',u.pathname+(u.search||''));
    fetch(`/api/movies?item=${encodeURIComponent(id)}&itemType=${type==='tv'?'tv':'movie'}`).then(r=>r.ok?r.json():null).then(d=>{
      const mv=d&&d.movies&&d.movies[0];if(!mv)return;
      sharedRef.current=mv;setSharedReady(n=>n+1);
      setMovies(p=>[mv,...p.filter(x=>!(x.id===mv.id&&!!x.isTV===!!mv.isTV))]);
      setActiveIndex(0);setTimeout(()=>containerRef.current?.scrollTo({top:0,behavior:'instant'}),30);
    }).catch(()=>{});
  },[]);

  // Notifications on by default: silently keep the subscription fresh if allowed, otherwise ask once (softly)
  const[pushAsk,setPushAsk]=useState(false);
  useEffect(()=>{
    if(!isLoaded||!isSignedIn||typeof window==='undefined')return;
    if(!('Notification' in window)||!('serviceWorker' in navigator)||!('PushManager' in window))return;
    if(Notification.permission==='granted'){subscribePush().catch(()=>{});return;}
    if(Notification.permission==='denied')return;
    let last=0;try{last=+localStorage.getItem('cine_push_ask')||0;}catch{}
    if(Date.now()-last<5*24*3600e3)return;
    const t=setTimeout(()=>setPushAsk(true),9000);
    return()=>clearTimeout(t);
  },[isLoaded,isSignedIn]);
  const answerPush=async(yes)=>{
    setPushAsk(false);
    try{localStorage.setItem('cine_push_ask',String(Date.now()));}catch{}
    if(!yes)return;
    try{await subscribePush();setFeedToast('Notifications on');setTimeout(()=>setFeedToast(null),2500);}
    catch(e){setFeedToast(e.message==='denied'?'Notifications blocked in browser settings':'Could not turn on notifications');setTimeout(()=>setFeedToast(null),3000);}
  };

  // Install the API cache once, then prefetch the screens people open most
  useEffect(()=>{installApiCache();prefetchScreens();},[]);
  useEffect(()=>{
    if(!isLoaded||!isSignedIn)return;
    const go=()=>window.__cinePrefetch&&window.__cinePrefetch(['/api/activity?type=feed','/api/follows?type=following','/api/follows?type=stats','/api/follows?type=suggested','/api/lists?tab=mine','/api/settings']);
    const t=setTimeout(()=>{if('requestIdleCallback' in window)window.requestIdleCallback(go,{timeout:3000});else go();},2500);
    return()=>clearTimeout(t);
  },[isLoaded,isSignedIn]);

  // "Watch with…" picker, opened from any film (player, share, watchlist, folders, friends)
  const isSignedInRef=useRef(false);isSignedInRef.current=!!isSignedIn;
  const openSignInRef=useRef(null);openSignInRef.current=openSignIn;
  const[watchWith,setWatchWith]=useState(null);
  useEffect(()=>{const fn=(e)=>{if(!e.detail)return;if(!isSignedInRef.current){openSignInRef.current&&openSignInRef.current();return;}setWatchWith(e.detail);};window.addEventListener('cine:watch-with',fn);return()=>window.removeEventListener('cine:watch-with',fn);},[]);
  // Incoming watch-party invites: checked on load, every 25s while visible, and when you come back to the tab
  const[incoming,setIncoming]=useState(null);
  const dismissInvite=(id)=>{try{const d=JSON.parse(sessionStorage.getItem('cs_party_dismissed')||'[]');sessionStorage.setItem('cs_party_dismissed',JSON.stringify([...d,id].slice(-30)));}catch{}};
  useEffect(()=>{
    if(!isSignedIn)return;
    let alive=true;
    const check=async()=>{
      if(document.visibilityState!=='visible')return;
      try{
        const r=await fetch('/api/party?pending=1',{cache:'no-store'});const d=await r.json();
        let gone=[];try{gone=JSON.parse(sessionStorage.getItem('cs_party_dismissed')||'[]');}catch{}
        const next=(d.pending||[]).find(x=>!gone.includes(x.id));
        if(alive)setIncoming(cur=>cur&&cur.id===next?.id?cur:(next||null));
      }catch{}
    };
    check();const t=setInterval(check,25000);const vis=()=>check();
    document.addEventListener('visibilitychange',vis);window.addEventListener('focus',vis);window.addEventListener('cine:party-check',vis);
    return()=>{alive=false;clearInterval(t);document.removeEventListener('visibilitychange',vis);window.removeEventListener('focus',vis);window.removeEventListener('cine:party-check',vis);};
  },[isSignedIn]);
  // Watch party room: from chat cards, the Together sheet, or a push link (?party=<id>)
  const[partyId,setPartyId]=useState(null);
  useEffect(()=>{
    const open=(e)=>{if(e.detail&&e.detail.id)setPartyId(e.detail.id);};
    window.addEventListener('cine:open-party',open);
    try{const q=new URLSearchParams(window.location.search).get('party');if(q){setPartyId(q);const u=new URL(window.location.href);u.searchParams.delete('party');window.history.replaceState({},'',u.toString());}}catch{}
    return()=>window.removeEventListener('cine:open-party',open);
  },[]);
  // Letterboxd / IMDb import can be opened from anywhere; reload saves when it finishes
  const[showImport,setShowImport]=useState(false);
  const[safety,setSafety]=useState(null);
  useEffect(()=>{try{const u=new URL(window.location.href);if(u.searchParams.get('deleted')==='1'){u.searchParams.delete('deleted');window.history.replaceState(null,'',u.pathname+u.search);setFeedToast('Your account and data were deleted');setTimeout(()=>setFeedToast(null),4000);}}catch{}},[]);
  useEffect(()=>{const fn=(e)=>{if(e.detail?.user||e.detail?.targetId)setSafety(e.detail);};window.addEventListener('cine:safety',fn);return()=>window.removeEventListener('cine:safety',fn);},[]);
  // First-run onboarding: new (empty) accounts pick titles → import → invite. ?welcome=1 forces it for testing.
  const[welcome,setWelcome]=useState(null);// null | accent string while open
  const welcomeCheckedRef=useRef(false);
  useEffect(()=>{
    if(!isLoaded||!isSignedIn||!user?.id||!profileReady||welcomeCheckedRef.current)return;
    welcomeCheckedRef.current=true;
    let force=false;try{force=new URLSearchParams(window.location.search).get('welcome')==='1';}catch{}
    let done=false;try{done=localStorage.getItem(`cs_onboarded_${user.id}`)==='1';}catch{}
    if(force||(!done&&watchlistRef.current.length===0))setWelcome(movies[activeIndex]?.accent||'#F5A623');
  },[isLoaded,isSignedIn,user?.id,profileReady]);
  const finishWelcome=async({picks})=>{
    try{localStorage.setItem(`cs_onboarded_${user?.id}`,'1');}catch{}
    setWelcome(null);
    if(!picks)return;
    try{const r=await fetch('/api/watchlist',{cache:'no-store'});const d=await r.json();const items=d.items||[];watchlistRef.current=items;setWatchlist(items);setWatchlistIds(new Set(items.map(m=>m.movie_id)));}catch{}
    pageRef.current=1;fetchMovies(activeMood,activeGenre,'',1,false,activeProvider);
    setFeedToast('Your feed is tuned to your taste ✨');setTimeout(()=>setFeedToast(null),2600);
  };
  useEffect(()=>{
    const open=()=>setShowImport(true);
    const refresh=async()=>{try{const r=await fetch('/api/watchlist',{cache:'no-store'});const d=await r.json();const items=d.items||[];setWatchlist(items);setWatchlistIds(new Set(items.map(m=>m.movie_id)));}catch{}};
    window.addEventListener('cine:open-import',open);window.addEventListener('cine:watchlist-refresh',refresh);
    return()=>{window.removeEventListener('cine:open-import',open);window.removeEventListener('cine:watchlist-refresh',refresh);};
  },[]);
  // Shared film cards (chat, notifications) open the player from anywhere
  useEffect(()=>{
    const fn=(e)=>{if(e.detail&&e.detail.id)setTrailerMovie(e.detail);};
    window.addEventListener('cine:open-title',fn);
    return()=>window.removeEventListener('cine:open-title',fn);
  },[]);

  // Warm the profile cover in the background so the profile opens with it already painted
  useEffect(()=>{
    if(!isLoaded||!isSignedIn||!user?.id)return;
    const t=setTimeout(()=>{
      const cached=coverCache.get(user.id);if(cached){const i=new Image();i.src=cached;}
      fetch('/api/settings').then(r=>r.ok?r.json():null).then(d=>{if(!d)return;coverCache.set(user.id,d.cover_url||null);if(d.cover_url&&d.cover_url!==cached){const i=new Image();i.src=d.cover_url;}}).catch(()=>{});
    },1500);
    return()=>clearTimeout(t);
  },[isLoaded,isSignedIn,user?.id]);

  // Opened from a push notification (?chat=<userId>): jump straight into that conversation
  const[pushChatPeer,setPushChatPeer]=useState(null);
  useEffect(()=>{
    if(!isLoaded||!isSignedIn||typeof window==='undefined')return;
    const openFromUrl=(href)=>{
      try{
        const u=new URL(href,window.location.origin);const id=u.searchParams.get('chat');
        if(!id)return;
        u.searchParams.delete('chat');window.history.replaceState(null,'',u.pathname+(u.search||''));
        fetch(`/api/users/${encodeURIComponent(id)}`).then(r=>r.ok?r.json():null).then(p=>{
          setPushChatPeer({user_id:id,username:p?.username||'member',display_name:p?.display_name,avatar_url:p?.avatar_url||null});
        }).catch(()=>setPushChatPeer({user_id:id,username:'member',avatar_url:null}));
      }catch{}
    };
    openFromUrl(window.location.href);
    // Keep the push subscription registered with the service worker on every visit
    if('serviceWorker' in navigator){
      navigator.serviceWorker.register('/sw.js').catch(()=>{});
      const onMsg=(e)=>{if(e.data&&e.data.type==='open-url')openFromUrl(e.data.url);};
      navigator.serviceWorker.addEventListener('message',onMsg);
      return()=>navigator.serviceWorker.removeEventListener('message',onMsg);
    }
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
  // Actions requested from a public title page (?m=…&act=save|party), run once the title and sign-in state are ready
  const saveRef=useRef(null);
  useEffect(()=>{
    const act=pendingActRef.current,mv=sharedRef.current;
    if(!act||!mv||!isLoaded)return;
    if(!isSignedIn){setShowAuth(true);return;}// runs again after they sign in
    if(!profileReady)return;
    pendingActRef.current=null;
    if(act==='save'){if(!watchlistIds.has(mv.id))saveRef.current&&saveRef.current(mv);setFeedToast(`Saved ${mv.title} to your watchlist`);setTimeout(()=>setFeedToast(null),2600);}
    else window.dispatchEvent(new CustomEvent('cine:watch-with',{detail:{movie:mv}}));
  },[sharedReady,isLoaded,isSignedIn,profileReady]);
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
    try{const g=JSON.parse(localStorage.getItem('cine_hidden_genres')||'{}');(movie.genre||[]).forEach(n=>{g[n]=(g[n]||0)+1;});localStorage.setItem('cine_hidden_genres',JSON.stringify(g));}catch{}
    setMovies(p=>p.filter(m=>m.id!==movie.id));
    clearTimeout(hiddenToastTimer.current);setHiddenToast({movie,idx});hiddenToastTimer.current=setTimeout(()=>setHiddenToast(null),4000);
  };
  const undoNotInterested=()=>{
    if(!hiddenToast)return;const{movie,idx}=hiddenToast;
    hiddenIdsRef.current.delete(movie.id);saveHidden();
    setMovies(p=>{const n=[...p];n.splice(Math.max(0,idx),0,movie);return n;});
    clearTimeout(hiddenToastTimer.current);setHiddenToast(null);
  };
  // ── Feed memory: what this device has already been shown, so the feed keeps moving ──
  const feedKey=m=>`${m.isTV?'t':'m'}${m.id}`;
  const seenRef=useRef({});
  const seedRef=useRef(String(Math.floor(Math.random()*1e9)));
  const watchlistRef=useRef([]);
  useEffect(()=>{watchlistRef.current=watchlist;},[watchlist]);
  useEffect(()=>{
    try{
      const raw=JSON.parse(localStorage.getItem('cine_seen')||'{}');const now=Date.now();const keep={};
      Object.entries(raw).forEach(([k,t])=>{if(now-t<5*24*3600e3)keep[k]=t;});
      seenRef.current=keep;
    }catch{}
  },[]);
  const markSeen=m=>{
    if(!m||!m.id)return;
    const k=feedKey(m);if(seenRef.current[k])return;
    seenRef.current[k]=Date.now();
    try{
      const entries=Object.entries(seenRef.current).sort((a,b)=>b[1]-a[1]).slice(0,900);
      seenRef.current=Object.fromEntries(entries);
      localStorage.setItem('cine_seen',JSON.stringify(seenRef.current));
    }catch{}
  };
  const tasteParams=()=>{
    const counts={};
    (watchlistRef.current||[]).forEach(w=>(Array.isArray(w.genre)?w.genre:[]).forEach(g=>{counts[g]=(counts[g]||0)+(w.watched?1:2);}));
    const taste=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([g])=>g);
    let avoid=[];
    try{const h=JSON.parse(localStorage.getItem('cine_hidden_genres')||'{}');avoid=Object.entries(h).filter(([g,c])=>c>=3&&!taste.includes(g)&&(c>=(counts[g]||0)+3)).map(([g])=>g);}catch{}
    return{taste,avoid};
  };

  const fetchMovies=useCallback(async(mood,genre,search='',page=1,append=false,provider='',retry=0)=>{
    if(loadingMoreRef.current&&append&&!retry)return;
    if(append){loadingMoreRef.current=true;setLoadingMore(true);}else{setLoading(true);seedRef.current=String(Math.floor(Math.random()*1e9));}
    try{
      const params=new URLSearchParams({mood:(mood||'trending').toLowerCase(),genre:genre||'',search:search||'',page:String(page),seed:seedRef.current});
      if(provider) params.set('provider', provider);
      const recent=Object.entries(seenRef.current).sort((a,b)=>b[1]-a[1]).slice(0,70).map(([k])=>k);
      if(recent.length)params.set('exclude',recent.join(','));
      const{taste,avoid}=tasteParams();
      if(taste.length)params.set('taste',taste.join(','));
      if(avoid.length)params.set('avoid',avoid.join(','));
      const res=await fetch(`/api/movies?${params}`);
      const data=await res.json();
      const hidden=hiddenIdsRef.current;
      const raw=(data.movies||[]).filter(m=>!hidden.has(m.id));
      // Prefer titles this device hasn't been shown in the last few days
      const fresh=raw.filter(m=>!seenRef.current[feedKey(m)]);
      const pick=fresh.length>=5?fresh:raw;
      if(append){
        let added=0;
        setMovies(p=>{const have=new Set(p.map(feedKey));const add=pick.filter(m=>!have.has(feedKey(m)));added=add.length;return[...p,...add];});
        if(fresh.length<4&&retry<2){pageRef.current+=1;loadingMoreRef.current=false;return fetchMovies(mood,genre,search,pageRef.current,true,provider,retry+1);}
      }
      else{
        const shared=sharedRef.current;sharedRef.current=null;
        setMovies(shared?[shared,...pick.filter(x=>!(x.id===shared.id&&!!x.isTV===!!shared.isTV))]:pick);
        setActiveIndex(0);
        pageRef.current=1;
        setTimeout(()=>containerRef.current?.scrollTo({top:0,behavior:'instant'}),30);
      }
    }catch(e){console.error(e);}
    if(append){loadingMoreRef.current=false;setLoadingMore(false);}else setLoading(false);
  },[]);

  // Anything the viewer actually lands on counts as seen
  useEffect(()=>{const m=movies[activeIndex];if(!m)return;const t=setTimeout(()=>markSeen(m),1200);return()=>clearTimeout(t);},[activeIndex,movies]);

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
  saveRef.current=handleSave;
  const accent=movies[activeIndex]?.accent||'#F5A623';
  const activeGenreLabel=GENRE_OPTIONS.find(g=>g.id===activeGenre)?.label||'All';

  return(
    <div style={{position:'fixed',inset:0,background:'#04040A',fontFamily:"var(--font-sans), 'Inter', system-ui, -apple-system, sans-serif",color:'#fff',overflow:'hidden'}}>
      {feedToast&&<Toast message={feedToast} accent={accent}/>}
      {pushChatPeer&&<ChatWidget peer={pushChatPeer} onClose={()=>setPushChatPeer(null)} accent={accent}/>}
      {pushAsk&&(
        <div style={{position:'fixed',left:16,right:16,top:'calc(64px + env(safe-area-inset-top))',zIndex:300,display:'flex',justifyContent:'center',animation:'fadeUp .3s ease'}}>
          <div style={{display:'flex',alignItems:'center',gap:12,maxWidth:420,width:'100%',background:'rgba(12,12,18,0.86)',backdropFilter:'blur(18px)',WebkitBackdropFilter:'blur(18px)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:14,padding:'12px 12px 12px 14px',boxShadow:'0 12px 36px rgba(0,0,0,0.5)'}}>
            <SvgIcon name="bell" size={18} color={accent}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12.5,fontWeight:700,color:'#fff'}}>Turn on notifications</div>
              <div style={{fontSize:11,color:T.text2,marginTop:1}}>Messages, calls and release reminders</div>
            </div>
            <button onClick={()=>answerPush(false)} style={{background:'none',border:'none',padding:'6px 4px',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.55)'}}>Not now</button>
            <button onClick={()=>answerPush(true)} style={{background:accent,border:'none',borderRadius:16,padding:'7px 14px',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,color:'#07070F'}}>Turn on</button>
          </div>
        </div>
      )}
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
            <button onClick={()=>setShowProfile(true)} aria-label="Profile" style={{width:36,height:36,padding:0,background:'none',border:'none',cursor:'pointer',flexShrink:0,position:'relative'}}>
              <span style={{position:'absolute',inset:0,borderRadius:'50%',background:`${accent}22`,border:`2px solid ${accent}55`,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
                {user?.imageUrl?<img src={user.imageUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:13,fontWeight:700,color:accent}}>{(user?.firstName||user?.username||'?')[0].toUpperCase()}</span>}
              </span>
              {watchlistIds.size>0&&<span style={{position:'absolute',top:-5,right:-6,minWidth:17,height:17,padding:'0 4px',borderRadius:9,background:accent,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid #04040A',boxSizing:'border-box',fontSize:9,fontWeight:800,color:'#04040A',lineHeight:1,zIndex:1}}>{watchlistIds.size>99?'99+':watchlistIds.size}</span>}
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


      {incoming&&!partyId&&<PartyInvite invite={incoming} accent={accent} onJoin={()=>{const inv=incoming;dismissInvite(inv.id);setIncoming(null);if(inv.scheduled_for&&Date.parse(inv.scheduled_for)-Date.now()>10*60000){fetch('/api/party',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'join',id:inv.id})}).then(()=>{setFeedToast(`You're in · ${fmtWhen(inv.scheduled_for)} 🍿`);setTimeout(()=>setFeedToast(null),2600);}).catch(()=>{});}else setPartyId(inv.id);}} onLater={()=>{dismissInvite(incoming.id);setIncoming(null);}} onDecline={()=>{const id=incoming.id;dismissInvite(id);setIncoming(null);fetch('/api/party',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'decline',id})}).catch(()=>{});}}/>}
      {watchWith&&<StartPartySheet movie={watchWith.movie} candidates={watchWith.candidates} label={watchWith.label} preselect={watchWith.preselect} accent={accent} onClose={()=>setWatchWith(null)}/>}
      {partyId&&isSignedIn&&<PartyRoom partyId={partyId} accent={accent} onClose={()=>setPartyId(null)}/>}
      {safety&&isSignedIn&&<SafetySheet {...safety} accent={accent} onClose={()=>{setSafety(null);window.dispatchEvent(new Event('cine:safety-closed'));}}/>}
      {welcome&&isSignedIn&&<Welcome user={user} accent={welcome} onDone={finishWelcome}/>}
      {showImport&&<ImportSheet accent={accent} onClose={()=>setShowImport(false)} onImported={({matched})=>{if(matched)track('import',{matched});}}/>}
      <FilterSheet show={showFilter} onClose={()=>setShowFilter(false)} onOpenFolder={id=>setTopLevelList(id)} onOpenFolders={()=>setShowLists(true)} activeGenre={activeGenre} activeMood={activeMood} onGenre={setActiveGenre} onMood={setActiveMood} accent={accent} activeProvider={activeProvider} onProvider={setActiveProvider} onSearchSelect={m=>{setMovies(p=>[m,...p.filter(x=>x.id!==m.id)]);scrollTo(0);}}/>
      {similarMovie&&<SimilarSheet movie={similarMovie} onClose={()=>setSimilarMovie(null)} accent={accent} onSelect={handleSimilarSelect} onScrollAll={handleSimilarScrollAll} onTrailer={setTrailerMovie} onSave={handleSave} savedIds={watchlistIds}/>}
      {showAuth&&<AuthGate onClose={()=>setShowAuth(false)} accent={accent}/>}
      {showProfile&&<ProfileSheet onClose={()=>setShowProfile(false)} accent={accent} watchlist={watchlist} setWatchlist={setWatchlist} userReviews={userReviews} loadingData={loadingProfileData} onWatchTrailer={(m)=>{setShowProfile(false);setTrailerMovie(m);}} onDiscover={()=>{setShowProfile(false);setTimeout(()=>setShowFilter(true),50);}}/>}
      {showLists&&<ListsScreen onClose={()=>setShowLists(false)} accent={accent} onWatchTrailer={setTrailerMovie} onSave={handleSave} watchlistIds={watchlistIds} watchlist={watchlist} onMarkWatched={handleMarkWatched} onOpenList={id=>setTopLevelList(id)} openListId={topLevelList}/>}
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
