import { SUPABASE_KEY } from '@/lib/db';
// One place for file storage.
// Uses Cloudflare R2 when its keys are set on Vercel, otherwise Supabase Storage.
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL
// R2_PUBLIC_URL is the bucket's public address (r2.dev URL or a custom domain), no trailing slash.

const SUPABASE_URL = 'https://gwvfihozxyboirkaixqb.supabase.co';

export function r2Enabled() {
  return !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET && process.env.R2_PUBLIC_URL);
}

let _r2 = null;
async function r2Client() {
  if (_r2) return _r2;
  const { AwsClient } = await import('aws4fetch');
  _r2 = new AwsClient({ accessKeyId: (process.env.R2_ACCESS_KEY_ID || '').trim(), secretAccessKey: (process.env.R2_SECRET_ACCESS_KEY || '').trim(), service: 's3', region: 'auto' });
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
    try {
      const res = await client.fetch(r2Url(full), { method: 'PUT', body, headers: { 'Content-Type': contentType || 'application/octet-stream', 'Cache-Control': cache } });
      if (res.ok) return { url: `${process.env.R2_PUBLIC_URL}/${full}`, provider: 'r2' };
      console.error('R2 upload failed, falling back to Supabase', res.status, (await res.text()).slice(0, 200));
    } catch (e) {
      console.error('R2 upload error, falling back to Supabase', e);
    }
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

/** Delete every object under `prefix` (all pages). Used when an account is deleted. */
export async function deleteAllUnder({ bucket, prefix }) {
  for (let round = 0; round < 30; round++) {
    let found = 0;
    try {
      if (r2Enabled()) {
        const client = await r2Client();
        const list = await client.fetch(`https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}?list-type=2&max-keys=500&prefix=${encodeURIComponent(`${bucket}/${prefix}`)}`);
        const keys = [...(await list.text()).matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => m[1]);
        found = keys.length;
        await Promise.all(keys.map((k) => client.fetch(r2Url(k), { method: 'DELETE' }).catch(() => {})));
      }
      // Older uploads may still live in Supabase Storage
      const auth = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
      const files = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket}`, { method: 'POST', headers: auth, body: JSON.stringify({ prefix, limit: 100 }) }).then((r) => r.json()).catch(() => []);
      const names = (Array.isArray(files) ? files : []).filter((f) => f.name).map((f) => `${prefix}${f.name}`);
      if (names.length) { found += names.length; await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}`, { method: 'DELETE', headers: auth, body: JSON.stringify({ prefixes: names }) }); }
    } catch { return; }
    if (!found) return;
  }
}
