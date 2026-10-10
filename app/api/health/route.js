import { r2Enabled } from '@/lib/storage';
import { SUPABASE_URL, SUPABASE_KEY, keyKind } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/health — which services are configured (never returns secrets or fragments of them)
export async function GET() {
  const out = {
    db: keyKind(),
    storage: r2Enabled() ? 'r2' : 'supabase',
    push: !!process.env.VAPID_PRIVATE_KEY,
    email: !!process.env.RESEND_API_KEY,
    turnConfigured: !!(process.env.CLOUDFLARE_TURN_KEY_ID && process.env.CLOUDFLARE_TURN_API_TOKEN),
  };
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/messages?select=id&limit=1`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, cache: 'no-store' });
    out.dbRead = r.ok ? 'ok' : `failed ${r.status}`;
  } catch (e) { out.dbRead = 'error'; }
  if (r2Enabled()) {
    try {
      const { AwsClient } = await import('aws4fetch');
      const c = new AwsClient({ accessKeyId: (process.env.R2_ACCESS_KEY_ID || '').trim(), secretAccessKey: (process.env.R2_SECRET_ACCESS_KEY || '').trim(), service: 's3', region: 'auto' });
      const key = `health/ping-${Date.now()}.txt`;
      const base = `https://${(process.env.R2_ACCOUNT_ID || '').trim()}.r2.cloudflarestorage.com/${(process.env.R2_BUCKET || '').trim()}`;
      const put = await c.fetch(`${base}/${key}`, { method: 'PUT', body: 'ok', headers: { 'Content-Type': 'text/plain' } });
      out.r2Write = put.ok ? 'ok' : `failed ${put.status}`;
      if (put.ok) await c.fetch(`${base}/${key}`, { method: 'DELETE' }).catch(() => {});
    } catch (e) {
      out.r2Write = 'error';
    }
  }
  return Response.json(out, { headers: { 'Cache-Control': 'no-store' } });
}
