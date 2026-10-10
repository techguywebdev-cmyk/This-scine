'use client';
import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import ImportSheet from '../ImportSheet';
import { SvgIcon } from './shared';

// PROFILE SHEET
// COVER CROP MODAL (Twitter-style drag-to-reposition + zoom, exports a compressed JPEG)
export function CoverCropModal({file,onCancel,onSave,accent,aspect=2.5,title='Adjust Cover Photo',outputWidth=1400,roundPreview=false}){
  const ASPECT=aspect;
  const[imgUrl,setImgUrl]=useState(null);
  const[natural,setNatural]=useState({w:0,h:0});
  const[containerSize,setContainerSize]=useState({w:0,h:0});
  const[scale,setScale]=useState(1);
  const[offset,setOffset]=useState({x:0,y:0});
  const[saving,setSaving]=useState(false);
  const containerRef=useRef(null);
  const imgElRef=useRef(null);
  const dragRef=useRef(null);

  useEffect(()=>{
    const url=URL.createObjectURL(file);
    setImgUrl(url);
    return()=>URL.revokeObjectURL(url);
  },[file]);

  useEffect(()=>{
    const measure=()=>{if(containerRef.current){const r=containerRef.current.getBoundingClientRect();setContainerSize({w:r.width,h:r.height});}};
    measure();
    window.addEventListener('resize',measure);
    return()=>window.removeEventListener('resize',measure);
  },[]);

  const baseScale=natural.w&&containerSize.w?Math.max(containerSize.w/natural.w,containerSize.h/natural.h):1;
  const effectiveScale=baseScale*scale;
  const displayW=natural.w*effectiveScale;
  const displayH=natural.h*effectiveScale;

  const clamp=(ox,oy,curScale)=>{
    const eScale=baseScale*curScale;
    const dW=natural.w*eScale,dH=natural.h*eScale;
    const maxX=Math.max(0,(dW-containerSize.w)/2);
    const maxY=Math.max(0,(dH-containerSize.h)/2);
    return{x:Math.min(maxX,Math.max(-maxX,ox)),y:Math.min(maxY,Math.max(-maxY,oy))};
  };

  const onImgLoad=(e)=>{setNatural({w:e.target.naturalWidth,h:e.target.naturalHeight});setOffset({x:0,y:0});setScale(1);};

  const onPointerDown=(e)=>{
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current={startX:e.clientX,startY:e.clientY,startOffX:offset.x,startOffY:offset.y};
  };
  const onPointerMove=(e)=>{
    if(!dragRef.current)return;
    const dx=e.clientX-dragRef.current.startX;
    const dy=e.clientY-dragRef.current.startY;
    setOffset(clamp(dragRef.current.startOffX+dx,dragRef.current.startOffY+dy,scale));
  };
  const onPointerUp=()=>{dragRef.current=null;};

  const onZoomChange=(e)=>{
    const next=parseFloat(e.target.value);
    setScale(next);
    setOffset(o=>clamp(o.x,o.y,next));
  };

  const handleSave=()=>{
    if(!imgElRef.current||!natural.w)return;
    setSaving(true);
    const OUT_W=outputWidth;const OUT_H=Math.round(OUT_W/ASPECT);
    const canvas=document.createElement('canvas');
    canvas.width=OUT_W;canvas.height=OUT_H;
    const ctx=canvas.getContext('2d');
    const imgLeft=(containerSize.w-displayW)/2+offset.x;
    const imgTop=(containerSize.h-displayH)/2+offset.y;
    let srcX=(-imgLeft)/effectiveScale;
    let srcY=(-imgTop)/effectiveScale;
    let srcW=containerSize.w/effectiveScale;
    let srcH=containerSize.h/effectiveScale;
    srcX=Math.max(0,Math.min(natural.w-srcW,srcX));
    srcY=Math.max(0,Math.min(natural.h-srcH,srcY));
    // Decode a fresh, full-resolution copy of the source image specifically for export.
    // Some mobile browsers cache a downscaled decode of an <img> that's been rendered
    // small on screen, which silently degrades quality when that element is later
    // drawn to canvas. A clean Image() load guarantees we draw from the real source data.
    const fullResImg=new Image();
    fullResImg.onload=()=>{
      ctx.imageSmoothingEnabled=true;
      ctx.imageSmoothingQuality='high';
      ctx.drawImage(fullResImg,srcX,srcY,srcW,srcH,0,0,OUT_W,OUT_H);
      canvas.toBlob(blob=>{setSaving(false);if(blob)onSave(blob);},'image/jpeg',0.85);
    };
    fullResImg.onerror=()=>{
      ctx.imageSmoothingEnabled=true;
      ctx.imageSmoothingQuality='high';
      ctx.drawImage(imgElRef.current,srcX,srcY,srcW,srcH,0,0,OUT_W,OUT_H);
      canvas.toBlob(blob=>{setSaving(false);if(blob)onSave(blob);},'image/jpeg',0.85);
    };
    fullResImg.src=imgUrl;
  };

  return(
    <div style={{position:'fixed',inset:0,zIndex:200,background:'#05050a',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'16px 16px 12px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
        <button onClick={onCancel} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:18,padding:'8px 16px',cursor:'pointer',fontFamily:'inherit',fontSize:13,color:'rgba(255,255,255,0.6)',fontWeight:600}}>Cancel</button>
        <span style={{fontSize:14,fontWeight:700,color:'#fff'}}>{title}</span>
        <button onClick={handleSave} disabled={saving||!natural.w} style={{background:accent,border:'none',borderRadius:18,padding:'8px 18px',cursor:saving?'default':'pointer',fontFamily:'inherit',fontSize:13,color:'#07070F',fontWeight:700,display:'flex',alignItems:'center',gap:6,opacity:saving?0.7:1}}>
          {saving&&<div style={{width:11,height:11,border:'1.5px solid rgba(7,7,15,0.3)',borderTop:'1.5px solid #07070F',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>}
          Save
        </button>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'0 16px'}}>
        <div ref={containerRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          style={{width:'100%',maxWidth:480,aspectRatio:`${ASPECT}`,position:'relative',overflow:'hidden',borderRadius:roundPreview?'50%':16,border:`1px solid ${accent}44`,background:'#000',touchAction:'none',cursor:'grab'}}>
          {roundPreview&&<div style={{position:'absolute',inset:0,borderRadius:'50%',border:`2px solid ${accent}`,zIndex:3,pointerEvents:'none'}}/>}
          {imgUrl&&(
            <img ref={imgElRef} src={imgUrl} onLoad={onImgLoad} alt="" draggable={false}
              style={{position:'absolute',left:(containerSize.w-displayW)/2+offset.x,top:(containerSize.h-displayH)/2+offset.y,width:displayW||'auto',height:displayH||'auto',maxWidth:'none',userSelect:'none',pointerEvents:'none'}}/>
          )}
          {!natural.w&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:24,height:24,border:'2px solid rgba(255,255,255,0.15)',borderTop:`2px solid ${accent}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/></div>}
        </div>
        <div style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginTop:12,marginBottom:18}}>Drag to reposition</div>
        <div style={{width:'100%',maxWidth:480,display:'flex',alignItems:'center',gap:12}}>
          <SvgIcon name="search" size={13} color="rgba(255,255,255,0.25)"/>
          <input type="range" min="1" max="2.5" step="0.01" value={scale} onChange={onZoomChange} style={{flex:1,accentColor:accent}}/>
          <SvgIcon name="search" size={17} color="rgba(255,255,255,0.4)"/>
        </div>
      </div>
    </div>
  );
}
