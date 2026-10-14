'use client';
import { useEffect, useMemo, useState } from 'react';
import { T, ambient, subscribePush, track } from './shared';

// "Remind me to watch" sheet for a saved title. Open from anywhere with:
//   window.dispatchEvent(new CustomEvent('cine:remind', { detail: { movie } }))
// movie: a watchlist row ({ movie_id, title, poster, accent, is_tv, remind_at }) or a feed movie ({ id, ... }).

const glass = { background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.14)' };
const eyebrow = (c) => ({ fontSize: 10.5, letterSpacing: 2.2, textTransform: 'uppercase', fontWeight: 700, color: c });
const timeOf = (d) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function fmtRemind(iso) {
  if (!iso) return '';
  const d = new Date(iso), now = new Date();
  const tmr = new Date(now); tmr.setDate(now.getDate() + 1);
  if (sameDay(d, now)) return `${d.getHours() >= 17 ? 'Tonight' : 'Today'} · ${timeOf(d)}`;
  if (sameDay(d, tmr)) return `Tomorrow · ${timeOf(d)}`;
  if (d - now < 6 * 86400000) return `${d.toLocaleDateString([], { weekday: 'short' })} · ${timeOf(d)}`;
  return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })} · ${timeOf(d)}`;
}

function at(base, addDays, h, m = 0) { const d = new Date(base); d.setDate(d.getDate() + addDays); d.setHours(h, m, 0, 0); return d; }

function quickPicks() {
  const now = new Date();
  const out = [];
  const tonight = at(now, 0, 20);
  if (tonight - now > 15 * 60000) out.push({ k: 'tonight', label: 'Tonight', when: tonight });
  else out.push({ k: 'later', label: 'In an hour', when: new Date(now.getTime() + 3600000) });
  out.push({ k: 'tomorrow', label: 'Tomorrow night', when: at(now, 1, 20) });
  const dow = now.getDay(); // 0 Sun … 6 Sat
  let toSat = (6 - dow + 7) % 7; if (toSat === 0 && at(now, 0, 19) - now < 60 * 60000) toSat = 7; if (dow === 0) toSat = 6;
  const sat = at(now, toSat, 19);
  if (toSat > 1) out.push({ k: 'weekend', label: toSat <= 6 ? 'This weekend' : 'Next weekend', when: sat });
  out.push({ k: 'week', label: 'Next week', when: at(now, 7, 20) });
  return out;
}

// Day + time chips for "Pick a day & time" (same on web and app)
export function dayChoices(n = 14) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = at(now, i, 0);
    return { i, d, label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString([], { weekday: 'short' }), sub: d.toLocaleDateString([], { day: 'numeric', month: 'short' }) };
  });
}
export const TIME_CHOICES = [[12, 0], [15, 0], [18, 0], [19, 0], [19, 30], [20, 0], [20, 30], [21, 0], [22, 0]];
const releaseLabel = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString([], { day: 'numeric', month: 'short', year: new Date(`${iso}T12:00:00`).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });


function Switch({ on, onClick, disabled, label, accent }) {
  return (
    <button type="button" role="switch" aria-checked={!!on} aria-label={label} disabled={disabled} onClick={onClick}
      style={{ width: 46, height: 28, borderRadius: 14, border: 'none', padding: 3, cursor: 'pointer', background: on ? accent : 'rgba(255,255,255,0.16)', transition: 'background .2s', flexShrink: 0, opacity: disabled ? 0.5 : 1 }}>
      <span style={{ display: 'block', width: 22, height: 22, borderRadius: '50%', background: '#fff', transform: on ? 'translateX(18px)' : 'none', transition: 'transform .2s cubic-bezier(.3,.7,.3,1)' }} />
    </button>
  );
}

export function RemindSheet({ movie, onClose, onChange }) {
  const accent = movie?.accent || '#F5A623';
  const movieId = movie?.movie_id ?? movie?.id;
  const picks = useMemo(quickPicks, []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [custom, setCustom] = useState(false);
  const days = useMemo(() => dayChoices(14), []);
  const [dayI, setDayI] = useState(1);
  const [tm, setTm] = useState([20, 0]);
  const [people, setPeople] = useState(null);
  const [withId, setWithId] = useState(movie?.remind_with || null);
  const [note, setNote] = useState(movie?.remind_note || '');
  const [released, setReleased] = useState(false);
  const upcoming = movie?.releaseDate && movie.releaseDate > new Date().toISOString().slice(0, 10) ? movie.releaseDate : null;
  const [done, setDone] = useState(null); // { text }
  const [prefs, setPrefs] = useState(null);
  const [perm, setPerm] = useState('unknown'); // granted | default | denied | unsupported

  useEffect(() => {
    fetch('/api/settings').then((r) => (r.ok ? r.json() : null)).then((d) => d && setPrefs(d.notify_prefs || {})).catch(() => {});
    fetch('/api/follows?type=following').then((r) => (r.ok ? r.json() : null)).then((d) => setPeople((d && d.users) || [])).catch(() => setPeople([]));
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) setPerm('unsupported');
    else setPerm(Notification.permission);
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const save = async (when) => {
    if (busy) return;
    setBusy(true); setErr('');
    try {
      const whenLabel = when ? fmtRemind(when.toISOString()).replace(' · ', ' at ') : '';
      const mv = { title: movie?.title, year: movie?.year, rating: movie?.rating, poster: movie?.poster, backdrop: movie?.backdrop, genre: movie?.genre, overview: movie?.overview, accent: movie?.accent, isTV: movie?.isTV ?? movie?.is_tv };
      const r = await fetch('/api/watchlist', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ movieId, remindAt: when ? when.toISOString() : null, ...(when ? { remindWith: withId, note: note.trim() || null, whenLabel } : {}), movie: mv }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Could not set the reminder');
      onChange && onChange(movieId, when ? when.toISOString() : null, { remind_with: when ? withId : null, remind_note: when ? note.trim() || null : null });
      try { window.dispatchEvent(new CustomEvent('cine:watchlist-refresh')); } catch {}
      track(when ? 'watch_remind' : 'watch_remind_off', { movie_id: movieId });
      if (navigator.vibrate) navigator.vibrate(12);
      const friend = withId && people ? people.find((u) => u.user_id === withId) : null;
      setDone({ friend: friend ? (friend.display_name || friend.username || '').split(' ')[0] : null, text: when ? `We'll remind you${friend ? ` and ${(friend.display_name || friend.username || '').split(' ')[0]}` : ''} ${(() => { const f = fmtRemind(when.toISOString()).replace(' · ', ' at '); return /^(Tonight|Today|Tomorrow)/.test(f) ? f[0].toLowerCase() + f.slice(1) : `on ${f}`; })()}` : 'Reminder removed', on: !!when });
      setTimeout(onClose, 1300);
    } catch (e) { setErr(e.message || 'Something went wrong'); } finally { setBusy(false); }
  };

  const remindRelease = async () => {
    if (busy || !upcoming) return;
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/reminders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ movieId, mediaType: movie?.isTV || movie?.is_tv ? 'tv' : 'movie', title: movie?.title, poster: movie?.poster, releaseDate: upcoming }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Could not set that');
      setReleased(true);
      setDone({ text: `We'll tell you when it's out · ${releaseLabel(upcoming)}`, on: true });
      setTimeout(onClose, 1500);
    } catch (e) { setErr(e.message || 'Something went wrong'); } finally { setBusy(false); }
  };

  const turnOnPush = async () => {
    try {
      await subscribePush();
      setPerm('granted');
      fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notify_prefs: { web: true } }) }).catch(() => {});
    } catch (e) { setPerm(typeof Notification !== 'undefined' ? Notification.permission : 'denied'); }
  };

  const toggleNudge = () => {
    const next = !(prefs && prefs.nudge);
    let tz = 'UTC'; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch {}
    setPrefs((p) => ({ ...(p || {}), nudge: next, tz }));
    fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notify_prefs: { nudge: next, tz } }) }).catch(() => setPrefs((p) => ({ ...(p || {}), nudge: !next })));
    track(next ? 'nudge_on' : 'nudge_off', {});
  };

  const row = { display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 0', background: 'none', border: 'none', borderTop: `1px solid ${T.hairline}`, color: '#fff', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' };
  const current = movie?.remind_at && Date.parse(movie.remind_at) > Date.now() ? movie.remind_at : null;

  return (
    <div onClick={() => !busy && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 520, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'rmIn .2s ease' }}>
      <style>{`@keyframes rmIn{from{opacity:0}to{opacity:1}}@keyframes rmUp{from{transform:translateY(100%)}to{transform:none}}@keyframes rmPop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:scale(1)}}@keyframes rmRing{0%,100%{transform:rotate(0)}20%{transform:rotate(14deg)}40%{transform:rotate(-12deg)}60%{transform:rotate(8deg)}80%{transform:rotate(-4deg)}}`}</style>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Remind me to watch" style={{ width: '100%', maxWidth: 560, maxHeight: '88dvh', overflowY: 'auto', background: ambient(accent), borderRadius: '22px 22px 0 0', borderTop: `1px solid ${T.hairline}`, padding: '10px 22px calc(22px + env(safe-area-inset-bottom))', color: '#fff', animation: 'rmUp .32s cubic-bezier(0.22,1,0.36,1)' }}>
        <div style={{ width: 34, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.25)', margin: '0 auto 16px' }} />

        {done ? (
          <div style={{ padding: '26px 0 30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', ...glass, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'rmPop .45s cubic-bezier(.3,1.4,.5,1)' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={done.on ? accent : '#fff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: done.on ? 'rmRing .7s ease .25s' : 'none', transformOrigin: '50% 10%' }} aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
            </div>
            <div style={{ fontFamily: T.serif, fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em' }}>{done.text}</div>
            {done.on && <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)' }}>{movie.title}</div>}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', paddingBottom: 16 }}>
              <div style={{ width: 46, aspectRatio: '2/3', borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.08)' }}>{movie?.poster && <img src={movie.poster} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</div>
              <div style={{ minWidth: 0 }}>
                <div style={eyebrow(accent)}>Remind me to watch</div>
                <div style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15, marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{movie?.title}</div>
                {current && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>Currently set for {fmtRemind(current)}</div>}
              </div>
            </div>

            {people && people.length > 0 && (
              <div style={{ paddingBottom: 14 }}>
                <div style={{ ...eyebrow('rgba(255,255,255,0.5)'), fontSize: 9.5, marginBottom: 10 }}>Watch it with</div>
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
                  {[{ user_id: null, display_name: 'Just me' }, ...people].map((u) => {
                    const on = withId === u.user_id;
                    const nm = (u.display_name || u.username || '').split(' ')[0];
                    return (
                      <button key={u.user_id || 'me'} type="button" onClick={() => setWithId(u.user_id)} aria-pressed={on} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 58, flexShrink: 0, fontFamily: 'inherit' }}>
                        <span style={{ width: 48, height: 48, borderRadius: '50%', padding: 2, border: `2px solid ${on ? accent : 'transparent'}`, boxSizing: 'border-box', display: 'flex' }}>
                          <span style={{ flex: 1, borderRadius: '50%', overflow: 'hidden', background: u.user_id ? '#1A1A22' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15 }}>
                            {u.user_id ? (u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (nm[0] || 'U').toUpperCase()) : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>}
                          </span>
                        </span>
                        <span style={{ fontSize: 11, fontWeight: on ? 800 : 600, color: on ? '#fff' : 'rgba(255,255,255,0.55)', maxWidth: 58, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nm}</span>
                      </button>
                    );
                  })}
                </div>
                {withId && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 8 }}>They’ll get a heads-up now, and you’ll both be reminded.</div>}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderTop: `1px solid ${T.hairline}` }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
              <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 80))} placeholder="Add a note — “order pizza”, “bring tissues”…" aria-label="Reminder note" style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 14, fontFamily: 'inherit' }} />
            </div>

            {picks.map((p) => (
              <button key={p.k} type="button" disabled={busy} onClick={() => save(p.when)} style={row}>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{p.label}</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{p.k === 'weekend' || p.k === 'week' ? `${p.when.toLocaleDateString([], p.k === 'week' ? { weekday: 'short', day: 'numeric', month: 'short' } : { weekday: 'short' })} · ${timeOf(p.when)}` : timeOf(p.when)}</span>
              </button>
            ))}

            <button type="button" onClick={() => setCustom((c) => !c)} style={row} aria-expanded={custom}>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>Pick a day & time</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={{ transform: custom ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}><path d="M9 6l6 6-6 6" /></svg>
            </button>
            {custom && (() => {
              const when = at(days[dayI].d, 0, tm[0], tm[1]);
              const past = when.getTime() < Date.now() + 5 * 60000;
              const chipS = (on) => ({ ...glass, flexShrink: 0, borderRadius: 12, padding: '8px 12px', cursor: 'pointer', fontFamily: 'inherit', color: '#fff', background: on ? '#fff' : glass.background, ...(on ? { color: '#06060B', border: '1px solid #fff' } : {}) });
              return (
                <div style={{ paddingBottom: 14 }}>
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                    {days.map((d) => (
                      <button key={d.i} type="button" onClick={() => setDayI(d.i)} style={{ ...chipS(dayI === d.i), display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 62 }}>
                        <span style={{ fontSize: 13, fontWeight: 800 }}>{d.label}</span>
                        <span style={{ fontSize: 10.5, opacity: 0.7, marginTop: 2 }}>{d.sub}</span>
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '8px 0 4px', scrollbarWidth: 'none' }}>
                    {TIME_CHOICES.map(([h, m]) => {
                      const t = at(days[dayI].d, 0, h, m);
                      const gone = t.getTime() < Date.now() + 5 * 60000;
                      return <button key={`${h}:${m}`} type="button" disabled={gone} onClick={() => setTm([h, m])} style={{ ...chipS(tm[0] === h && tm[1] === m), fontSize: 13, fontWeight: 700, opacity: gone ? 0.3 : 1, cursor: gone ? 'default' : 'pointer' }}>{timeOf(t)}</button>;
                    })}
                  </div>
                  <button type="button" disabled={busy || past} onClick={() => save(when)} style={{ width: '100%', height: 46, marginTop: 10, borderRadius: 23, border: 'none', background: past ? 'rgba(255,255,255,0.2)' : '#fff', color: '#06060B', fontWeight: 800, fontSize: 14, fontFamily: 'inherit', cursor: past ? 'default' : 'pointer' }}>
                    {past ? 'Pick a later time' : `Remind me ${fmtRemind(when.toISOString()).replace(' · ', ' at ')}`}
                  </button>
                </div>
              );
            })()}

            {upcoming && !released && (
              <button type="button" disabled={busy} onClick={remindRelease} style={row}>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>When it comes out</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>We’ll ping you on release day</span>
                </span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{releaseLabel(upcoming)}</span>
              </button>
            )}

            {perm !== 'granted' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderTop: `1px solid ${T.hairline}` }}>
                <div style={{ flex: 1, fontSize: 12.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                  {perm === 'default' ? 'Turn on notifications so the reminder pops up on this device. Otherwise we’ll email you.' : perm === 'denied' ? 'Notifications are blocked in this browser, so we’ll email your reminder instead.' : 'This browser can’t show notifications (on iPhone, add Thiscene to your Home Screen). We’ll email you instead.'}
                </div>
                {perm === 'default' && <button type="button" onClick={turnOnPush} style={{ ...glass, height: 34, padding: '0 14px', borderRadius: 17, color: '#fff', fontWeight: 700, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0 }}>Turn on</button>}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0 4px', borderTop: `1px solid ${T.hairline}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Nudge me about older saves</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2, lineHeight: 1.45 }}>Once a week at most, around 7pm, for something you saved a while ago.</div>
              </div>
              <Switch on={!!(prefs && prefs.nudge)} disabled={!prefs} onClick={toggleNudge} label="Nudge me about older saves" accent={accent} />
            </div>

            {err && <div role="alert" style={{ marginTop: 12, fontSize: 12.5, color: '#ff8a8a' }}>{err}</div>}

            {current && (
              <button type="button" disabled={busy} onClick={() => save(null)} style={{ ...glass, width: '100%', height: 48, borderRadius: 14, marginTop: 16, color: '#ff8a8a', fontWeight: 700, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>Remove reminder</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
