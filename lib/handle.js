/**
 * Public @handle for a Clerk user. Never derived from the email address —
 * people without a username get "firstname" + 4 chars of their id, or "member" + 4 chars.
 */
export function publicHandle(u) {
  if (!u) return 'user';
  if (u.username) return u.username;
  const base = (u.firstName || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16);
  const tail = String(u.id || '').replace(/[^a-z0-9]/gi, '').slice(-4).toLowerCase();
  return base ? `${base}${tail}` : `member${tail}`;
}
