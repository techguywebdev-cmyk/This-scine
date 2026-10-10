'use client';
import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import ImportSheet from '../ImportSheet';
import { AccentGlow, Eyebrow, SvgIcon, T, ambient } from './shared';

// MAIN APP
// ─── COMMUNITY LISTS ────────────────────────────────────────────────────────

export function CreateListSheet({onClose,accent,onCreated}){
  const{isSignedIn}=useUser();
  const[title,setTitle]=useState('');
  const[description,setDescription]=useState('');
  const[isPublic,setIsPublic]=useState(false);
  const[saving,setSaving]=useState(false);
  const[error,setError]=useState('');

  const handleCreate=async()=>{
    if(!title.trim()){setError('Give your folder a name');return;}
    setSaving(true);setError('');
    try{
      const res=await fetch('/api/lists',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,description,is_public:isPublic})});
      const data=await res.json();
      if(!res.ok||data.error){throw new Error(data.error||'Couldn’t create the folder');}
      onCreated(data.list);
      onClose();
    }catch(err){setError(err.message);}
    setSaving(false);
  };

  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:170,background:'rgba(0,0,0,0.82)',backdropFilter:'blur(20px)',display:'flex',alignItems:'flex-end',animation:'fadeIn 0.2s ease'}}>
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',background:ambient(accent),borderRadius:'24px 24px 0 0',border:`1px solid ${T.hairline}`,borderBottom:'none',padding:'0 20px 48px',animation:'sheetUp 0.32s cubic-bezier(0.22,1,0.36,1)',position:'relative',overflow:'hidden'}}>
        <AccentGlow accent={accent} size={180} style={{right:-20,top:-60}}/>
        <div style={{width:32,height:3,borderRadius:2,background:'rgba(255,255,255,0.14)',margin:'14px auto 22px',position:'relative'}}/>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22,position:'relative'}}>
          <span style={{fontFamily:T.serif,fontSize:21,letterSpacing:'-0.02em',fontWeight:700,color:T.text}}>New folder</span>
          <button onClick={onClose} style={{background:'transparent',border:'none',cursor:'pointer',padding:4}}><SvgIcon name="close" size={14} color={T.text2}/></button>
        </div>
        <div style={{position:'relative',marginBottom:14}}>
          <Eyebrow color={accent} style={{marginBottom:8}}>Folder name</Eyebrow>
          <input autoFocus value={title} onChange={e=>{setTitle(e.target.value);setError('');}} maxLength={60} placeholder="e.g. Date night, Crime series, Cartoons for the kids" style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${error?'#FF6B6B44':T.hairline}`,borderRadius:12,padding:'13px 14px',color:T.text,fontSize:15,outline:'none',fontFamily:'inherit'}}/>
          <div style={{fontSize:10,color:T.text3,marginTop:5,textAlign:'right'}}>{title.length}/60</div>
        </div>
        <div style={{marginBottom:22}}>
          <Eyebrow color={T.text3} style={{marginBottom:8}}>Description <span style={{color:T.text3,fontWeight:400,fontSize:9,letterSpacing:0}}>(optional)</span></Eyebrow>
          <textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={200} placeholder="What's in this folder?" rows={2} style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${T.hairline}`,borderRadius:12,padding:'13px 14px',color:T.text,fontSize:14,outline:'none',fontFamily:'inherit',resize:'none',lineHeight:1.5}}/>
        </div>
        <div style={{marginBottom:18}}>
          <Eyebrow color={T.text3} style={{marginBottom:10}}>Visibility</Eyebrow>
          <div style={{display:'flex',gap:8}}>
            <button type="button" onClick={()=>setIsPublic(true)} style={{flex:1,background:isPublic?`${accent}18`:T.surface2,border:`1px solid ${isPublic?accent+'55':T.hairline}`,borderRadius:12,padding:'12px 10px',cursor:'pointer',fontFamily:'inherit',textAlign:'left'}}>
              <div style={{fontSize:13,fontWeight:700,color:isPublic?accent:T.text}}>Public</div>
              <div style={{fontSize:11,color:T.text3,marginTop:3}}>Anyone can find, follow and rate it</div>
            </button>
            <button type="button" onClick={()=>setIsPublic(false)} style={{flex:1,background:!isPublic?`${accent}18`:T.surface2,border:`1px solid ${!isPublic?accent+'55':T.hairline}`,borderRadius:12,padding:'12px 10px',cursor:'pointer',fontFamily:'inherit',textAlign:'left'}}>
              <div style={{fontSize:13,fontWeight:700,color:!isPublic?accent:T.text}}>Private</div>
              <div style={{fontSize:10,color:T.text3,marginTop:3}}>Only you can see it</div>
            </button>
          </div>
        </div>
        {error&&<div style={{fontSize:12,color:'#FF6B6B',marginBottom:14}}>{error}</div>}
        <button onClick={handleCreate} disabled={saving||!title.trim()} style={{width:'100%',background:saving||!title.trim()?'rgba(255,255,255,0.08)':accent,border:'none',borderRadius:16,padding:'15px',cursor:saving||!title.trim()?'default':'pointer',fontSize:15,fontWeight:700,color:saving||!title.trim()?T.text3:'#07070F',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8,transition:'all 0.2s ease'}}>
          {saving&&<div style={{width:14,height:14,border:'2px solid rgba(7,7,15,0.3)',borderTop:'2px solid #07070F',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>}
          {saving?'Creating…':(isPublic?'Create public folder':'Create private folder')}
        </button>
      </div>
      <style>{`@keyframes sheetUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
