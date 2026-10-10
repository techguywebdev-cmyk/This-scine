'use client';
import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import ImportSheet from '../ImportSheet';
import { AddToListSheet, CreateListSheet, FolderCover, FolderCoverFill, SvgIcon, T, Toast, ambient } from './shared';

// WATCHLIST — everything you've saved, organised into folders (private by default, public when you choose).
// Replaces the old Community Lists screen; public folders are what lists used to be.
export const STARTER_FOLDERS = ['Date night', 'Weekend binge'];
export function ListsScreen({onClose,accent,onWatchTrailer,onSave,watchlistIds,watchlist=[],onMarkWatched,onOpenList,openListId,onOpenArcs}){
  const{isSignedIn}=useUser();
  const[tab,setTab]=useState('mine'); // mine | following | trending
  const[lists,setLists]=useState([]);
  const[loading,setLoading]=useState(true);
  const[showCreate,setShowCreate]=useState(false);
  const[filingMovie,setFilingMovie]=useState(null);
  const[view,setView]=useState('home'); // home | all
  const[allFilter,setAllFilter]=useState('towatch');
  const[toast,setToast]=useState(null);
  const[menuFor,setMenuFor]=useState(null);
  const[wallPosters,setWallPosters]=useState([]);
  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(null),2600);};
  // Header poster wall: your own saves first, trending as a fallback; reshuffled every visit
  useEffect(()=>{
    const mine=(watchlist||[]).map(m=>m.poster).filter(Boolean);
    const shuffle=a=>{const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]];}return x;};
    if(mine.length>=5){setWallPosters(shuffle(mine).slice(0,5));return;}
    fetch('/api/movies?popular=1').then(r=>r.json()).then(d=>{const pop=(d.movies||[]).map(m=>m.poster).filter(Boolean);setWallPosters([...shuffle(mine),...shuffle(pop)].slice(0,5));}).catch(()=>setWallPosters(mine.slice(0,5)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const fetchLists=useCallback(async(t)=>{
    setLoading(true);
    try{
      const res=await fetch(`/api/lists?tab=${t}`);
      const data=await res.json();
      let got=data.lists||[];
      // First visit: give people two empty starter folders so the idea is obvious
      if(t==='mine'&&isSignedIn&&got.length===0){
        let done=false;try{done=localStorage.getItem('cine_starter_folders')==='1';}catch{}
        if(!done){
          try{localStorage.setItem('cine_starter_folders','1');}catch{}
          const made=await Promise.all(STARTER_FOLDERS.map(title=>fetch('/api/lists',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,is_public:false})}).then(r=>r.json()).catch(()=>null)));
          got=made.filter(m=>m&&m.list).map(m=>({...m.list,is_public:false,movie_count:0,posters:[]}));
        }
      }
      setLists(got);
    }catch{}
    setLoading(false);
  },[isSignedIn]);

  useEffect(()=>{fetchLists(tab);},[tab,fetchLists]);
  // Refresh folder covers/counts when coming back from a folder
  useEffect(()=>{if(!openListId&&tab==='mine')fetchLists('mine');},[openListId]);

  const saved=watchlist||[];
  const toWatch=saved.filter(m=>!m.watched);
  const watchedList=saved.filter(m=>m.watched);
  const asMovie=(m)=>({id:m.movie_id,title:m.title,poster:m.poster,backdrop:m.backdrop,year:m.year,rating:m.rating,accent:m.accent||accent,overview:m.overview,genre:m.genre,isTV:!!m.is_tv,mediaType:m.is_tv?'tv':'movie'});

  const Tabs=()=>(
    <div style={{display:'flex',gap:24,borderBottom:`1px solid ${T.hairline}`,marginTop:16}}>
      {[['mine','My watchlist'],['following','Following'],['trending','Popular folders']].map(([t,label])=>(
        <button key={t} onClick={()=>{setTab(t);setView('home');}} style={{background:'none',border:'none',borderBottom:`2px solid ${tab===t?accent:'transparent'}`,marginBottom:-1,padding:'0 0 11px',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:tab===t?700:500,color:tab===t?accent:'rgba(255,255,255,0.5)',whiteSpace:'nowrap'}}>{label}</button>
      ))}
    </div>
  );
  const Label=({children,right})=>(
    <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',margin:'26px 0 10px'}}>
      <span style={{fontSize:10.5,letterSpacing:2.2,textTransform:'uppercase',fontWeight:700,color:accent}}>{children}</span>{right}
    </div>
  );
  const Spinner=()=>(<div style={{display:'flex',justifyContent:'center',padding:32}}><div style={{width:22,height:22,border:'2px solid rgba(255,255,255,0.1)',borderTop:`2px solid ${accent}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/></div>);

  const SavedRow=({m})=>(
    <div style={{display:'flex',gap:14,padding:'14px 0',borderTop:`1px solid ${T.hairline}`}}>
      <div role="button" tabIndex={0} onClick={()=>onWatchTrailer(asMovie(m))} style={{width:58,aspectRatio:'2/3',borderRadius:3,overflow:'hidden',flexShrink:0,background:m.gradient||T.surface,cursor:'pointer'}}>
        {m.poster&&<img src={m.poster} alt="" loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',display:'block',opacity:m.watched?0.55:1}}/>}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontFamily:T.serif,letterSpacing:'-0.02em',fontSize:14,fontWeight:700,color:m.watched?'rgba(255,255,255,0.6)':'#fff',lineHeight:1.25,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.title}</div>
        <div style={{display:'flex',alignItems:'center',gap:6,marginTop:3,fontSize:11,color:T.text2}}>
          {m.year&&<span>{m.year}</span>}
          {m.rating&&m.rating!=='N/A'&&<><span>·</span><SvgIcon name="star" size={10} color="#FFD166" filled/><span style={{color:'rgba(255,255,255,0.85)'}}>{m.rating}</span></>}
          {m.is_tv&&<><span>·</span><span>Series</span></>}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:18,marginTop:10}}>
          <button onClick={()=>onWatchTrailer(asMovie(m))} style={{display:'inline-flex',alignItems:'center',gap:5,background:'none',border:'none',padding:0,cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,color:'#fff'}}><SvgIcon name="play" size={11} color="#fff" filled/>Trailer</button>
          <button onClick={()=>setFilingMovie(asMovie(m))} style={{display:'inline-flex',alignItems:'center',gap:5,background:'none',border:'none',padding:0,cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.75)'}}><SvgIcon name="folder" size={14} color="rgba(255,255,255,0.75)"/>Folder</button>
          <button onClick={()=>onMarkWatched&&onMarkWatched(asMovie(m))} style={{display:'inline-flex',alignItems:'center',gap:5,background:'none',border:'none',padding:0,cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,color:m.watched?accent:'rgba(255,255,255,0.75)'}}><SvgIcon name="check" size={14} color={m.watched?accent:'rgba(255,255,255,0.75)'}/>{m.watched?'Watched':'Mark watched'}</button>
        </div>
      </div>
    </div>
  );

  const FolderTile=({title,sub,posters,locked,onClick,dashed,count})=>(
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={e=>e.key==='Enter'&&onClick()} style={{cursor:'pointer',minWidth:0}}>
      {dashed?(
        <div style={{position:'relative',width:'100%',aspectRatio:'5/6'}}>
          <div style={{position:'absolute',left:0,top:0,width:'40%',height:'10%',borderRadius:'10px 10px 0 0',border:`1.5px dashed ${accent}77`,borderBottom:'none'}}/>
          <div style={{position:'absolute',left:0,right:0,top:'7%',bottom:0,borderRadius:12,border:`1.5px dashed ${accent}77`,display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="plus" size={18} color={accent}/></div>
        </div>
      ):(
        <FolderCoverFill posters={posters} accent={accent} locked={locked} count={count}/>
      )}
      <div style={{fontSize:12,fontWeight:700,color:dashed?accent:'#fff',marginTop:7,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{title}</div>
      {sub&&<div style={{fontSize:11,color:T.text2,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sub}</div>}
    </div>
  );

  const PublicTile=({l})=>(
    <div role="button" tabIndex={0} onClick={()=>onOpenList&&onOpenList(l.id)} onKeyDown={e=>e.key==='Enter'&&onOpenList&&onOpenList(l.id)} style={{cursor:'pointer',minWidth:0}}>
      <FolderCoverFill posters={l.cover_url?[l.cover_url]:(l.posters?.length?l.posters:(l.cover_poster?[l.cover_poster]:[]))} accent={accent} count={l.movie_count||0}/>
      <div style={{display:'flex',alignItems:'center',gap:6,marginTop:9}}>
        <div style={{flex:1,minWidth:0,fontSize:12,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.title}</div>
        {l.avg_rating!=null&&<span style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:11,fontWeight:700,color:'#fff',flexShrink:0}}><SvgIcon name="star" size={10} color="#FFD166" filled/>{l.avg_rating}</span>}
      </div>
      <div style={{fontSize:11,color:T.text2,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>by {l.display_name||l.username}{l.follower_count?` · ${l.follower_count} following`:''}</div>
    </div>
  );

  const PublicRow=({l})=>(
    <div role="button" tabIndex={0} onClick={()=>onOpenList&&onOpenList(l.id)} onKeyDown={e=>e.key==='Enter'&&onOpenList&&onOpenList(l.id)} style={{display:'flex',gap:14,alignItems:'center',padding:'13px 0',borderTop:`1px solid ${T.hairline}`,cursor:'pointer'}}>
      <FolderCover posters={l.posters?.length?l.posters:(l.cover_poster?[l.cover_poster]:[])} accent={accent} size={60}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontFamily:T.serif,letterSpacing:'-0.02em',fontSize:14,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.title}</div>
        <div style={{fontSize:11,color:T.text2,marginTop:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>by {l.display_name||l.username} · {l.movie_count||0} titles{l.follower_count?` · ${l.follower_count} following`:''}</div>
        {l.description&&<div style={{fontSize:12,color:'rgba(255,255,255,0.58)',marginTop:4,lineHeight:1.4,display:'-webkit-box',WebkitLineClamp:1,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{l.description}</div>}
      </div>
      {l.avg_rating!=null&&<span style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:12,fontWeight:700,color:'#fff',flexShrink:0}}><SvgIcon name="star" size={11} color="#FFD166" filled/>{l.avg_rating}</span>}
    </div>
  );

  const shown=[...(allFilter==='towatch'?toWatch:watchedList)].sort((a,b)=>(b.saved_at||0)-(a.saved_at||0));
  const glassBtn={background:'rgba(0,0,0,0.35)',backdropFilter:'blur(10px)',WebkitBackdropFilter:'blur(10px)',border:'none',borderRadius:'50%',width:36,height:36,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'};
  const section={display:'flex',alignItems:'baseline',justifyContent:'space-between',margin:'26px 0 12px'};
  const sectionLabel={fontSize:10.5,letterSpacing:2.2,textTransform:'uppercase',fontWeight:700,color:accent};

  const SimpleFolder=({title,posters,locked,count,onClick})=>(
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={e=>e.key==='Enter'&&onClick()} style={{cursor:'pointer',minWidth:0}}>
      <FolderCoverFill posters={posters} accent={accent} locked={locked} count={count}/>
      <div style={{fontSize:12,fontWeight:600,color:'#fff',marginTop:7,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{title}</div>
    </div>
  );

  return(
    <div style={{position:'fixed',inset:0,zIndex:120,background:ambient(accent),display:'flex',flexDirection:'column',animation:'playerSlideUp 0.38s cubic-bezier(0.22,1,0.36,1)',visibility:openListId?'hidden':'visible'}}>
      <style>{`@keyframes playerSlideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
      {toast&&<Toast message={toast} accent={accent}/>}
      {showCreate&&<CreateListSheet onClose={()=>setShowCreate(false)} accent={accent} onCreated={(l)=>{showToast(`Created ${l?.title||'folder'}`);fetchLists('mine');}}/>}
      {filingMovie&&<AddToListSheet movie={filingMovie} onClose={()=>{setFilingMovie(null);fetchLists('mine');}} accent={accent} isSaved={watchlistIds?.has(filingMovie.id)} onEnsureSaved={onSave}/>}
      {menuFor&&(
        <div onClick={()=>setMenuFor(null)} style={{position:'fixed',inset:0,zIndex:140,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(6px)',WebkitBackdropFilter:'blur(6px)',display:'flex',alignItems:'flex-end',animation:'fadeIn .2s ease'}}>
          <div onClick={e=>e.stopPropagation()} style={{width:'100%',background:ambient(accent),borderRadius:'20px 20px 0 0',border:`1px solid ${T.hairline}`,borderBottom:'none',padding:'14px 20px calc(18px + env(safe-area-inset-bottom))',animation:'playerSlideUp .28s cubic-bezier(0.22,1,0.36,1)'}}>
            <div style={{width:34,height:4,borderRadius:2,background:'rgba(255,255,255,0.25)',margin:'0 auto 14px'}}/>
            <div style={{display:'flex',gap:12,alignItems:'center',paddingBottom:12,borderBottom:`1px solid ${T.hairline}`}}>
              <div style={{width:40,aspectRatio:'2/3',borderRadius:3,overflow:'hidden',background:T.surface,flexShrink:0}}>{menuFor.poster&&<img src={menuFor.poster} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>}</div>
              <div style={{minWidth:0}}>
                <div style={{fontSize:14,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{menuFor.title}</div>
                <div style={{fontSize:11.5,color:T.text2,marginTop:2}}>{[menuFor.year,menuFor.is_tv?'Series':null].filter(Boolean).join(' · ')}</div>
              </div>
            </div>
            {[
              ['play','Watch trailer',()=>onWatchTrailer(asMovie(menuFor))],
              ['folder','Add to folder',()=>setFilingMovie(asMovie(menuFor))],
              ['check',menuFor.watched?'Mark as not watched':'Mark as watched',()=>onMarkWatched&&onMarkWatched(asMovie(menuFor))],
            ].map(([ic,l,fn])=>(
              <button key={l} onClick={()=>{const f=fn;setMenuFor(null);f();}} style={{display:'flex',alignItems:'center',gap:14,width:'100%',background:'none',border:'none',borderBottom:`1px solid ${T.hairline}`,padding:'15px 0',cursor:'pointer',fontFamily:'inherit',fontSize:14,fontWeight:600,color:'#fff',textAlign:'left'}}>
                <SvgIcon name={ic} size={17} color={accent} filled={ic==='play'}/>{l}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Header — poster wall like Friends */}
      <div style={{position:'relative',padding:'max(18px, env(safe-area-inset-top)) 20px 0',flexShrink:0}}>
        <div aria-hidden="true" style={{position:'absolute',left:0,right:0,top:0,height:'calc(190px + env(safe-area-inset-top))',overflow:'hidden',pointerEvents:'none',WebkitMaskImage:'linear-gradient(to bottom,#000 55%,transparent 100%)',maskImage:'linear-gradient(to bottom,#000 55%,transparent 100%)'}}>
          <div style={{position:'absolute',left:-18,right:-18,top:-34,display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:6,transform:'rotate(-4deg)'}}>
            {(wallPosters.length?wallPosters:Array(5).fill(null)).map((src,i)=>(
              <div key={i} style={{aspectRatio:'2/3',borderRadius:4,overflow:'hidden',background:'rgba(255,255,255,0.05)',transform:`translateY(${i%2?22:0}px)`}}>
                {src&&<img src={src} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block',animation:'fadeIn .6s ease'}}/>}
              </div>
            ))}
          </div>
          <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg, rgba(6,6,11,0.35) 0%, rgba(6,6,11,0.1) 40%, rgba(6,6,11,0.55) 100%)'}}/>
        </div>
        <div style={{position:'relative',display:'flex',alignItems:'center'}}>
          <button onClick={onClose} aria-label="Back" style={{...glassBtn,marginLeft:-4}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div style={{flex:1}}/>
          {isSignedIn&&tab==='mine'&&<button onClick={()=>setShowCreate(true)} aria-label="New folder" style={glassBtn}><SvgIcon name="plus" size={18} color="#fff"/></button>}
        </div>
        <h1 style={{position:'relative',fontFamily:T.serif,fontSize:26,letterSpacing:'-0.02em',fontWeight:800,color:'#fff',margin:'78px 0 0',textShadow:'0 2px 18px rgba(0,0,0,0.6)'}}>Watchlist</h1>
        <div style={{position:'relative',fontSize:12,color:T.text2,marginTop:2}}>
          <b style={{color:'#fff'}}>{toWatch.length}</b> to watch<span style={{margin:'0 8px'}}>·</span><b style={{color:'#fff'}}>{watchedList.length}</b> watched
        </div>
        <div style={{position:'relative',display:'flex',gap:24,marginTop:16,borderBottom:`1px solid ${T.hairline}`}}>
          {[['mine','Mine'],['following','Following'],['trending','Popular']].map(([t,label])=>(
            <button key={t} onClick={()=>setTab(t)} style={{background:'none',border:'none',borderBottom:`2px solid ${tab===t?accent:'transparent'}`,marginBottom:-1,padding:'0 0 11px',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:tab===t?700:500,color:tab===t?accent:'rgba(255,255,255,0.5)'}}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',scrollbarWidth:'none',padding:'0 20px calc(40px + env(safe-area-inset-bottom))'}}>
        {!isSignedIn?(
          <div style={{padding:'40px 0'}}>
            <div style={{fontFamily:T.serif,letterSpacing:'-0.02em',fontSize:16,fontWeight:700,color:'#fff'}}>Your watchlist lives here</div>
            <div style={{fontSize:12.5,color:T.text2,marginTop:6,lineHeight:1.5}}>Sign in to save films and sort them into folders.</div>
          </div>
        ):tab==='mine'?(
          <>
            {/* Folders */}
            <div style={section}><span style={sectionLabel}>Folders</span></div>
            {loading?<Spinner/>:(
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'18px 12px'}}>
                {lists.map(l=>(
                  <SimpleFolder key={l.id} title={l.title} count={l.movie_count||0} posters={l.cover_url?[l.cover_url]:(l.posters||[])} locked={l.is_public===false} onClick={()=>onOpenList&&onOpenList(l.id)}/>
                ))}
                <div role="button" tabIndex={0} onClick={()=>setShowCreate(true)} style={{cursor:'pointer',minWidth:0}}>
                  <div style={{position:'relative',width:'100%',aspectRatio:'5/6'}}>
                    <div style={{position:'absolute',left:0,right:0,top:'7%',bottom:0,borderRadius:12,border:`1.5px dashed ${accent}66`,display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="plus" size={18} color={accent}/></div>
                  </div>
                  <div style={{fontSize:12,fontWeight:600,color:accent,marginTop:7}}>New folder</div>
                </div>
              </div>
            )}

            {/* Saved titles */}
            <div style={section}>
              <span style={sectionLabel}>Saved</span>
              <div style={{display:'flex',gap:14}}>
                {[['towatch','To watch'],['watched','Watched']].map(([t,l])=>(
                  <button key={t} onClick={()=>setAllFilter(t)} style={{background:'none',border:'none',padding:0,cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,color:allFilter===t?'#fff':'rgba(255,255,255,0.4)'}}>{l}</button>
                ))}
              </div>
            </div>
            {shown.length===0?(
              <div style={{padding:'4px 0'}}><div style={{fontSize:12.5,color:T.text2,lineHeight:1.5}}>{allFilter==='towatch'?'Tap Save on any film in your feed and it lands here.':'Films you mark as watched show up here.'}</div><button onClick={()=>window.dispatchEvent(new CustomEvent('cine:open-import'))} style={{marginTop:10,background:'none',border:'none',padding:0,cursor:'pointer',fontFamily:'inherit',fontSize:12.5,fontWeight:700,color:'#fff',display:'inline-flex',alignItems:'center',gap:6}}><SvgIcon name="plus" size={12} color="#fff"/>Import from Letterboxd or IMDb</button></div>
            ):(
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px 10px'}}>
                {shown.map(m=>(
                  <div key={m.movie_id} style={{position:'relative',minWidth:0}}>
                    <button onClick={()=>onWatchTrailer(asMovie(m))} aria-label={m.title} style={{display:'block',width:'100%',aspectRatio:'2/3',borderRadius:3,overflow:'hidden',background:m.gradient||T.surface,border:'none',padding:0,cursor:'pointer'}}>
                      {m.poster&&<img src={m.poster} alt="" loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',display:'block',opacity:m.watched?0.6:1}}/>}
                    </button>
                    <button onClick={e=>{e.stopPropagation();setMenuFor(m);}} aria-label="More" style={{position:'absolute',top:5,right:5,width:26,height:26,borderRadius:'50%',background:'rgba(0,0,0,0.55)',backdropFilter:'blur(6px)',WebkitBackdropFilter:'blur(6px)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <SvgIcon name="dots" size={13} color="#fff"/>
                    </button>
                    <div style={{fontSize:11.5,fontWeight:600,color:m.watched?'rgba(255,255,255,0.55)':'#fff',marginTop:6,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.title}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        ):(
          <>
            {loading?<Spinner/>:lists.length===0?(
              <div style={{padding:'28px 0'}}>
                <div style={{fontSize:13,fontWeight:700,color:'#fff'}}>{tab==='following'?'No folders followed yet':'No public folders yet'}</div>
                <div style={{fontSize:12,color:T.text2,marginTop:4,lineHeight:1.5}}>{tab==='following'?'Follow a public folder and it shows up here.':'Make one of yours public to be the first.'}</div>
              </div>
            ):(
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'18px 12px',paddingTop:20}}>
                {lists.map(l=>(
                  <div key={l.id} role="button" tabIndex={0} onClick={()=>onOpenList&&onOpenList(l.id)} style={{cursor:'pointer',minWidth:0}}>
                    <FolderCoverFill posters={l.cover_url?[l.cover_url]:(l.posters?.length?l.posters:(l.cover_poster?[l.cover_poster]:[]))} accent={accent} count={l.movie_count||0}/>
                    <div style={{fontSize:12,fontWeight:600,color:'#fff',marginTop:7,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.title}</div>
                    <div style={{fontSize:10.5,color:T.text3,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.display_name||l.username}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
