'use client';
import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import ImportSheet from '../ImportSheet';
import { DeleteAccountSheet, BlockedList, PartyHistoryRow, AccentGlow, CoverCropModal, CoverImg, Eyebrow, GRADS, InlinePlayer, SerifStat, SvgIcon, T, Toast, UserProfileSheet, ambient, coverCache, subscribePush } from './shared';

export function loadCanvasImage(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const safeUrl = url.replace('https://image.tmdb.org/t/p/original','https://image.tmdb.org/t/p/w342').replace('https://image.tmdb.org/t/p/w500','https://image.tmdb.org/t/p/w342');
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = safeUrl;
    setTimeout(() => resolve(null), 5000);
  });
}
// ── Profile share card (1080×1920 story): avatar, level, stats, interests, recently watched ──
export async function drawProfileCard(d, accent) {
  const W=1080,H=1920;
  const c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d');
  const cs=typeof document!=='undefined'?getComputedStyle(document.body):null;
  const display=(cs&&getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim())||"'Inter Tight', system-ui, sans-serif";
  const body=(cs&&cs.fontFamily)||'system-ui, sans-serif';
  const F=(w,s,fam=body)=>`${w} ${s}px ${fam}, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;
  const rr=(x,y,w,h,r)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);};
  const cover=(img,x,y,w,h,r)=>{ctx.save();rr(x,y,w,h,r);ctx.clip();const s=Math.max(w/img.width,h/img.height);ctx.drawImage(img,x+(w-img.width*s)/2,y+(h-img.height*s)/2,img.width*s,img.height*s);ctx.restore();};
  const spaced=(txt,x,y,sp)=>{ctx.letterSpacing=`${sp}px`;ctx.fillText(txt,x,y);ctx.letterSpacing='0px';};
  const fit=(txt,max)=>{let t=txt;while(t.length>1&&ctx.measureText(t).width>max)t=t.slice(0,-1);return t===txt?t:t.trimEnd()+'…';};

  // load images in parallel
  const wallSrc=[...new Set((d.wall||[]).filter(Boolean))].slice(0,12);
  const [avatar,wall,shelf]=await Promise.all([
    d.avatar?loadCanvasImage(d.avatar):null,
    Promise.all(wallSrc.map(loadCanvasImage)),
    Promise.all((d.shelf||[]).slice(0,4).map(m=>m.poster?loadCanvasImage(m.poster):null)),
  ]);

  // backdrop — app ambient
  ctx.fillStyle='#06060B';ctx.fillRect(0,0,W,H);
  const glow=(x,y,r,a)=>{const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,accent+a);g.addColorStop(1,accent+'00');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);};

  // poster wall
  const walls=wall.filter(Boolean);
  if(walls.length){
    const cols=5,gap=14,pw=(W+60-gap*(cols-1))/cols,ph=pw*1.5;
    ctx.save();ctx.globalAlpha=0.55;
    for(let i=0;i<cols*2;i++){const img=walls[i%walls.length];const col=i%cols,row=Math.floor(i/cols);const x=-30+col*(pw+gap),y=-80+row*(ph+gap)+(col%2?-60:0);cover(img,x,y,pw,ph,10);}
    ctx.restore();
  }
  const fade=ctx.createLinearGradient(0,0,0,700);fade.addColorStop(0,'rgba(6,6,11,0.3)');fade.addColorStop(0.6,'rgba(6,6,11,0.78)');fade.addColorStop(1,'#06060B');
  ctx.fillStyle=fade;ctx.fillRect(0,0,W,700);
  glow(0,0,1300,'38');glow(W,H,1200,'2e');glow(W*0.5,520,620,'1c');

  // wordmark
  ctx.textAlign='left';ctx.fillStyle='#fff';ctx.font=F(800,40,display);ctx.fillText('CineScroll',72,118);

  // avatar
  const ax=W/2,ay=500,ar=150;
  ctx.save();ctx.shadowColor='rgba(0,0,0,0.6)';ctx.shadowBlur=50;ctx.fillStyle='#0B0B12';ctx.beginPath();ctx.arc(ax,ay,ar+14,0,Math.PI*2);ctx.fill();ctx.restore();
  const ring=ctx.createLinearGradient(ax-ar,ay-ar,ax+ar,ay+ar);ring.addColorStop(0,accent);ring.addColorStop(1,'#FF6B8A');
  ctx.strokeStyle=ring;ctx.lineWidth=7;ctx.beginPath();ctx.arc(ax,ay,ar+8,0,Math.PI*2);ctx.stroke();
  ctx.save();ctx.beginPath();ctx.arc(ax,ay,ar,0,Math.PI*2);ctx.clip();
  if(avatar){const s=Math.max(ar*2/avatar.width,ar*2/avatar.height);ctx.drawImage(avatar,ax-avatar.width*s/2,ay-avatar.height*s/2,avatar.width*s,avatar.height*s);}
  else{ctx.fillStyle=accent+'33';ctx.fillRect(ax-ar,ay-ar,ar*2,ar*2);ctx.fillStyle=accent;ctx.font=F(800,130,display);ctx.textAlign='center';ctx.fillText((d.name||'?')[0].toUpperCase(),ax,ay+46);}
  ctx.restore();

  // name + handle
  ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font=F(800,84,display);ctx.fillText(fit(d.name||'Cinephile',W-160),W/2,760);
  if(d.handle){ctx.fillStyle='rgba(255,255,255,0.5)';ctx.font=F(500,34);ctx.fillText('@'+d.handle,W/2,812);}

  // level pill
  const lv=cineLevel(d.score||0);
  const pillTxt=`LEVEL ${lv.idx+1} · ${lv.name.toUpperCase()}`;
  ctx.font=F(800,26);ctx.letterSpacing='4px';const pwid=ctx.measureText(pillTxt).width+64;ctx.letterSpacing='0px';
  ctx.fillStyle='rgba(255,255,255,0.07)';rr(W/2-pwid/2,852,pwid,62,31);ctx.fill();ctx.strokeStyle='rgba(255,255,255,0.16)';ctx.lineWidth=2;rr(W/2-pwid/2,852,pwid,62,31);ctx.stroke();
  ctx.fillStyle=accent;ctx.font=F(800,26);spaced(pillTxt,W/2,893,4);

  // stats row: score · watched · reviews · saved
  const stats=[['CINESCORE',d.score||0],['WATCHED',d.watched||0],['REVIEWS',d.reviews||0],['SAVED',d.saved||0]];
  const sy=965,sh=150,colW=(W-144)/4;
  ctx.strokeStyle='rgba(255,255,255,0.1)';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(72,sy);ctx.lineTo(W-72,sy);ctx.moveTo(72,sy+sh);ctx.lineTo(W-72,sy+sh);ctx.stroke();
  stats.forEach(([l,v],i)=>{
    const cx=72+colW*i+colW/2;
    if(i){ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.beginPath();ctx.moveTo(72+colW*i,sy+30);ctx.lineTo(72+colW*i,sy+sh-30);ctx.stroke();}
    ctx.fillStyle=i===0?accent:'#fff';ctx.font=F(800,64,display);ctx.fillText(String(v),cx,sy+88);
    ctx.fillStyle='rgba(255,255,255,0.4)';ctx.font=F(700,20);spaced(l,cx,sy+124,4);
  });

  // interests
  let y=1190;
  const genres=(d.genres||[]).slice(0,4);
  if(genres.length){
    ctx.textAlign='left';ctx.fillStyle=accent;ctx.font=F(800,22);spaced('INTO',72,y,6);
    y+=28;let x=72;ctx.font=F(700,30);
    genres.forEach(g=>{const w=ctx.measureText(g).width+52;if(x+w>W-72)return;ctx.fillStyle='rgba(255,255,255,0.07)';rr(x,y,w,64,32);ctx.fill();ctx.strokeStyle='rgba(255,255,255,0.14)';ctx.lineWidth=2;rr(x,y,w,64,32);ctx.stroke();ctx.fillStyle='#fff';ctx.fillText(g,x+26,y+42);x+=w+14;});
    y+=64+60;
  }

  // shelf
  const shelfItems=(d.shelf||[]).slice(0,4).map((m,i)=>({...m,img:shelf[i]})).filter(m=>m.img);
  if(shelfItems.length){
    ctx.textAlign='left';ctx.fillStyle=accent;ctx.font=F(800,22);spaced(d.shelfLabel||'RECENTLY WATCHED',72,y,6);
    y+=30;const gap=22,pw=(W-144-gap*3)/4,ph=pw*1.5;
    shelfItems.forEach((m,i)=>{const x=72+i*(pw+gap);ctx.save();ctx.shadowColor='rgba(0,0,0,0.55)';ctx.shadowBlur=30;ctx.shadowOffsetY=12;ctx.fillStyle='#000';rr(x,y,pw,ph,10);ctx.fill();ctx.restore();cover(m.img,x,y,pw,ph,10);
      ctx.fillStyle='rgba(255,255,255,0.85)';ctx.font=F(600,22);ctx.fillText(fit(m.title||'',pw),x,y+ph+36);});
  }

  // footer
  ctx.textAlign='center';ctx.fillStyle='rgba(255,255,255,0.55)';ctx.font=F(600,28);ctx.fillText('Find me on CineScroll',W/2,H-104);
  ctx.fillStyle=accent;ctx.font=F(800,30);ctx.fillText(d.url||'this-scine.vercel.app',W/2,H-60);
  return c.toDataURL('image/png');
}
export async function generateShareCard(type, data, accent) {
  if(type==='score')return drawProfileCard(data,accent);
  const W=750,H=1334;
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#05050D';ctx.fillRect(0,0,W,H);
  const g1=ctx.createRadialGradient(W*.5,0,0,W*.5,0,H*.65);
  g1.addColorStop(0,accent+'30');g1.addColorStop(1,'transparent');
  ctx.fillStyle=g1;ctx.fillRect(0,0,W,H);
  ctx.shadowColor=accent;ctx.shadowBlur=20;ctx.strokeStyle=accent+'60';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.roundRect(10,10,W-20,H-20,32);ctx.stroke();ctx.shadowBlur=0;
  ctx.fillStyle='#ffffff';ctx.font='800 32px system-ui, -apple-system, Helvetica, Arial, sans-serif';ctx.textAlign='left';ctx.fillText('CineScroll',66,76);
  if(type==='score'){
    ctx.fillStyle='rgba(255,255,255,0.35)';ctx.font='600 13px sans-serif';ctx.textAlign='center';ctx.letterSpacing='4px';ctx.fillText('CINEPHILE PROFILE',W/2,152);ctx.letterSpacing='0px';
    ctx.fillStyle='#ffffff';ctx.font='800 60px system-ui, -apple-system, Helvetica, Arial, sans-serif';ctx.fillText(data.name,W/2,224);
    const cx=W/2,cy=460,r=150;
    ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=20;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
    const lvl=cineLevel(data.score);const pct=Math.max(lvl.progress>0?0.035:0,lvl.progress);
    if(pct>0){const ag=ctx.createLinearGradient(cx-r,cy,cx+r,cy);ag.addColorStop(0,accent+'80');ag.addColorStop(0.5,accent);ag.addColorStop(1,accent+'cc');ctx.shadowColor=accent;ctx.shadowBlur=16;ctx.strokeStyle=ag;ctx.lineWidth=20;ctx.lineCap='round';ctx.beginPath();ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+pct*2*Math.PI);ctx.stroke();ctx.shadowBlur=0;ctx.lineCap='butt';}
    ctx.fillStyle='#ffffff';ctx.font='bold 108px Georgia, serif';ctx.shadowColor=accent;ctx.shadowBlur=20;ctx.fillText(data.score,cx,cy+34);ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,255,255,0.45)';ctx.font='600 13px sans-serif';ctx.letterSpacing='5px';ctx.fillText(lvl.name.toUpperCase(),cx,cy+68);ctx.letterSpacing='0px';
    const cols=[{label:'WATCHED',value:data.watched},{label:'REVIEWS',value:data.reviews},{label:'SAVED',value:data.saved}];
    const statY=680;const colW=W/3;
    cols.forEach((s,i)=>{const x=colW*i+colW/2;ctx.fillStyle='rgba(255,255,255,0.04)';ctx.beginPath();ctx.roundRect(colW*i+24,statY-46,colW-48,100,18);ctx.fill();ctx.fillStyle=accent;ctx.font='bold 34px Georgia, serif';ctx.fillText(s.value,x,statY+24);ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='600 11px sans-serif';ctx.letterSpacing='2px';ctx.fillText(s.label,x,statY+44);ctx.letterSpacing='0px';});
    ctx.fillStyle=accent+'15';ctx.beginPath();ctx.roundRect(W/2-155,830,310,50,25);ctx.fill();ctx.fillStyle=accent;ctx.font='bold 16px sans-serif';ctx.fillText('this-scine.vercel.app',W/2,860);
  } else if(type==='watchlist'){
    ctx.fillStyle='rgba(255,255,255,0.32)';ctx.font='600 13px sans-serif';ctx.textAlign='center';ctx.letterSpacing='4px';ctx.fillText('WATCHLIST',W/2,148);ctx.letterSpacing='0px';
    ctx.fillStyle='#ffffff';ctx.font='800 54px system-ui, -apple-system, Helvetica, Arial, sans-serif';ctx.fillText(data.name,W/2,210);
    const items=data.items.slice(0,6);const CARD_H=118,POSTER_W=72,POSTER_H=102,startY=296;
    for(let idx=0;idx<items.length;idx++){
      const m=items[idx];const cardY=startY+idx*(CARD_H+8);
      ctx.fillStyle='rgba(255,255,255,0.04)';ctx.beginPath();ctx.roundRect(36,cardY,W-72,CARD_H,16);ctx.fill();
      ctx.strokeStyle=accent+'22';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(36,cardY,W-72,CARD_H,16);ctx.stroke();
      const posterX=50,posterY=cardY+8;
      if(m.poster){const img=await loadCanvasImage(m.poster);if(img){ctx.save();ctx.beginPath();ctx.roundRect(posterX,posterY,POSTER_W,POSTER_H,10);ctx.clip();const scale=Math.max(POSTER_W/img.width,POSTER_H/img.height);ctx.drawImage(img,posterX+(POSTER_W-img.width*scale)/2,posterY+(POSTER_H-img.height*scale)/2,img.width*scale,img.height*scale);ctx.restore();}}
      const textX=50+POSTER_W+28;const title=m.title.length>22?m.title.slice(0,22)+'...':m.title;
      ctx.fillStyle='#ffffff';ctx.font='800 21px system-ui, -apple-system, Helvetica, Arial, sans-serif';ctx.textAlign='left';ctx.fillText(title,textX,cardY+36);
      if(m.genre&&m.genre.length>0){ctx.fillStyle=accent+'99';ctx.font='12px sans-serif';ctx.fillText(m.genre.slice(0,2).join(' · '),textX,cardY+57);}
      ctx.fillStyle='rgba(255,255,255,0.28)';ctx.font='13px sans-serif';ctx.fillText(m.year||'',textX,cardY+76);
      const ratingX=W-36-76,ratingY=cardY+CARD_H/2-16;
      ctx.fillStyle=accent+'18';ctx.beginPath();ctx.roundRect(ratingX,ratingY,68,32,16);ctx.fill();
      ctx.strokeStyle=accent+'44';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(ratingX,ratingY,68,32,16);ctx.stroke();
      ctx.fillStyle=accent;ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.fillText('* '+m.rating,ratingX+34,ratingY+20);
    }
    const urlY=H-90;ctx.fillStyle=accent+'15';ctx.beginPath();ctx.roundRect(W/2-155,urlY,310,50,25);ctx.fill();ctx.fillStyle=accent;ctx.font='bold 16px sans-serif';ctx.textAlign='center';ctx.fillText('this-scine.vercel.app',W/2,urlY+30);
  }
  const botBar=ctx.createLinearGradient(0,0,W,0);botBar.addColorStop(0,'transparent');botBar.addColorStop(0.5,accent+'cc');botBar.addColorStop(1,'transparent');
  ctx.fillStyle=botBar;ctx.beginPath();ctx.roundRect(40,H-13,W-80,3,2);ctx.fill();
  return canvas.toDataURL('image/png');
}
export async function shareImage(dataUrl,title,text){
  try{const blob=await(await fetch(dataUrl)).blob();const file=new File([blob],'cinescroll.png',{type:'image/png'});if(navigator.share&&navigator.canShare({files:[file]})){await navigator.share({title,text,files:[file],url:'https://this-scine.vercel.app'});return;}}catch{}
  const a=document.createElement('a');a.href=dataUrl;a.download='cinescroll.png';a.click();
}
export function calcCineScore(watched,reviews,saved){return Math.min(999,(watched*3)+(reviews*8)+(saved*2));}
export const CINE_LEVELS=[{name:'Newcomer',min:0,max:100},{name:'Casual viewer',min:100,max:300},{name:'Cinephile',min:300,max:600},{name:'Connoisseur',min:600,max:999}];
export function cineLevel(score){const i=Math.max(0,CINE_LEVELS.findIndex(l=>score<l.max));const idx=score>=999?CINE_LEVELS.length-1:i;const l=CINE_LEVELS[idx];return{...l,idx,next:CINE_LEVELS[idx+1]||null,progress:Math.min(1,(score-l.min)/(l.max-l.min)),toNext:Math.max(0,l.max-score)};}
export function CineScoreRing({score,accent}){
  const r=40,circ=2*Math.PI*r,lv=cineLevel(score);
  const dash=Math.max(lv.progress>0?0.035:0,lv.progress)*circ;
  return(
    <div style={{position:'relative',width:100,height:100,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <svg width="100" height="100" style={{position:'absolute',inset:0,transform:'rotate(-90deg)'}}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5"/>
        <circle cx="50" cy="50" r={r} fill="none" stroke={accent} strokeWidth="5" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{transition:'stroke-dasharray 1s ease',filter:`drop-shadow(0 0 6px ${accent}66)`}}/>
      </svg>
      <div style={{textAlign:'center',zIndex:1}}>
        <div style={{fontFamily:T.serif,letterSpacing:'-0.02em',fontSize:26,fontWeight:800,color:'#fff',lineHeight:1}}>{score}</div>
        <div style={{fontSize:8.5,letterSpacing:1.6,color:'rgba(255,255,255,0.45)',fontWeight:700,marginTop:4,textTransform:'uppercase'}}>Level {lv.idx+1}</div>
      </div>
    </div>
  );
}
export function ProfileSheet({onClose,accent,watchlist,setWatchlist,userReviews,loadingData,onDiscover,onWatchTrailer}){
  const{user}=useUser();const{signOut}=useClerk();
  const[tab,setTab]=useState('profile');const[signingOut,setSigningOut]=useState(false);const[signedOut,setSignedOut]=useState(false);const[showTmdb,setShowTmdb]=useState(false);const[showBlocked,setShowBlocked]=useState(false);const[showDelete,setShowDelete]=useState(false);const[sharing,setSharing]=useState(false);const[toast,setToast]=useState(null);const[watchlistSearch,setWatchlistSearch]=useState('');const[watchlistFilter,setWatchlistFilter]=useState('all');const[watchlistSort,setWatchlistSort]=useState('date');const[watchlistPlatform,setWatchlistPlatform]=useState('');const[providerCache,setProviderCache]=useState({});const[loadingProviders,setLoadingProviders]=useState(false);const[platformAlerts,setPlatformAlerts]=useState([]);const[playerMovie,setPlayerMovie]=useState(null);
  const[watchlistPublic,setWatchlistPublic]=useState(true);const[loadingSettings,setLoadingSettings]=useState(true);const[notifyPrefs,setNotifyPrefs]=useState({email:true,web:true,app:true,messages:true,follows:true,activity:true});const[hasWebPush,setHasWebPush]=useState(false);const[pushBusy,setPushBusy]=useState(false);
  const[bio,setBio]=useState('');const[bioInput,setBioInput]=useState('');const[savingBio,setSavingBio]=useState(false);
  const[nickname,setNickname]=useState('');const[nicknameInput,setNicknameInput]=useState('');const[savingNickname,setSavingNickname]=useState(false);
  const[coverUrl,setCoverUrlState]=useState(()=>coverCache.get(user?.id));const setCoverUrl=u=>{setCoverUrlState(u);coverCache.set(user?.id,u);};const[uploadingCover,setUploadingCover]=useState(false);
  const[cropFile,setCropFile]=useState(null);
  const[avatarCropFile,setAvatarCropFile]=useState(null);
  const[uploadingAvatar,setUploadingAvatar]=useState(false);
  const avatarInputRef=useRef(null);
  const coverInputRef=useRef(null);
  const bioRef=useRef(null);
  const[showOwnPreview,setShowOwnPreview]=useState(false);
  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(null),3000);};
  useEffect(()=>{
    fetch('/api/settings').then(r=>r.json()).then(d=>{setWatchlistPublic(d.watchlist_public!==false);setBio(d.bio||'');setBioInput(d.bio||'');setCoverUrl(d.cover_url||null);setNickname(d.nickname||'');setNicknameInput(d.nickname||'');setNotifyPrefs(d.notify_prefs||{email:true,web:true,app:true,messages:true,follows:true,activity:true});setHasWebPush(!!d.has_web_push);setLoadingSettings(false);}).catch(()=>setLoadingSettings(false));
  },[]);
  const togglePrivacy=async()=>{
    const next=!watchlistPublic;
    setWatchlistPublic(next);
    try{
      const res=await fetch('/api/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({watchlist_public:next})});
      const data=await res.json();
      if(!res.ok||data.error){throw new Error(data.error||'Failed');}
      showToast(next?'Watchlist is now public':'Watchlist is now private');
    }catch{setWatchlistPublic(!next);showToast('Could not update — try again');}
  };
  const toggleNotify=async(key)=>{
    const next={...notifyPrefs,[key]:!notifyPrefs[key]};
    setNotifyPrefs(next);
    try{
      const res=await fetch('/api/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({notify_prefs:next})});
      const data=await res.json();
      if(!res.ok||data.error){throw new Error(data.error||'Failed');}
      showToast('Notification preference saved');
    }catch(e){
      setNotifyPrefs(p=>({...p,[key]:!next[key]}));
      showToast(e.message||'Could not save preference');
    }
  };
  const enableWebPush=async()=>{
    if(typeof window==='undefined'||!('Notification' in window)||!('serviceWorker' in navigator)||!('PushManager' in window)){
      const ios=/iPhone|iPad|iPod/.test(navigator.userAgent);
      showToast(ios?'On iPhone: Share → Add to Home Screen, open from there, then enable':'Notifications are not supported in this browser');
      return;
    }
    setPushBusy(true);
    try{
      await subscribePush();
      setHasWebPush(true);
      const next={...notifyPrefs,web:true};
      setNotifyPrefs(next);
      await fetch('/api/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({notify_prefs:next})});
      showToast('Browser notifications enabled');
    }catch(e){
      showToast(e.message==='denied'?'Notifications are blocked — allow them in your browser settings':(e.message||'Could not enable notifications'));
    }
    setPushBusy(false);
  };
  const patchSettings=async(fields)=>{
    let res;
    try{res=await fetch('/api/settings',{method:'PATCH',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(fields)});}
    catch{throw new Error('No connection — try again');}
    const text=await res.text();
    let data={};try{data=text?JSON.parse(text):{};}catch{
      if(res.status===401||res.status===403||res.redirected)throw new Error('Session expired — refresh the page and try again');
      throw new Error(`Couldn't save (error ${res.status})`);
    }
    if(!res.ok||data.error)throw new Error(data.error||`Couldn't save (error ${res.status})`);
    return data;
  };
  const saveBio=async()=>{
    if(bioInput===bio)return;
    setSavingBio(true);
    try{
      await patchSettings({bio:bioInput});
      setBio(bioInput);
      showToast('Bio updated');
    }catch(err){showToast(err.message||'Could not save bio — try again');}
    setSavingBio(false);
  };
  const saveNickname=async()=>{
    if(nicknameInput===nickname)return;
    setSavingNickname(true);
    try{
      const data=await patchSettings({nickname:nicknameInput});
      setNickname((data&&typeof data.nickname==='string')?data.nickname:nicknameInput.trim());
      showToast('Display name updated');
    }catch(err){showToast(err.message||'Could not save — try again');}
    setSavingNickname(false);
  };
  const[editingAbout,setEditingAbout]=useState(false);
  const nameRef=useRef(null);
  const aboutDirty=nicknameInput!==nickname||bioInput!==bio;
  const savingAbout=savingNickname||savingBio;
  const saveAbout=async()=>{
    if(nicknameInput!==nickname&&bioInput!==bio){
      setSavingNickname(true);setSavingBio(true);
      try{const data=await patchSettings({nickname:nicknameInput,bio:bioInput});setNickname((data&&typeof data.nickname==='string')?data.nickname:nicknameInput.trim());setBio(bioInput);showToast('Profile updated');}
      catch(err){showToast(err.message||'Could not save — try again');}
      setSavingNickname(false);setSavingBio(false);return;
    }
    if(nicknameInput!==nickname)return saveNickname();
    if(bioInput!==bio)return saveBio();
  };
  const cancelAbout=()=>{setNicknameInput(nickname);setBioInput(bio);};
  const uploadCoverBlob=async(blobOrFile)=>{
    setUploadingCover(true);
    try{
      const formData=new FormData();formData.append('file',blobOrFile,'cover.jpg');
      const res=await fetch('/api/upload-cover',{method:'POST',body:formData});
      let data={};
      try{data=await res.json();}catch{throw new Error(`Server returned an unexpected response (status ${res.status})`);}
      if(res.ok&&data.cover_url){setCoverUrl(data.cover_url);showToast('Cover photo updated');}
      else{throw new Error(data.error||`Upload failed (status ${res.status})`);}
    }catch(err){showToast(err.message||'Upload failed — try a smaller image');}
    setUploadingCover(false);
  };
  const onCoverFileSelected=(e)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    const validTypes=['image/jpeg','image/png','image/gif','image/webp'];
    if(!validTypes.includes(file.type)){showToast('Use JPG, PNG, GIF, or WEBP');if(coverInputRef.current)coverInputRef.current.value='';return;}
    if(file.type==='image/gif'){
      // GIFs can't be cropped client-side without losing animation, so upload directly with a tighter size cap
      if(file.size>4*1024*1024){showToast('GIFs must be under 4MB');if(coverInputRef.current)coverInputRef.current.value='';return;}
      uploadCoverBlob(file).then(()=>{if(coverInputRef.current)coverInputRef.current.value='';});
    }else{
      // static images go through the crop modal first
      setCropFile(file);
    }
  };
  const handleCropCancel=()=>{setCropFile(null);if(coverInputRef.current)coverInputRef.current.value='';};
  const handleCropSave=async(blob)=>{setCropFile(null);await uploadCoverBlob(blob);if(coverInputRef.current)coverInputRef.current.value='';};

  const onAvatarFileSelected=(e)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    const validTypes=['image/jpeg','image/png','image/webp'];
    if(!validTypes.includes(file.type)){showToast('Use JPG, PNG, or WEBP');if(avatarInputRef.current)avatarInputRef.current.value='';return;}
    setAvatarCropFile(file);
  };
  const handleAvatarCropCancel=()=>{setAvatarCropFile(null);if(avatarInputRef.current)avatarInputRef.current.value='';};
  const handleAvatarCropSave=async(blob)=>{
    setAvatarCropFile(null);
    setUploadingAvatar(true);
    try{
      await user?.setProfileImage({file:blob});
      await user?.reload?.();
      showToast('Profile photo updated');
    }catch{showToast('Could not update photo — try again');}
    setUploadingAvatar(false);
    if(avatarInputRef.current)avatarInputRef.current.value='';
  };
  const toggleWatched=async(item)=>{
    const next=!item.watched;
    setWatchlist(p=>p.map(m=>m.movie_id===item.movie_id?{...m,watched:next}:m));
    await fetch('/api/watchlist',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({movieId:item.movie_id,watched:next})});
    if(next){
      fetch('/api/activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'watched',movieId:item.movie_id,movieTitle:item.title,moviePoster:item.poster,movieYear:item.year,movieRating:item.rating,movieAccent:item.accent,username:user?.username||user?.firstName||'user',avatarUrl:user?.imageUrl||null})}).catch(()=>{});
    }
  };
  const removeFromWatchlist=async(item)=>{setWatchlist(p=>p.filter(m=>m.movie_id!==item.movie_id));await fetch('/api/watchlist',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({movieId:item.movie_id})});};
  const handleSignOut=async()=>{setSigningOut(true);try{await signOut();}catch{}setSigningOut(false);setSignedOut(true);showToast('Signed out successfully');setTimeout(()=>onClose(),2000);};
  const watched=watchlist.filter(m=>m.watched).length;const saved=watchlist.length;const reviews=userReviews.length;
  const cineScore=calcCineScore(watched,reviews,saved);
  const avgRating=userReviews.filter(r=>r.rating>0).length>0?(userReviews.filter(r=>r.rating>0).reduce((s,r)=>s+r.rating,0)/userReviews.filter(r=>r.rating>0).length).toFixed(1):'--';
  const topGenres=watchlist.flatMap(m=>m.genre||[]).reduce((acc,g)=>{acc[g]=(acc[g]||0)+1;return acc;},{});
  const sortedGenres=Object.entries(topGenres).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const WATCHLIST_PLATFORMS=[
    {name:'Netflix',ids:[8],color:'#E50914'},
    {name:'Prime',ids:[9,119,10],color:'#00A8E0'},
    {name:'Disney+',ids:[337],color:'#0063e5'},
    {name:'Apple TV+',ids:[350],color:'#aaaaaa'},
    {name:'Max',ids:[1899,384,31],color:'#002BE7'},
    {name:'Hulu',ids:[15],color:'#1CE783'},
  ];
  useEffect(()=>{
    if(tab!=='watchlist'||watchlist.length===0)return;
    // Always hydrate providers on watchlist (for platform filter + alerts)
    const missing=watchlist.filter(m=>!providerCache[String(m.movie_id)]);
    if(missing.length===0)return;
    let cancelled=false;
    setLoadingProviders(true);
    (async()=>{
      const next={...providerCache};
      for(let i=0;i<missing.length;i+=6){
        const chunk=missing.slice(i,i+6);
        await Promise.all(chunk.map(async(m)=>{
          try{
            const type=m.is_tv?'tv':'movie';
            const r=await fetch(`/api/providers?id=${m.movie_id}&type=${type}`);
            const d=await r.json();
            next[String(m.movie_id)]=(d.providers||[]).map(p=>p.provider_id);
          }catch{ next[String(m.movie_id)]=[]; }
        }));
        if(cancelled)return;
        setProviderCache({...next});
      }
      if(!cancelled){setProviderCache({...next});setLoadingProviders(false);}
    })();
    return()=>{cancelled=true;};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[tab,watchlistPlatform,watchlist.length]);

  // Platform change alerts: compare current providers to last snapshot
  useEffect(()=>{
    if(!watchlist.length||Object.keys(providerCache).length===0)return;
    // Only run when we have coverage for most of the list
    const covered=watchlist.filter(m=>providerCache[String(m.movie_id)]!==undefined).length;
    if(covered<Math.min(watchlist.length,3))return;
    try{
      const key='cine_provider_snapshot_v1';
      const prev=JSON.parse(localStorage.getItem(key)||'{}');
      const PLATFORM_MAP=[
        {name:'Netflix',ids:[8]},
        {name:'Prime',ids:[9,119,10]},
        {name:'Disney+',ids:[337]},
        {name:'Max',ids:[1899,384,31]},
        {name:'Hulu',ids:[15]},
        {name:'Apple TV+',ids:[350]},
      ];
      const preferred=localStorage.getItem('cine_preferred_provider')||'';
      const next={};
      const alerts=[];
      for(const m of watchlist){
        if(m.watched)continue;
        const id=String(m.movie_id);
        const ids=providerCache[id];
        if(!ids)continue;
        next[id]=ids;
        const old=prev[id];
        if(!old)continue; // first time seeing this title — not an alert
        for(const p of PLATFORM_MAP){
          const had=old.some(x=>p.ids.includes(x));
          const has=ids.some(x=>p.ids.includes(x));
          if(!had&&has){
            if(!preferred||preferred===p.name){
              alerts.push({kind:'new',platform:p.name,title:m.title,movieId:m.movie_id,poster:m.poster});
            }
          }
          if(had&&!has){
            if(!preferred||preferred===p.name){
              alerts.push({kind:'left',platform:p.name,title:m.title,movieId:m.movie_id,poster:m.poster});
            }
          }
        }
      }
      localStorage.setItem(key,JSON.stringify({...prev,...next}));
      // Cap and dedupe
      const seen=new Set();
      const unique=[];
      for(const a of alerts){
        const k=a.kind+a.platform+a.movieId;
        if(seen.has(k))continue;
        seen.add(k);
        unique.push(a);
        if(unique.length>=6)break;
      }
      if(unique.length)setPlatformAlerts(unique);
    }catch{}
  },[providerCache,watchlist]);

  const filteredWatchlist=watchlist.filter(m=>{
    if(watchlistFilter==='movies'&&m.is_tv)return false;
    if(watchlistFilter==='tv'&&!m.is_tv)return false;
    if(watchlistSearch&&!m.title?.toLowerCase().includes(watchlistSearch.toLowerCase()))return false;
    if(watchlistPlatform){
      const platform=WATCHLIST_PLATFORMS.find(p=>p.name===watchlistPlatform);
      if(platform){
        const ids=providerCache[String(m.movie_id)];
        if(!ids)return false;
        if(!ids.some(id=>platform.ids.includes(id)))return false;
      }
    }
    return true;
  }).sort((a,b)=>{
    if(watchlistSort==='rating')return parseFloat(b.rating||0)-parseFloat(a.rating||0);
    if(watchlistSort==='title')return(a.title||'').localeCompare(b.title||'');
    return(b.saved_at||0)-(a.saved_at||0);
  });
  const handleWatchlistItemClick=(item)=>{
    const payload={
      id:item.movie_id||item.id,
      title:item.title,
      year:item.year,
      rating:item.rating,
      poster:item.poster,
      backdrop:item.backdrop,
      genre:Array.isArray(item.genre)?item.genre:(typeof item.genre==='string'?(()=>{try{return JSON.parse(item.genre);}catch{return[];}})():[]),
      overview:item.overview,
      accent:item.accent||accent,
      mediaType:item.is_tv||item.isTV?'tv':'movie',
      isTV:!!(item.is_tv||item.isTV),
      certification:item.certification||'',
    };
    if(onWatchTrailer){ onWatchTrailer(payload); }
    else { setPlayerMovie(payload); }
  };
  const profGlass={width:34,height:34,borderRadius:'50%',background:'rgba(0,0,0,0.3)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.12)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0};
  const Switch=({on,onClick,disabled,label})=>(
    <button type="button" onClick={onClick} disabled={disabled} role="switch" aria-checked={!!on} aria-label={label} style={{width:40,height:24,borderRadius:12,border:`1px solid ${on?'transparent':'rgba(255,255,255,0.16)'}`,cursor:disabled?'default':'pointer',background:on?accent:'rgba(255,255,255,0.08)',position:'relative',flexShrink:0,padding:0,transition:'background .2s ease'}}>
      <span style={{position:'absolute',top:2,left:on?18:2,width:18,height:18,borderRadius:'50%',background:'#fff',boxShadow:'0 1px 4px rgba(0,0,0,0.35)',transition:'left .2s ease'}}/>
    </button>
  );
  const SetRow=({title,sub,right})=>(
    <div style={{display:'flex',alignItems:'center',gap:12,padding:'13px 0',borderTop:`1px solid ${T.hairline}`}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13.5,fontWeight:600,color:'#fff'}}>{title}</div>
        {sub&&<div style={{fontSize:11.5,color:T.text3,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sub}</div>}
      </div>
      {right}
    </div>
  );
  return(
    <>
    {playerMovie&&<InlinePlayer movie={playerMovie} onClose={()=>setPlayerMovie(null)} accent={playerMovie.accent||accent}/>}
    {cropFile&&<CoverCropModal file={cropFile} accent={accent} onCancel={handleCropCancel} onSave={handleCropSave}/>}
    {avatarCropFile&&<CoverCropModal file={avatarCropFile} accent={accent} onCancel={handleAvatarCropCancel} onSave={handleAvatarCropSave} aspect={1} title="Adjust Profile Photo" outputWidth={600} roundPreview/>}
    {showOwnPreview&&user&&<UserProfileSheet userId={user.id} onClose={()=>setShowOwnPreview(false)} accent={accent} onWatchTrailer={setPlayerMovie}/>}
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,0.82)',backdropFilter:'blur(20px)',display:'flex',alignItems:'flex-end',animation:'fadeIn 0.2s ease'}}>
      {toast&&<Toast message={toast} accent={accent}/>}
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',height:'92%',background:ambient(accent),borderRadius:'28px 28px 0 0',border:`1px solid ${T.hairline}`,borderBottom:'none',display:'flex',flexDirection:'column',animation:'sheetUp 0.35s cubic-bezier(0.22,1,0.36,1)'}}>
        <style>{`@keyframes sheetUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={{width:32,height:3,borderRadius:2,background:'rgba(255,255,255,0.14)',margin:'14px auto 0',flexShrink:0}}/>
        <div style={{padding:'16px 18px 0',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <span style={{fontFamily:T.serif,fontSize:21,letterSpacing:'-0.02em',fontWeight:700,color:T.text}}>My Profile</span>
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            <button onClick={()=>setShowOwnPreview(true)} title="Preview public profile" style={profGlass}><SvgIcon name="eye" size={15} color="#fff"/></button>
            <button onClick={()=>{setTab('profile');setEditingAbout(true);setTimeout(()=>{nameRef.current?.scrollIntoView({behavior:'smooth',block:'center'});nameRef.current?.focus();},120);}} title="Edit Profile" style={profGlass}><SvgIcon name="edit" size={15} color="#fff"/></button>
            <button onClick={onClose} aria-label="Close" style={profGlass}><SvgIcon name="close" size={15} color="#fff"/></button>
          </div>
        </div>
        <div style={{display:'flex',padding:'18px 18px 0',gap:16,flexShrink:0,borderBottom:`1px solid ${T.hairline}`,overflowX:'auto',WebkitOverflowScrolling:'touch',scrollbarWidth:'none'}}>
          {[['profile','Profile'],['watchlist','Watchlist'],['watched','Watched'],['reviews','Reviews']].map(([t,label])=>(
            <button key={t} onClick={()=>setTab(t)} style={{background:'none',border:'none',cursor:'pointer',padding:'0 0 14px',fontFamily:'inherit',fontSize:13,fontWeight:tab===t?800:600,color:tab===t?'#fff':T.text3,transition:'color 0.2s ease',letterSpacing:0.2,flexShrink:0}}>
              {label}
            </button>
          ))}
        </div>
        <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',scrollbarWidth:'none'}}>
          {tab==='profile'&&(
            <div style={{padding:'16px'}}>
              {loadingData&&<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,padding:'10px 14px',background:'rgba(255,255,255,0.03)',borderRadius:12}}><div style={{width:14,height:14,border:`2px solid rgba(255,255,255,0.1)`,borderTop:`2px solid ${accent}`,borderRadius:'50%',animation:'spin 0.7s linear infinite',flexShrink:0}}/><span style={{fontSize:12,color:'rgba(255,255,255,0.3)'}}>Loading...</span></div>}

              {/* COVER + AVATAR — unified header */}
              <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={onCoverFileSelected} style={{display:'none'}}/>
              <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onAvatarFileSelected} style={{display:'none'}}/>
              <button onClick={()=>coverInputRef.current?.click()} disabled={uploadingCover} style={{position:'relative',width:'100%',aspectRatio:'2.5',borderRadius:18,overflow:'hidden',border:`1px solid ${T.hairline}`,background:coverUrl?'#0a0a12':`linear-gradient(150deg,${accent}1f,${T.surface})`,cursor:'pointer',padding:0,display:'block',position:'relative'}}>
                {coverUrl&&<CoverImg src={coverUrl} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',objectPosition:'center top'}}/>}
                <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(0,0,0,0.1),rgba(0,0,0,0.5))'}}/>
                <div style={{position:'absolute',right:10,top:10,display:'flex',alignItems:'center',gap:6,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(6px)',borderRadius:18,padding:'6px 12px'}}>
                  {uploadingCover?<div style={{width:12,height:12,border:'1.5px solid rgba(255,255,255,0.25)',borderTop:'1.5px solid #fff',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>:<SvgIcon name="plus" size={11} color="#fff"/>}
                  <span style={{fontSize:10.5,fontWeight:600,color:'#fff'}}>{coverUrl?'Change cover':'Add cover'}</span>
                </div>
              </button>

              <div style={{position:'relative',display:'flex',alignItems:'center',gap:14,padding:'0 4px',marginTop:-32,marginBottom:32}}>
                <AccentGlow accent={accent} size={110} style={{left:-12,top:-30}}/>
                <button onClick={()=>avatarInputRef.current?.click()} disabled={uploadingAvatar} style={{position:'relative',width:72,height:72,borderRadius:'50%',background:T.surface,border:`3px solid ${T.bg}`,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',padding:0,cursor:'pointer',flexShrink:0}}>
                  {user?.imageUrl?<img src={user.imageUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:24,fontWeight:700,color:accent,fontFamily:T.serif}}>{(user?.firstName||user?.username||'?')[0].toUpperCase()}</span>}
                  <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',opacity:uploadingAvatar?1:0,transition:'opacity 0.15s ease'}} onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=uploadingAvatar?1:0}>
                    {uploadingAvatar?<div style={{width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',borderTop:'2px solid #fff',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>:<SvgIcon name="edit" size={14} color="#fff"/>}
                  </div>
                </button>
                <button onClick={()=>avatarInputRef.current?.click()} disabled={uploadingAvatar} aria-label="Change profile photo" style={{position:'absolute',left:56,top:46,width:28,height:28,borderRadius:'50%',background:'rgba(0,0,0,0.55)',backdropFilter:'blur(10px)',WebkitBackdropFilter:'blur(10px)',border:`2px solid ${T.bg}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,zIndex:2}}>
                  <SvgIcon name="edit" size={12} color="#fff"/>
                </button>
                <div style={{position:'relative',paddingTop:18}}>
                  <div style={{fontSize:19,fontWeight:700,color:T.text,fontFamily:T.serif,letterSpacing:'-0.02em',lineHeight:1.2}}>{nickname||user?.firstName||user?.username||'Cinephile'}</div>
                  <div style={{display:'flex',alignItems:'center',gap:5,marginTop:4}}><div style={{width:5,height:5,borderRadius:'50%',background:accent,flexShrink:0}}/><span style={{fontSize:11,color:T.text2,fontWeight:500}}>{user?.primaryEmailAddress?.emailAddress}</span></div>
                </div>
              </div>

              {/* ABOUT YOU — read view; edit icon reveals borderless fields in place */}
              <div style={{marginBottom:32,paddingBottom:32,borderBottom:`1px solid ${T.hairline}`}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                  <Eyebrow color={accent}>About you</Eyebrow>
                  {!editingAbout&&<button onClick={()=>{setEditingAbout(true);setTimeout(()=>nameRef.current?.focus(),50);}} aria-label="Edit name and bio" style={{width:32,height:32,borderRadius:'50%',background:'rgba(0,0,0,0.3)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.14)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}><SvgIcon name="edit" size={13} color="#fff"/></button>}
                </div>
                {editingAbout?(
                  <div style={{animation:'fadeIn .2s ease'}}>
                    <div style={{fontSize:11,fontWeight:600,color:T.text3,marginBottom:2}}>Display name</div>
                    <input ref={nameRef} value={nicknameInput} onChange={e=>setNicknameInput(e.target.value)} maxLength={40} placeholder={user?.firstName||user?.username||'Your name'} className="cs-field" style={{width:'100%',boxSizing:'border-box',background:'transparent',border:'none',padding:'4px 0',color:'#fff',fontSize:18,fontWeight:700,fontFamily:T.serif,letterSpacing:'-0.02em',outline:'none'}}/>
                    <div style={{fontSize:11,fontWeight:600,color:T.text3,margin:'12px 0 2px',display:'flex',justifyContent:'space-between'}}>Bio<span style={{fontWeight:500}}>{bioInput.length}/160</span></div>
                    <textarea ref={bioRef} value={bioInput} onChange={e=>setBioInput(e.target.value)} maxLength={160} placeholder="Tell people about your taste in film…" rows={3} className="cs-field" style={{width:'100%',boxSizing:'border-box',background:'transparent',border:'none',padding:'4px 0',color:'rgba(255,255,255,0.85)',fontSize:14,outline:'none',fontFamily:'inherit',resize:'none',lineHeight:1.5}}/>
                    <style>{`.cs-field::placeholder{color:rgba(255,255,255,0.3)}.cs-field{caret-color:${accent}}`}</style>
                    <div style={{fontSize:11,color:T.text3,marginTop:2}}>@{user?.username||'handle'} stays the same</div>
                    <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:12}}>
                      <button onClick={()=>{cancelAbout();setEditingAbout(false);}} disabled={savingAbout} style={{background:'none',border:'none',height:36,padding:'0 12px',cursor:'pointer',fontSize:12.5,fontWeight:700,color:T.text2,fontFamily:'inherit'}}>Cancel</button>
                      <button onClick={async()=>{if(aboutDirty)await saveAbout();setEditingAbout(false);}} disabled={savingAbout} style={{display:'flex',alignItems:'center',gap:7,background:'rgba(0,0,0,0.3)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.16)',borderRadius:18,height:36,padding:'0 16px',cursor:savingAbout?'default':'pointer',fontSize:12.5,fontWeight:700,color:'#fff',fontFamily:'inherit'}}>
                        {savingAbout?<div style={{width:11,height:11,border:'1.5px solid rgba(255,255,255,0.3)',borderTop:'1.5px solid #fff',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>:<SvgIcon name="check" size={13} color="#fff"/>}
                        {savingAbout?'Saving…':'Done'}
                      </button>
                    </div>
                  </div>
                ):(
                  <div onClick={()=>{setEditingAbout(true);setTimeout(()=>nameRef.current?.focus(),50);}} style={{cursor:'text'}}>
                    <div style={{fontFamily:T.serif,fontSize:18,fontWeight:700,letterSpacing:'-0.02em',color:'#fff'}}>{nickname||user?.firstName||user?.username||'Add a display name'}</div>
                    <div style={{fontSize:14,lineHeight:1.5,color:bio?'rgba(255,255,255,0.75)':T.text3,marginTop:4,whiteSpace:'pre-wrap'}}>{bio||'Add a bio — tell people about your taste in film'}</div>
                  </div>
                )}
              </div>

              {/* Import history */}
              <button onClick={()=>window.dispatchEvent(new CustomEvent('cine:open-import'))} style={{width:'100%',display:'flex',alignItems:'center',gap:14,background:'none',border:'none',borderBottom:`1px solid ${T.hairline}`,padding:'0 0 28px',marginBottom:32,cursor:'pointer',fontFamily:'inherit',textAlign:'left'}}>
                <div style={{width:40,height:40,borderRadius:'50%',background:'rgba(0,0,0,0.3)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.14)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg></div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:700,color:'#fff'}}>Import from Letterboxd or IMDb</div>
                  <div style={{fontSize:12,color:T.text2,marginTop:2}}>Bring everything you’ve watched in one go</div>
                </div>
                <span style={{display:'flex',transform:'rotate(-90deg)'}}><SvgIcon name="chevron" size={14} color={T.text2}/></span>
              </button>

              <div style={{position:'relative',marginBottom:32}}>
                <AccentGlow accent={accent} size={160} style={{right:-40,top:-40}}/>
                <div style={{position:'relative',display:'flex',alignItems:'center',gap:16,marginBottom:18}}>
                  <CineScoreRing score={cineScore} accent={accent}/>
                  {(()=>{const lv=cineLevel(cineScore);const pill={display:'inline-flex',alignItems:'center',gap:6,background:'rgba(0,0,0,0.3)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.14)',borderRadius:16,height:32,padding:'0 13px',cursor:'pointer',fontSize:11.5,fontWeight:700,color:'#fff',fontFamily:'inherit'};return(
                  <div style={{flex:1,minWidth:0}}>
                    <Eyebrow color={accent} style={{marginBottom:4}}>CineScore</Eyebrow>
                    <div style={{fontFamily:T.serif,fontSize:18,fontWeight:700,letterSpacing:'-0.02em',color:'#fff',lineHeight:1.15}}>{lv.name}</div>
                    <div style={{fontSize:12,color:T.text2,lineHeight:1.45,marginTop:3}}>{lv.next?<><b style={{color:'#fff',fontWeight:700}}>{lv.toNext}</b> points to {lv.next.name}</>:'Top level reached'}</div>
                    <div style={{fontSize:10.5,color:T.text3,marginTop:3}}>Watch +3 · Review +8 · Save +2</div>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:11}}>
                      {cineScore<300&&<button onClick={()=>setTab('watched')} style={pill}>View watched</button>}
                      <button onClick={async()=>{setSharing(true);try{const watchedItems=watchlist.filter(m=>m.watched);const shelfSrc=(watchedItems.length?watchedItems:watchlist).filter(m=>m.poster);const d=await generateShareCard('score',{score:cineScore,name:nickname||user?.fullName||user?.firstName||user?.username||'Cinephile',handle:user?.username||null,avatar:user?.imageUrl||null,watched,reviews,saved,genres:sortedGenres.map(([g])=>g),shelf:shelfSrc.slice(0,4),shelfLabel:watchedItems.length?'RECENTLY WATCHED':'ON THE WATCHLIST',wall:watchlist.map(m=>m.poster)},accent);await shareImage(d,'My CineScroll profile',`I'm a ${cineLevel(cineScore).name} on CineScroll — come see what I'm watching`);showToast('Share card ready!');}catch(e){console.error(e);}setSharing(false);}} disabled={sharing} style={{...pill,opacity:sharing?0.6:1}}>
                        <SvgIcon name="share" size={12} color="#fff"/>{sharing?'Preparing…':'Share'}
                      </button>
                    </div>
                  </div>);})()}
                </div>
                <div style={{position:'relative',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:1,borderTop:`1px solid ${T.hairline}`,borderBottom:`1px solid ${T.hairline}`,borderRadius:0,overflow:'hidden'}}>
                  {[{label:'Titles',value:saved},{label:'Watched',value:watched},{label:'Reviews',value:reviews}].map(s=>(
                    <div key={s.label} style={{background:'transparent',boxShadow:`-1px 0 0 ${T.hairline}`,padding:'14px 6px',textAlign:'center'}}>
                      <SerifStat size={21}>{s.value}</SerifStat>
                      <Eyebrow style={{marginTop:4,fontSize:8.5}}>{s.label}</Eyebrow>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,marginBottom:32,borderTop:`1px solid ${T.hairline}`,borderBottom:`1px solid ${T.hairline}`,borderRadius:0,overflow:'hidden'}}>
                {[{label:'Avg Rating',value:avgRating,icon:'star'},{label:'Genres Explored',value:Object.keys(topGenres).length,icon:'gem'}].map(s=>(
                  <div key={s.label} style={{background:'transparent',boxShadow:`-1px 0 0 ${T.hairline}`,padding:'14px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:7}}><SvgIcon name={s.icon} size={11} color={T.text3}/><Eyebrow style={{fontSize:8.5}}>{s.label}</Eyebrow></div>
                    <SerifStat size={23}>{s.value}</SerifStat>
                  </div>
                ))}
              </div>
              <PartyHistoryRow target="me" title="Watch parties" accent={accent} style={{marginBottom:32}}/>
              {sortedGenres.length>0&&(
                <div style={{marginBottom:32}}>
                  <Eyebrow style={{marginBottom:12}}>Top Genres</Eyebrow>
                  {sortedGenres.map(([genre,count])=>(
                    <div key={genre} style={{marginBottom:10}}>
                      <div style={{marginBottom:6}}><span style={{fontSize:13,color:T.text,fontWeight:500}}>{genre}</span></div>
                      <div style={{height:2,borderRadius:2,background:T.hairline}}><div style={{height:'100%',borderRadius:2,background:accent,width:`${(count/sortedGenres[0][1])*100}%`,transition:'width 0.8s ease'}}/></div>
                    </div>
                  ))}
                </div>
              )}
              {/* Privacy */}
              <div style={{marginBottom:32}}>
                <Eyebrow color={accent} style={{marginBottom:4}}>Privacy</Eyebrow>
                <SetRow title="Public watchlist" sub={watchlistPublic?'Anyone can see your watchlist':'Only you can see your watchlist'} right={<Switch on={watchlistPublic} onClick={togglePrivacy} disabled={loadingSettings} label="Public watchlist"/>}/>
                <button type="button" onClick={()=>setShowBlocked(v=>!v)} style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'13px 0',borderTop:`1px solid ${T.hairline}`,background:'none',borderLeft:'none',borderRight:'none',borderBottom:'none',cursor:'pointer',fontFamily:'inherit',textAlign:'left'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13.5,fontWeight:600,color:'#fff'}}>Blocked accounts</div>
                    <div style={{fontSize:11.5,color:T.text3,marginTop:2}}>People who can’t contact or follow you</div>
                  </div>
                  <span style={{color:T.text3,fontSize:14,transform:showBlocked?'rotate(90deg)':'none',transition:'transform .2s'}}>›</span>
                </button>
                {showBlocked&&<div style={{paddingBottom:6}}><BlockedList accent={accent}/></div>}
              </div>

              {/* Notifications */}
              <div style={{marginBottom:32}}>
                <Eyebrow color={accent} style={{marginBottom:4}}>Notifications</Eyebrow>
                <SetRow title="Email" sub={user?.primaryEmailAddress?.emailAddress?`Send to ${user.primaryEmailAddress.emailAddress}`:'Messages & follows to your inbox'} right={<Switch on={notifyPrefs.email} onClick={()=>toggleNotify('email')} disabled={loadingSettings} label="Email notifications"/>}/>
                <SetRow title="Web push" sub={hasWebPush?'On for this browser':'Alerts when you’re away'} right={hasWebPush
                  ?<Switch on={notifyPrefs.web} onClick={()=>toggleNotify('web')} disabled={loadingSettings} label="Web push"/>
                  :<button type="button" onClick={enableWebPush} disabled={pushBusy||loadingSettings} style={{background:'rgba(0,0,0,0.3)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.14)',borderRadius:16,height:30,padding:'0 13px',cursor:'pointer',fontSize:11.5,fontWeight:700,color:'#fff',fontFamily:'inherit',flexShrink:0}}>{pushBusy?'…':'Turn on'}</button>}/>
                <div style={{fontSize:10.5,letterSpacing:2.2,textTransform:'uppercase',fontWeight:700,color:T.text3,margin:'18px 0 4px'}}>Notify me about</div>
                {[
                  {key:'messages',label:'Messages & requests'},
                  {key:'follows',label:'New followers'},
                  {key:'activity',label:'Likes, mentions & folder activity'},
                ].map(row=>(<SetRow key={row.key} title={row.label} right={<Switch on={notifyPrefs[row.key]} onClick={()=>toggleNotify(row.key)} disabled={loadingSettings} label={row.label}/>}/>))}
              </div>

                            <button type="button" onClick={()=>setShowTmdb(true)} style={{display:'block',width:'100%',background:'none',border:'none',padding:'0 0 14px',cursor:'pointer',textAlign:'center',fontFamily:'inherit'}}>
                <span style={{fontSize:11,color:T.text3,lineHeight:1.4,textDecoration:'underline',textDecorationColor:'rgba(255,255,255,0.15)',textUnderlineOffset:3}}>
                  Movie data provided by TMDB · Disclaimer
                </span>
              </button>
              <div style={{display:'flex',justifyContent:'center',gap:14,paddingBottom:16,marginTop:-4}}>
                <a href={`/privacy?a=${String(accent||'').replace('#','')}`} target="_blank" rel="noopener" style={{fontSize:11,color:T.text3,textDecoration:'underline',textDecorationColor:'rgba(255,255,255,0.15)',textUnderlineOffset:3}}>Privacy policy</a>
                <a href={`/terms?a=${String(accent||'').replace('#','')}`} target="_blank" rel="noopener" style={{fontSize:11,color:T.text3,textDecoration:'underline',textDecorationColor:'rgba(255,255,255,0.15)',textUnderlineOffset:3}}>Terms of use</a>
              </div>
              {showTmdb&&(
                <div onClick={()=>setShowTmdb(false)} style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(12px)',display:'flex',alignItems:'center',justifyContent:'center',padding:24,animation:'fadeIn 0.2s ease'}}>
                  <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:340,background:'rgba(18,18,26,0.82)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',border:`1px solid ${T.hairline}`,borderRadius:18,padding:'22px 20px 20px',position:'relative'}}>
                    <button type="button" onClick={()=>setShowTmdb(false)} style={{position:'absolute',top:12,right:12,background:'transparent',border:'none',cursor:'pointer',padding:4}}><SvgIcon name="close" size={13} color={T.text2}/></button>
                    <div style={{fontFamily:T.serif,letterSpacing:'-0.02em',fontSize:17,fontWeight:700,color:T.text,marginBottom:12}}>Data disclaimer</div>
                    <div style={{fontSize:13,color:T.text2,lineHeight:1.55,marginBottom:14}}>
                      This product uses the TMDB API but is not endorsed or certified by TMDB.
                    </div>
                    <div style={{fontSize:12,color:T.text3,lineHeight:1.5,marginBottom:16}}>
                      Titles, posters, ratings, and related metadata come from The Movie Database (TMDB). CineScroll is an independent discovery app and is not affiliated with TMDB.
                    </div>
                    <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:12,fontWeight:600,color:accent,textDecoration:'none'}}>
                      Visit themoviedb.org →
                    </a>
                  </div>
                </div>
              )}
<button onClick={handleSignOut} disabled={signingOut||signedOut} style={{width:'100%',background:'rgba(0,0,0,0.25)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:22,padding:'12px',marginBottom:6,cursor:signingOut||signedOut?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,fontFamily:'inherit',transition:'all 0.3s ease'}}>
                {signedOut?(<><div style={{width:16,height:16,borderRadius:'50%',background:accent,display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="check" size={10} color="#000"/></div><span style={{fontSize:13,color:accent,fontWeight:600}}>Signed out</span></>):signingOut?(<><div style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.1)',borderTop:'2px solid rgba(255,255,255,0.6)',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/><span style={{fontSize:13,color:'rgba(255,255,255,0.5)'}}>Signing out...</span></>):(<><SvgIcon name="logout" size={15} color="rgba(255,255,255,0.4)"/><span style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>Sign out</span></>)}
              </button>
              <button type="button" onClick={()=>setShowDelete(true)} style={{display:'block',margin:'0 auto',padding:'10px 12px calc(10px + env(safe-area-inset-bottom))',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:600,color:'rgba(255,120,120,0.75)'}}>Delete account</button>
              {showDelete&&<DeleteAccountSheet accent={accent} onClose={()=>setShowDelete(false)} onDeleted={async()=>{try{await signOut();}catch{}window.location.href='/?deleted=1';}}/>}
            </div>
          )}
          {tab==='watchlist'&&(
            <div>
              <div style={{margin:'16px 18px 0',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:1,borderTop:`1px solid ${T.hairline}`,borderBottom:`1px solid ${T.hairline}`,borderRadius:0,overflow:'hidden'}}>
                <div style={{background:'transparent',boxShadow:`-1px 0 0 ${T.hairline}`,padding:'13px 8px',textAlign:'center'}}><SerifStat size={18}>{watchlist.length}</SerifStat><Eyebrow style={{marginTop:3,fontSize:8.5}}>Titles</Eyebrow></div>
                <div style={{background:'transparent',boxShadow:`-1px 0 0 ${T.hairline}`,padding:'13px 8px',textAlign:'center'}}><SerifStat size={18} color={accent}>{avgRating}</SerifStat><Eyebrow style={{marginTop:3,fontSize:8.5}}>Avg Rating</Eyebrow></div>
                <div style={{background:'transparent',boxShadow:`-1px 0 0 ${T.hairline}`,padding:'13px 8px',textAlign:'center'}}><SerifStat size={18} color="#7BC8FF">{watched}</SerifStat><Eyebrow style={{marginTop:3,fontSize:8.5}}>Watched</Eyebrow></div>
              </div>
              <div style={{padding:'14px 18px 6px',display:'flex',flexDirection:'column',gap:9}}>
                <div style={{position:'relative'}}><div style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)'}}><SvgIcon name="search" size={13} color={T.text3}/></div><input value={watchlistSearch} onChange={e=>setWatchlistSearch(e.target.value)} placeholder="Search watchlist..." style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${T.hairline}`,borderRadius:12,padding:'9px 12px 9px 34px',color:T.text,fontSize:13,outline:'none',fontFamily:'inherit'}}/></div>
                <div style={{display:'flex',gap:5,alignItems:'center'}}>
                  <div style={{display:'flex',gap:4,flex:1}}>{[['all','All'],['movies','Movies'],['tv','TV']].map(([val,label])=>(<button key={val} onClick={()=>setWatchlistFilter(val)} style={{flex:1,background:watchlistFilter===val?accent:'transparent',border:`1px solid ${watchlistFilter===val?accent:T.hairlineStrong}`,borderRadius:20,padding:'5px 6px',cursor:'pointer',fontSize:11,fontWeight:watchlistFilter===val?700:500,color:watchlistFilter===val?'#07070F':T.text2,fontFamily:'inherit',transition:'all 0.2s ease'}}>{label}</button>))}</div>
                  <select value={watchlistSort} onChange={e=>setWatchlistSort(e.target.value)} style={{background:T.surface2,border:`1px solid ${T.hairline}`,borderRadius:20,padding:'5px 8px',color:T.text2,fontSize:11,outline:'none',fontFamily:'inherit',cursor:'pointer'}}><option value="date">Date added</option><option value="rating">Rating</option><option value="title">A-Z</option></select>
                </div>
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <Eyebrow color={T.text3} style={{marginBottom:0}}>On my platforms</Eyebrow>
                    {watchlistPlatform?(
                      <button type="button" onClick={()=>setWatchlistPlatform('')} style={{background:'none',border:'none',cursor:'pointer',fontSize:11,color:accent,fontWeight:600,fontFamily:'inherit',padding:0}}>Clear</button>
                    ):null}
                  </div>
                  <div style={{display:'flex',gap:6,overflowX:'auto',WebkitOverflowScrolling:'touch',scrollbarWidth:'none',paddingBottom:2}}>
                    {WATCHLIST_PLATFORMS.map(p=>{
                      const on=watchlistPlatform===p.name;
                      return (
                        <button key={p.name} type="button" onClick={()=>setWatchlistPlatform(on?'':p.name)} style={{flexShrink:0,background:on?`${p.color}22`:'transparent',border:`1px solid ${on?p.color+'66':T.hairlineStrong}`,borderRadius:20,padding:'5px 12px',cursor:'pointer',fontSize:11,fontWeight:on?700:500,color:on?p.color:T.text2,fontFamily:'inherit',transition:'all 0.2s ease'}}>{p.name}</button>
                      );
                    })}
                  </div>
                </div>
                {platformAlerts.length>0&&(
                  <div style={{marginTop:12,display:'flex',flexDirection:'column',gap:8}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <Eyebrow color={T.text3} style={{marginBottom:0}}>Platform updates</Eyebrow>
                      <button type="button" onClick={()=>setPlatformAlerts([])} style={{background:'none',border:'none',cursor:'pointer',fontSize:11,color:T.text3,fontFamily:'inherit',padding:0}}>Dismiss</button>
                    </div>
                    {platformAlerts.map((a,i)=>(
                      <div key={i} style={{display:'flex',gap:10,alignItems:'center',padding:'10px 12px',borderRadius:14,border:`1px solid ${T.hairline}`,background:T.surface2}}>
                        {a.poster?(
                          <div style={{width:28,height:40,borderRadius:6,overflow:'hidden',flexShrink:0}}><img src={a.poster} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/></div>
                        ):(
                          <div style={{width:28,height:40,borderRadius:6,background:T.surface,flexShrink:0}}/>
                        )}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12.5,fontWeight:700,color:T.text,fontFamily:T.serif,letterSpacing:'-0.02em',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.title}</div>
                          <div style={{fontSize:11,color:a.kind==='new'?'#7BFF9E':'#FF8B8B',marginTop:2,fontWeight:600}}>
                            {a.kind==='new'?`Now on ${a.platform}`:`Left ${a.platform}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {loadingData||(loadingProviders&&watchlistPlatform)?(<div style={{textAlign:'center',padding:24,color:T.text3,fontSize:13,display:'flex',flexDirection:'column',alignItems:'center',gap:8}}><div style={{width:20,height:20,border:`2px solid rgba(255,255,255,0.1)`,borderTop:`2px solid ${accent}`,borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>{loadingProviders?'Checking platforms...':'Loading...'}</div>)
              :filteredWatchlist.length===0?(<div style={{textAlign:'center',padding:'24px 20px',display:'flex',flexDirection:'column',alignItems:'center',gap:12}}><SvgIcon name="bookmark" size={26} color={T.hairlineStrong}/><div style={{fontSize:13.5,color:T.text3}}>{watchlistSearch?'No matches':watchlistPlatform?`Nothing on ${watchlistPlatform} in your watchlist`:'Your watchlist is empty'}</div>{!watchlistSearch&&!watchlistPlatform&&<button onClick={()=>window.dispatchEvent(new CustomEvent('cine:open-import'))} style={{background:'none',border:'none',padding:0,cursor:'pointer',fontSize:12.5,fontWeight:700,color:'#fff',fontFamily:'inherit'}}>Import from Letterboxd or IMDb</button>}{!watchlistSearch&&!watchlistPlatform&&<button onClick={()=>{if(onDiscover){onDiscover();}else if(onClose){onClose();}}} style={{marginTop:4,background:accent,border:'none',borderRadius:20,padding:'10px 18px',cursor:'pointer',fontSize:12,fontWeight:700,color:'#07070F',fontFamily:'inherit'}}>Discover movies</button>}{watchlistPlatform&&<button onClick={()=>setWatchlistPlatform('')} style={{marginTop:4,background:'transparent',border:`1px solid ${T.hairlineStrong}`,borderRadius:20,padding:'10px 18px',cursor:'pointer',fontSize:12,fontWeight:600,color:T.text2,fontFamily:'inherit'}}>Show all titles</button>}</div>)
              :(
                <div style={{display:'flex',flexDirection:'column',padding:'0 18px 12px'}}>
                  {filteredWatchlist.map((m,i)=>(
                    <div key={m.movie_id} style={{display:'flex',gap:10,alignItems:'flex-start',padding:'13px 0',borderTop:i>0?`1px solid ${T.hairline}`:'none'}}>
                      <div style={{width:18,textAlign:'center',flexShrink:0,marginTop:5}}><span style={{fontSize:11,fontWeight:700,fontFamily:T.serif,letterSpacing:'-0.02em',color:i<3?accent:T.text3}}>{i+1}</span></div>
                      <button onClick={()=>handleWatchlistItemClick(m)} style={{width:52,height:72,borderRadius:10,flexShrink:0,overflow:'hidden',background:m.gradient||GRADS[i%GRADS.length],position:'relative',border:'none',cursor:'pointer',padding:0}}>
                        {m.poster&&<img src={m.poster} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
                        {m.watched&&<div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="check" size={14} color={accent}/></div>}
                        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:22,height:22,borderRadius:'50%',background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="play" size={10} color="#fff" filled/></div></div>
                      </button>
                      <div style={{flex:1,minWidth:0}}>
                        <button onClick={()=>handleWatchlistItemClick(m)} style={{background:'none',border:'none',cursor:'pointer',padding:0,textAlign:'left',width:'100%'}}>
                          <div style={{display:'flex',alignItems:'flex-start',gap:5,marginBottom:3}}><span style={{fontSize:14,fontWeight:700,color:m.watched?T.text3:T.text,fontFamily:T.serif,letterSpacing:'-0.02em',lineHeight:1.2,textDecoration:m.watched?'line-through':'none'}}>{m.title}</span>{m.is_tv&&<span style={{fontSize:9,color:'#7BC8FF',border:'1px solid #7BC8FF44',borderRadius:4,padding:'1px 4px',flexShrink:0,marginTop:2,fontWeight:700}}>TV</span>}</div>
                        </button>
                        <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:6}}><span style={{fontSize:11,color:T.text3}}>{m.year}</span><SvgIcon name="star" size={10} color={accent} filled/><span style={{fontSize:11,color:accent,fontWeight:600}}>{m.rating}</span>{m.watched&&<span style={{fontSize:9,color:accent,background:`${accent}14`,borderRadius:10,padding:'1px 6px',fontWeight:700}}>Watched</span>}</div>
                        {m.genre&&m.genre.length>0&&<div style={{display:'flex',gap:3,flexWrap:'wrap',marginBottom:8}}>{m.genre.slice(0,3).map(g=><span key={g} style={{fontSize:9,color:T.text3,background:T.surface2,border:`1px solid ${T.hairline}`,borderRadius:20,padding:'2px 6px'}}>{g}</span>)}</div>}
                        <div style={{display:'flex',gap:5}}>
                          <button onClick={()=>toggleWatched(m)} style={{display:'flex',alignItems:'center',gap:3,background:m.watched?`${accent}14`:'transparent',border:`1px solid ${m.watched?accent+'40':T.hairlineStrong}`,borderRadius:20,padding:'3px 9px',cursor:'pointer',fontSize:10,color:m.watched?accent:T.text2,fontFamily:'inherit',fontWeight:600}}><SvgIcon name="check" size={9} color={m.watched?accent:T.text2}/>{m.watched?'Watched':'Mark watched'}</button>
                          <button onClick={()=>handleWatchlistItemClick(m)} style={{display:'flex',alignItems:'center',gap:3,background:'transparent',border:`1px solid ${T.hairlineStrong}`,borderRadius:20,padding:'3px 9px',cursor:'pointer',fontSize:10,color:T.text2,fontFamily:'inherit',fontWeight:600}}><SvgIcon name="play" size={9} color={T.text2} filled/>Trailer</button>
                          <button onClick={()=>removeFromWatchlist(m)} style={{background:'transparent',border:`1px solid ${T.hairline}`,borderRadius:20,padding:'3px 7px',cursor:'pointer',display:'flex',alignItems:'center'}}><SvgIcon name="trash" size={10} color={T.text3}/></button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); if(onDiscover){ onDiscover(); } else if(onClose){ onClose(); } }}
                    style={{display:'flex',alignItems:'center',gap:10,padding:'16px 0 4px',justifyContent:'center',marginTop:4,borderTop:`1px solid ${T.hairline}`,width:'100%',background:'none',borderLeft:'none',borderRight:'none',borderBottom:'none',cursor:'pointer',fontFamily:'inherit'}}
                  >
                    <SvgIcon name="plus" size={13} color={T.text3}/>
                    <div style={{textAlign:'left'}}><div style={{fontSize:12,color:T.text2,fontWeight:500}}>Add something to your watchlist</div><div style={{fontSize:10,color:T.text3,marginTop:1}}>Find your next great watch</div></div>
                  </button>
                </div>
              )}
            </div>
          )}
          {tab==='watched'&&(
            <div style={{padding:'16px 18px'}}>
              {/* Summary banner */}
              <div style={{position:'relative',borderRadius:20,padding:'20px 18px',marginBottom:18,overflow:'hidden',border:`1px solid rgba(255,255,255,0.08)`,background:T.surface,backdropFilter:'blur(18px)',WebkitBackdropFilter:'blur(18px)'}}>
                <AccentGlow accent={accent} size={140} style={{right:-30,top:-40}}/>
                <div style={{position:'relative',zIndex:1}}>
                  <Eyebrow color={T.text3} style={{marginBottom:8}}>Your history</Eyebrow>
                  <div style={{fontFamily:T.serif,letterSpacing:'-0.02em',fontSize:22,fontWeight:700,color:T.text,lineHeight:1.25,marginBottom:6}}>
                    {watched===0
                      ? <>You haven&apos;t marked anything as <span style={{color:accent}}>seen</span> yet</>
                      : <>You&apos;ve watched a total of <span style={{color:accent}}>{watched}</span> {watched===1?'title':'titles'}</>}
                  </div>
                  <div style={{fontSize:12.5,color:T.text3,lineHeight:1.5}}>
                    {watched===0
                      ? 'Tap Seen on any film in the feed to log it here and grow your CineScore.'
                      : watched<5
                        ? 'Nice start — keep logging watches to build your CineScore.'
                        : watched<20
                          ? 'Solid streak. Your taste is taking shape.'
                          : 'Deep log. You know what you like.'}
                  </div>
                  {watched>0&&(
                    <div style={{display:'flex',gap:16,marginTop:14}}>
                      <div>
                        <div style={{fontSize:18,fontWeight:700,color:accent,fontFamily:T.serif}}>{watched}</div>
                        <div style={{fontSize:10,color:T.text3,letterSpacing:0.5,textTransform:'uppercase',fontWeight:600}}>Watched</div>
                      </div>
                      <div style={{width:1,background:T.hairline}}/>
                      <div>
                        <div style={{fontSize:18,fontWeight:700,color:T.text,fontFamily:T.serif}}>{watchlist.filter(m=>!m.watched).length}</div>
                        <div style={{fontSize:10,color:T.text3,letterSpacing:0.5,textTransform:'uppercase',fontWeight:600}}>Still to watch</div>
                      </div>
                      <div style={{width:1,background:T.hairline}}/>
                      <div>
                        <div style={{fontSize:18,fontWeight:700,color:T.text,fontFamily:T.serif}}>{cineScore}</div>
                        <div style={{fontSize:10,color:T.text3,letterSpacing:0.5,textTransform:'uppercase',fontWeight:600}}>CineScore</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {loadingData?(
                <div style={{textAlign:'center',padding:30,color:T.text3,fontSize:13,display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
                  <div style={{width:20,height:20,border:`2px solid rgba(255,255,255,0.1)`,borderTop:`2px solid ${accent}`,borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
                  Loading...
                </div>
              ):watched===0?(
                <div style={{textAlign:'center',padding:'28px 16px',display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
                  <SvgIcon name="check" size={28} color={T.hairlineStrong}/>
                  <div style={{fontSize:13.5,color:T.text3}}>Nothing watched yet</div>
                  <button
                    type="button"
                    onClick={()=>{if(onDiscover){onDiscover();}else if(onClose){onClose();}}}
                    style={{marginTop:4,background:accent,border:'none',borderRadius:20,padding:'10px 18px',cursor:'pointer',fontSize:12,fontWeight:700,color:'#07070F',fontFamily:'inherit'}}
                  >
                    Browse the feed
                  </button>
                </div>
              ):(
                <div style={{display:'flex',flexDirection:'column'}}>
                  {watchlist.filter(m=>m.watched).sort((a,b)=>(b.saved_at||0)-(a.saved_at||0)).map((m,i)=>(
                    <div key={m.movie_id} style={{display:'flex',gap:10,alignItems:'flex-start',padding:'13px 0',borderTop:i>0?`1px solid ${T.hairline}`:'none'}}>
                      <button type="button" onClick={()=>handleWatchlistItemClick(m)} style={{width:48,height:70,borderRadius:10,overflow:'hidden',flexShrink:0,padding:0,border:'none',cursor:'pointer',background:T.surface2,position:'relative'}}>
                        {m.poster?<img src={m.poster} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<div style={{width:'100%',height:'100%',background:T.surface}}/>}
                        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.25)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <div style={{width:22,height:22,borderRadius:'50%',background:`${accent}cc`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <SvgIcon name="check" size={11} color="#07070F" filled/>
                          </div>
                        </div>
                      </button>
                      <div style={{flex:1,minWidth:0}}>
                        <button type="button" onClick={()=>handleWatchlistItemClick(m)} style={{background:'none',border:'none',cursor:'pointer',padding:0,textAlign:'left',width:'100%'}}>
                          <div style={{display:'flex',alignItems:'flex-start',gap:5,marginBottom:3}}>
                            <span style={{fontSize:14,fontWeight:700,color:T.text,fontFamily:T.serif,letterSpacing:'-0.02em',lineHeight:1.2}}>{m.title}</span>
                            {m.is_tv&&<span style={{fontSize:9,color:'#7BC8FF',border:'1px solid #7BC8FF44',borderRadius:4,padding:'1px 4px',flexShrink:0,marginTop:2,fontWeight:700}}>TV</span>}
                          </div>
                        </button>
                        <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:8}}>
                          <span style={{fontSize:11,color:T.text3}}>{m.year}</span>
                          <SvgIcon name="star" size={10} color={accent} filled/>
                          <span style={{fontSize:11,color:accent,fontWeight:600}}>{m.rating}</span>
                          <span style={{fontSize:9,color:accent,background:`${accent}14`,borderRadius:10,padding:'1px 6px',fontWeight:700}}>Watched</span>
                        </div>
                        <div style={{display:'flex',gap:5}}>
                          <button type="button" onClick={()=>toggleWatched(m)} style={{display:'flex',alignItems:'center',gap:3,background:`${accent}14`,border:`1px solid ${accent}40`,borderRadius:20,padding:'3px 9px',cursor:'pointer',fontSize:10,color:accent,fontFamily:'inherit',fontWeight:600}}>
                            <SvgIcon name="check" size={9} color={accent}/>Unmark
                          </button>
                          <button type="button" onClick={()=>handleWatchlistItemClick(m)} style={{display:'flex',alignItems:'center',gap:3,background:'transparent',border:`1px solid ${T.hairlineStrong}`,borderRadius:20,padding:'3px 9px',cursor:'pointer',fontSize:10,color:T.text2,fontFamily:'inherit',fontWeight:600}}>
                            <SvgIcon name="play" size={9} color={T.text2} filled/>Trailer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab==='reviews'&&(
            <div style={{padding:'16px 18px'}}>
              {loadingData?<div style={{textAlign:'center',padding:30,color:T.text3,fontSize:13}}>Loading...</div>
              :userReviews.length===0?(<div style={{textAlign:'center',padding:'32px 0',display:'flex',flexDirection:'column',alignItems:'center',gap:10}}><SvgIcon name="chat" size={26} color={T.hairlineStrong}/><div style={{fontSize:13.5,color:T.text3}}>No reviews yet</div></div>)
              :(<div style={{display:'flex',flexDirection:'column'}}>
                {userReviews.map((r,i)=>(
                  <div key={r.id} style={{padding:'14px 0',borderTop:i>0?`1px solid ${T.hairline}`:'none'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><span style={{fontSize:14,fontWeight:700,color:T.text,fontFamily:T.serif}}>{r.movie_title}</span><span style={{fontSize:11,color:T.text3}}>{r.time}</span></div>
                    {r.rating>0&&<div style={{display:'flex',gap:2,marginBottom:7}}>{[1,2,3,4,5].map(s=><SvgIcon key={s} name="star" size={11} color={s<=r.rating?accent:T.hairlineStrong} filled={s<=r.rating}/>)}</div>}
                    <p style={{fontSize:13,color:T.text2,lineHeight:1.55,margin:0}}>{r.text}</p>
                  </div>
                ))}
              </div>)}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
