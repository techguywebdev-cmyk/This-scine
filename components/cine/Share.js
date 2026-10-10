'use client';
import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import ImportSheet from '../ImportSheet';
import { SvgIcon, T, ambient, track } from './shared';
import { titlePath } from '../../lib/look';

// ── Share a film: send to friends in-app (DM) or share a link anywhere ──
export function ShareSheet({movie,accent,onClose}){
  const{isSignedIn}=useUser();
  const[friends,setFriends]=useState(null);
  const[picked,setPicked]=useState(()=>new Set());
  const[q,setQ]=useState('');
  const[note,setNote]=useState('');
  const[sending,setSending]=useState(false);
  const[done,setDone]=useState(null);
  const type=movie?.isTV||movie?.mediaType==='tv'?'tv':'movie';
  const link=`${typeof window!=='undefined'?window.location.origin:'https://this-scine.vercel.app'}${titlePath(type,movie?.id,movie?.title)}`;
  useEffect(()=>{
    if(!isSignedIn){setFriends([]);return;}
    Promise.all([
      fetch('/api/follows?type=following').then(r=>r.json()).catch(()=>({users:[]})),
      fetch('/api/messages').then(r=>r.json()).catch(()=>({threads:[]})),
    ]).then(([f,m])=>{
      const map=new Map();
      (m.threads||m.conversations||[]).forEach(t=>{const id=t.peer_id||t.user_id;if(id)map.set(id,{user_id:id,username:t.username||t.peer_username,display_name:t.display_name,avatar_url:t.avatar_url||t.peer_avatar});});
      (f.users||[]).forEach(u=>{if(!map.has(u.user_id))map.set(u.user_id,u);});
      setFriends([...map.values()].filter(u=>u.username));
    });
  },[isSignedIn]);
  useEffect(()=>{
    if(q.trim().length<2)return;
    const t=setTimeout(()=>{fetch(`/api/follows?type=search&q=${encodeURIComponent(q.trim())}`).then(r=>r.json()).then(d=>{setFriends(p=>{const have=new Set((p||[]).map(u=>u.user_id));return[...(p||[]),...(d.users||[]).filter(u=>!have.has(u.user_id))];});}).catch(()=>{});},250);
    return()=>clearTimeout(t);
  },[q]);
  const shown=(friends||[]).filter(u=>!q.trim()||`${u.username} ${u.display_name||''}`.toLowerCase().includes(q.trim().toLowerCase()));
  const toggle=id=>setPicked(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
  const send=async()=>{track('share',{via:'dm'});
    if(!picked.size)return;
    setSending(true);
    const meta={id:movie.id,type,title:movie.title,poster:movie.poster||null,backdrop:movie.backdrop||null,year:movie.year||null,rating:movie.rating||null,accent:movie.accent||null};
    const ids=[...picked];
    await Promise.all(ids.map(id=>fetch('/api/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({toUserId:id,msg_type:'title',text:movie.title,meta})}).then(()=>note.trim()?fetch('/api/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({toUserId:id,text:note.trim()})}):null).catch(()=>{})));
    setSending(false);
    setDone(ids.length===1?`Sent to ${(friends||[]).find(u=>u.user_id===ids[0])?.display_name||(friends||[]).find(u=>u.user_id===ids[0])?.username||'1 person'}`:`Sent to ${ids.length} people`);
    setTimeout(onClose,1100);
  };
  const external=async()=>{track('share',{via:'external'});
    const text=`${movie.title}${movie.year?` (${movie.year})`:''} — found it on CineScroll`;
    try{if(navigator.share){await navigator.share({title:movie.title,text,url:link});return;}await navigator.clipboard.writeText(`${text} ${link}`);setDone('Link copied');setTimeout(()=>setDone(null),1600);}catch{}
  };
  const copy=async()=>{track('share',{via:'link'});try{await navigator.clipboard.writeText(link);setDone('Link copied');setTimeout(()=>setDone(null),1600);}catch{}};
  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:400,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',display:'flex',alignItems:'flex-end',animation:'fadeIn .2s ease'}}>
      <style>{`@keyframes shareUp{from{transform:translateY(100%)}to{transform:none}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxHeight:'82vh',display:'flex',flexDirection:'column',background:ambient(accent),borderRadius:'20px 20px 0 0',border:`1px solid ${T.hairline}`,borderBottom:'none',animation:'shareUp .28s cubic-bezier(0.22,1,0.36,1)'}}>
        <div style={{padding:'12px 20px 0'}}>
          <div style={{width:34,height:4,borderRadius:2,background:'rgba(255,255,255,0.25)',margin:'0 auto 14px'}}/>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <div style={{width:42,aspectRatio:'2/3',borderRadius:3,overflow:'hidden',background:T.surface,flexShrink:0}}>{movie?.poster&&<img src={movie.poster} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>}</div>
            <div style={{minWidth:0,flex:1}}>
              <div style={{fontSize:15,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>Share “{movie?.title}”</div>
              <div style={{fontSize:12,color:T.text2,marginTop:2}}>{done||'Send to friends or share a link'}</div>
            </div>
          </div>
        </div>
        {isSignedIn?(
          <>
            <div style={{padding:'16px 20px 0'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,paddingBottom:10,borderBottom:'1.5px solid rgba(255,255,255,0.14)'}}>
                <SvgIcon name="search" size={16} color="rgba(255,255,255,0.5)"/>
                <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search people" style={{flex:1,minWidth:0,background:'transparent',border:'none',outline:'none',color:'#fff',fontSize:14,fontFamily:'inherit'}}/>
              </div>
            </div>
            <div style={{flex:1,minHeight:120,overflowY:'auto',padding:'14px 20px 4px'}}>
              {friends===null?<div style={{display:'flex',justifyContent:'center',padding:20}}><div style={{width:20,height:20,border:'2px solid rgba(255,255,255,0.1)',borderTop:`2px solid ${accent}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/></div>:shown.length===0?(
                <div style={{fontSize:12.5,color:T.text2,padding:'8px 0'}}>{q?'No one found':'Follow people to send films to them here.'}</div>
              ):(
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'14px 8px'}}>
                  {shown.map(u=>{const on=picked.has(u.user_id);return(
                    <button key={u.user_id} onClick={()=>toggle(u.user_id)} style={{background:'none',border:'none',padding:0,cursor:'pointer',fontFamily:'inherit',display:'flex',flexDirection:'column',alignItems:'center',gap:6,minWidth:0}}>
                      <span style={{position:'relative',width:54,height:54,borderRadius:'50%',boxShadow:on?`0 0 0 2px ${T.bg}, 0 0 0 4px ${accent}`:'none',transition:'box-shadow .15s'}}>
                        <span style={{display:'flex',width:'100%',height:'100%',borderRadius:'50%',overflow:'hidden',background:`${accent}33`,alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:700,color:accent}}>{u.avatar_url?<img src={u.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:(u.display_name||u.username||'U')[0].toUpperCase()}</span>
                        {on&&<span style={{position:'absolute',right:-2,bottom:-2,width:20,height:20,borderRadius:'50%',background:accent,border:`2px solid ${T.bg}`,display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="check" size={11} color="#06060B"/></span>}
                      </span>
                      <span style={{fontSize:11,fontWeight:on?700:500,color:on?'#fff':'rgba(255,255,255,0.7)',width:'100%',textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{(u.display_name||u.username||'').split(' ')[0]}</span>
                    </button>
                  );})}
                </div>
              )}
            </div>
            {picked.size>0&&(
              <div style={{display:'flex',gap:8,alignItems:'center',padding:'10px 20px 0'}}>
                <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a message (optional)" style={{flex:1,minWidth:0,background:`linear-gradient(135deg, rgba(255,255,255,0.08), ${accent}14)`,border:`1px solid ${accent}2e`,borderRadius:22,padding:'11px 15px',color:'#fff',fontSize:14,outline:'none',fontFamily:'inherit'}}/>
                <button onClick={send} disabled={sending} style={{background:accent,border:'none',borderRadius:22,height:42,padding:'0 18px',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:700,color:'#07070F',flexShrink:0,opacity:sending?0.7:1}}>{sending?'Sending…':`Send${picked.size>1?` (${picked.size})`:''}`}</button>
              </div>
            )}
          </>
        ):<div style={{padding:'16px 20px 0',fontSize:12.5,color:T.text2}}>Sign in to send films to friends.</div>}
        <div style={{padding:'16px 20px 0'}}>
          <button onClick={()=>{onClose();setTimeout(()=>window.dispatchEvent(new CustomEvent('cine:watch-with',{detail:{movie:movie}})),120);}} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:8,height:46,borderRadius:23,border:`1px solid ${accent}`,background:`${accent}22`,color:'#fff',fontFamily:'inherit',fontSize:13.5,fontWeight:800,cursor:'pointer'}}><span style={{fontSize:16}}>🍿</span>Start a watch party instead</button>
        </div>
        <div style={{display:'flex',gap:10,padding:'12px 20px calc(18px + env(safe-area-inset-bottom))'}}>
          <button onClick={external} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,height:44,borderRadius:22,border:`1px solid ${T.hairlineStrong}`,background:'rgba(255,255,255,0.04)',color:'#fff',fontFamily:'inherit',fontSize:13,fontWeight:700,cursor:'pointer'}}><SvgIcon name="share" size={15} color="#fff"/>Share via…</button>
          <button onClick={copy} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,height:44,borderRadius:22,border:`1px solid ${T.hairlineStrong}`,background:'rgba(255,255,255,0.04)',color:'#fff',fontFamily:'inherit',fontSize:13,fontWeight:700,cursor:'pointer'}}><SvgIcon name="list" size={15} color="#fff"/>Copy link</button>
        </div>
      </div>
    </div>
  );
}
