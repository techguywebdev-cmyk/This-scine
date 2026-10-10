'use client';
import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import ImportSheet from '../ImportSheet';
import { MentionSuggest, MentionText, SvgIcon, T, UserProfileSheet, ambient, applyMention } from './shared';

// COMMENT PANEL
export function CommentPanel({movie,onClose,accent,onAuthRequired,onWatchTrailer,onAddToWatchlist}){
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

  const mentionsRef=useRef([]);
  const post=async()=>{
    if(!isSignedIn){onAuthRequired();return;}
    if(!input.trim())return;
    const text=input;const parentId=replyingTo?replyingTo.id:null;
    setInput('');setReplyingTo(null);
    const mentions=mentionsRef.current;mentionsRef.current=[];
    try{
      const res=await fetch('/api/reviews',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({movieId:movie?.id,movieTitle:movie?.title,moviePoster:movie?.poster||null,mediaType:movie?.mediaType==='tv'||movie?.isTV?'tv':'movie',text,rating:0,parentId,mentions})});
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
                <p style={{fontSize:13.5,color:T.text2,lineHeight:1.55,margin:'0 0 7px'}}><MentionText text={c.text} accent={accent}/></p>
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
                  <p style={{fontSize:12.5,color:T.text2,lineHeight:1.5,margin:0}}><MentionText text={r.text} accent={accent}/></p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      {replyingTo&&<div style={{padding:'8px 20px',background:T.surface2,borderTop:`1px solid ${T.hairline}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}><span style={{fontSize:11,color:T.text2}}>Replying to <span style={{color:accent}}>@{replyingTo.username}</span></span><button onClick={()=>{setReplyingTo(null);setInput('');}} style={{background:'none',border:'none',cursor:'pointer',color:T.text3,fontSize:14,padding:0}}>×</button></div>}
      {isSignedIn?(<div style={{position:'relative',padding:'10px 16px 34px',borderTop:`1px solid ${T.hairline}`,display:'flex',gap:8,alignItems:'center',flexShrink:0,background:'rgba(6,6,11,0.55)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)'}}><MentionSuggest value={input} accent={accent} onPick={u=>{mentionsRef.current=[...mentionsRef.current,{user_id:u.user_id,handle:u.username}];setInput(v=>applyMention(v,u));setTimeout(()=>inputRef.current?.focus(),0);}}/><input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&post()} placeholder={replyingTo?`Reply to @${replyingTo.username}...`:'Write a review… type @ to tag someone'} style={{flex:1,background:T.surface2,border:`1px solid ${replyingTo?accent+'40':T.hairline}`,borderRadius:22,padding:'11px 16px',color:T.text,fontSize:14,outline:'none',fontFamily:'inherit'}}/><button onClick={post} style={{background:accent,border:'none',borderRadius:'50%',width:40,height:40,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><SvgIcon name="send" size={14} color="#07070F"/></button></div>)
      :(<div style={{padding:'14px 20px 34px',borderTop:`1px solid ${T.hairline}`,flexShrink:0,background:'rgba(6,6,11,0.55)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)'}}><button onClick={onAuthRequired} style={{width:'100%',background:`${accent}14`,border:`1px solid ${accent}40`,borderRadius:16,padding:'13px',cursor:'pointer',fontFamily:'inherit',fontSize:14,color:accent,fontWeight:600}}>Sign in to leave a review</button></div>)}
    </div>
    </>
  );
}
