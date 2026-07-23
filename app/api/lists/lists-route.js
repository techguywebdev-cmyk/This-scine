import { auth, clerkClient } from '@clerk/nextjs/server';

const SUPABASE_URL = 'https://gwvfihozxyboirkaixqb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dmZpaG96eHlib2lya2FpeHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjYxMDEsImV4cCI6MjA5NTY0MjEwMX0.y6zfENBPd6iJvFEf5-nRFeiWvVTzlDMAkNLr4CGfsGc';
const db = (path) => `${SUPABASE_URL}/rest/v1/${path}`;
const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };

async function enrichLists(lists, viewerId) {
  if (!lists.length) return [];
  const listIds = lists.map(l => l.id);
  const idList = listIds.join(',');
  const userIds = [...new Set(lists.map(l => l.user_id))];

  const [mr, fr, rr, posterRes] = await Promise.all([
    fetch(`${db('community_list_movies')}?list_id=in.(${idList})&select=list_id`, { headers }).then(r => r.json()),
    fetch(`${db('community_list_follows')}?list_id=in.(${idList})&select=list_id`, { headers }).then(r => r.json()),
    fetch(`${db('community_list_ratings')}?list_id=in.(${idList})&select=list_id,rating`, { headers }).then(r => r.json()),
    fetch(`${db('community_list_movies')}?list_id=in.(${idList})&select=list_id,movie_poster,movie_accent&order=added_at.asc`, { headers }).then(r => r.json()),
  ]);

  const movieCounts={}, followerCounts={}, ratingTotals={}, ratingCounts={}, posterMap={};
  for (const row of Array.isArray(mr)?mr:[]) movieCounts[row.list_id]=(movieCounts[row.list_id]||0)+1;
  for (const row of Array.isArray(fr)?fr:[]) followerCounts[row.list_id]=(followerCounts[row.list_id]||0)+1;
  for (const row of Array.isArray(rr)?rr:[]) {
    ratingTotals[row.list_id]=(ratingTotals[row.list_id]||0)+row.rating;
    ratingCounts[row.list_id]=(ratingCounts[row.list_id]||0)+1;
  }
  for (const row of Array.isArray(posterRes)?posterRes:[]) {
    if (!posterMap[row.list_id]) posterMap[row.list_id]={poster:row.movie_poster,accent:row.movie_accent};
  }

  let viewerFollows=new Set(), viewerRatings={};
  if (viewerId) {
    const [vf, vr] = await Promise.all([
      fetch(`${db('community_list_follows')}?list_id=in.(${idList})&user_id=eq.${viewerId}&select=list_id`, { headers }).then(r=>r.json()),
      fetch(`${db('community_list_ratings')}?list_id=in.(${idList})&user_id=eq.${viewerId}&select=list_id,rating`, { headers }).then(r=>r.json()),
    ]);
    for (const r of Array.isArray(vf)?vf:[]) viewerFollows.add(r.list_id);
    for (const r of Array.isArray(vr)?vr:[]) viewerRatings[r.list_id]=r.rating;
  }

  const userMap={};
  try {
    const {data:users}=await clerkClient.users.getUserList({userId:userIds,limit:userIds.length});
    for (const u of users) {
      userMap[u.id]={
        username:u.username||u.emailAddresses?.[0]?.emailAddress?.split('@')[0]||'user',
        display_name:u.firstName?`${u.firstName}${u.lastName?' '+u.lastName:''}`:(u.username||'user'),
        avatar_url:u.imageUrl||null,
      };
    }
    if (userIds.length) {
      const nickRows=await fetch(`${db('user_settings')}?user_id=in.(${userIds.join(',')})&select=user_id,nickname`,{headers}).then(r=>r.json());
      for (const row of Array.isArray(nickRows)?nickRows:[]) {
        if (row.nickname&&userMap[row.user_id]) userMap[row.user_id].display_name=row.nickname;
      }
    }
  } catch(err) { console.error('enrichLists error:',err); }

  return lists.map(l=>{
    const rc=ratingCounts[l.id]||0;
    const avgRating=rc>0?Math.round((ratingTotals[l.id]/rc)*10)/10:null;
    const u=userMap[l.user_id]||{};
    return {
      ...l,
      username:u.username||'user',
      display_name:u.display_name||u.username||'user',
      avatar_url:u.avatar_url||null,
      movie_count:movieCounts[l.id]||0,
      follower_count:followerCounts[l.id]||0,
      avg_rating:avgRating,
      rating_count:rc,
      is_following:viewerFollows.has(l.id),
      viewer_rating:viewerRatings[l.id]||null,
      cover_poster:l.cover_url||posterMap[l.id]?.poster||null,
      cover_accent:posterMap[l.id]?.accent||null,
    };
  });
}

export async function GET(req) {
  const {userId}=auth();
  const {searchParams}=new URL(req.url);
  const tab=searchParams.get('tab')||'trending';
  try {
    let listsRes;
    if (tab==='mine') {
      if (!userId) return Response.json({lists:[]});
      listsRes=await fetch(`${db('community_lists')}?user_id=eq.${userId}&is_public=eq.true&order=updated_at.desc&limit=50`,{headers});
    } else if (tab==='following') {
      if (!userId) return Response.json({lists:[]});
      const followRows=await fetch(`${db('community_list_follows')}?user_id=eq.${userId}&select=list_id`,{headers}).then(r=>r.json());
      const ids=(Array.isArray(followRows)?followRows:[]).map(r=>r.list_id);
      if (!ids.length) return Response.json({lists:[]});
      listsRes=await fetch(`${db('community_lists')}?id=in.(${ids.join(',')})&is_public=eq.true&order=updated_at.desc&limit=50`,{headers});
    } else {
      listsRes=await fetch(`${db('community_lists')}?is_public=eq.true&order=created_at.desc&limit=100`,{headers});
    }
    const raw=await listsRes.json();
    const lists=Array.isArray(raw)?raw:[];
    const enriched=await enrichLists(lists,userId);
    if (tab==='trending') {
      enriched.sort((a,b)=>((b.follower_count*2)+(b.avg_rating||0)*3+b.movie_count)-((a.follower_count*2)+(a.avg_rating||0)*3+a.movie_count));
    }
    return Response.json({lists:enriched});
  } catch(err) {
    console.error('GET /api/lists error:',err);
    return Response.json({error:'Failed to load lists'},{status:500});
  }
}

export async function POST(req) {
  const {userId}=auth();
  if (!userId) return Response.json({error:'Unauthorized'},{status:401});
  try {
    const {title,description}=await req.json();
    if (!title?.trim()) return Response.json({error:'Title is required'},{status:400});
    const res=await fetch(db('community_lists'),{method:'POST',headers,body:JSON.stringify({user_id:userId,title:title.trim(),description:description?.trim()||null})});
    if (!res.ok) { const t=await res.text(); return Response.json({error:`Failed: ${t}`},{status:500}); }
    const [list]=await res.json();
    return Response.json({list});
  } catch(err) {
    return Response.json({error:'Failed to create list'},{status:500});
  }
}
