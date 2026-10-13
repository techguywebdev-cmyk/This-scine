// Digital Asset Links: proves the Thiscene Android app (com.thiscene.app) belongs to this site,
// so it opens full-screen with no browser bar and handles thiscene.com links.
// UPLOAD_KEY = the key GitHub Actions signs builds with. After the first Play upload, add the
// "App signing key certificate" SHA-256 from Play Console → Test and release → App integrity
// to the ANDROID_SHA256_EXTRA env var on Vercel (comma-separated) — no code change needed.

export const dynamic = 'force-static';
export const revalidate = 3600;

const UPLOAD_KEY = '7F:53:11:6B:E2:EB:CA:9D:92:85:73:4E:28:C8:AE:1A:A3:7A:EE:C2:67:B7:2A:1D:E9:98:78:86:1A:33:4F:9E';

export function GET() {
  const extra = String(process.env.ANDROID_SHA256_EXTRA || '')
    .split(',').map((s) => s.trim().toUpperCase()).filter((s) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(s));
  const fingerprints = [...new Set([UPLOAD_KEY, ...extra])];
  return Response.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: { namespace: 'android_app', package_name: 'com.thiscene.app', sha256_cert_fingerprints: fingerprints },
    },
  ], { headers: { 'Cache-Control': 'public, max-age=3600' } });
}
