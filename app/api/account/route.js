import { auth, clerkClient } from '@clerk/nextjs/server';
import { SUPABASE_URL, SUPABASE_KEY, clean } from '@/lib/db';
import { deleteAllUnder } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
const db = (p) => `${SUPABASE_URL}/rest/v1/${p}`;

// DELETE /api/account  body: { confirm: 'DELETE' }
// Permanently removes the signed-in user's data everywhere, then their sign-in account.
// Kept on purpose: reports *about* this user (safety records), with no other personal data.
export async function DELETE(req) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body.confirm !== 'DELETE') return Response.json({ error: 'Type DELETE to confirm' }, { status: 400 });
  const u = clean(userId);

  // Each entry: table + filter. Folders cascade to their films, follows, ratings and comments; statuses cascade to views.
  const targets = [
    ['community_lists', `user_id=eq.${u}`],
    ['community_list_follows', `user_id=eq.${u}`],
    ['community_list_ratings', `user_id=eq.${u}`],
    ['reviews', `user_id=eq.${u}`],
    ['statuses', `user_id=eq.${u}`],
    ['status_views', `viewer_id=eq.${u}`],
    ['messages', `or=(from_user_id.eq.${u},to_user_id.eq.${u})`],
    ['notifications', `or=(user_id.eq.${u},from_user_id.eq.${u})`],
    ['follows', `or=(follower_id.eq.${u},following_id.eq.${u})`],
    ['watch_parties', `or=(host_id.eq.${u},guest_id.eq.${u})`],
    ['blocks', `or=(blocker_id.eq.${u},blocked_id.eq.${u})`],
    ['reports', `reporter_id=eq.${u}`],
    ['watchlist', `user_id=eq.${u}`],
    ['reminders', `user_id=eq.${u}`],
    ['activity', `user_id=eq.${u}`],
    ['arc_comments', `user_id=eq.${u}`],
    ['arc_ratings', `user_id=eq.${u}`],
    ['events', `user_id=eq.${u}`],
    ['user_settings', `user_id=eq.${u}`],
  ];
  const results = await Promise.all(targets.map(async ([table, filter]) => {
    const r = await fetch(`${db(table)}?${filter}`, { method: 'DELETE', headers }).catch(() => null);
    return { table, ok: !!r && r.ok };
  }));
  const failed = results.filter((x) => !x.ok).map((x) => x.table);
  if (failed.length) {
    console.error('account delete failed for', failed);
    return Response.json({ error: 'Something went wrong deleting your data. Nothing else was removed from your sign-in — please try again.', failed }, { status: 500 });
  }

  // Uploaded files: chat photos/voice/status media and profile covers live under the user's id
  await Promise.all([
    deleteAllUnder({ bucket: 'chat-media', prefix: `${u}/` }),
    deleteAllUnder({ bucket: 'profile-covers', prefix: `${u}/` }),
  ]);

  // Finally the sign-in account itself (name, email, avatar)
  try { await clerkClient.users.deleteUser(userId); }
  catch (e) {
    console.error('clerk delete failed', e?.message);
    return Response.json({ error: 'Your data was deleted but we couldn’t close your sign-in account. Please try again.' }, { status: 500 });
  }
  return Response.json({ ok: true });
}
