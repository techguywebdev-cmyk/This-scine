import { r2Enabled } from '@/lib/storage';

export const dynamic = 'force-dynamic';

// GET /api/health — which services are configured (never returns secrets)
export async function GET() {
  const out = {
    storage: r2Enabled() ? 'r2' : 'supabase',
    push: !!process.env.VAPID_PRIVATE_KEY,
    email: !!process.env.RESEND_API_KEY,
    turnConfigured: !!(process.env.CLOUDFLARE_TURN_KEY_ID && process.env.CLOUDFLARE_TURN_API_TOKEN),
  };
  if (r2Enabled()) {
    try {
      const { AwsClient } = await import('aws4fetch');
      const c = new AwsClient({ accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY, service: 's3', region: 'auto' });
      const key = `health/ping-${Date.now()}.txt`;
      const base = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}`;
      const put = await c.fetch(`${base}/${key}`, { method: 'PUT', body: 'ok', headers: { 'Content-Type': 'text/plain' } });
      out.r2Write = put.ok ? 'ok' : `failed ${put.status}`;
      if (put.ok) {
        const pub = await fetch(`${process.env.R2_PUBLIC_URL}/${key}`, { cache: 'no-store' });
        out.r2PublicRead = pub.ok ? 'ok' : `failed ${pub.status}`;
        await c.fetch(`${base}/${key}`, { method: 'DELETE' }).catch(() => {});
      } else {
        out.r2Error = (await put.text()).replace(/<[^>]+>/g, ' ').trim().slice(0, 160);
      }
    } catch (e) {
      out.r2Write = `error: ${e.message}`.slice(0, 160);
    }
    out.r2PublicUrlLooksRight = /^https:\/\/[^/]+$/.test(process.env.R2_PUBLIC_URL || '');
  }
  return Response.json(out, { headers: { 'Cache-Control': 'no-store' } });
}
