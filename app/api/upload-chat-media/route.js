import { auth } from '@clerk/nextjs/server';
import { putObject } from '@/lib/storage';

// POST /api/upload-chat-media (multipart: file, kind=image|voice|video|file)
// Stores chat media as files instead of inside the messages table.
const LIMITS = { image: 8, voice: 8, video: 4.4, file: 4.4 }; // MB (Vercel caps request bodies at ~4.5MB; images are compressed client-side)
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };

export async function POST(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get('file');
    const kind = String(form.get('kind') || 'file');
    if (!file || typeof file.arrayBuffer !== 'function') return Response.json({ error: 'No file provided' }, { status: 400 });
    const type = (file.type || '').split(';')[0];
    const max = (LIMITS[kind] || 4.4) * 1024 * 1024;
    if (file.size > max) return Response.json({ error: `File too large (max ${LIMITS[kind] || 4.4}MB)` }, { status: 400 });
    const ext = EXT[type] || (kind === 'voice' ? 'webm' : 'bin');
    const key = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { url } = await putObject({ bucket: 'chat-media', key, body: await file.arrayBuffer(), contentType: type || 'application/octet-stream' });
    return Response.json({ url });
  } catch (err) {
    console.error('upload-chat-media', err);
    return Response.json({ error: err?.message || 'Upload failed' }, { status: 500 });
  }
}
