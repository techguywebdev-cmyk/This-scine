'use client';
import { useEffect, useState } from 'react';
import { T, ambient, track } from './shared';

// Report / block sheet, opened anywhere via:
//   window.dispatchEvent(new CustomEvent('cine:safety', { detail: { user, kind, targetId, snapshot, mode } }))
// user: { user_id, display_name, username, avatar_url }   kind: 'user'|'message'|'status'|'review'|'comment'|'list'
// After a block, 'cine:blocked' { userId } fires so open screens can close themselves.

const REASONS = [
  ['spam', 'Spam or scam'],
  ['harassment', 'Harassment or bullying'],
  ['inappropriate', 'Nudity, violence or hateful content'],
  ['impersonation', 'Pretending to be someone else'],
  ['underage', 'May be under 13'],
  ['other', 'Something else'],
];
const KIND_LABEL = { user: 'account', message: 'message', status: 'status', review: 'review', comment: 'comment', list: 'folder' };
const glass = { background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.14)' };
const nameOf = (u) => (u?.display_name || u?.username || 'this person').trim();

export function SafetySheet({ user, kind = 'user', targetId = null, snapshot = null, mode = 'menu', accent = '#F5A623', onClose }) {
  const [view, setView] = useState(mode); // menu | report | confirmBlock | done
  const [reason, setReason] = useState(null);
  const [note, setNote] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(kind === 'user' || kind === 'message');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [doneText, setDoneText] = useState('');
  const name = nameOf(user);
  const w0 = name.split(/\s+/)[0];
  const first = w0.length <= 3 && name.length > w0.length ? (name.length > 16 ? name.slice(0, 15) + '…' : name) : w0;

  useEffect(() => {
    const k = (e) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [busy, onClose]);

  const post = async (payload) => {
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/safety', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Something went wrong');
      return d;
    } catch (e) { setErr(e.message || 'Something went wrong'); return null; } finally { setBusy(false); }
  };

  const doBlock = async () => {
    const d = await post({ action: 'block', userId: user.user_id });
    if (!d) return;
    track('block');
    window.dispatchEvent(new CustomEvent('cine:blocked', { detail: { userId: user.user_id } }));
    setDoneText(`${first} is blocked. They can’t message, call, follow or invite you, and you won’t see each other’s statuses. You can unblock in Settings.`);
    setView('done');
  };

  const doReport = async () => {
    if (!reason) return;
    const d = await post({ action: 'report', userId: user?.user_id, kind, targetId, reason, note: note.trim() || null, snapshot, alsoBlock: alsoBlock && !!user?.user_id });
    if (!d) return;
    track('report', { kind, reason });
    if (d.blocked) window.dispatchEvent(new CustomEvent('cine:blocked', { detail: { userId: user.user_id } }));
    setDoneText(`Thanks for telling us. We’ll review this ${KIND_LABEL[kind] || 'report'}${d.blocked ? ` — and ${first} is now blocked` : ''}. ${first} won’t know you reported them.`);
    setView('done');
  };

  const row = { width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '15px 2px', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, textAlign: 'left', cursor: 'pointer' };
  const primary = { ...glass, width: '100%', height: 52, borderRadius: 26, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 800, cursor: 'pointer' };
  const danger = { ...primary, color: '#ff8a8a' };

  return (
    <div onClick={() => !busy && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 520, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'sfIn .2s ease' }}>
      <style>{`@keyframes sfIn{from{opacity:0}to{opacity:1}}@keyframes sfUp{from{transform:translateY(100%)}to{transform:none}}`}</style>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, maxHeight: '88dvh', overflowY: 'auto', background: ambient(accent), borderRadius: '22px 22px 0 0', borderTop: `1px solid ${T.hairline}`, padding: '10px 22px calc(22px + env(safe-area-inset-bottom))', color: '#fff', animation: 'sfUp .32s cubic-bezier(0.22,1,0.36,1)' }}>
        <div style={{ width: 34, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.25)', margin: '0 auto 14px' }} />

        {view === 'menu' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 6 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>{user?.avatar_url ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name[0]?.toUpperCase()}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                {user?.username && <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)' }}>@{user.username}</div>}
              </div>
            </div>
            <button onClick={() => setView('report')} style={row}><span style={{ width: 22, textAlign: 'center' }}>⚑</span>Report {kind === 'user' ? first : `this ${KIND_LABEL[kind]}`}</button>
            {user?.user_id && <button onClick={() => setView('confirmBlock')} style={{ ...row, color: '#ff7b7b', borderBottom: 'none' }}><span style={{ width: 22, textAlign: 'center' }}>⊘</span>Block {first}</button>}
            <button onClick={onClose} style={{ ...primary, marginTop: 14 }}>Cancel</button>
          </>
        )}

        {view === 'report' && (
          <>
            <div style={{ fontSize: 10.5, letterSpacing: 2.2, textTransform: 'uppercase', fontWeight: 700, color: accent }}>Report {KIND_LABEL[kind] || 'account'}</div>
            <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 800, marginTop: 8, lineHeight: 1.2 }}>What’s wrong?</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 6, lineHeight: 1.5 }}>Your report is private — {first} won’t see who sent it.</div>
            <div style={{ marginTop: 10 }}>
              {REASONS.map(([k, label]) => (
                <button key={k} onClick={() => setReason(k)} style={{ ...row, fontWeight: reason === k ? 800 : 600 }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${reason === k ? accent : 'rgba(255,255,255,0.35)'}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{reason === k && <span style={{ width: 10, height: 10, borderRadius: '50%', background: accent }} />}</span>
                  {label}
                </button>
              ))}
            </div>
            {reason && (
              <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 1000))} placeholder="Anything else we should know? (optional)" rows={3} style={{ width: '100%', boxSizing: 'border-box', marginTop: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '12px 14px', color: '#fff', fontFamily: 'inherit', fontSize: 14, resize: 'none', outline: 'none' }} />
            )}
            {user?.user_id && (
              <button onClick={() => setAlsoBlock((v) => !v)} style={{ ...row, borderBottom: 'none', fontSize: 14, marginTop: 4 }}>
                <span style={{ width: 40, height: 24, borderRadius: 12, background: alsoBlock ? accent : 'rgba(255,255,255,0.18)', position: 'relative', flexShrink: 0, transition: 'background .2s' }}><span style={{ position: 'absolute', top: 3, left: alsoBlock ? 19 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} /></span>
                Also block {first}
              </button>
            )}
            {err && <div style={{ color: '#ff8a8a', fontSize: 13, marginTop: 6 }}>{err}</div>}
            <button disabled={!reason || busy} onClick={doReport} style={{ ...primary, marginTop: 12, background: reason ? `${accent}33` : glass.background, borderColor: reason ? accent : glass.border.split(' ').pop(), opacity: !reason || busy ? 0.6 : 1 }}>{busy ? 'Sending…' : 'Send report'}</button>
            <button onClick={() => (mode === 'report' ? onClose() : setView('menu'))} style={{ display: 'block', margin: '10px auto 0', background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Back</button>
          </>
        )}

        {view === 'confirmBlock' && (
          <>
            <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>Block {name}?</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 10, lineHeight: 1.55 }}>
              They won’t be able to message, call, follow or invite you to a watch party. You’ll stop following each other and won’t see each other’s statuses or activity. We won’t tell them.
            </div>
            {err && <div style={{ color: '#ff8a8a', fontSize: 13, marginTop: 10 }}>{err}</div>}
            <button disabled={busy} onClick={doBlock} style={{ ...danger, marginTop: 20, opacity: busy ? 0.6 : 1 }}>{busy ? 'Blocking…' : `Block ${first}`}</button>
            <button onClick={() => (mode === 'confirmBlock' ? onClose() : setView('menu'))} style={{ ...primary, marginTop: 10 }}>Cancel</button>
          </>
        )}

        {view === 'done' && (
          <div style={{ textAlign: 'center', padding: '10px 0 4px' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', margin: '0 auto', background: `${accent}2e`, border: `1px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>✓</div>
            <div style={{ fontFamily: T.serif, fontSize: 21, fontWeight: 800, marginTop: 14 }}>Done</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 8, lineHeight: 1.55 }}>{doneText}</div>
            <button onClick={onClose} style={{ ...primary, marginTop: 20 }}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

// Settings → Blocked accounts
export function BlockedList({ accent = '#F5A623' }) {
  const [list, setList] = useState(null);
  const load = () => fetch('/api/safety', { cache: 'no-store' }).then((r) => r.json()).then((d) => setList(d.blocked || [])).catch(() => setList([]));
  useEffect(() => { load(); }, []);
  const unblock = async (u) => {
    setList((l) => l.filter((x) => x.user_id !== u.user_id));
    await fetch('/api/safety', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unblock', userId: u.user_id }) }).catch(() => load());
    track('unblock');
  };
  if (list === null) return <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', padding: '10px 0' }}>Loading…</div>;
  if (!list.length) return <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', padding: '10px 0', lineHeight: 1.5 }}>You haven’t blocked anyone. You can block or report someone from the ⋯ menu on their profile, in a chat or on a status.</div>;
  return (
    <div>
      {list.map((u, i) => (
        <div key={u.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>{u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (u.display_name || 'U')[0]}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.display_name}</div>
            {u.username && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>@{u.username}</div>}
          </div>
          <button onClick={() => unblock(u)} style={{ ...glass, height: 34, padding: '0 14px', borderRadius: 17, color: '#fff', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>Unblock</button>
        </div>
      ))}
    </div>
  );
}

// Settings → Delete account (permanent)
export function DeleteAccountSheet({ accent = '#F5A623', onClose, onDeleted }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const ok = text.trim().toUpperCase() === 'DELETE';
  const go = async () => {
    if (!ok || busy) return;
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/account', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: 'DELETE' }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Something went wrong');
      try { Object.keys(localStorage).filter((k) => k.startsWith('cs_') || k.startsWith('cine_')).forEach((k) => localStorage.removeItem(k)); } catch {}
      onDeleted();
    } catch (e) { setErr(e.message); setBusy(false); }
  };
  const btn = { ...glass, width: '100%', height: 52, borderRadius: 26, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 800, cursor: 'pointer' };
  const items = ['Your profile, bio, cover and sign-in', 'Your watchlist, watched films, reviews and folders', 'Your messages, statuses, photos and voice notes', 'Followers, following, watch parties and blocks'];
  return (
    <div onClick={() => !busy && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 520, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'sfIn .2s ease' }}>
      <style>{`@keyframes sfIn{from{opacity:0}to{opacity:1}}@keyframes sfUp{from{transform:translateY(100%)}to{transform:none}}`}</style>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, maxHeight: '88dvh', overflowY: 'auto', background: ambient(accent), borderRadius: '22px 22px 0 0', borderTop: `1px solid ${T.hairline}`, padding: '10px 22px calc(22px + env(safe-area-inset-bottom))', color: '#fff', animation: 'sfUp .32s cubic-bezier(0.22,1,0.36,1)' }}>
        <div style={{ width: 34, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.25)', margin: '0 auto 16px' }} />
        <div style={{ fontSize: 10.5, letterSpacing: 2.2, textTransform: 'uppercase', fontWeight: 700, color: '#ff8a8a' }}>Permanent</div>
        <div style={{ fontFamily: T.serif, fontSize: 24, fontWeight: 800, marginTop: 8 }}>Delete your account?</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 8, lineHeight: 1.55 }}>This can’t be undone. We’ll erase:</div>
        <div style={{ marginTop: 10 }}>
          {items.map((t) => <div key={t} style={{ display: 'flex', gap: 10, padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 13.5, color: 'rgba(255,255,255,0.85)' }}><span style={{ color: '#ff8a8a' }}>✕</span>{t}</div>)}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 10, lineHeight: 1.5 }}>Conversations you were part of disappear for the other person too.</div>
        <div style={{ fontSize: 13, fontWeight: 700, marginTop: 18 }}>Type DELETE to confirm</div>
        <input value={text} onChange={(e) => setText(e.target.value)} autoCapitalize="characters" autoComplete="off" placeholder="DELETE" style={{ width: '100%', boxSizing: 'border-box', marginTop: 8, height: 48, borderRadius: 14, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.14)', color: '#fff', padding: '0 14px', fontFamily: 'inherit', fontSize: 15, letterSpacing: 2, outline: 'none' }} />
        {err && <div style={{ color: '#ff8a8a', fontSize: 13, marginTop: 10 }}>{err}</div>}
        <button disabled={!ok || busy} onClick={go} style={{ ...btn, marginTop: 16, color: '#ff8a8a', opacity: !ok || busy ? 0.45 : 1 }}>{busy ? 'Deleting everything…' : 'Delete my account'}</button>
        <button disabled={busy} onClick={onClose} style={{ ...btn, marginTop: 10 }}>Keep my account</button>
      </div>
    </div>
  );
}
