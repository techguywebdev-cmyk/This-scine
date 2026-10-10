'use client';
import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import ImportSheet from '../ImportSheet';
import { SvgIcon, T, ambient } from './shared';

export function NotificationsPanel({onClose,accent,notifications,loading,onMarkRead,onFollowBack,onOpenChat}){
  const timeAgo=(ts)=>{const diff=Date.now()-new Date(ts).getTime();const mins=Math.floor(diff/60000);if(mins<1)return'now';if(mins<60)return`${mins}m`;const hrs=Math.floor(mins/60);if(hrs<24)return`${hrs}h`;return`${Math.floor(hrs/24)}d`;};
  const notifIcon=(type)=>{
    if(type==='follow')return{icon:'userPlus',color:'#7BC8FF'};
    if(type==='follow_request')return{icon:'userPlus',color:accent};
    if(type==='like')return{icon:'heart',color:'#FF6B8A'};
    if(type==='message_request'||type==='message')return{icon:'chat',color:'#7BC8FF'};
    if(type==='release_reminder')return{icon:'calendar',color:'#FFD166'};
    if(type==='mention')return{icon:'chat',color:accent};
    return{icon:'bell',color:accent};
  };
  const openMention=(n)=>{
    const d=n.data||{};
    if(!d.movie_id)return;
    window.dispatchEvent(new CustomEvent('cine:open-title',{detail:{id:d.movie_id,title:d.title,poster:d.poster,mediaType:d.media_type||'movie',isTV:d.media_type==='tv',accent,initialTab:'comments',highlightCommentId:d.review_id}}));
    onClose();
  };
  return(
    <>
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:105,background:'rgba(0,0,0,0.65)',backdropFilter:'blur(10px)',animation:'fadeIn 0.2s ease'}}/>
    <div style={{position:'fixed',top:0,left:0,right:0,zIndex:106,background:ambient(accent),borderRadius:'0 0 24px 24px',border:`1px solid ${T.hairline}`,borderTop:'none',maxHeight:'70vh',display:'flex',flexDirection:'column',animation:'notifDrop 0.32s cubic-bezier(0.22,1,0.36,1)',paddingTop:'env(safe-area-inset-top,0px)'}}>
      <style>{`@keyframes notifDrop{from{transform:translateY(-100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{padding:'18px 18px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:`1px solid ${T.hairline}`,flexShrink:0}}>
        <span style={{fontFamily:T.serif,fontSize:21,letterSpacing:'-0.02em',fontWeight:700,color:T.text}}>Notifications</span>
        <button onClick={onClose} style={{background:'transparent',border:'none',width:28,height:28,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><SvgIcon name="close" size={13} color={T.text2}/></button>
      </div>
      <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',scrollbarWidth:'none'}}>
        {loading?(
          <div style={{display:'flex',justifyContent:'center',padding:36}}><div style={{width:22,height:22,border:`2px solid rgba(255,255,255,0.1)`,borderTop:`2px solid ${accent}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/></div>
        ):notifications.length===0?(
          <div style={{textAlign:'center',padding:'40px 24px',display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
            <SvgIcon name="inbox" size={28} color={T.hairlineStrong}/>
            <div style={{fontSize:13.5,color:T.text2,fontWeight:600}}>No notifications yet</div>
            <div style={{fontSize:11.5,color:T.text3}}>New followers and activity will show up here</div>
          </div>
        ):(
          <div style={{padding:'4px 18px 16px'}}>
            {notifications.map((n,i)=>{
              const ni=notifIcon(n.type);
              return(
                <div key={n.id||i} onClick={()=>{if(!n.read)onMarkRead(n.id);if(n.type==='mention'){openMention(n);return;}if((n.type==='message_request'||n.type==='message')&&onOpenChat){onOpenChat({user_id:n.user_id,username:n.username,avatar_url:n.avatar_url});onClose();}}} style={{display:'flex',gap:12,alignItems:'center',padding:'12px 0',borderBottom:i<notifications.length-1?`1px solid ${T.hairline}`:'none',cursor:n.read?'default':'pointer',opacity:n.read?0.5:1,transition:'opacity 0.2s ease'}}>
                  <div style={{width:38,height:38,borderRadius:'50%',background:`${ni.color}16`,border:`1px solid ${ni.color}38`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,position:'relative',overflow:'hidden'}}>
                    {n.type==='release_reminder'&&n.data?.poster?<img src={n.data.poster} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:n.avatar_url&&n.type!=='release_reminder'?<img src={n.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<SvgIcon name={ni.icon} size={16} color={ni.color}/>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    {n.type==='release_reminder'?(
                    <div style={{fontSize:13,color:T.text,lineHeight:1.4}}>
                      <span style={{fontFamily:T.serif,letterSpacing:'-0.02em',fontWeight:700}}>{n.data?.title||'A film you saved'}</span>{' '}
                      {n.data?.when==='tomorrow'?'releases tomorrow':'is out today'}
                    </div>
                    ):n.type==='mention'?(
                    <div style={{fontSize:13,color:T.text,lineHeight:1.4}}>
                      <span style={{fontWeight:700}}>@{n.username||'someone'}</span> mentioned you{n.data?.title?<> on <span style={{fontWeight:700}}>{n.data.title}</span></>:''}
                      {n.data?.snippet&&<div style={{fontSize:12,color:T.text2,marginTop:3,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>“{n.data.snippet}”</div>}
                    </div>
                    ):(
                    <div style={{fontSize:13,color:T.text,lineHeight:1.4}}>
                      <span style={{fontWeight:700}}>@{n.username||'someone'}</span>{' '}
                      {n.type==='follow'?'started following you':n.type==='follow_request'?'requested to follow you':n.type==='message_request'?'sent you a message request':n.type==='message'?'sent you a message':n.type==='like'?'liked your review':'sent a notification'}
                    </div>
                    )}
                    <div style={{fontSize:11,color:T.text3,marginTop:2}}>{timeAgo(n.created_at)} ago</div>
                  </div>
                  {n.type==='follow'&&!n.followedBack&&(
                    <button onClick={(e)=>{e.stopPropagation();onFollowBack(n);}} style={{background:accent,border:'none',borderRadius:18,padding:'6px 14px',cursor:'pointer',fontSize:11,fontWeight:700,color:'#07070F',fontFamily:'inherit',flexShrink:0}}>Follow back</button>
                  )}
                  {n.type==='mention'&&n.data?.poster&&<div style={{width:30,aspectRatio:'2/3',borderRadius:3,overflow:'hidden',flexShrink:0}}><img src={n.data.poster} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/></div>}
                  {(n.type==='message_request'||n.type==='message')&&onOpenChat&&(
                    <button onClick={(e)=>{e.stopPropagation();onOpenChat({user_id:n.user_id,username:n.username,avatar_url:n.avatar_url});onClose();}} style={{background:`${accent}18`,border:`1px solid ${accent}44`,borderRadius:18,padding:'6px 14px',cursor:'pointer',fontSize:11,fontWeight:700,color:accent,fontFamily:'inherit',flexShrink:0}}>Reply</button>
                  )}
                  {!n.read&&<div style={{width:6,height:6,borderRadius:'50%',background:accent,flexShrink:0}}/>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
