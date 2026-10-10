'use client';
import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import ImportSheet from '../ImportSheet';
import { TogetherSheet, ChatWidget, CoverImg, FolderCoverFill, FollowListModal, GRADS, ListDetailSheet, SvgIcon, T, Toast, ambient, coverCache } from './shared';

// Full TMDB genre name -> id map (movie genre list), used for profile cover photo lookups
export const TMDB_GENRE_IDS = {
  'Action':'28','Adventure':'12','Animation':'16','Comedy':'35','Crime':'80',
  'Documentary':'99','Drama':'18','Family':'10751','Fantasy':'14','History':'36',
  'Horror':'27','Music':'10402','Mystery':'9648','Romance':'10749','Science Fiction':'878',
  'Sci-Fi':'878','TV Movie':'10770','Thriller':'53','War':'10752','Western':'37',
};
export function UserProfileSheet({userId,onClose,accent,onWatchTrailer,onAddToWatchlist}){
  const{user:currentUser}=useUser();
  const[profile,setProfile]=useState(null);
  const[showTogether,setShowTogether]=useState(false);
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
    setTab('activity');setActivity([]);setReviews([]);setCoverImg(coverCache.get(userId));
    fetch(`/api/users/${userId}`)
      .then(r=>r.json())
      .then(d=>{setProfile(d);setFollowing(!!d.isFollowing);setLoading(false);})
      .catch(()=>setLoading(false));
  },[userId]);

  // Cover photo: use the user's custom upload if set, otherwise a randomized backdrop from their #1 genre
  useEffect(()=>{
    if(!profile)return;
    if(profile.cover_url){
      setCoverImg(profile.cover_url);
      coverCache.set(profile.user_id||userId,profile.cover_url);
      return;
    }
    if(coverCache.get(profile.user_id||userId)){coverCache.set(profile.user_id||userId,null);setCoverImg(null);}
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
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',height:'94vh',maxHeight:'94vh',background:ambient(accent),borderRadius:'24px 24px 0 0',border:`1px solid ${T.hairline}`,borderBottom:'none',display:'flex',flexDirection:'column',animation:'sheetUp 0.32s cubic-bezier(0.22,1,0.36,1)',overflow:'hidden'}}>
        <style>{`@keyframes sheetUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.profile-scroll::-webkit-scrollbar{display:none}`}</style>

        {loading?(
          <div style={{display:'flex',justifyContent:'center',padding:60}}>
            <div style={{width:24,height:24,border:`2px solid rgba(255,255,255,0.1)`,borderTop:`2px solid ${accentColor}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
          </div>
        ):!profile?(
          <div style={{textAlign:'center',padding:'40px 20px',color:T.text3,fontSize:13}}>Couldn't load this profile</div>
        ):(
          <div className="profile-scroll" style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',scrollbarWidth:'none'}}>
            {(()=>{
              const name=profile.display_name||profile.username;
              const toMovie=m=>({id:m.movie_id,title:m.title,poster:m.poster,year:m.year,rating:m.rating,genre:m.genre,overview:m.overview,accent:m.accent||accentColor,gradient:m.gradient,mediaType:m.is_tv?'tv':'movie'});
              const saveIt=m=>{onAddToWatchlist&&onAddToWatchlist({id:m.movie_id,title:m.title,year:m.year,rating:m.rating,poster:m.poster,backdrop:m.backdrop,genre:m.genre,overview:m.overview,accent:m.accent||accentColor,gradient:m.gradient,isTV:m.is_tv,certification:m.certification||''});showToast(`Saved ${m.title}`);};
              const shareProfile=async()=>{
                const shareUrl=`https://this-scine.vercel.app/u/${profile.has_username?profile.username:(profile.user_id||userId)}`;
                try{
                  if(navigator.share){await navigator.share({title:`${name} on CineScroll`,text:`See what ${name} is watching on CineScroll`,url:shareUrl});}
                  else{await navigator.clipboard.writeText(shareUrl);setShareCopied(true);showToast('Profile link copied');setTimeout(()=>setShareCopied(false),2000);}
                }catch{}
              };
              const label={fontSize:10.5,letterSpacing:2.2,textTransform:'uppercase',fontWeight:700,color:accentColor};
              const glassBtn={background:'rgba(0,0,0,0.38)',backdropFilter:'blur(10px)',WebkitBackdropFilter:'blur(10px)',border:'none',borderRadius:'50%',width:34,height:34,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'};
              const watchlist=profile.watchlist||[];
              const recentPosters=watchlist.filter(m=>m.poster).slice(0,10);
              const spinner=<div style={{display:'flex',justifyContent:'center',padding:30}}><div style={{width:22,height:22,border:`2px solid rgba(255,255,255,0.1)`,borderTop:`2px solid ${accentColor}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/></div>;
              const empty=(t,sub)=><div style={{padding:'26px 0',textAlign:'left'}}><div style={{fontSize:13,fontWeight:700,color:T.text}}>{t}</div>{sub&&<div style={{fontSize:12,color:T.text2,marginTop:4,lineHeight:1.5}}>{sub}</div>}</div>;
              const VERB={saved:'Saved',watched:'Watched',reviewed:'Reviewed',list_follow:'Followed folder',arc_complete:'Finished arc'};
              return(
              <>
                {/* COVER */}
                <div style={{position:'relative',width:'100%',aspectRatio:'1.9',flexShrink:0}}>
                  <div style={{position:'absolute',inset:0,overflow:'hidden',borderRadius:'24px 24px 0 0',background:coverImg?'transparent':`radial-gradient(120% 120% at 20% 0%, ${accentColor}40, transparent 70%)`,WebkitMaskImage:'linear-gradient(to bottom,#000 45%,transparent 100%)',maskImage:'linear-gradient(to bottom,#000 45%,transparent 100%)'}}>
                    {coverImg&&<CoverImg src={coverImg} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',objectPosition:'center 30%'}}/>}
                    <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(6,6,11,0.35) 0%,rgba(6,6,11,0) 35%)'}}/>
                  </div>
                  <div style={{width:34,height:4,borderRadius:2,background:'rgba(255,255,255,0.3)',position:'absolute',top:10,left:'50%',transform:'translateX(-50%)'}}/>
                  <div style={{position:'absolute',top:16,left:16,right:16,display:'flex',justifyContent:'space-between'}}>
                    <button onClick={onClose} aria-label="Close" style={glassBtn}><SvgIcon name="close" size={14} color="#fff"/></button>
                    <button onClick={shareProfile} aria-label="Share profile" style={glassBtn}><SvgIcon name={shareCopied?'check':'share'} size={14} color="#fff"/></button>
                  </div>
                </div>

                <div style={{padding:'0 20px 36px',marginTop:-58,position:'relative'}}>
                  {/* IDENTITY */}
                  <div style={{width:84,height:84,borderRadius:'50%',padding:3,background:`linear-gradient(135deg,${accentColor},${accentColor}55)`,boxShadow:'0 10px 30px rgba(0,0,0,0.5)'}}>
                    <div style={{width:'100%',height:'100%',borderRadius:'50%',overflow:'hidden',background:'#14141B',border:'3px solid #0B0B12',boxSizing:'border-box',display:'flex',alignItems:'center',justifyContent:'center',fontSize:30,fontWeight:700,color:accentColor}}>
                      {profile.avatar_url?<img src={profile.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:(name||'U')[0].toUpperCase()}
                    </div>
                  </div>
                  <div style={{marginTop:12}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{flex:1,minWidth:0,display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                        <span style={{fontFamily:T.serif,fontSize:22,fontWeight:700,letterSpacing:'-0.02em',color:'#fff',lineHeight:1.15}}>{name}</span>
                        {profile.followsYou&&<span style={{fontSize:10.5,fontWeight:700,color:T.text2,background:'rgba(255,255,255,0.08)',borderRadius:6,padding:'3px 7px'}}>Follows you</span>}
                      </div>
                      {!profile.isSelf&&currentUser&&currentUser.id!==userId&&(
                        <button onClick={handleMessageRequest} aria-label={`Message ${name}`} style={{flexShrink:0,width:40,height:40,borderRadius:'50%',background:'rgba(0,0,0,0.3)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.14)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}>
                          <SvgIcon name="chat" size={17} color="#fff"/>
                        </button>
                      )}
                    </div>
                    <div style={{fontSize:12.5,color:T.text2,marginTop:3}}>@{profile.username}{profile.topGenres?.length?<span style={{color:T.text3}}> · into {profile.topGenres.slice(0,3).join(', ')}</span>:null}</div>
                    {profile.bio&&<div style={{fontSize:13,color:'rgba(255,255,255,0.85)',marginTop:10,lineHeight:1.5}}>{profile.bio}</div>}
                  </div>

                  {/* STATS — one quiet line */}
                  <div style={{display:'flex',gap:18,marginTop:14,flexWrap:'wrap'}}>
                    {[
                      [profile.followers,'followers',()=>setFollowListType('followers')],
                      [profile.following,'following',()=>setFollowListType('following')],
                      [profile.watchlistCount,'saved',()=>setTab('watchlist')],
                      [profile.watchedCount||0,'watched',()=>setTab('activity')],
                    ].map(([v,l,fn])=>(
                      <button key={l} onClick={fn} style={{background:'none',border:'none',padding:0,cursor:'pointer',fontFamily:'inherit',fontSize:12.5,color:T.text2}}><b style={{color:'#fff',fontWeight:700}}>{v||0}</b> {l}</button>
                    ))}
                  </div>

                  {/* ACTIONS */}
                  {!profile.isSelf&&(
                    <div style={{display:'flex',gap:10,marginTop:18}}>
                      <button onClick={handleFollow} style={{flex:1,height:42,borderRadius:21,border:following?`1px solid ${T.hairlineStrong}`:'none',background:following?'transparent':accentColor,color:following?'#fff':'#07070F',fontFamily:'inherit',fontSize:13,fontWeight:700,cursor:'pointer',transition:'all .2s'}}>
                        {following?'Following':profile.followsYou?'Follow back':'Follow'}
                      </button>
                      {currentUser&&currentUser.id!==userId&&(
                        <button onClick={()=>setShowTogether(true)} style={{flex:1,height:42,borderRadius:21,border:`1px solid ${T.hairlineStrong}`,background:'rgba(255,255,255,0.04)',color:'#fff',fontFamily:'inherit',fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:7}}>
                          <span style={{fontSize:14}}>🍿</span>Watch together
                        </button>
                      )}
                    </div>
                  )}
                  {showTogether&&<TogetherSheet peer={{user_id:userId,username:profile.username,display_name:profile.display_name||profile.username,avatar_url:profile.avatar_url||null}} accent={accentColor||accent} onClose={()=>setShowTogether(false)}/>}

                  {/* IN COMMON */}
                  {!profile.isSelf&&profile.inCommonCount>0&&(
                    <div style={{marginTop:26}}>
                      <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between'}}>
                        <span style={label}>You both saved</span>
                        <span style={{fontSize:11.5,color:T.text2}}>{profile.inCommonCount} title{profile.inCommonCount===1?'':'s'}</span>
                      </div>
                      <div style={{display:'flex',gap:8,overflowX:'auto',scrollbarWidth:'none',margin:'12px -20px 0',padding:'0 20px'}}>
                        {profile.inCommon.map(m=>(
                          <button key={m.movie_id} onClick={()=>onWatchTrailer&&onWatchTrailer(toMovie(m))} style={{flexShrink:0,width:72,aspectRatio:'2/3',borderRadius:3,overflow:'hidden',background:m.gradient||T.surface,border:'none',padding:0,cursor:'pointer'}}>
                            {m.poster&&<img src={m.poster} alt="" loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* RECENTLY SAVED SHELF */}
                  {recentPosters.length>0&&(
                    <div style={{marginTop:26}}>
                      <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between'}}>
                        <span style={label}>Recently saved</span>
                        {watchlist.length>recentPosters.length&&<button onClick={()=>setTab('watchlist')} style={{background:'none',border:'none',padding:0,cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,color:accentColor}}>See all</button>}
                      </div>
                      <div style={{display:'flex',gap:10,overflowX:'auto',scrollbarWidth:'none',margin:'12px -20px 0',padding:'0 20px'}}>
                        {recentPosters.map(m=>(
                          <div key={m.movie_id} style={{flexShrink:0,width:104}}>
                            <button onClick={()=>onWatchTrailer&&onWatchTrailer(toMovie(m))} style={{position:'relative',display:'block',width:'100%',aspectRatio:'2/3',borderRadius:3,overflow:'hidden',background:m.gradient||T.surface,border:'none',padding:0,cursor:'pointer'}}>
                              <img src={m.poster} alt="" loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
                              {m.watched&&<span style={{position:'absolute',top:5,left:5,fontSize:9.5,fontWeight:700,color:'#fff',background:'rgba(0,0,0,0.6)',borderRadius:4,padding:'2px 5px'}}>Watched</span>}
                            </button>
                            <div style={{fontSize:11.5,fontWeight:600,color:'#fff',marginTop:6,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.title}</div>
                            {!profile.isSelf&&onAddToWatchlist&&<button onClick={()=>saveIt(m)} style={{display:'inline-flex',alignItems:'center',gap:4,background:'none',border:'none',padding:0,marginTop:3,cursor:'pointer',fontFamily:'inherit',fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.6)'}}><SvgIcon name="plus" size={11} color="rgba(255,255,255,0.6)"/>Save</button>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TABS */}
                  <div style={{display:'flex',gap:22,borderBottom:`1px solid ${T.hairline}`,marginTop:28}}>
                    {[['activity','Activity'],['watchlist','Watchlist'],['reviews','Reviews'],['lists','Folders']].map(([t,l])=>(
                      <button key={t} onClick={()=>setTab(t)} style={{background:'none',border:'none',borderBottom:`2px solid ${tab===t?accentColor:'transparent'}`,marginBottom:-1,padding:'0 0 11px',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:tab===t?700:500,color:tab===t?accentColor:'rgba(255,255,255,0.5)'}}>{l}</button>
                    ))}
                  </div>

                  {/* ACTIVITY */}
                  {tab==='activity'&&(loadingActivity?spinner:activity.length===0?empty('Nothing yet',`When ${name.split(' ')[0]} saves, watches or reviews something, it shows up here.`):(
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'14px 10px',paddingTop:16}}>
                      {activity.map((item,i)=>{
                        const tappable=item.movie_id&&item.type!=='list_follow';
                        const tint=item.type==='watched'?'#7BFFB0':item.type==='reviewed'?'#FFD166':item.type==='saved'?accentColor:'#fff';
                        return(
                          <div key={item.id||i} style={{minWidth:0}}>
                            <button onClick={()=>{if(!tappable||!onWatchTrailer)return;onWatchTrailer({id:item.movie_id,title:item.movie_title,poster:item.movie_poster,year:item.movie_year,rating:item.movie_rating,accent:item.movie_accent||accentColor,mediaType:item.is_tv?'tv':'movie',...(item.type==='reviewed'&&item.review_id?{initialTab:'comments',highlightCommentId:item.review_id}:{})});}}
                              style={{position:'relative',display:'block',width:'100%',aspectRatio:'2/3',borderRadius:3,overflow:'hidden',background:GRADS[i%GRADS.length],border:'none',padding:0,cursor:tappable?'pointer':'default'}}>
                              {item.movie_poster?<img src={item.movie_poster} alt="" loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>:<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="folder" size={22} color="rgba(255,255,255,0.6)"/></div>}
                              <span style={{position:'absolute',left:5,top:5,display:'inline-flex',alignItems:'center',gap:4,fontSize:9.5,fontWeight:700,color:'#fff',background:'rgba(0,0,0,0.62)',backdropFilter:'blur(6px)',WebkitBackdropFilter:'blur(6px)',borderRadius:4,padding:'2px 6px'}}>
                                <span style={{width:5,height:5,borderRadius:'50%',background:tint}}/>{VERB[item.type]||'Activity'}
                              </span>
                            </button>
                            <div style={{fontSize:11.5,fontWeight:600,color:'#fff',marginTop:6,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.movie_title}</div>
                            <div style={{fontSize:10.5,color:T.text3,marginTop:2}}>{timeAgo(item.created_at)}</div>
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {/* WATCHLIST */}
                  {tab==='watchlist'&&(profile.watchlist===null?empty('This watchlist is private',`${name.split(' ')[0]} keeps their saves to themselves.`):watchlist.length===0?empty('No titles yet'):(
                    <div style={{paddingTop:4}}>
                      {watchlist.slice(0,80).map((m,i)=>(
                        <div key={m.movie_id||i} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 0',borderTop:i?`1px solid ${T.hairline}`:'none'}}>
                          <button onClick={()=>onWatchTrailer&&onWatchTrailer(toMovie(m))} style={{width:42,aspectRatio:'2/3',borderRadius:3,overflow:'hidden',flexShrink:0,background:m.gradient||GRADS[i%GRADS.length],border:'none',padding:0,cursor:'pointer'}}>
                            {m.poster&&<img src={m.poster} alt="" loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>}
                          </button>
                          <button onClick={()=>onWatchTrailer&&onWatchTrailer(toMovie(m))} style={{flex:1,minWidth:0,background:'none',border:'none',padding:0,cursor:'pointer',fontFamily:'inherit',textAlign:'left'}}>
                            <div style={{fontSize:13.5,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.title}</div>
                            <div style={{fontSize:11.5,color:T.text2,marginTop:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                              {[m.year,(m.genre||[]).slice(0,2).join(', ')].filter(Boolean).join(' · ')}
                              {m.watched&&<span style={{color:'#7BFFB0',fontWeight:700}}> · Watched</span>}
                            </div>
                          </button>
                          {!profile.isSelf&&onAddToWatchlist&&(
                            <button onClick={()=>saveIt(m)} aria-label={`Save ${m.title}`} style={{flexShrink:0,display:'inline-flex',alignItems:'center',gap:5,background:'none',border:`1px solid ${T.hairlineStrong}`,borderRadius:16,height:30,padding:'0 12px',cursor:'pointer',fontFamily:'inherit',fontSize:11.5,fontWeight:700,color:'#fff'}}>
                              <SvgIcon name="plus" size={11} color="#fff"/>Save
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* REVIEWS */}
                  {tab==='reviews'&&(loadingReviews?spinner:reviews.length===0?empty('No reviews yet'):(
                    <div>
                      {reviews.map((r,i)=>(
                        <div key={r.id} style={{padding:'14px 0',borderTop:i?`1px solid ${T.hairline}`:'none'}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:10}}>
                            <span style={{fontSize:14,fontWeight:700,color:'#fff'}}>{r.movie_title}</span>
                            <span style={{fontSize:11,color:T.text3,flexShrink:0}}>{timeAgo(r.created_at)}</span>
                          </div>
                          {r.rating>0&&<div style={{display:'flex',gap:2,marginTop:6}}>{[1,2,3,4,5].map(n=><SvgIcon key={n} name="star" size={11} color={n<=r.rating?'#FFD166':T.hairlineStrong} filled={n<=r.rating}/>)}</div>}
                          <p style={{fontSize:13,color:'rgba(255,255,255,0.85)',lineHeight:1.55,margin:'8px 0 0'}}>{r.text}</p>
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* FOLDERS */}
                  {tab==='lists'&&(loadingLists?spinner:userLists.length===0?empty('No public folders',profile.isSelf?'Make a folder public to show it here.':`${name.split(' ')[0]} hasn't shared any folders yet.`):(
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'18px 12px',paddingTop:18}}>
                      {userLists.map(list=>(
                        <button key={list.id} onClick={()=>setViewingList(list.id)} style={{background:'none',border:'none',padding:0,cursor:'pointer',fontFamily:'inherit',textAlign:'left',minWidth:0}}>
                          <FolderCoverFill posters={list.cover_url?[list.cover_url]:(list.posters||[])} accent={accentColor} locked={list.is_public===false} count={list.movie_count||0}/>
                          <div style={{fontSize:13,fontWeight:700,color:'#fff',marginTop:8,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{list.title}</div>
                          <div style={{fontSize:11,color:T.text2,marginTop:2}}>{list.follower_count||0} follower{list.follower_count===1?'':'s'}</div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </>
              );
            })()}
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
