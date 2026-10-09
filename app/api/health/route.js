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
        // Narrow down the cause without exposing secrets
        const list = await c.fetch(`${base}?list-type=2&max-keys=1`);
        out.r2ListBucket = list.ok ? 'ok' : `failed ${list.status} ${(await list.text()).replace(/<[^>]+>/g, ' ').trim().slice(0, 80)}`;
        const eu = await c.fetch(`https://${process.env.R2_ACCOUNT_ID}.eu.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${key}`, { method: 'PUT', body: 'ok' });
        out.r2EuEndpointWrite = eu.ok ? 'ok' : `failed ${eu.status}`;
        if (eu.ok) await c.fetch(`https://${process.env.R2_ACCOUNT_ID}.eu.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${key}`, { method: 'DELETE' }).catch(() => {});
        out.bucketName = process.env.R2_BUCKET === process.env.R2_BUCKET.trim() ? process.env.R2_BUCKET : 'has extra spaces';
        out.accountIdLength = (process.env.R2_ACCOUNT_ID || '').trim().length;
        out.accessKeyIdLength = (process.env.R2_ACCESS_KEY_ID || '').trim().length;
      }
    } catch (e) {
      out.r2Write = `error: ${e.message}`.slice(0, 160);
    }
    out.r2PublicUrlLooksRight = /^https:\/\/[^/]+$/.test(process.env.R2_PUBLIC_URL || '');
  }
  return Response.json(out, { headers: { 'Cache-Control': 'no-store' } });
}
