// One place for file storage.
// Uses Cloudflare R2 when its keys are set on Vercel, otherwise Supabase Storage.
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL
// R2_PUBLIC_URL is the bucket's public address (r2.dev URL or a custom domain), no trailing slash.

const SUPABASE_URL = 'https://gwvfihozxyboirkaixqb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dmZpaG96eHlib2lya2FpeHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjYxMDEsImV4cCI6MjA5NTY0MjEwMX0.y6zfENBPd6iJvFEf5-nRFeiWvVTzlDMAkNLr4CGfsGc';

export function r2Enabled() {
  return !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET && process.env.R2_PUBLIC_URL);
}

let _r2 = null;
async function r2Client() {
  if (_r2) return _r2;
  const { AwsClient } = await import('aws4fetch');
  _r2 = new AwsClient({ accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY, service: 's3', region: 'auto' });
  return _r2;
}
const r2Url = (key) => `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${key.split('/').map(encodeURIComponent).join('/')}`;

/**
 * Upload bytes. `bucket` is the Supabase bucket name; on R2 it becomes a folder prefix.
 * Returns { url } — a public, long-cacheable URL.
 */
export async function putObject({ bucket, key, body, contentType }) {
  const cache = 'public, max-age=31536000, immutable';
  if (r2Enabled()) {
    const client = await r2Client();
    const full = `${bucket}/${key}`;
    const res = await client.fetch(r2Url(full), { method: 'PUT', body, headers: { 'Content-Type': contentType || 'application/octet-stream', 'Cache-Control': cache } });
    if (!res.ok) throw new Error(`R2 upload failed (${res.status}): ${(await res.text()).slice(0, 160)}`);
    return { url: `${process.env.R2_PUBLIC_URL}/${full}`, provider: 'r2' };
  }
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${key}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': contentType || 'application/octet-stream', 'cache-control': 'max-age=31536000', 'x-upsert': 'true' },
    body,
  });
  if (!res.ok) {
    const t = await res.text();
    let detail = t; try { detail = JSON.parse(t)?.message || t; } catch {}
    throw new Error(`Storage error (${res.status}): ${String(detail).slice(0, 160)}`);
  }
  return { url: `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${key}`, provider: 'supabase' };
}

/** Best-effort delete of every object under `prefix` except `keepKey`. */
export async function deletePrefix({ bucket, prefix, keepKey }) {
  try {
    if (r2Enabled()) {
      const client = await r2Client();
      const list = await client.fetch(`https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}?list-type=2&prefix=${encodeURIComponent(`${bucket}/${prefix}`)}`);
      const xml = await list.text();
      const keys = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => m[1]).filter((k) => k !== `${bucket}/${keepKey}`);
      await Promise.all(keys.map((k) => client.fetch(r2Url(k), { method: 'DELETE' }).catch(() => {})));
      return;
    }
    const auth = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
    const listRes = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket}`, { method: 'POST', headers: auth, body: JSON.stringify({ prefix, limit: 100 }) });
    const files = await listRes.json();
    const old = (Array.isArray(files) ? files : []).map((f) => `${prefix}${f.name}`).filter((n) => n !== keepKey);
    if (old.length) await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}`, { method: 'DELETE', headers: auth, body: JSON.stringify({ prefixes: old }) });
  } catch {}
}
