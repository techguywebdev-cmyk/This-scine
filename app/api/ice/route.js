// GET /api/ice — STUN/TURN servers for calls.
// TURN relays calls when phones are behind mobile-carrier NAT (very common on 3G/4G),
// which is the usual reason a call rings but never connects.
// Configure ONE of these on Vercel:
//   CLOUDFLARE_TURN_KEY_ID + CLOUDFLARE_TURN_API_TOKEN   (Cloudflare Realtime TURN)
//   METERED_TURN_DOMAIN + METERED_TURN_API_KEY            (metered.ca)
//   TURN_URLS (comma separated) + TURN_USERNAME + TURN_CREDENTIAL  (any TURN server)

export const dynamic = 'force-dynamic';

const STUN = [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

export async function GET() {
  const servers = [...STUN];
  try {
    if (process.env.CLOUDFLARE_TURN_KEY_ID && process.env.CLOUDFLARE_TURN_API_TOKEN) {
      const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${process.env.CLOUDFLARE_TURN_KEY_ID}/credentials/generate-ice-servers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_TURN_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttl: 86400 }),
      });
      if (r.ok) {
        const d = await r.json();
        const list = Array.isArray(d.iceServers) ? d.iceServers : d.iceServers ? [d.iceServers] : [];
        servers.push(...list);
      }
    } else if (process.env.METERED_TURN_DOMAIN && process.env.METERED_TURN_API_KEY) {
      const r = await fetch(`https://${process.env.METERED_TURN_DOMAIN}/api/v1/turn/credentials?apiKey=${process.env.METERED_TURN_API_KEY}`);
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d)) servers.push(...d);
      }
    } else if (process.env.TURN_URLS && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
      servers.push({ urls: process.env.TURN_URLS.split(',').map((u) => u.trim()), username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL });
    }
  } catch (e) {
    console.error('ICE server fetch failed', e);
  }
  const hasTurn = servers.some((s) => [].concat(s.urls || []).some((u) => String(u).startsWith('turn')));
  return Response.json({ iceServers: servers, turn: hasTurn }, { headers: { 'Cache-Control': 'private, max-age=3600' } });
}
