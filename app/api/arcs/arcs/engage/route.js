/**
 * GET/POST /api/arcs/engage
 * Ratings + comments for Cine Arcs.
 *
 * Copy to: app/api/arcs/engage/route.js
 *
 * Supabase SQL (run once):
 *
 * create table if not exists arc_ratings (
 *   arc_id text not null,
 *   user_id text not null,
 *   rating int not null check (rating between 1 and 5),
 *   primary key (arc_id, user_id)
 * );
 *
 * create table if not exists arc_comments (
 *   id uuid default gen_random_uuid() primary key,
 *   arc_id text not null,
 *   user_id text not null,
 *   username text,
 *   avatar_url text,
 *   body text not null,
 *   created_at timestamptz default now()
 * );
 * create index if not exists arc_comments_arc_id on arc_comments (arc_id, created_at desc);
 */

import { auth } from '@clerk/nextjs/server';

const SUPABASE_URL = 'https://gwvfihozxyboirkaixqb.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dmZpaG96eHlib2lya2FpeHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjYxMDEsImV4cCI6MjA5NTY0MjEwMX0.y6zfENBPd6iJvFEf5-nRFeiWvVTzlDMAkNLr4CGfsGc';

const db = (path) => `${SUPABASE_URL}/rest/v1/${path}`;
const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const arcId = searchParams.get('arcId');
  if (!arcId) return Response.json({ error: 'arcId required' }, { status: 400 });

  try {
    const [ratingsRes, commentsRes] = await Promise.all([
      fetch(`${db('arc_ratings')}?arc_id=eq.${encodeURIComponent(arcId)}&select=rating,user_id`, { headers }),
      fetch(
        `${db('arc_comments')}?arc_id=eq.${encodeURIComponent(arcId)}&order=created_at.desc&limit=40&select=id,user_id,username,avatar_url,body,created_at`,
        { headers }
      ),
    ]);

    const ratings = ratingsRes.ok ? await ratingsRes.json() : [];
    const comments = commentsRes.ok ? await commentsRes.json() : [];

    const list = Array.isArray(ratings) ? ratings : [];
    const avg =
      list.length > 0 ? Math.round((list.reduce((s, r) => s + Number(r.rating || 0), 0) / list.length) * 10) / 10 : null;

    const { userId } = auth();
    const mine = userId ? list.find((r) => r.user_id === userId) : null;

    return Response.json({
      avg,
      count: list.length,
      myRating: mine ? mine.rating : null,
      comments: Array.isArray(comments) ? comments : [],
    });
  } catch (err) {
    console.error('GET /api/arcs/engage', err);
    return Response.json({ avg: null, count: 0, myRating: null, comments: [] });
  }
}

export async function POST(req) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { arcId, action, rating, text, username, avatarUrl } = body;
    if (!arcId) return Response.json({ error: 'arcId required' }, { status: 400 });

    if (action === 'rate') {
      const r = Number(rating);
      if (!r || r < 1 || r > 5) return Response.json({ error: 'Rating 1-5' }, { status: 400 });

      // Upsert-style: delete then insert (works without unique conflict Prefer)
      await fetch(`${db('arc_ratings')}?arc_id=eq.${encodeURIComponent(arcId)}&user_id=eq.${userId}`, {
        method: 'DELETE',
        headers,
      });
      const res = await fetch(db('arc_ratings'), {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({ arc_id: arcId, user_id: userId, rating: r }),
      });
      if (!res.ok) {
        const t = await res.text();
        console.error('rate fail', t);
        return Response.json({ error: 'Failed to rate — create arc_ratings table?', detail: t }, { status: 500 });
      }
      return Response.json({ success: true, rating: r });
    }

    if (action === 'comment') {
      const bodyText = (text || '').trim();
      if (!bodyText) return Response.json({ error: 'Empty comment' }, { status: 400 });
      if (bodyText.length > 500) return Response.json({ error: 'Too long' }, { status: 400 });

      const res = await fetch(db('arc_comments'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          arc_id: arcId,
          user_id: userId,
          username: username || 'user',
          avatar_url: avatarUrl || null,
          body: bodyText,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        return Response.json({ error: 'Failed to comment — create arc_comments table?', detail: t }, { status: 500 });
      }
      const rows = await res.json();
      return Response.json({ success: true, comment: Array.isArray(rows) ? rows[0] : rows });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('POST /api/arcs/engage', err);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}
