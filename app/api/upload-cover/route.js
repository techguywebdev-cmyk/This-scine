import { auth } from '@clerk/nextjs/server';

const SUPABASE_URL = 'https://gwvfihozxyboirkaixqb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dmZpaG96eHlib2lya2FpeHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjYxMDEsImV4cCI6MjA5NTY0MjEwMX0.y6zfENBPd6iJvFEf5-nRFeiWvVTzlDMAkNLr4CGfsGc';

const db = (path) => `${SUPABASE_URL}/rest/v1/${path}`;
const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

const ALLOWED_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};
const MAX_SIZE = 8 * 1024 * 1024; // 8MB

// POST /api/upload-cover  (multipart/form-data, field name "file")
export async function POST(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file.arrayBuffer !== 'function') {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return Response.json({ error: 'Unsupported file type. Use JPG, PNG, GIF, or WEBP.' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return Response.json({ error: 'File too large. Max size is 8MB.' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    // A new file name per upload lets browsers cache each cover forever
    const path = `${userId}/cover-${Date.now()}.${ext}`;

    const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/profile-covers/${path}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': file.type,
        'cache-control': 'max-age=31536000',
        'x-upsert': 'true',
      },
      body: buffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error('Storage upload error:', uploadRes.status, errText);
      let detail = errText;
      try { detail = JSON.parse(errText)?.message || JSON.parse(errText)?.error || errText; } catch {}
      return Response.json({ error: `Storage error (${uploadRes.status}): ${detail}`.slice(0, 300) }, { status: 500 });
    }

    // cache-bust so the new image shows immediately even though the path is stable
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/profile-covers/${path}`;

    // save the URL to user_settings
    const settingsRes = await fetch(db('user_settings'), {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        user_id: userId,
        cover_url: publicUrl,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!settingsRes.ok) {
      const errText = await settingsRes.text();
      console.error('Failed to save cover_url to user_settings:', settingsRes.status, errText);
      return Response.json({ error: 'Image uploaded but failed to save to your profile — try again' }, { status: 500 });
    }

    // Tidy up older covers for this user (best-effort)
    try {
      const listRes = await fetch(`${SUPABASE_URL}/storage/v1/object/list/profile-covers`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix: `${userId}/`, limit: 50 }),
      });
      const files = await listRes.json();
      const old = (Array.isArray(files) ? files : []).map((f) => `${userId}/${f.name}`).filter((n) => n !== path);
      if (old.length) {
        await fetch(`${SUPABASE_URL}/storage/v1/object/profile-covers`, {
          method: 'DELETE',
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ prefixes: old }),
        });
      }
    } catch {}

    return Response.json({ cover_url: publicUrl });
  } catch (err) {
    console.error('POST /api/upload-cover error:', err);
    return Response.json({ error: 'Failed to upload cover photo' }, { status: 500 });
  }
}
