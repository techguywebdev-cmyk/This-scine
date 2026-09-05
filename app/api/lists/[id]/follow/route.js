import { auth } from '@clerk/nextjs/server';

const SUPABASE_URL = 'https://gwvfihozxyboirkaixqb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dmZpaG96eHlib2lya2FpeHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjYxMDEsImV4cCI6MjA5NTY0MjEwMX0.y6zfENBPd6iJvFEf5-nRFeiWvVTzlDMAkNLr4CGfsGc';
const db = (path) => `${SUPABASE_URL}/rest/v1/${path}`;
const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };

// POST /api/lists/[id]/follow  (toggles follow/unfollow)
export async function POST(req, { params }) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = params;
  try {
    const existing = await fetch(`${db('community_list_follows')}?list_id=eq.${id}&user_id=eq.${userId}`, { headers });
    const rows = await existing.json();
    if (Array.isArray(rows) && rows.length > 0) {
      await fetch(`${db('community_list_follows')}?list_id=eq.${id}&user_id=eq.${userId}`, { method: 'DELETE', headers });
      return Response.json({ following: false });
    } else {
      await fetch(db('community_list_follows'), { method: 'POST', headers, body: JSON.stringify({ list_id: id, user_id: userId }) });
      return Response.json({ following: true });
    }
  } catch (err) {
    return Response.json({ error: 'Failed to toggle follow' }, { status: 500 });
  }
            }
