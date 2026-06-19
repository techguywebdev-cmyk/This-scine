import { clerkClient } from '@clerk/nextjs/server';

const SUPABASE_URL = 'https://gwvfihozxyboirkaixqb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dmZpaG96eHlib2lya2FpeHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjYxMDEsImV4cCI6MjA5NTY0MjEwMX0.y6zfENBPd6iJvFEf5-nRFeiWvVTzlDMAkNLr4CGfsGc';

const db = (path) => `${SUPABASE_URL}/rest/v1/${path}`;
const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

// GET /api/leaderboard?type=watchlist -> top users ranked by watchlist size
// NOTE: aggregates in-memory from raw watchlist rows (no SQL view), consistent with
// this project's "no @supabase/supabase-js, raw PostgREST fetch" convention.
// Fine at current scale; if the watchlist table grows very large, a proper
// Postgres view/RPC for server-side GROUP BY would be a better long-term fix.
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'watchlist';

  try {
    if (type !== 'watchlist') {
      return Response.json({ error: 'Unsupported leaderboard type' }, { status: 400 });
    }

    const res = await fetch(`${db('watchlist')}?select=user_id&limit=10000`, { headers });
    const rows = await res.json();

    const counts = {};
    for (const row of Array.isArray(rows) ? rows : []) {
      if (!row.user_id) continue;
      counts[row.user_id] = (counts[row.user_id] || 0) + 1;
    }

    const ranked = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (ranked.length === 0) return Response.json({ leaders: [] });

    const topIds = ranked.map(([userId]) => userId);

    // batch-enrich with Clerk profile info
    const userMap = {};
    try {
      const { data: users } = await clerkClient.users.getUserList({ userId: topIds, limit: topIds.length });
      for (const u of users) {
        userMap[u.id] = {
          username: u.username || u.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'user',
          display_name: u.firstName ? `${u.firstName}${u.lastName ? ' ' + u.lastName : ''}` : (u.username || 'user'),
          avatar_url: u.imageUrl || null,
        };
      }
    } catch (err) {
      console.error('leaderboard Clerk enrichment error:', err);
    }

    // overlay custom nicknames (override display_name only)
    try {
      const inList = topIds.join(',');
      const nickRes = await fetch(`${db('user_settings')}?user_id=in.(${inList})&select=user_id,nickname`, { headers });
      const nickRows = await nickRes.json();
      for (const row of Array.isArray(nickRows) ? nickRows : []) {
        if (row.nickname && userMap[row.user_id]) userMap[row.user_id].display_name = row.nickname;
      }
    } catch (err) {
      console.error('leaderboard nickname overlay error:', err);
    }

    const leaders = ranked.map(([userId, count], i) => ({
      rank: i + 1,
      user_id: userId,
      watchlistCount: count,
      username: userMap[userId]?.username || 'user',
      display_name: userMap[userId]?.display_name || 'user',
      avatar_url: userMap[userId]?.avatar_url || null,
    }));

    return Response.json({ leaders });
  } catch (err) {
    console.error('GET /api/leaderboard error:', err);
    return Response.json({ error: 'Failed to load leaderboard' }, { status: 500 });
  }
}
