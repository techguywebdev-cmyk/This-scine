'use client';
import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import ImportSheet from '../ImportSheet';
import { SvgIcon, T, ambient, statusBg } from './shared';

// ── Status (24h stories): text or photo/video, friends react & reply into DMs ──
export const STATUS_BGS=['#F5A623','#818CF8','#2DD4BF','#FF6B8A','#A3E635','#B07FEF','#38BDF8','#E6E6EA'];
export const statusAgo=(ts)=>{const m=Math.floor((Date.now()-new Date(ts))/60000);if(m<1)return'just now';if(m<60)return`${m}m ago`;return`${Math.floor(m/60)}h ago`;};
// Editor vocab — saved in statuses.meta and replayed by the viewer
export const STATUS_FONTS={serif:['Serif',T.serif,700,false],sans:['Modern','inherit',800,false],mono:['Type','ui-monospace, SFMono-Regular, Menlo, monospace',600,false],classic:['Classic',T.serif,500,true]};
export const STATUS_TEXT_COLORS=['#FFFFFF','#07070F','#F5A623','#FF6B8A','#2DD4BF','#818CF8','#A3E635'];
export const STATUS_FILTERS=[['none','Normal',''],['vivid','Vivid','saturate(1.45) contrast(1.08)'],['warm','Warm','sepia(0.28) saturate(1.25) hue-rotate(-8deg)'],['cool','Cool','saturate(1.1) hue-rotate(14deg) brightness(1.03)'],['fade','Fade','contrast(0.84) brightness(1.08) saturate(0.78)'],['mono','Mono','grayscale(1) contrast(1.1)'],['noir','Noir','grayscale(1) contrast(1.45) brightness(0.9)']];
export const statusFilterCss=(preset,adj={})=>{const p=(STATUS_FILTERS.find(f=>f[0]===preset)||STATUS_FILTERS[0])[2];const parts=[p];if(adj.b&&adj.b!==1)parts.push(`brightness(${adj.b})`);if(adj.c&&adj.c!==1)parts.push(`contrast(${adj.c})`);if(adj.s&&adj.s!==1)parts.push(`saturate(${adj.s})`);return parts.filter(Boolean).join(' ');};
export const safeFilter=(f)=>typeof f==='string'&&/^[a-z0-9().,\s%-]{0,240}$/i.test(f)?f:'';
export function statusTextCss(t,{len=0,overlay=false}={}){
  t=t||{};const f=STATUS_FONTS[t.font]||STATUS_FONTS.serif;
  const sz=Math.min(2.5,Math.max(0.5,Number(t.size)||1));
  const color=STATUS_TEXT_COLORS.includes(t.color)?t.color:'#FFFFFF';
  const base=len>140?22:len>60?28:34;
  return{fontFamily:f[1],fontWeight:f[2],fontStyle:f[3]?'italic':'normal',textAlign:['left','right'].includes(t.align)?t.align:'center',fontSize:overlay?`${(6.2*sz).toFixed(2)}cqw`:Math.round(base*sz),lineHeight:1.25,letterSpacing:t.font==='mono'?'0':'-0.02em',color,textShadow:color==='#07070F'?'none':'0 2px 18px rgba(0,0,0,0.35)',whiteSpace:'pre-wrap',wordBreak:'break-word'};
}
export function StatusOverlayText({ov,text}){
  const css=statusTextCss(ov,{overlay:true});const box=ov?.style==='box';const dark=css.color==='#07070F';
  return(
    <div style={{...css,textShadow:box||dark?'none':'0 1px 12px rgba(0,0,0,0.75)',color:box?(dark?'#fff':'#07070F'):css.color}}>
      {box?<span style={{background:css.color,padding:'0.06em 0.32em',borderRadius:'0.22em',boxDecorationBreak:'clone',WebkitBoxDecorationBreak:'clone',lineHeight:1.5}}>{text}</span>:text}
    </div>
  );
}
export let _canvasFilterOk;
export const canvasFilterOk=()=>{if(_canvasFilterOk!==undefined)return _canvasFilterOk;try{const c=document.createElement('canvas');c.width=c.height=1;const x=c.getContext('2d');x.filter='grayscale(1)';x.fillStyle='#f00';x.fillRect(0,0,1,1);const d=x.getImageData(0,0,1,1).data;_canvasFilterOk=Math.abs(d[0]-d[1])<12;}catch{_canvasFilterOk=false;}return _canvasFilterOk;};
export const IMG_FRAMES=[['fit','Original',null],['9:16','Story',9/16],['4:5','Portrait',4/5],['1:1','Square',1]];
export const VID_FRAMES=[['fit','Original',null],['fill','Fill',9/16]];
export const EDIT0={frame:'fit',zoom:1,rot:0,nx:0,ny:0,filter:'none',adj:{b:1,c:1,s:1}};
export const OV0={x:0.5,y:0.8,font:'sans',align:'center',color:'#FFFFFF',size:1,style:'plain'};
export const statusBackdrop=(item,accent)=>item.kind==='text'?(item.meta?.bgStyle==='ambient'?ambient(item.bg||accent):statusBg(item.bg||accent)):'#000';
// Renders a status exactly as friends see it — shared by the viewer and the composer's preview screen
export function StatusContent({item,videoRef,onTimeUpdate,onEnded,muted=false,loop=false}){
  if(item.kind==='text')return <div style={{padding:'0 28px',maxWidth:560,width:'100%',boxSizing:'border-box',...statusTextCss(item.meta?.text,{len:(item.text||'').length})}}>{item.text}</div>;
  const m=item.meta||{};const ar=Number(m.ar)>0.2&&Number(m.ar)<5?Number(m.ar):null;const f=safeFilter(m.filter)||undefined;
  const el=item.kind==='video'
    ?<video key={item.id||item.media_url} ref={videoRef} src={item.media_url} autoPlay playsInline muted={muted} loop={loop} onTimeUpdate={onTimeUpdate} onEnded={onEnded} style={{width:'100%',height:'100%',objectFit:m.fit==='cover'?'cover':'contain',filter:f}}/>
    :<img key={item.id||item.media_url} src={item.media_url} alt="" style={{width:'100%',height:'100%',objectFit:'contain',filter:f}}/>;
  if(!ar)return el;
  return(
    <div style={{position:'relative',width:`min(100vw, calc(100dvh * ${ar}))`,aspectRatio:String(ar),maxHeight:'100%',overflow:'hidden',containerType:'inline-size'}}>
      {el}
      {m.overlay&&item.text&&(
        <div style={{position:'absolute',left:`${(Number(m.overlay.x)||0.5)*100}%`,top:`${(Number(m.overlay.y)||0.8)*100}%`,transform:'translate(-50%,-50%)',maxWidth:'88%',width:'max-content',padding:4,pointerEvents:'none'}}>
          <StatusOverlayText ov={m.overlay} text={item.text}/>
        </div>
      )}
    </div>
  );
}
export const uploadWithProgress=(form,onP)=>new Promise((res,rej)=>{
  const x=new XMLHttpRequest();x.open('POST','/api/upload-chat-media');
  x.upload.onprogress=(e)=>{if(e.lengthComputable)onP(e.loaded/e.total);};
  x.onload=()=>{let d={};try{d=JSON.parse(x.responseText);}catch{}if(x.status<300&&d.url)res(d);else rej(new Error(d.error||'Upload failed'));};
  x.onerror=()=>rej(new Error('Network error — check your connection and try again'));
  x.send(form);
});
export const UploadIcon=({color='#fff'})=>(<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V4"/><path d="m7 9 5-5 5 5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>);
export const RotateIcon=({color='#fff'})=>(<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>);
export const AlignIcon=({align,color='#fff'})=>(<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round"><path d="M4 6h16"/>{align==='left'?<><path d="M4 12h10"/><path d="M4 18h13"/></>:align==='right'?<><path d="M10 12h10"/><path d="M7 18h13"/></>:<><path d="M7 12h10"/><path d="M5.5 18h13"/></>}</svg>);
export function EdChip({on,onClick,children,accent,style}){
  return <button onClick={onClick} style={{flexShrink:0,border:'none',borderRadius:16,height:32,padding:'0 13px',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,background:on?'#fff':'rgba(255,255,255,0.1)',color:on?'#07070F':'rgba(255,255,255,0.8)',display:'flex',alignItems:'center',gap:6,...style}}>{children}</button>;
}
export function EdSlider({label,value,min,max,step=0.01,onChange,accent,fmt}){
  return(
    <label style={{display:'flex',alignItems:'center',gap:12,fontSize:11.5,fontWeight:700,color:'rgba(255,255,255,0.75)'}}>
      <span style={{width:74,flexShrink:0}}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(parseFloat(e.target.value))} style={{flex:1,accentColor:accent}}/>
      <span style={{width:38,textAlign:'right',fontVariantNumeric:'tabular-nums',color:'#fff'}}>{fmt?fmt(value):value}</span>
    </label>
  );
}
export function TextStyleControls({ts,setTs,accent,overlay}){
  const nextAlign={center:'left',left:'right',right:'center'};
  return(
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <div style={{display:'flex',gap:6,overflowX:'auto',scrollbarWidth:'none'}}>
        {Object.entries(STATUS_FONTS).map(([k,f])=>(<EdChip key={k} on={ts.font===k} onClick={()=>setTs({...ts,font:k})} style={{fontFamily:f[1],fontStyle:f[3]?'italic':'normal'}}>{f[0]}</EdChip>))}
        <EdChip on={false} onClick={()=>setTs({...ts,align:nextAlign[ts.align]||'center'})}><AlignIcon align={ts.align}/></EdChip>
        {overlay&&<EdChip on={ts.style==='box'} onClick={()=>setTs({...ts,style:ts.style==='box'?'plain':'box'})}>Highlight</EdChip>}
      </div>
      <div style={{display:'flex',gap:9,alignItems:'center'}}>
        {STATUS_TEXT_COLORS.map(c=>(<button key={c} onClick={()=>setTs({...ts,color:c})} aria-label="Text colour" style={{width:24,height:24,borderRadius:'50%',background:c,border:ts.color===c?'2.5px solid #fff':'2px solid rgba(255,255,255,0.25)',boxShadow:ts.color===c?`0 0 0 2px ${accent}`:'none',cursor:'pointer',padding:0,flexShrink:0}}/>))}
      </div>
      <EdSlider label="Text size" value={ts.size} min={overlay?0.5:0.6} max={overlay?2.5:1.8} onChange={v=>setTs({...ts,size:v})} accent={accent} fmt={v=>`${Math.round(v*100)}%`}/>
    </div>
  );
}
export function StatusComposer({accent,onClose,onPosted}){
  const[mode,setMode]=useState('text');
  const[text,setText]=useState('');
  const[bg,setBg]=useState('ambient'); // 'ambient' = the app's own gradient, or a swatch hex
  const[ts,setTs]=useState({font:'serif',align:'center',color:'#FFFFFF',size:1});
  const[textTool,setTextTool]=useState('bg');
  const[file,setFile]=useState(null);
  const[media,setMedia]=useState(null); // {url,isVideo,isGif,w,h}
  const[edit,setEdit]=useState(EDIT0);
  const[ov,setOv]=useState(OV0);
  const[tool,setTool]=useState('crop');
  const[stage,setStage]=useState({w:0,h:0});
  const[review,setReview]=useState(null); // the finished status, shown full-screen before it uploads
  const[preparing,setPreparing]=useState(false);
  const[progress,setProgress]=useState(null); // null = idle, 0..1 = sharing
  const[done,setDone]=useState(false);
  const[err,setErr]=useState(null);
  const fileRef=useRef(null);
  const stageRef=useRef(null);
  const frameRef=useRef(null);
  const ptrs=useRef(new Map());
  const gesture=useRef(null);
  const editRef=useRef(edit);editRef.current=edit;
  const ovRef=useRef(ov);ovRef.current=ov;

  // the colour everything keys off: the chosen swatch for text statuses, otherwise the app accent
  const ac=mode==='text'&&bg!=='ambient'?bg:accent;
  const backdrop=mode==='text'?(bg==='ambient'?ambient(accent):statusBg(bg)):ambient(accent);

  useEffect(()=>()=>{if(media?.url)URL.revokeObjectURL(media.url);},[media?.url]);
  useEffect(()=>()=>{if(review?.previewUrl)URL.revokeObjectURL(review.previewUrl);},[review?.previewUrl]);
  useEffect(()=>{
    const el=stageRef.current;if(!el)return;
    const ro=new ResizeObserver(([e])=>setStage({w:e.contentRect.width,h:e.contentRect.height}));
    ro.observe(el);return()=>ro.disconnect();
  },[mode,!!media,!!review]);// eslint-disable-line react-hooks/exhaustive-deps

  const pick=(f)=>{
    if(!f)return;if(!/^image\/|^video\//.test(f.type)){setErr('Pick a photo or video');return;}
    setErr(null);const url=URL.createObjectURL(f);const isVideo=f.type.startsWith('video/');
    const fin=(w,h)=>{setFile(f);setMedia({url,isVideo,isGif:f.type==='image/gif',w:w||1080,h:h||1920});setEdit(EDIT0);setTool(isVideo||f.type==='image/gif'?'filter':'crop');setMode('media');};
    if(isVideo){const v=document.createElement('video');v.preload='metadata';v.onloadedmetadata=()=>fin(v.videoWidth,v.videoHeight);v.onerror=()=>fin();v.src=url;}
    else{const im=new Image();im.onload=()=>fin(im.naturalWidth,im.naturalHeight);im.onerror=()=>fin();im.src=url;}
  };

  // ── geometry ──
  const editable=media&&!media.isVideo&&!media.isGif;
  const frames=media?.isVideo?VID_FRAMES:editable?IMG_FRAMES:IMG_FRAMES.slice(0,1);
  const rotated=media&&edit.rot%180!==0;
  const ew=media?(rotated?media.h:media.w):1, eh=media?(rotated?media.w:media.h):1;
  const R=(frames.find(f=>f[0]===edit.frame)?.[2])||ew/eh;
  const FW=Math.max(1,Math.min(stage.w,stage.h*R)), FH=FW/R;
  const clampEdit=(e)=>{
    const ewx=e.rot%180?media.h:media.w, ehx=e.rot%180?media.w:media.h;
    const Rx=(frames.find(f=>f[0]===e.frame)?.[2])||ewx/ehx;
    const z=Math.min(5,Math.max(1,e.zoom));
    const mx=Math.max(0,(Math.max(1,ewx/(ehx*Rx))*z-1)/2), my=Math.max(0,(Math.max(1,ehx*Rx/ewx)*z-1)/2);
    return{...e,zoom:z,nx:Math.max(-mx,Math.min(mx,e.nx)),ny:Math.max(-my,Math.min(my,e.ny))};
  };
  const upd=(patch)=>setEdit(e=>clampEdit({...e,...patch}));
  const S=media?Math.max(FW/ew,FH/eh)*edit.zoom:1;
  const fcss=statusFilterCss(edit.filter,edit.adj);
  const showText=!!text||tool==='text';
  const clampSize=(v)=>Math.min(2.5,Math.max(0.5,v));

  // ── gestures ──
  // One finger drags, two fingers pinch. Touching the text (or working in the Text tab) moves / resizes the
  // text; otherwise it pans / zooms the photo.
  const startGesture=()=>{
    const p=[...ptrs.current.values()];const g=gesture.current;if(!g)return;
    const e=editRef.current,o=ovRef.current;
    if(p.length>=2){const d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)||1;gesture.current={...g,type:'pinch',d,zoom:e.zoom,size:o.size};}
    else if(p.length===1){gesture.current={...g,type:'pan',x:p[0].x,y:p[0].y,nx:e.nx,ny:e.ny,ox:o.x,oy:o.y};}
  };
  const onDown=(e)=>{
    e.currentTarget.setPointerCapture?.(e.pointerId);
    ptrs.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(ptrs.current.size===1){
      const onText=!!e.target.closest?.('[data-ov]');
      const target=showText&&(onText||tool==='text')?'text':editable?'image':null;
      gesture.current=target?{target,onText,moved:false}:null;
    }
    startGesture();
  };
  const onMove=(e)=>{
    if(!ptrs.current.has(e.pointerId)||!gesture.current)return;
    ptrs.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const g=gesture.current;const p=[...ptrs.current.values()];
    if(g.type==='pinch'&&p.length>=2){
      const k=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)/g.d;g.moved=true;
      if(g.target==='text')setOv(o=>({...o,size:clampSize(g.size*k)}));else upd({zoom:g.zoom*k});
    }else if(g.type==='pan'){
      const dx=e.clientX-g.x,dy=e.clientY-g.y;if(Math.abs(dx)+Math.abs(dy)>3)g.moved=true;
      if(g.target==='text')setOv(o=>({...o,x:Math.max(0.06,Math.min(0.94,g.ox+dx/FW)),y:Math.max(0.05,Math.min(0.95,g.oy+dy/FH))}));
      else upd({nx:g.nx+dx/FW,ny:g.ny+dy/FH});
    }
  };
  const onUp=(e)=>{
    ptrs.current.delete(e.pointerId);const g=gesture.current;
    if(!ptrs.current.size){if(g&&g.onText&&!g.moved)setTool('text');gesture.current=null;return;}
    startGesture();
  };
  useEffect(()=>{
    const el=frameRef.current;if(!el)return;
    const wheel=(e)=>{
      e.preventDefault();const k=Math.exp(-e.deltaY*0.0018);
      if(showText&&(tool==='text'||e.target.closest?.('[data-ov]')))setOv(o=>({...o,size:clampSize(o.size*k)}));
      else if(editable)setEdit(ed=>clampEdit({...ed,zoom:ed.zoom*k}));
    };
    el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel);
  });

  // bake the framed photo (crop / zoom / rotate / filter) into a JPEG
  const renderImage=async()=>{
    const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=media.url;});
    const long=Math.min(1600,Math.max(ew,eh));
    const OW=Math.round(R>=1?long:long*R), OH=Math.round(R>=1?long/R:long);
    const c=document.createElement('canvas');c.width=OW;c.height=OH;const ctx=c.getContext('2d');
    ctx.fillStyle='#000';ctx.fillRect(0,0,OW,OH);
    let baked=!fcss;
    if(fcss&&canvasFilterOk()){ctx.filter=fcss;baked=true;}
    const s=Math.max(OW/ew,OH/eh)*edit.zoom;
    ctx.translate(OW/2+edit.nx*OW,OH/2+edit.ny*OH);ctx.rotate(edit.rot*Math.PI/180);
    ctx.drawImage(img,-media.w*s/2,-media.h*s/2,media.w*s,media.h*s);
    const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',0.86));
    if(!blob)throw new Error('Could not process photo');
    return{file:new File([blob],'status.jpg',{type:'image/jpeg'}),ar:OW/OH,baked};
  };

  // Step 1: build the finished status and show it full-screen
  const prepare=async()=>{
    setErr(null);
    try{
      if(mode==='text'){
        if(!text.trim())throw new Error('Write something first');
        setReview({kind:'text',text,bg:bg==='ambient'?accent:bg,meta:{text:ts,...(bg==='ambient'?{bgStyle:'ambient'}:{})}});
        return;
      }
      if(!file||!media)throw new Error('Add a photo or video');
      setPreparing(true);
      const isVideo=media.isVideo;let up=file;const meta={};
      if(editable){const r=await renderImage();up=r.file;meta.ar=r.ar;if(!r.baked&&fcss)meta.filter=fcss;}
      else{meta.ar=R;if(fcss)meta.filter=fcss;if(isVideo&&edit.frame==='fill')meta.fit='cover';}
      if(text.trim())meta.overlay=ov;
      if(up.size>(isVideo?4.4:8)*1024*1024)throw new Error(isVideo?'Videos must be under 4MB — try a shorter clip':'Photo is too large');
      const purl=up===file?media.url:URL.createObjectURL(up);
      setReview({kind:isVideo?'video':'image',text,meta,upload:up,media_url:purl,previewUrl:up===file?null:purl});
    }catch(e){setErr(e.message||'Something went wrong');}
    setPreparing(false);
  };

  // Step 2: upload with progress, then publish
  const share=async()=>{
    if(!review||progress!=null)return;
    setErr(null);setProgress(0.02);
    try{
      let body;
      if(review.kind==='text'){body={kind:'text',text:review.text,bg:review.bg,meta:review.meta};setProgress(0.6);}
      else{
        const form=new FormData();form.append('file',review.upload,review.upload.name||'status');form.append('kind',review.kind);
        const d=await uploadWithProgress(form,(p)=>setProgress(0.02+p*0.88));
        body={kind:review.kind,media_url:d.url,text:review.text,meta:review.meta};
      }
      const r=await fetch('/api/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||'Could not post');
      setProgress(1);setDone(true);
      setTimeout(()=>{onPosted&&onPosted();onClose();},950);
    }catch(e){setErr(e.message||'Could not post');setProgress(null);}
  };

  const mediaTools=editable?[['crop','Crop'],['filter','Filters'],['adjust','Adjust'],['text','Text']]:[...(media?.isVideo?[['crop','Frame']]:[]),['filter','Filters'],['adjust','Adjust'],['text','Text']];
  const glassBtn={width:38,height:38,borderRadius:'50%',background:'rgba(0,0,0,0.35)',backdropFilter:'blur(10px)',WebkitBackdropFilter:'blur(10px)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'};
  const tabBtn=(on)=>({flex:1,border:'none',background:'transparent',cursor:'pointer',fontFamily:'inherit',fontSize:12.5,fontWeight:on?800:600,color:on?'#fff':'rgba(255,255,255,0.45)',padding:'6px 0',transition:'color .2s'});
  // glass pill — same treatment as the app's other floating buttons
  const primaryBtn={display:'flex',alignItems:'center',justifyContent:'center',gap:8,background:'rgba(0,0,0,0.35)',backdropFilter:'blur(14px)',WebkitBackdropFilter:'blur(14px)',border:'1px solid rgba(255,255,255,0.16)',borderRadius:22,height:44,padding:'0 20px',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:700,color:'#fff'};
  const textCss=statusTextCss(ts,{len:text.length});
  const pct=Math.round((progress||0)*100);

  // ── Preview & share screen ──
  if(review){
    const item={...review,id:null};
    return(
      <div style={{position:'fixed',inset:0,zIndex:300,background:statusBackdrop(item,accent),display:'flex',flexDirection:'column',animation:'fadeIn .2s ease'}}>
        <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes popIn{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:scale(1)}}`}</style>
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <StatusContent item={item} muted loop/>
        </div>
        <div style={{position:'relative',display:'flex',alignItems:'center',gap:10,padding:'max(14px, env(safe-area-inset-top)) 16px 10px',background:'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)'}}>
          <button onClick={()=>{if(progress==null){setReview(null);setErr(null);}}} disabled={progress!=null} aria-label="Back to editing" style={{...glassBtn,opacity:progress!=null?0.4:1}}><span style={{display:'flex',transform:'rotate(90deg)'}}><SvgIcon name="chevron" size={15} color="#fff"/></span></button>
          <div style={{flex:1}}>
            <div style={{fontSize:10.5,letterSpacing:2.2,textTransform:'uppercase',fontWeight:700,color:'#fff',opacity:0.85}}>Preview</div>
            <div style={{fontSize:11.5,color:'rgba(255,255,255,0.65)',marginTop:2}}>This is how friends will see it</div>
          </div>
        </div>
        <div style={{flex:1}}/>
        <div style={{position:'relative',padding:'18px 16px calc(16px + env(safe-area-inset-bottom))',background:'linear-gradient(to top, rgba(0,0,0,0.65), transparent)',display:'flex',flexDirection:'column',gap:12,maxWidth:560,width:'100%',margin:'0 auto',boxSizing:'border-box'}}>
          {err&&<div style={{fontSize:12.5,color:'#FF8FA3',textAlign:'center'}}>{err}</div>}
          {progress!=null?(
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,fontWeight:700,color:'#fff'}}>
                <span>{done?'Posted · visible for 24 hours':review.kind==='text'?'Posting…':pct<90?'Uploading…':'Publishing…'}</span>
                <span style={{fontVariantNumeric:'tabular-nums',opacity:0.8}}>{pct}%</span>
              </div>
              <div style={{height:4,borderRadius:2,background:'rgba(255,255,255,0.18)',overflow:'hidden'}}>
                <div style={{height:'100%',width:`${pct}%`,background:'#fff',borderRadius:2,transition:'width .25s ease'}}/>
              </div>
            </div>
          ):(
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{setReview(null);setErr(null);}} style={{...primaryBtn,flex:1,color:'rgba(255,255,255,0.8)'}}>Edit</button>
              <button onClick={share} style={{...primaryBtn,flex:2}}>Share status<SvgIcon name="send" size={14} color="#fff"/></button>
            </div>
          )}
        </div>
        {done&&(
          <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.35)',pointerEvents:'none'}}>
            <div style={{width:76,height:76,borderRadius:'50%',background:'rgba(0,0,0,0.35)',backdropFilter:'blur(14px)',WebkitBackdropFilter:'blur(14px)',border:'1px solid rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',animation:'popIn .45s ease'}}><SvgIcon name="check" size={32} color="#fff"/></div>
          </div>
        )}
      </div>
    );
  }

  return(
    <div style={{position:'fixed',inset:0,zIndex:300,background:backdrop,display:'flex',flexDirection:'column',animation:'fadeIn .2s ease',transition:'background .3s'}}>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
      <input ref={fileRef} type="file" accept="image/*,video/*" style={{display:'none'}} onChange={e=>{pick(e.target.files?.[0]);e.target.value='';}}/>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'max(14px, env(safe-area-inset-top)) 16px 10px'}}>
        <button onClick={onClose} aria-label="Close" style={glassBtn}><SvgIcon name="close" size={15} color="#fff"/></button>
        <div style={{flex:1}}/>
        <div style={{display:'flex',background:'rgba(0,0,0,0.35)',backdropFilter:'blur(10px)',WebkitBackdropFilter:'blur(10px)',borderRadius:20,padding:3}}>
          {[['text','Text'],['media','Photo / Video']].map(([m,l])=>(
            <button key={m} onClick={()=>setMode(m)} style={{border:'none',borderRadius:17,padding:'7px 13px',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,background:mode===m?'#fff':'transparent',color:mode===m?'#07070F':'rgba(255,255,255,0.75)'}}>{l}</button>
          ))}
        </div>
        <div style={{flex:1}}/>
        {mode==='media'&&media?<button onClick={()=>fileRef.current?.click()} aria-label="Change media" style={glassBtn}><SvgIcon name="image" size={16} color="#fff"/></button>:<div style={{width:38}}/>}
      </div>

      {/* stage */}
      <div ref={stageRef} style={{flex:1,minHeight:0,margin:mode==='media'?'4px 16px 0':'0 24px',display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
        {mode==='text'?(
          <textarea autoFocus value={text} onChange={e=>setText(e.target.value.slice(0,700))} placeholder="What are you watching?" style={{width:'100%',maxWidth:520,background:'transparent',border:'none',outline:'none',resize:'none',minHeight:200,...textCss}}/>
        ):media?(
          <div ref={frameRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
            style={{position:'relative',width:FW,height:FH,overflow:'hidden',borderRadius:6,background:'#000',touchAction:'none',userSelect:'none',WebkitUserSelect:'none',WebkitTouchCallout:'none',cursor:editable||showText?'grab':'default',containerType:'inline-size',boxShadow:'0 20px 60px rgba(0,0,0,0.5)'}}>
            {media.isVideo?(
              <video src={media.url} autoPlay loop muted playsInline style={{width:'100%',height:'100%',objectFit:edit.frame==='fill'?'cover':'contain',filter:fcss||undefined,pointerEvents:'none'}}/>
            ):(
              <img src={media.url} alt="" draggable={false} style={{position:'absolute',left:'50%',top:'50%',width:media.w*S,height:media.h*S,maxWidth:'none',transform:`translate(-50%,-50%) translate(${edit.nx*FW}px,${edit.ny*FH}px) rotate(${edit.rot}deg)`,filter:fcss||undefined,pointerEvents:'none',userSelect:'none'}}/>
            )}
            {editable&&tool==='crop'&&(
              <div style={{position:'absolute',inset:0,pointerEvents:'none',backgroundImage:'linear-gradient(rgba(255,255,255,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.22) 1px, transparent 1px)',backgroundSize:'33.333% 33.333%',backgroundPosition:'-1px -1px',boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.5)'}}/>
            )}
            {showText&&(
              <div data-ov="1" style={{position:'absolute',left:`${ov.x*100}%`,top:`${ov.y*100}%`,transform:'translate(-50%,-50%)',maxWidth:'88%',width:'max-content',cursor:'move',padding:4,opacity:text?1:0.6}}>
                <StatusOverlayText ov={ov} text={text||'Your text'}/>
              </div>
            )}
          </div>
        ):(
          <button onClick={()=>fileRef.current?.click()} aria-label="Upload a photo or video" style={{background:'none',border:'none',padding:0,cursor:'pointer',fontFamily:'inherit',color:'#fff',display:'flex',flexDirection:'column',alignItems:'center',gap:14}}>
            <div style={{width:84,height:84,borderRadius:'50%',background:'rgba(0,0,0,0.35)',backdropFilter:'blur(14px)',WebkitBackdropFilter:'blur(14px)',border:'1px solid rgba(255,255,255,0.18)',display:'flex',alignItems:'center',justifyContent:'center'}}><UploadIcon/></div>
            <span style={{fontSize:14,fontWeight:700}}>Upload</span>
            <span style={{fontSize:11.5,color:'rgba(255,255,255,0.55)',marginTop:-8}}>Photo or video · videos up to 4MB</span>
          </button>
        )}
      </div>

      {/* editor panels */}
      <div style={{padding:'10px 16px calc(14px + env(safe-area-inset-bottom))',display:'flex',flexDirection:'column',gap:12,maxWidth:560,width:'100%',margin:'0 auto',boxSizing:'border-box'}}>
        {err&&<div style={{fontSize:12.5,color:'#FF8FA3',textAlign:'center'}}>{err}</div>}
        {mode==='text'?(
          <>
            <div style={{display:'flex'}}>
              {[['bg','Background'],['font','Font & colour']].map(([k,l])=>(<button key={k} onClick={()=>setTextTool(k)} style={tabBtn(textTool===k)}>{l}</button>))}
            </div>
            {textTool==='bg'?(
              <div style={{display:'flex',gap:10,justifyContent:'center',padding:'4px 0',flexWrap:'wrap'}}>
                {['ambient',...STATUS_BGS].map(c=>(<button key={c} onClick={()=>setBg(c)} aria-label={c==='ambient'?'Default background':'Background'} style={{width:28,height:28,borderRadius:'50%',background:c==='ambient'?ambient(accent):c==='#E6E6EA'?'#000':c,border:bg===c?'2.5px solid #fff':'2px solid rgba(255,255,255,0.25)',cursor:'pointer',padding:0}}/>))}
              </div>
            ):<TextStyleControls ts={ts} setTs={setTs} accent={ac}/>}
          </>
        ):media?(
          <>
            <div style={{display:'flex'}}>
              {mediaTools.map(([k,l])=>(<button key={k} onClick={()=>setTool(k)} style={tabBtn(tool===k)}>{l}</button>))}
            </div>
            <div style={{minHeight:142,display:'flex',flexDirection:'column',gap:10,justifyContent:'center'}}>
              {tool==='crop'&&(
                <>
                  <div style={{display:'flex',gap:6,overflowX:'auto',scrollbarWidth:'none'}}>
                    {frames.map(([k,l])=>(<EdChip key={k} on={edit.frame===k} onClick={()=>upd({frame:k,nx:0,ny:0})}>{l}</EdChip>))}
                    {editable&&<EdChip on={false} onClick={()=>upd({rot:(edit.rot+90)%360,nx:0,ny:0})}><RotateIcon/>Rotate</EdChip>}
                    {editable&&(edit.zoom!==1||edit.rot||edit.nx||edit.ny||edit.frame!=='fit')&&<EdChip on={false} onClick={()=>setEdit(e=>({...e,frame:'fit',zoom:1,rot:0,nx:0,ny:0}))}>Reset</EdChip>}
                  </div>
                  {editable&&<EdSlider label="Zoom" value={edit.zoom} min={1} max={5} onChange={v=>upd({zoom:v})} accent={ac} fmt={v=>`${v.toFixed(1)}×`}/>}
                  {editable&&<div style={{fontSize:11,color:'rgba(255,255,255,0.5)',textAlign:'center'}}>Drag to reposition · pinch or scroll to zoom</div>}
                </>
              )}
              {tool==='filter'&&(
                <div style={{display:'flex',gap:10,overflowX:'auto',scrollbarWidth:'none',paddingBottom:2}}>
                  {STATUS_FILTERS.map(([k,l,css])=>(
                    <button key={k} onClick={()=>upd({filter:k})} style={{flexShrink:0,background:'none',border:'none',padding:0,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:6,fontFamily:'inherit'}}>
                      <div style={{width:56,height:70,borderRadius:6,overflow:'hidden',border:edit.filter===k?`2px solid ${ac}`:'2px solid transparent',background:'#111'}}>
                        {media.isVideo?<div style={{width:'100%',height:'100%',background:`linear-gradient(160deg, ${ac}, #222 70%)`,filter:css||undefined}}/>:<img src={media.url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',filter:css||undefined}}/>}
                      </div>
                      <span style={{fontSize:11,fontWeight:700,color:edit.filter===k?'#fff':'rgba(255,255,255,0.6)'}}>{l}</span>
                    </button>
                  ))}
                </div>
              )}
              {tool==='adjust'&&(
                <>
                  {[['b','Brightness'],['c','Contrast'],['s','Saturation']].map(([k,l])=>(
                    <EdSlider key={k} label={l} value={edit.adj[k]} min={0.5} max={1.5} onChange={v=>setEdit(e=>({...e,adj:{...e.adj,[k]:v}}))} accent={ac} fmt={v=>`${v>=1?'+':''}${Math.round((v-1)*100)}`}/>
                  ))}
                </>
              )}
              {tool==='text'&&(
                <>
                  <input value={text} onChange={e=>setText(e.target.value.slice(0,200))} placeholder="Add text…" style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.14)',borderRadius:22,padding:'10px 16px',color:'#fff',fontSize:14,outline:'none',fontFamily:'inherit'}}/>
                  <TextStyleControls ts={ov} setTs={setOv} accent={ac} overlay/>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',textAlign:'center'}}>Hold & drag to move · pinch to resize</div>
                </>
              )}
            </div>
          </>
        ):null}
        {(mode==='text'||media)&&<button onClick={prepare} disabled={preparing} style={{...primaryBtn,alignSelf:'flex-end',opacity:preparing?0.7:1}}>
          {preparing?'Preparing…':'Next'}<span style={{display:'flex',transform:'rotate(-90deg)'}}><SvgIcon name="chevron" size={13} color="#fff"/></span>
        </button>}
      </div>
    </div>
  );
}
export function StatusViewer({people,startIndex=0,accent,onClose,onChanged}){
  const{user}=useUser();
  const[pi,setPi]=useState(startIndex);
  const person=people[pi];
  const firstUnseen=Math.max(0,(person?.items||[]).findIndex(i=>!i.seen));
  const[si,setSi]=useState(person?.isSelf?0:firstUnseen);
  const[paused,setPaused]=useState(false);
  const[progress,setProgress]=useState(0);
  const[reply,setReply]=useState('');
  const[sent,setSent]=useState(null);
  const[viewers,setViewers]=useState(null);
  const videoRef=useRef(null);
  const item=person?.items?.[si];
  const DURATION=item?.kind==='video'?null:6000;

  const next=useCallback(()=>{
    if(!person)return;
    if(si<person.items.length-1){setSi(si+1);return;}
    if(pi<people.length-1){const np=people[pi+1];setPi(pi+1);setSi(np.isSelf?0:Math.max(0,np.items.findIndex(i=>!i.seen)));return;}
    onClose();
  },[si,pi,person,people,onClose]);
  const prev=()=>{if(si>0){setSi(si-1);return;}if(pi>0){setPi(pi-1);setSi(0);}};

  // mark seen
  useEffect(()=>{
    if(!item||person.isSelf||item.seen)return;
    item.seen=true;
    fetch('/api/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({view:item.id})}).then(()=>onChanged&&onChanged()).catch(()=>{});
  },[item?.id]);// eslint-disable-line react-hooks/exhaustive-deps

  // timer for text/photo (video drives its own progress)
  const pausedRef=useRef(false);
  const nextRef=useRef(next);
  nextRef.current=next;
  useEffect(()=>{
    setProgress(0);setSent(null);setViewers(null);
    if(!item||!DURATION)return;
    let elapsed=0;
    const id=setInterval(()=>{
      if(pausedRef.current)return;
      elapsed+=50;
      const p=Math.min(1,elapsed/DURATION);
      setProgress(p);
      if(p>=1){clearInterval(id);nextRef.current();}
    },50);
    return()=>clearInterval(id);
  },[pi,si]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{pausedRef.current=paused;const v=videoRef.current;if(v){paused?v.pause():v.play().catch(()=>{});}},[paused]);

  // Reaction burst: emoji float up from the button, a big one pops in the middle, the button bounces
  const[bursts,setBursts]=useState([]);
  const[bump,setBump]=useState(null);
  const react=(e,ev)=>{
    const r=ev.currentTarget.getBoundingClientRect();
    const id=Date.now()+Math.random();
    const parts=Array.from({length:14},()=>({dx:(Math.random()-0.5)*170,rise:240+Math.random()*280,delay:Math.random()*0.35,size:18+Math.random()*22,rot:(Math.random()-0.5)*60,dur:1.1+Math.random()*0.7}));
    setBursts(b=>[...b.slice(-3),{id,e,x:r.left+r.width/2,y:r.top,parts}]);
    setTimeout(()=>setBursts(b=>b.filter(x=>x.id!==id)),2300);
    setBump({e,k:id});
    try{navigator.vibrate?.(12);}catch{}
    pausedRef.current=true;setTimeout(()=>{pausedRef.current=paused;},1300);
    send(e,true);
  };
  const send=async(textToSend,reaction)=>{
    if(!textToSend.trim()||!person||person.isSelf)return;
    setReply('');setPaused(false);
    await fetch('/api/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({toUserId:person.user_id,msg_type:'status_reply',text:textToSend.trim(),meta:{status_id:item.id,kind:item.kind,text:item.text,media_url:item.media_url,bg:item.bg,reaction:!!reaction}})}).catch(()=>{});
    setSent(reaction?`Sent to ${(person.display_name||person.username||'').split(' ')[0]}`:'Reply sent');
    setTimeout(()=>setSent(null),1600);
  };
  const del=async()=>{
    await fetch('/api/status',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id})}).catch(()=>{});
    onChanged&&onChanged();onClose();
  };
  const loadViewers=async()=>{setPaused(true);const d=await fetch(`/api/status?viewers=${item.id}`,{cache:'no-store'}).then(r=>r.json()).catch(()=>({viewers:[]}));setViewers(d.viewers||[]);};

  if(!person||!item)return null;
  return(
    <div style={{position:'fixed',inset:0,zIndex:320,background:'#000',display:'flex',flexDirection:'column',animation:'fadeIn .2s ease',userSelect:'none'}}>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
      {/* content */}
      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:statusBackdrop(item,accent)}}>
        <StatusContent item={item} videoRef={videoRef} onTimeUpdate={e=>{const v=e.currentTarget;if(v.duration)setProgress(v.currentTime/v.duration);}} onEnded={next}/>
        {item.kind!=='text'&&item.text&&!item.meta?.overlay&&<div style={{position:'absolute',left:16,right:16,bottom:'calc(110px + env(safe-area-inset-bottom))',textAlign:'center',fontSize:15,color:'#fff',fontWeight:600,textShadow:'0 2px 12px rgba(0,0,0,0.8)'}}>{item.text}</div>}
      </div>
      {/* tap zones */}
      <div style={{position:'absolute',inset:'90px 0 140px 0',display:'flex'}} onPointerDown={()=>setPaused(true)} onPointerUp={()=>setPaused(false)} onPointerLeave={()=>setPaused(false)}>
        <div style={{flex:1}} onClick={prev}/><div style={{flex:2}} onClick={next}/>
      </div>
      {/* top: progress + who */}
      <div style={{position:'relative',padding:'max(10px, env(safe-area-inset-top)) 12px 0',background:'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)'}}>
        <div style={{display:'flex',gap:4}}>
          {person.items.map((it,i)=>(
            <div key={it.id} style={{flex:1,height:2.5,borderRadius:2,background:'rgba(255,255,255,0.3)',overflow:'hidden'}}>
              <div style={{height:'100%',background:'#fff',width:i<si?'100%':i===si?`${progress*100}%`:'0%'}}/>
            </div>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10,marginTop:12}}>
          <div style={{width:36,height:36,borderRadius:'50%',overflow:'hidden',background:`${accent}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:accent,flexShrink:0}}>{person.avatar_url?<img src={person.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:(person.display_name||person.username||'U')[0].toUpperCase()}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:700,color:'#fff'}}>{person.isSelf?'Your status':(person.display_name||person.username)}</div>
            <div style={{fontSize:11.5,color:'rgba(255,255,255,0.7)'}}>{statusAgo(item.created_at)}</div>
          </div>
          {person.isSelf&&<button onClick={del} aria-label="Delete" style={{width:36,height:36,borderRadius:'50%',background:'rgba(0,0,0,0.35)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="trash" size={15} color="#fff"/></button>}
          <button onClick={onClose} aria-label="Close" style={{width:36,height:36,borderRadius:'50%',background:'rgba(0,0,0,0.35)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="close" size={15} color="#fff"/></button>
        </div>
      </div>
      <div style={{flex:1}}/>
      {/* bottom */}
      <div style={{position:'relative',padding:'0 14px calc(16px + env(safe-area-inset-bottom))',background:'linear-gradient(to top, rgba(0,0,0,0.6), transparent)'}}>
        {sent&&<div style={{textAlign:'center',fontSize:12.5,fontWeight:700,color:'#fff',marginBottom:10}}>{sent}</div>}
        {person.isSelf?(
          <button onClick={loadViewers} style={{display:'flex',alignItems:'center',gap:8,margin:'0 auto',background:'rgba(255,255,255,0.12)',backdropFilter:'blur(10px)',border:'none',borderRadius:20,height:38,padding:'0 16px',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:700,color:'#fff'}}>
            <SvgIcon name="eye" size={15} color="#fff"/>Seen by {item.views||0}
          </button>
        ):(
          <>
            <div style={{display:'flex',justifyContent:'center',gap:10,marginBottom:12}}>
              {['❤️','😂','😮','🔥','👏','😢'].map(e=>(<button key={bump?.e===e?`${e}-${bump.k}`:e} onClick={(ev)=>react(e,ev)} aria-label={`React ${e}`} style={{width:42,height:42,borderRadius:'50%',background:'rgba(255,255,255,0.12)',backdropFilter:'blur(10px)',WebkitBackdropFilter:'blur(10px)',border:'none',cursor:'pointer',fontSize:21,lineHeight:1,animation:bump?.e===e?'rxBump .5s cubic-bezier(.3,1.6,.5,1)':undefined}}>{e}</button>))}
            </div>
            <div style={{display:'flex',gap:8}}>
              <input value={reply} onChange={e=>setReply(e.target.value)} onFocus={()=>setPaused(true)} onBlur={()=>setPaused(false)} onKeyDown={e=>e.key==='Enter'&&send(reply)} placeholder={`Reply to ${(person.display_name||person.username||'').split(' ')[0]}…`} style={{flex:1,minWidth:0,background:'rgba(255,255,255,0.12)',backdropFilter:'blur(10px)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:24,padding:'12px 16px',color:'#fff',fontSize:14,outline:'none',fontFamily:'inherit'}}/>
              <button onClick={()=>send(reply)} aria-label="Send" style={{width:46,height:46,borderRadius:'50%',background:accent,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><SvgIcon name="send" size={16} color="#07070F"/></button>
            </div>
          </>
        )}
      </div>
      {bursts.length>0&&(
        <div style={{position:'absolute',inset:0,zIndex:3,pointerEvents:'none',overflow:'hidden'}}>
          <style>{`
            @keyframes rxFloat{0%{transform:translate(-50%,0) scale(.3) rotate(0);opacity:0}12%{opacity:1;transform:translate(calc(-50% + var(--dx) * .15),-28px) scale(1.15) rotate(var(--rot))}100%{transform:translate(calc(-50% + var(--dx)),calc(var(--rise) * -1)) scale(.85) rotate(calc(var(--rot) * -1));opacity:0}}
            @keyframes rxPop{0%{transform:translate(-50%,-50%) scale(0);opacity:0}30%{transform:translate(-50%,-50%) scale(1.4);opacity:1}48%{transform:translate(-50%,-50%) scale(.92)}62%{transform:translate(-50%,-50%) scale(1.08)}80%{transform:translate(-50%,-50%) scale(1);opacity:1}100%{transform:translate(-50%,-70%) scale(1);opacity:0}}
            @keyframes rxRing{0%{transform:translate(-50%,-50%) scale(.2);opacity:.7}100%{transform:translate(-50%,-50%) scale(2.6);opacity:0}}
            @media (prefers-reduced-motion: reduce){.rx-p{display:none}}
          `}</style>
          {bursts.map(b=>(
            <Fragment key={b.id}>
              <div style={{position:'absolute',left:'50%',top:'44%',width:120,height:120,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.55)',animation:'rxRing .8s ease-out forwards'}}/>
              <div style={{position:'absolute',left:'50%',top:'44%',fontSize:96,lineHeight:1,filter:'drop-shadow(0 10px 30px rgba(0,0,0,0.45))',animation:'rxPop 1.35s ease forwards'}}>{b.e}</div>
              {b.parts.map((pt,i)=>(
                <span key={i} className="rx-p" style={{position:'absolute',left:b.x,top:b.y,fontSize:pt.size,lineHeight:1,opacity:0,'--dx':`${pt.dx}px`,'--rise':`${pt.rise}px`,'--rot':`${pt.rot}deg`,animation:`rxFloat ${pt.dur}s cubic-bezier(.2,.7,.3,1) ${pt.delay}s forwards`}}>{b.e}</span>
              ))}
            </Fragment>
          ))}
        </div>
      )}
      <style>{`@keyframes rxBump{0%{transform:scale(1)}35%{transform:scale(1.45)}65%{transform:scale(.9)}100%{transform:scale(1)}}`}</style>
      {viewers&&(
        <div onClick={()=>{setViewers(null);setPaused(false);}} style={{position:'absolute',inset:0,zIndex:2,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'flex-end'}}>
          <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxHeight:'60vh',overflowY:'auto',background:ambient(accent),borderRadius:'20px 20px 0 0',padding:'16px 20px calc(18px + env(safe-area-inset-bottom))'}}>
            <div style={{fontSize:10.5,letterSpacing:2.2,textTransform:'uppercase',fontWeight:700,color:accent,marginBottom:10}}>Seen by {viewers.length}</div>
            {viewers.length===0?<div style={{fontSize:12.5,color:T.text2}}>No views yet.</div>:viewers.map(v=>(
              <div key={v.user_id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderTop:`1px solid ${T.hairline}`}}>
                <div style={{width:36,height:36,borderRadius:'50%',overflow:'hidden',background:`${accent}33`,flexShrink:0}}>{v.avatar_url&&<img src={v.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}</div>
                <div style={{flex:1}}><div style={{fontSize:13.5,fontWeight:700,color:'#fff'}}>{v.display_name||v.username}</div><div style={{fontSize:11.5,color:T.text2}}>{statusAgo(v.viewed_at)}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
