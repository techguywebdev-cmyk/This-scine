import { auth, clerkClient } from '@clerk/nextjs/server';

const SUPABASE_URL = 'https://gwvfihozxyboirkaixqb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dmZpaG96eHlib2lya2FpeHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjYxMDEsImV4cCI6MjA5NTY0MjEwMX0.y6zfENBPd6iJvFEf5-nRFeiWvVTzlDMAkNLr4CGfsGc';

const db = (path) => `${SUPABASE_URL}/rest/v1/${path}`;
const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function getUserMap(userIds) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const map = {};
  if (uniqueIds.length === 0) return map;

  try {
    const { data: users } = await clerkClient.users.getUserList({
      userId: uniqueIds,
      limit: Math.min(uniqueIds.length, 100),
    });
    for (const u of users || []) {
      map[u.id] = {
        username: u.username || u.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'user',
        display_name: u.firstName
          ? `${u.firstName}${u.lastName ? ' ' + u.lastName : ''}`
          : u.username || 'user',
        avatar_url: u.imageUrl || null,
      };
    }
  } catch (err) {
    console.error('getUserMap batch error:', err);
  }

  for (const id of uniqueIds) {
    if (map[id]?.avatar_url) continue;
    try {
      const u = await clerkClient.users.getUser(id);
      map[id] = {
        username: u.username || u.emailAddresses?.[0]?.emailAddress?.split('@')[0] || map[id]?.username || 'user',
        display_name: u.firstName
          ? `${u.firstName}${u.lastName ? ' ' + u.lastName : ''}`
          : u.username || map[id]?.display_name || 'user',
        avatar_url: u.imageUrl || map[id]?.avatar_url || null,
      };
    } catch {
      if (!map[id]) map[id] = { username: 'user', display_name: 'user', avatar_url: null };
    }
  }

  try {
    const nickRows = await fetch(
      `${db('user_settings')}?user_id=in.(${uniqueIds.join(',')})&select=user_id,nickname`,
      { headers }
    ).then((r) => r.json());
    for (const row of Array.isArray(nickRows) ? nickRows : []) {
      if (row.nickname && map[row.user_id]) map[row.user_id].display_name = row.nickname;
    }
  } catch {}

  for (const id of uniqueIds) {
    if (!map[id]) map[id] = { username: 'user', display_name: 'user', avatar_url: null };
  }
  return map;
}

function mapMessage(m, userId) {
  return {
    id: m.id,
    text: m.text,
    created_at: m.created_at,
    from_me: m.from_user_id === userId,
    read: !!m.read,
    read_at: m.read_at || null,
    delivered: m.delivered !== false,
    msg_type: m.msg_type || 'text',
    media_url: m.media_url || null,
  };
}

export async function GET(req) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const withId = searchParams.get('with');

  try {
    if (withId) {
      let res = await fetch(
        `${db('messages')}?or=(and(from_user_id.eq.${userId},to_user_id.eq.${withId}),and(from_user_id.eq.${withId},to_user_id.eq.${userId}))&order=created_at.asc&limit=120&select=id,from_user_id,to_user_id,text,created_at,read,read_at,delivered,msg_type,media_url`,
        { headers }
      );
      if (!res.ok) {
        res = await fetch(
          `${db('messages')}?or=(and(from_user_id.eq.${userId},to_user_id.eq.${withId}),and(from_user_id.eq.${withId},to_user_id.eq.${userId}))&order=created_at.asc&limit=120&select=id,from_user_id,to_user_id,text,created_at,read`,
          { headers }
        );
      }
      const rows = await res.json();
      const messages = Array.isArray(rows) ? rows : [];

      const unreadIds = messages
        .filter((m) => m.to_user_id === userId && !m.read)
        .map((m) => m.id);
      if (unreadIds.length) {
        const readAt = new Date().toISOString();
        await fetch(`${db('messages')}?id=in.(${unreadIds.join(',')})`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ read: true, read_at: readAt }),
        }).catch(() => {});
        for (const m of messages) {
          if (unreadIds.includes(m.id)) {
            m.read = true;
            m.read_at = readAt;
          }
        }
      }

      const peerMap = await getUserMap([withId]);
      return Response.json({
        messages: messages.map((m) => mapMessage(m, userId)),
        peer: {
          user_id: withId,
          username: peerMap[withId]?.username || 'user',
          display_name: peerMap[withId]?.display_name || 'user',
          avatar_url: peerMap[withId]?.avatar_url || null,
        },
      });
    }

    let res = await fetch(
      `${db('messages')}?or=(from_user_id.eq.${userId},to_user_id.eq.${userId})&order=created_at.desc&limit=100&select=id,from_user_id,to_user_id,text,created_at,read,msg_type,media_url`,
      { headers }
    );
    if (!res.ok) {
      res = await fetch(
        `${db('messages')}?or=(from_user_id.eq.${userId},to_user_id.eq.${userId})&order=created_at.desc&limit=100&select=id,from_user_id,to_user_id,text,created_at,read`,
        { headers }
      );
    }
    const rows = await res.json();
    const all = Array.isArray(rows) ? rows : [];

    // newest first — skip call signaling so inbox never shows raw JSON
    const ordered = [...all].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const seen = new Set();
    const threads = [];
    for (const m of ordered) {
      const peerId = m.from_user_id === userId ? m.to_user_id : m.from_user_id;
      if (!peerId || seen.has(peerId)) continue;

      // Find latest non-signal message for this peer
      if (m.msg_type === 'call_signal') continue;

      seen.add(peerId);
      let preview = m.text || '';
      if (m.msg_type === 'voice') preview = 'Voice note';
      else if (m.msg_type === 'sticker') preview = m.text || 'Sticker';
      else if (m.msg_type === 'gif') preview = 'GIF';
      // Guard: never surface raw signal JSON
      if (typeof preview === 'string' && preview.trim().startsWith('{') && preview.includes('"kind"')) {
        preview = 'Call update';
      }
      threads.push({
        peer_id: peerId,
        last_text: preview,
        last_at: m.created_at,
        from_me: m.from_user_id === userId,
        unread: m.to_user_id === userId && !m.read && m.msg_type !== 'call_signal',
      });
    }

    // Peers who only have call signals still appear with a neutral preview
    for (const m of ordered) {
      const peerId = m.from_user_id === userId ? m.to_user_id : m.from_user_id;
      if (!peerId || seen.has(peerId)) continue;
      if (m.msg_type !== 'call_signal') continue;
      seen.add(peerId);
      let label = 'Call';
      try {
        const p = JSON.parse(m.text || '{}');
        if (p.kind === 'offer') label = p.callType === 'video' ? 'Video call' : 'Audio call';
        else if (p.kind === 'end') label = 'Call ended';
        else if (p.kind === 'answer') label = 'In a call';
      } catch {}
      threads.push({
        peer_id: peerId,
        last_text: label,
        last_at: m.created_at,
        from_me: m.from_user_id === userId,
        unread: false,
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

export async function POST(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const toUserId = body.toUserId || body.targetId;
    const text = (body.text || '').trim();
    const msgType = body.msg_type || 'text';
    const mediaUrl = body.media_url || null;

    if (!toUserId || toUserId === userId) {
      return Response.json({ error: 'Invalid recipient' }, { status: 400 });
    }
    if (!text && !mediaUrl) {
      return Response.json({ error: 'Message is empty' }, { status: 400 });
    }
    // call_signal carries SDP — allow larger payloads; normal chat stays capped
    const maxLen = msgType === 'call_signal' ? 20000 : 1000;
    if (text.length > maxLen) {
      return Response.json({ error: 'Message too long' }, { status: 400 });
    }

    const payload = {
      from_user_id: userId,
      to_user_id: toUserId,
      text: text || (msgType === 'voice' ? 'Voice note' : ''),
      read: false,
      delivered: true,
      msg_type: msgType,
      media_url: mediaUrl,
    };

    let res = await fetch(db('messages'), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      if (errText.includes('msg_type') || errText.includes('media_url') || errText.includes('delivered') || errText.includes('read_at')) {
        res = await fetch(db('messages'), {
          method: 'POST',
          headers,
          body: JSON.stringify({
            from_user_id: userId,
            to_user_id: toUserId,
            text: payload.text,
            read: false,
          }),
        });
      } else {
        console.error('messages insert error:', res.status, errText);
        return Response.json({ error: `Failed to send: ${errText.slice(0, 150)}` }, { status: 500 });
      }
    }

    if (!res.ok) {
      const errText = await res.text();
      return Response.json({ error: `Failed to send: ${errText.slice(0, 150)}` }, { status: 500 });
    }

    const data = await res.json();
    const row = Array.isArray(data) ? data[0] : data;

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
      try {
        const { notifyUser } = await import('@/lib/notify').catch(() => ({ notifyUser: null }));
        if (notifyUser) {
          let recipientEmail = null;
          try {
            const u = await clerkClient.users.getUser(toUserId);
            recipientEmail =
              u.emailAddresses?.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ||
              u.emailAddresses?.[0]?.emailAddress ||
              null;
          } catch {}
          let fromName = 'Someone';
          try {
            const me = await clerkClient.users.getUser(userId);
            fromName = me.username || me.firstName || 'Someone';
          } catch {}
          const bodyPreview =
            msgType === 'voice' ? 'Voice note' : msgType === 'sticker' ? text : text.slice(0, 120);
          await notifyUser({
            userId: toUserId,
            email: recipientEmail,
            category: 'messages',
            title: isFirst ? 'New message request' : 'New message',
            body: `${fromName}: ${bodyPreview}`,
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
        delivered: true,
        msg_type: row?.msg_type || msgType,
        media_url: row?.media_url || mediaUrl,
        read_at: null,
      },
    });
  } catch (err) {
    console.error('POST /api/messages error:', err);
    return Response.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
