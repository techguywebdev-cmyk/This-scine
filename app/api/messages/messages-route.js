import { auth, clerkClient } from '@clerk/nextjs/server';

const SUPABASE_URL = 'https://gwvfihozxyboirkaixqb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dmZpaG96eHlib2lya2FpeHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjYxMDEsImV4cCI6MjA5NTY0MjEwMX0.y6zfENBPd6iJvFEf5-nRFeiWvVTzlDMAkNLr4CGfsGc';

const db = (path) => `${SUPABASE_URL}/rest/v1/${path}`;
const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

async function getUserMap(userIds) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const map = {};
  if (uniqueIds.length === 0) return map;
  try {
    const { data: users } = await clerkClient.users.getUserList({
      userId: uniqueIds,
      limit: uniqueIds.length,
    });
    for (const u of users) {
      map[u.id] = {
        username: u.username || u.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'user',
        display_name: u.firstName
          ? `${u.firstName}${u.lastName ? ' ' + u.lastName : ''}`
          : u.username || 'user',
        avatar_url: u.imageUrl || null,
      };
    }
  } catch (err) {
    console.error('getUserMap error:', err);
  }
  for (const id of uniqueIds) {
    if (!map[id]) map[id] = { username: 'user', display_name: 'user', avatar_url: null };
  }
  return map;
}

// GET /api/messages?with=userId  -> thread with that user
// GET /api/messages              -> recent conversation list
export async function GET(req) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const withId = searchParams.get('with');

  try {
    if (withId) {
      // Thread between current user and withId
      const res = await fetch(
        `${db('messages')}?or=(and(from_user_id.eq.${userId},to_user_id.eq.${withId}),and(from_user_id.eq.${withId},to_user_id.eq.${userId}))&order=created_at.asc&limit=100&select=id,from_user_id,to_user_id,text,created_at,read`,
        { headers }
      );
      const rows = await res.json();
      const messages = Array.isArray(rows) ? rows : [];

      // Mark messages TO me as read
      const unreadIds = messages
        .filter((m) => m.to_user_id === userId && !m.read)
        .map((m) => m.id);
      if (unreadIds.length) {
        await fetch(`${db('messages')}?id=in.(${unreadIds.join(',')})`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ read: true }),
        }).catch(() => {});
      }

      const peerMap = await getUserMap([withId]);
      return Response.json({
        messages: messages.map((m) => ({
          id: m.id,
          text: m.text,
          created_at: m.created_at,
          from_me: m.from_user_id === userId,
          read: m.read,
        })),
        peer: {
          user_id: withId,
          username: peerMap[withId]?.username || 'user',
          display_name: peerMap[withId]?.display_name || 'user',
          avatar_url: peerMap[withId]?.avatar_url || null,
        },
      });
    }

    // Conversation list: latest message per peer
    const res = await fetch(
      `${db('messages')}?or=(from_user_id.eq.${userId},to_user_id.eq.${userId})&order=created_at.desc&limit=80&select=id,from_user_id,to_user_id,text,created_at,read`,
      { headers }
    );
    const rows = await res.json();
    const all = Array.isArray(rows) ? rows : [];

    const seen = new Set();
    const threads = [];
    for (const m of all) {
      const peerId = m.from_user_id === userId ? m.to_user_id : m.from_user_id;
      if (seen.has(peerId)) continue;
      seen.add(peerId);
      threads.push({
        peer_id: peerId,
        last_text: m.text,
        last_at: m.created_at,
        from_me: m.from_user_id === userId,
        unread: m.to_user_id === userId && !m.read,
      });
    }

    const peerIds = threads.map((t) => t.peer_id);
    const userMap = await getUserMap(peerIds);

    return Response.json({
      conversations: threads.map((t) => ({
        ...t,
        username: userMap[t.peer_id]?.username || 'user',
        display_name: userMap[t.peer_id]?.display_name || 'user',
        avatar_url: userMap[t.peer_id]?.avatar_url || null,
      })),
    });
  } catch (err) {
    console.error('GET /api/messages error:', err);
    return Response.json({ error: 'Failed to load messages', messages: [], conversations: [] }, { status: 500 });
  }
}

// POST /api/messages { toUserId, text }
export async function POST(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const toUserId = body.toUserId || body.targetId;
    const text = (body.text || '').trim();

    if (!toUserId || toUserId === userId) {
      return Response.json({ error: 'Invalid recipient' }, { status: 400 });
    }
    if (!text) {
      return Response.json({ error: 'Message is empty' }, { status: 400 });
    }
    if (text.length > 1000) {
      return Response.json({ error: 'Message too long' }, { status: 400 });
    }

    const res = await fetch(db('messages'), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from_user_id: userId,
        to_user_id: toUserId,
        text,
        read: false,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('messages insert error:', res.status, errText);
      // Helpful hint if table missing
      if (res.status === 404 || errText.includes('does not exist')) {
        return Response.json(
          {
            error:
              'Messages table not set up. In Supabase SQL: create table messages (id uuid primary key default gen_random_uuid(), from_user_id text not null, to_user_id text not null, text text not null, read boolean default false, created_at timestamptz default now());',
          },
          { status: 500 }
        );
      }
      return Response.json({ error: `Failed to send: ${errText.slice(0, 150)}` }, { status: 500 });
    }

    const data = await res.json();
    const row = Array.isArray(data) ? data[0] : data;

    // In-app + multi-channel notify (email / web / app)
    try {
      const priorRes = await fetch(
        `${db('messages')}?or=(and(from_user_id.eq.${userId},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${userId}))&select=id&limit=2`,
        { headers }
      );
      const prior = await priorRes.json();
      const isFirst = !Array.isArray(prior) || prior.length <= 1;
      const notifType = isFirst ? 'message_request' : 'message';
      await fetch(db('notifications'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user_id: toUserId,
          from_user_id: userId,
          type: notifType,
          read: false,
        }),
      });

      // Multi-channel (requires lib/notify.js + Resend/VAPID env)
      try {
        const { notifyUser } = await import('@/lib/notify').catch(() => ({ notifyUser: null }));
        if (notifyUser) {
          let recipientEmail = null;
          try {
            const u = await clerkClient.users.getUser(toUserId);
            recipientEmail = u.emailAddresses?.find(e => e.id === u.primaryEmailAddressId)?.emailAddress
              || u.emailAddresses?.[0]?.emailAddress || null;
          } catch {}
          let fromName = 'Someone';
          try {
            const me = await clerkClient.users.getUser(userId);
            fromName = me.username || me.firstName || 'Someone';
          } catch {}
          await notifyUser({
            userId: toUserId,
            email: recipientEmail,
            category: 'messages',
            title: isFirst ? 'New message request' : 'New message',
            body: `${fromName}: ${text.slice(0, 120)}`,
            url: '/',
          });
        }
      } catch (e) {
        console.error('notifyUser error', e);
      }
    } catch (e) {
      console.error('message notification error:', e);
    }

    return Response.json({
      message: {
        id: row?.id,
        text: row?.text,
        created_at: row?.created_at,
        from_me: true,
        read: false,
      },
    });
  } catch (err) {
    console.error('POST /api/messages error:', err);
    return Response.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
