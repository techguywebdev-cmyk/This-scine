// Server-only database credentials.
// The private key (SUPABASE_SERVICE_ROLE_KEY) lives only in Vercel env vars and is never sent to browsers.
// The public anon key stays as a fallback only until the private key is configured; once the database is
// locked down (RLS deny-by-default), the anon key can no longer read or write any table.
if (typeof window !== 'undefined') throw new Error('lib/db is server-only');

export const SUPABASE_URL = 'https://gwvfihozxyboirkaixqb.supabase.co';
const ANON_FALLBACK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dmZpaG96eHlib2lya2FpeHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjYxMDEsImV4cCI6MjA5NTY0MjEwMX0.y6zfENBPd6iJvFEf5-nRFeiWvVTzlDMAkNLr4CGfsGc';

const SERVICE = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '').trim();
export const SUPABASE_KEY = SERVICE || ANON_FALLBACK;
export const hasServiceKey = !!SERVICE;

// Which kind of key is in use, without revealing it
export function keyKind() {
  if (!SERVICE) return 'anon-fallback';
  if (SERVICE.startsWith('sb_secret_')) return 'secret';
  try {
    const payload = JSON.parse(Buffer.from(SERVICE.split('.')[1], 'base64').toString('utf8'));
    return payload.role === 'service_role' ? 'service_role' : `jwt:${payload.role || 'unknown'}`;
  } catch { return 'unknown'; }
}

// Strip anything that could alter a PostgREST filter (commas, brackets, dots-operators, &, =, spaces…).
// IDs in this app are Clerk ids (user_…), UUIDs, numeric TMDB ids or slugs — all survive this untouched.
export const clean = (v) => String(v ?? '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 96);
