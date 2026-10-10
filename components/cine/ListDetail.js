'use client';
import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import ImportSheet from '../ImportSheet';
import { Eyebrow, FolderArt, ListPlaylistPlayer, SerifStat, SvgIcon, T, Toast, ambient } from './shared';

export function ListDetailSheet({listId,onClose,accent,onWatchTrailer,onSave,watchlistIds,watchedIds,watchlist=[],onFillFromFeed}){
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

  const accentColor=accent; // folders always follow the page colour

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
        <div style={{position:'relative',width:'100%',padding:'60px 0 52px',display:'flex',justifyContent:'center',flexShrink:0}}>
          {!loading&&list&&<div style={{width:120}}><FolderArt poster={list.cover_url||movies[movies.length-1]?.movie_poster||list.cover_poster} accent={accentColor} locked={list.is_public===false} count={movies.length}/></div>}
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
            <div style={{marginTop:0,position:'relative',zIndex:2,marginBottom:18}}>
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
