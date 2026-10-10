'use client';
import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import ImportSheet from '../ImportSheet';
import { GRADS, SvgIcon, T, ambient } from './shared';

export function getContentLabel(movie) {
  if (!movie) return 'Films';
  const genres = (movie.genre || []).map(g => g.toLowerCase());
  if (genres.includes('animation')) return 'Anime & Cartoons';
  if (movie.isTV) return 'Series';
  return 'Movies';
}
// SIMILAR SHEET
export function SimilarSheet({movie,onClose,accent,onSelect,onScrollAll,onTrailer,onSave,savedIds}){
  const[items,setItems]=useState([]);const[source,setSource]=useState(null);const[loading,setLoading]=useState(true);const[err,setErr]=useState(false);
  const contentLabel=getContentLabel(movie);
  const load=useCallback(()=>{
    if(!movie)return;setLoading(true);setErr(false);
    const genreIds=(movie.genreIds||movie.genre_ids||[]).join(',');
    fetch(`/api/movies?similar=${movie.id}&similarType=${movie.mediaType||(movie.isTV?'tv':'movie')}&similarGenres=${genreIds}`)
      .then(r=>r.json()).then(d=>{setItems(d.movies||[]);setSource(d.source||null);setLoading(false);})
      .catch(()=>{setErr(true);setLoading(false);});
  },[movie]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{const prev=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=prev;};},[]);
    const backdrop=source?.backdrop||movie?.backdrop||movie?.poster;
  const play=(m)=>{if(onTrailer){onTrailer(m);}else{onSelect?.(m);onClose();}};
  const wall=items.filter(m=>m.poster).slice(0,10);
  const shimmer={background:'linear-gradient(90deg,rgba(255,255,255,0.03),rgba(255,255,255,0.07),rgba(255,255,255,0.03))',backgroundSize:'400px 100%',animation:'simShimmer 1.2s linear infinite'};
  const glass={background:'rgba(0,0,0,0.35)',backdropFilter:'blur(14px)',WebkitBackdropFilter:'blur(14px)',border:'1px solid rgba(255,255,255,0.14)'};
  return(
    <><div onClick={onClose} style={{position:'fixed',inset:0,zIndex:55,background:'rgba(0,0,0,0.72)',backdropFilter:'blur(10px)',animation:'simFade 0.2s ease'}}/>
    <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:60,background:ambient(accent),borderRadius:'22px 22px 0 0',borderTop:`1px solid ${T.hairline}`,height:'90dvh',display:'flex',flexDirection:'column',overflow:'hidden',animation:'sheetUp 0.34s cubic-bezier(0.22,1,0.36,1)'}}>
      <style>{`@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes simFade{from{opacity:0}to{opacity:1}}@keyframes simShimmer{0%{background-position:-200px 0}100%{background-position:200px 0}}@keyframes simIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',scrollbarWidth:'none',overscrollBehavior:'contain'}}>
        {/* Header — poster wall of the matches */}
        <div style={{position:'relative',padding:'0 20px 18px',overflow:'hidden'}}>
          <div style={{position:'absolute',inset:'-10px -10px auto',height:230,display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:6,opacity:0.55}}>
            {Array.from({length:10}).map((_,i)=>{const m=wall[i];return(
              <div key={i} style={{aspectRatio:'2/3',borderRadius:4,overflow:'hidden',transform:`translateY(${i%2?-24:0}px)`,...(m?{background:'rgba(255,255,255,0.05)'}:shimmer)}}>
                {m&&<img src={m.poster} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block',animation:'simFade .6s ease'}}/>}
              </div>
            );})}
          </div>
          <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg, rgba(6,6,11,0.25) 0%, rgba(6,6,11,0.55) 45%, rgba(6,6,11,0.92) 78%, rgba(6,6,11,0) 100%)'}}/>
          <div style={{position:'relative'}}>
            <div style={{width:36,height:4,borderRadius:2,background:'rgba(255,255,255,0.3)',margin:'10px auto 0'}}/>
            <button onClick={onClose} aria-label="Close" style={{position:'absolute',top:14,right:0,width:36,height:36,borderRadius:'50%',...glass,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="close" size={14} color="#fff"/></button>
            <div style={{display:'flex',alignItems:'flex-end',gap:14,marginTop:96}}>
              {movie?.poster&&<div style={{width:54,aspectRatio:'2/3',borderRadius:3,overflow:'hidden',flexShrink:0,boxShadow:'0 8px 24px rgba(0,0,0,0.5)'}}><img src={movie.poster} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/></div>}
              <div style={{minWidth:0,paddingBottom:2}}>
                <div style={{fontSize:10.5,letterSpacing:2.2,textTransform:'uppercase',fontWeight:700,color:accent}}>Because you liked</div>
                <div style={{fontFamily:T.serif,fontWeight:700,fontSize:26,letterSpacing:'-0.02em',lineHeight:1.08,color:'#fff',marginTop:5,textShadow:'0 2px 18px rgba(0,0,0,0.6)',overflow:'hidden',textOverflow:'ellipsis',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{movie?.title}</div>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginTop:14}}>
              <div style={{flex:1,minWidth:0,display:'flex',gap:6,overflowX:'auto',scrollbarWidth:'none',WebkitMaskImage:'linear-gradient(to right,#000 82%,transparent)',maskImage:'linear-gradient(to right,#000 82%,transparent)',paddingRight:18}}>
                {(source?.keywords||[]).slice(0,3).map(k=>(<span key={k} style={{...glass,flexShrink:0,borderRadius:14,padding:'5px 11px',fontSize:11.5,fontWeight:600,color:'rgba(255,255,255,0.85)',textTransform:'capitalize',whiteSpace:'nowrap'}}>{k}</span>))}
              </div>
              {!loading&&items.length>0&&onScrollAll&&(
                <button onClick={()=>{onScrollAll(items);onClose();}} style={{flexShrink:0,height:36,display:'flex',alignItems:'center',gap:7,...glass,borderRadius:18,padding:'0 15px',color:'#fff',fontSize:12.5,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  <SvgIcon name="play" size={12} color="#fff" filled/>Play all
                </button>
              )}
            </div>
          </div>
        </div>

        {loading&&(
          <div style={{padding:'0 20px 24px'}}>
            {[0,1,2,3,4].map(i=>(
              <div key={i} style={{display:'flex',gap:14,padding:'12px 0',borderTop:`1px solid ${T.hairline}`}}>
                <div style={{width:56,aspectRatio:'2/3',borderRadius:3,...shimmer}}/>
                <div style={{flex:1,display:'flex',flexDirection:'column',gap:8,justifyContent:'center'}}>
                  <div style={{height:13,width:'60%',borderRadius:4,...shimmer}}/><div style={{height:10,width:'40%',borderRadius:4,...shimmer}}/><div style={{height:10,width:'50%',borderRadius:4,...shimmer}}/>
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading&&(err||items.length===0)&&(
          <div style={{textAlign:'center',padding:'40px 24px',display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
            <SvgIcon name="similar" size={28} color={T.text3}/>
            <div style={{fontSize:13,color:T.text,fontWeight:700}}>{err?'Couldn’t load matches':`No close matches for this ${contentLabel==='Series'?'series':'film'} yet`}</div>
            <button onClick={load} style={{marginTop:6,...glass,color:'#fff',borderRadius:999,padding:'8px 18px',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Try again</button>
          </div>
        )}

        {!loading&&items.length>0&&(
          <div style={{padding:'0 20px calc(28px + env(safe-area-inset-bottom))'}}>
            {items.map((m,i)=>{
              const saved=savedIds?.has?.(m.id);
              const reason=[m.matchReason,m.match?`${m.match}% match`:null].filter(Boolean).join(' · ');
              return(
              <div key={m.id} role="button" tabIndex={0} onClick={()=>play(m)} onKeyDown={(e)=>{if(e.key==='Enter')play(m);}}
                style={{display:'flex',alignItems:'center',gap:14,padding:'12px 0',borderTop:`1px solid ${T.hairline}`,cursor:'pointer',animation:`simIn 0.3s ease ${Math.min(i,8)*0.03}s both`}}>
                <div style={{position:'relative',width:56,aspectRatio:'2/3',borderRadius:3,overflow:'hidden',flexShrink:0,background:m.gradient||GRADS[i%GRADS.length]}}>
                  {m.poster&&<img src={m.poster} alt="" loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:T.serif,letterSpacing:'-0.02em',fontWeight:700,fontSize:15,lineHeight:1.2,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.title}</div>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginTop:4,fontSize:11.5,color:T.text2,whiteSpace:'nowrap',overflow:'hidden'}}>
                    {m.year&&<><span>{m.year}</span><span>·</span></>}
                    {m.rating&&<><span style={{display:'inline-flex',alignItems:'center',gap:3}}><SvgIcon name="star" size={10} color="#FFD166" filled/>{m.rating}</span></>}
                    {m.genre?.[0]&&<><span>·</span><span style={{overflow:'hidden',textOverflow:'ellipsis'}}>{m.genre[0]}</span></>}
                  </div>
                  {reason&&<div style={{fontSize:11.5,fontWeight:700,color:accent,marginTop:5,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{reason}</div>}
                </div>
                <button aria-label={saved?'Saved':'Save'} onClick={(e)=>{e.stopPropagation();onSave?.(m);}} style={{background:'none',border:'none',padding:8,marginRight:-8,cursor:'pointer',display:'flex',flexShrink:0}}><SvgIcon name="bookmark" size={19} color={saved?accent:'rgba(255,255,255,0.7)'} filled={saved}/></button>
              </div>
            );})}
          </div>
        )}
      </div>
    </div></>
  );
}
