'use client';
import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import ImportSheet from '../ImportSheet';
import { FolderCover, SvgIcon, T, Toast, ambient } from './shared';

// Pick which folders a title lives in. Tapping a folder adds or removes it; you can also make a new folder here.
export function AddToListSheet({movie,onClose,accent,isSaved,onEnsureSaved}){
  const{isSignedIn}=useUser();
  const[lists,setLists]=useState([]);
  const[loading,setLoading]=useState(true);
  const[busy,setBusy]=useState(null);
  const[toast,setToast]=useState(null);
  const[showCreate,setShowCreate]=useState(false);
  const[newTitle,setNewTitle]=useState('');
  const[newPublic,setNewPublic]=useState(false);
  const[creating,setCreating]=useState(false);
  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(null),2200);};
  const movieId=movie?.id||movie?.movie_id||movie?.tmdb_id;

  const moviePayload=()=>{
    if(!movieId)return null;
    return{
      id:movieId,
      title:movie.title||movie.movie_title||'Untitled',
      poster:movie.poster||movie.movie_poster||null,
      year:movie.year||movie.movie_year||null,
      rating:movie.rating||movie.movie_rating||null,
      accent:movie.accent||movie.movie_accent||accent,
      isTV:!!(movie.isTV||movie.is_tv||movie.mediaType==='tv'||movie.media_type==='tv'),
    };
  };

  useEffect(()=>{
    if(!isSignedIn){setLoading(false);return;}
    fetch(`/api/lists?tab=mine${movieId?`&movieId=${movieId}`:''}`).then(r=>r.json()).then(d=>{setLists(d.lists||[]);setLoading(false);}).catch(()=>setLoading(false));
  },[isSignedIn,movieId]);

  const toggle=async(list)=>{
    if(busy)return;
    const payload=moviePayload();
    if(!payload){showToast('Missing title info');return;}
    setBusy(list.id);
    const adding=!list.contains;
    setLists(p=>p.map(l=>l.id===list.id?{...l,contains:adding,movie_count:Math.max(0,(l.movie_count||0)+(adding?1:-1)),posters:adding&&payload.poster?[payload.poster,...(l.posters||[])].slice(0,4):(l.posters||[]).filter(x=>x!==payload.poster)}:l));
    try{
      const res=adding
        ?await fetch(`/api/lists/${list.id}/movies`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({movie:payload})})
        :await fetch(`/api/lists/${list.id}/movies`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({movieId:payload.id})});
      if(!res.ok)throw new Error();
      if(adding&&!isSaved&&onEnsureSaved)onEnsureSaved(movie);
      showToast(adding?`Added to ${list.title}`:`Removed from ${list.title}`);
    }catch{
      setLists(p=>p.map(l=>l.id===list.id?{...l,contains:!adding,movie_count:Math.max(0,(l.movie_count||0)+(adding?-1:1))}:l));
      showToast('Couldn’t update that folder — try again');
    }
    setBusy(null);
  };

  const createAndAdd=async()=>{
    if(!newTitle.trim()||creating)return;
    const payload=moviePayload();
    setCreating(true);
    try{
      const res=await fetch('/api/lists',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:newTitle.trim(),description:'',is_public:newPublic})});
      const data=await res.json();
      if(!res.ok||data.error){showToast(data.error||'Couldn’t create the folder');setCreating(false);return;}
      const list=data.list;
      let added=false;
      if(payload){
        const addRes=await fetch(`/api/lists/${list.id}/movies`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({movie:payload})});
        added=addRes.ok;
        if(added&&!isSaved&&onEnsureSaved)onEnsureSaved(movie);
      }
      setLists(p=>[{...list,is_public:newPublic,contains:added,movie_count:added?1:0,posters:added&&payload?.poster?[payload.poster]:[]},...p]);
      showToast(added?`Created ${list.title} and added it`:`Created ${list.title}`);
      setShowCreate(false);setNewTitle('');setNewPublic(false);
    }catch{showToast('Something went wrong');}
    setCreating(false);
  };

  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(14px)',display:'flex',alignItems:'flex-end',animation:'fadeIn 0.2s ease'}}>
      {toast&&<Toast message={toast} accent={accent}/>}
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxHeight:'80vh',background:ambient(accent),borderRadius:'22px 22px 0 0',borderTop:`1px solid ${T.hairline}`,display:'flex',flexDirection:'column',animation:'sheetUp 0.32s cubic-bezier(0.22,1,0.36,1)'}}>
        <style>{`@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={{width:36,height:4,borderRadius:2,background:'rgba(255,255,255,0.18)',margin:'10px auto 0',flexShrink:0}}/>
        <div style={{padding:'14px 20px 12px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div style={{minWidth:0,flex:1}}>
            <div style={{fontFamily:T.serif,fontSize:16,letterSpacing:'-0.02em',fontWeight:700,color:T.text}}>Add to folder</div>
            <div style={{fontSize:12,color:T.text2,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{movie?.title||movie?.movie_title}</div>
          </div>
          <button onClick={onClose} aria-label="Done" style={{background:'none',border:'none',cursor:'pointer',padding:4,fontFamily:'inherit',fontSize:12.5,fontWeight:700,color:accent,flexShrink:0}}>Done</button>
        </div>
        <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',padding:'0 20px calc(28px + env(safe-area-inset-bottom))'}}>
          {!isSignedIn?(
            <div style={{padding:'24px 0',color:T.text2,fontSize:12.5}}>Sign in to organise your watchlist into folders.</div>
          ):loading?(
            <div style={{display:'flex',justifyContent:'center',padding:24}}><div style={{width:20,height:20,border:'2px solid rgba(255,255,255,0.1)',borderTop:`2px solid ${accent}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/></div>
          ):(
            <>
              {!showCreate?(
                <div role="button" tabIndex={0} onClick={()=>setShowCreate(true)} onKeyDown={e=>e.key==='Enter'&&setShowCreate(true)} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 0',borderTop:`1px solid ${T.hairline}`,cursor:'pointer'}}>
                  <div style={{width:48,height:48,borderRadius:6,border:`1.5px dashed ${accent}88`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><SvgIcon name="plus" size={18} color={accent}/></div>
                  <div style={{fontSize:13,fontWeight:700,color:accent}}>New folder</div>
                </div>
              ):(
                <div style={{padding:'14px 0',borderTop:`1px solid ${T.hairline}`}}>
                  <input autoFocus value={newTitle} onChange={e=>setNewTitle(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')createAndAdd();}} maxLength={60} placeholder="Folder name, e.g. Slow-burn thrillers"
                    style={{width:'100%',boxSizing:'border-box',background:'transparent',border:'none',borderBottom:`1.5px solid ${accent}`,padding:'8px 2px',color:'#fff',fontSize:13.5,fontFamily:'inherit',outline:'none'}}/>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:14,gap:12}}>
                    <button type="button" onClick={()=>setNewPublic(p=>!p)} style={{display:'flex',alignItems:'center',gap:10,background:'none',border:'none',padding:0,cursor:'pointer',fontFamily:'inherit'}}>
                      <span style={{width:38,height:22,borderRadius:11,background:newPublic?accent:'rgba(255,255,255,0.15)',position:'relative',transition:'background 0.2s ease',flexShrink:0}}>
                        <span style={{position:'absolute',top:2,left:newPublic?18:2,width:18,height:18,borderRadius:'50%',background:'#fff',transition:'left 0.2s ease'}}/>
                      </span>
                      <span style={{textAlign:'left'}}>
                        <span style={{display:'block',fontSize:12.5,fontWeight:700,color:'#fff'}}>{newPublic?'Public':'Private'}</span>
                        <span style={{display:'block',fontSize:11,color:T.text2}}>{newPublic?'Anyone can find and follow it':'Only you can see it'}</span>
                      </span>
                    </button>
                    <div style={{display:'flex',gap:14,alignItems:'center',flexShrink:0}}>
                      <button type="button" onClick={()=>{setShowCreate(false);setNewTitle('');}} style={{background:'none',border:'none',padding:0,cursor:'pointer',fontSize:12.5,fontWeight:600,color:'rgba(255,255,255,0.6)',fontFamily:'inherit'}}>Cancel</button>
                      <button type="button" onClick={createAndAdd} disabled={creating||!newTitle.trim()} style={{background:accent,border:'none',borderRadius:6,padding:'9px 14px',cursor:creating||!newTitle.trim()?'default':'pointer',fontSize:12.5,fontWeight:700,color:'#06060B',fontFamily:'inherit',opacity:creating||!newTitle.trim()?0.5:1}}>{creating?'Creating…':'Create'}</button>
                    </div>
                  </div>
                </div>
              )}
              {lists.map(list=>(
                <div key={list.id} role="button" tabIndex={0} onClick={()=>toggle(list)} onKeyDown={e=>e.key==='Enter'&&toggle(list)} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 0',borderTop:`1px solid ${T.hairline}`,cursor:'pointer',opacity:busy===list.id?0.6:1}}>
                  <FolderCover posters={list.posters||(list.cover_poster?[list.cover_poster]:[])} accent={accent} size={48} locked={list.is_public===false}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{list.title}</div>
                    <div style={{fontSize:11,color:T.text2,marginTop:2}}>{list.movie_count||0} title{(list.movie_count||0)===1?'':'s'} · {list.is_public===false?'Private':'Public'}</div>
                  </div>
                  <span style={{width:24,height:24,borderRadius:'50%',border:`1.5px solid ${list.contains?accent:'rgba(255,255,255,0.3)'}`,background:list.contains?accent:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    {list.contains&&<SvgIcon name="check" size={13} color="#06060B"/>}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
