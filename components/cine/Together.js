'use client';
import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { T, ambient, SvgIcon, track } from './shared';

// "Watch together": what you and a friend both want to watch, and a one-tap pick for tonight.
const glass = { background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.14)' };
const eyebrow = (c) => ({ fontSize: 10.5, letterSpacing: 2.2, textTransform: 'uppercase', fontWeight: 700, color: c });
const asMovie = (m) => ({ id: m.movie_id, title: m.title, poster: m.poster, backdrop: m.backdrop, year: m.year, rating: m.rating, genre: m.genre || [], overview: m.overview, accent: m.accent, isTV: !!m.is_tv, mediaType: m.is_tv ? 'tv' : 'movie' });
const openTitle = (m) => window.dispatchEvent(new CustomEvent('cine:open-title', { detail: asMovie(m) }));

function Face({ u, size = 34, ring }) {
  const letter = (u?.display_name || u?.username || u?.firstName || '?')[0]?.toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.1)', boxShadow: `0 0 0 2.5px ${ring || '#0B0B12'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
      {u?.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : letter}
    </div>
  );
}

function PosterRow({ items, label }) {
  if (!items.length) return null;
  return (
    <div style={{ marginTop: 28 }}>
      <div style={eyebrow('rgba(255,255,255,0.5)')}>{label}</div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none', margin: '12px -20px 0', padding: '0 20px' }}>
        {items.map((m) => (
          <button key={m.movie_id} onClick={() => openTitle(m)} style={{ flexShrink: 0, width: 92, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
            <div style={{ width: '100%', aspectRatio: '2/3', borderRadius: 3, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>{m.poster && <img src={m.poster} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}</div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#fff', marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function TogetherSheet({ peer, accent = '#F5A623', onClose }) {
  const { user } = useUser();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [pick, setPick] = useState(null);
  const [providers, setProviders] = useState(null);
  const [shown, setShown] = useState([]);
  const [sent, setSent] = useState(false);
  const name = (peer?.display_name || peer?.username || 'your friend').split(' ')[0];

  useEffect(() => {
    let alive = true;
    fetch(`/api/together?with=${encodeURIComponent(peer.user_id)}`, { cache: 'no-store' })
      .then((r) => r.json()).then((d) => { if (alive) { if (d.error) setErr(d.error); else setData(d); } })
      .catch(() => alive && setErr('Couldn’t load — try again'));
    return () => { alive = false; };
  }, [peer.user_id]);
  useEffect(() => { const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev; }; }, []);

  const pickOne = () => {
    const pool = (data?.both || []).filter((m) => !shown.includes(m.movie_id));
    const src = pool.length ? pool : data?.both || [];
    if (!src.length) return;
    // favour the best-matched titles, with a little randomness so "Another" feels fresh
    const top = src.slice(0, Math.min(8, src.length));
    const weights = top.map((_, i) => 1 / (i + 1.5));
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    let chosen = top[0];
    for (let i = 0; i < top.length; i++) { r -= weights[i]; if (r <= 0) { chosen = top[i]; break; } }
    setPick(chosen); setSent(false); setProviders(null);
    setShown((s) => (pool.length ? [...s, chosen.movie_id] : [chosen.movie_id]));
    track('together_pick');
    fetch(`/api/providers?id=${chosen.movie_id}&type=${chosen.is_tv ? 'tv' : 'movie'}`).then((r) => r.json()).then((d) => setProviders(d.providers || [])).catch(() => setProviders([]));
  };

  const sendPick = async () => {
    if (!pick) return;
    const meta = { id: pick.movie_id, type: pick.is_tv ? 'tv' : 'movie', title: pick.title, poster: pick.poster || null, backdrop: pick.backdrop || null, year: pick.year || null, rating: pick.rating || null, accent: pick.accent || null };
    await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toUserId: peer.user_id, msg_type: 'title', text: pick.title, meta }) }).catch(() => {});
    await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toUserId: peer.user_id, text: `Tonight? 🍿 We both saved ${pick.title}` }) }).catch(() => {});
    setSent(true);
  };

  const me = { avatar_url: user?.imageUrl, display_name: user?.firstName || user?.username };
  const both = data?.both || [];
  const pill = { ...glass, height: 40, borderRadius: 20, padding: '0 16px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 380, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)' }} />
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 381, maxWidth: 640, margin: '0 auto', height: '88dvh', background: ambient(accent), borderRadius: '22px 22px 0 0', borderTop: `1px solid ${T.hairline}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'togUp .32s cubic-bezier(0.22,1,0.36,1)' }}>
        <style>{`@keyframes togUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes togPop{0%{transform:scale(.92);opacity:0}100%{transform:scale(1);opacity:1}}@keyframes togShim{0%{background-position:-200px 0}100%{background-position:200px 0}}`}</style>
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', padding: '10px 20px calc(28px + env(safe-area-inset-bottom))' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.3)', margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', flexShrink: 0 }}><Face u={me} size={42} /><div style={{ marginLeft: -12 }}><Face u={peer} size={42} ring={accent} /></div></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={eyebrow(accent)}>Watch together</div>
              <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff', marginTop: 3 }}>You & {name}</div>
            </div>
            <button onClick={onClose} aria-label="Close" style={{ ...glass, width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}><SvgIcon name="close" size={14} color="#fff" /></button>
          </div>

          {!data && !err && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 26 }}>
              {Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ aspectRatio: '2/3', borderRadius: 3, background: 'linear-gradient(90deg,rgba(255,255,255,0.03),rgba(255,255,255,0.08),rgba(255,255,255,0.03))', backgroundSize: '400px 100%', animation: 'togShim 1.2s linear infinite' }} />)}
            </div>
          )}
          {err && <div style={{ fontSize: 13, color: '#FF8FA3', marginTop: 24 }}>{err}</div>}

          {data?.private && (
            <div style={{ marginTop: 28, fontSize: 13.5, color: 'rgba(255,255,255,0.75)', lineHeight: 1.55 }}>{name}’s watchlist is private. Once you follow each other, you’ll see what you both want to watch here.</div>
          )}

          {data && !data.private && (
            <>
              <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.7)', marginTop: 16, lineHeight: 1.5 }}>
                {both.length ? <><b style={{ color: '#fff' }}>{both.length}</b> {both.length === 1 ? 'title' : 'titles'} you both want to watch.</> : `Nothing in common on your watchlists yet — save a few films and check back.`}
              </div>

              {both.length > 0 && !pick && (
                <button onClick={pickOne} style={{ ...pill, width: '100%', height: 48, borderRadius: 24, marginTop: 16, fontSize: 14 }}>
                  <span style={{ fontSize: 16 }}>🍿</span>Pick for tonight
                </button>
              )}

              {pick && (
                <div key={pick.movie_id} style={{ position: 'relative', marginTop: 18, borderRadius: 12, overflow: 'hidden', boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.1)`, animation: 'togPop .35s ease' }}>
                  {(pick.backdrop || pick.poster) && <img src={pick.backdrop || pick.poster} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.45 }} />}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(6,6,11,0.2), rgba(6,6,11,0.9))' }} />
                  <div style={{ position: 'relative', display: 'flex', gap: 14, padding: 14 }}>
                    <div style={{ width: 86, aspectRatio: '2/3', borderRadius: 3, overflow: 'hidden', flexShrink: 0, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>{pick.poster && <img src={pick.poster} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}</div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                      <div style={eyebrow(accent)}>Tonight’s pick</div>
                      <div style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff', marginTop: 4, lineHeight: 1.15 }}>{pick.title}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>{[pick.year, pick.rating && pick.rating !== 'N/A' ? `★ ${pick.rating}` : null, pick.genre?.[0]].filter(Boolean).join(' · ')}</div>
                      <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.75)', marginTop: 6, minHeight: 16 }}>
                        {providers === null ? 'Checking where to watch…' : providers.length ? `On ${providers.slice(0, 3).map((p) => p.provider_name).join(' · ')}` : 'Not streaming right now'}
                      </div>
                    </div>
                  </div>
                  <div style={{ position: 'relative', display: 'flex', gap: 8, padding: '0 14px 14px', flexWrap: 'wrap' }}>
                    <button onClick={() => openTitle(pick)} style={pill}><SvgIcon name="play" size={12} color="#fff" filled />Trailer</button>
                    <button onClick={sendPick} disabled={sent} style={{ ...pill, opacity: sent ? 0.7 : 1 }}>{sent ? <><SvgIcon name="check" size={13} color="#fff" />Sent</> : <><SvgIcon name="send" size={12} color="#fff" />Send to {name}</>}</button>
                    {both.length > 1 && <button onClick={pickOne} style={{ ...pill, background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', padding: '0 6px' }}>Another</button>}
                  </div>
                </div>
              )}

              {both.length > 0 && (
                <div style={{ marginTop: 28 }}>
                  <div style={eyebrow('rgba(255,255,255,0.5)')}>You both want to watch</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px 10px', marginTop: 12 }}>
                    {both.map((m) => (
                      <button key={m.movie_id} onClick={() => openTitle(m)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', minWidth: 0 }}>
                        <div style={{ width: '100%', aspectRatio: '2/3', borderRadius: 3, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', boxShadow: pick?.movie_id === m.movie_id ? `0 0 0 2px ${accent}` : 'none' }}>{m.poster && <img src={m.poster} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}</div>
                        <div style={{ fontSize: 11.5, fontWeight: 600, color: '#fff', marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <PosterRow items={data.theySaw || []} label={`${name} has seen these — ask them`} />
              <PosterRow items={data.youSaw || []} label={`You’ve seen — ${name} wants to`} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
