'use client';
import { useEffect, useState } from 'react';
import { T, track } from './shared';

// After a watch party: rate it, then get a story-size recap card to share or post to your status.
const glass = { background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.14)' };
const firstName = (u) => { const n = String(u?.display_name || u?.username || 'Friend').trim(); const w = n.split(/\s+/)[0]; return w.length <= 3 && n.length > w.length ? (n.length > 16 ? n.slice(0, 15) + '…' : n) : w; };
const fmtDur = (ms) => { const m = Math.round(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`; };

function loadImg(url) {
  return new Promise((res) => {
    if (!url) return res(null);
    const i = new Image(); i.crossOrigin = 'anonymous';
    i.onload = () => res(i); i.onerror = () => res(null);
    i.src = url.replace('/t/p/original', '/t/p/w500');
    setTimeout(() => res(null), 6000);
  });
}

// Draw the 1080×1920 recap card
export async function drawRecap({ movie, self, peer, ratings, reactions, durationMs, endedAt, accent }) {
  const W = 1080, H = 1920;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d');
  const display = (getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim() || "'Inter Tight'") + ', system-ui, -apple-system, Helvetica, Arial, sans-serif';
  const body = (getComputedStyle(document.body).fontFamily || 'system-ui') + ', system-ui, sans-serif';
  const F = (w, s, fam = body) => `${w} ${s}px ${fam}`;
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  const cover = (img, x, y, w, h, r) => { ctx.save(); rr(x, y, w, h, r); ctx.clip(); const s = Math.max(w / img.width, h / img.height); ctx.drawImage(img, x + (w - img.width * s) / 2, y + (h - img.height * s) / 2, img.width * s, img.height * s); ctx.restore(); };
  const spaced = (t, x, y, sp) => { ctx.letterSpacing = `${sp}px`; ctx.fillText(t, x, y); ctx.letterSpacing = '0px'; };
  const fit = (t, max) => { let s = t; while (s.length > 1 && ctx.measureText(s).width > max) s = s.slice(0, -1); return s === t ? s : s.trimEnd() + '…'; };
  const [poster, a1, a2] = await Promise.all([loadImg(movie.poster), loadImg(self?.avatar_url), loadImg(peer?.avatar_url)]);

  // brand ambient
  ctx.fillStyle = '#06060B'; ctx.fillRect(0, 0, W, H);
  const glow = (x, y, r, a) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, accent + a); g.addColorStop(1, accent + '00'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
  glow(0, 0, 1300, '44'); glow(W, H, 1200, '33'); glow(W / 2, 760, 700, '22');

  ctx.textAlign = 'center';
  ctx.fillStyle = accent; ctx.font = F(800, 26); spaced('WATCH PARTY', W / 2, 170, 8);
  ctx.fillStyle = '#fff'; ctx.font = F(800, 76, display); ctx.fillText(fit(`${firstName(self)} & ${firstName(peer)}`, W - 140), W / 2, 262);
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = F(500, 32); ctx.fillText('watched together', W / 2, 314);

  // poster
  const pw = 560, ph = 840, px = (W - pw) / 2, py = 380;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 80; ctx.shadowOffsetY = 30; ctx.fillStyle = '#111'; rr(px, py, pw, ph, 20); ctx.fill(); ctx.restore();
  if (poster) cover(poster, px, py, pw, ph, 20); else { ctx.fillStyle = accent + '33'; rr(px, py, pw, ph, 20); ctx.fill(); }

  // avatars overlapping the poster's bottom edge
  const ar = 74, ay = py + ph;
  const face = (img, u, x, ring) => {
    ctx.fillStyle = '#0B0B12'; ctx.beginPath(); ctx.arc(x, ay, ar + 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ring; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, ay, ar + 4, 0, Math.PI * 2); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(x, ay, ar, 0, Math.PI * 2); ctx.clip();
    if (img) { const s = Math.max((ar * 2) / img.width, (ar * 2) / img.height); ctx.drawImage(img, x - (img.width * s) / 2, ay - (img.height * s) / 2, img.width * s, img.height * s); }
    else { ctx.fillStyle = accent + '44'; ctx.fillRect(x - ar, ay - ar, ar * 2, ar * 2); ctx.fillStyle = '#fff'; ctx.font = F(800, 64, display); ctx.fillText(firstName(u)[0], x, ay + 22); }
    ctx.restore();
  };
  face(a1, self, W / 2 - 62, 'rgba(255,255,255,0.9)'); face(a2, peer, W / 2 + 62, accent);

  // title + meta
  ctx.fillStyle = '#fff'; ctx.font = F(800, 58, display); ctx.fillText(fit(movie.title || '', W - 140), W / 2, ay + ar + 96);
  const date = endedAt ? new Date(endedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = F(500, 30); ctx.fillText([date, durationMs > 60000 ? `${fmtDur(durationMs)} together` : null].filter(Boolean).join('  ·  '), W / 2, ay + ar + 146);

  // ratings
  let y = ay + ar + 240;
  const stars = (n) => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
  const rows = [[self, ratings?.[self?.user_id]], [peer, ratings?.[peer?.user_id]]].filter(([, r]) => r);
  if (rows.length) {
    const colW = (W - 160) / rows.length;
    rows.forEach(([u, r], i) => {
      const cx = 80 + colW * i + colW / 2;
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = F(700, 24); spaced(firstName(u).toUpperCase(), cx, y, 4);
      ctx.fillStyle = accent; ctx.font = F(700, 48); ctx.fillText(stars(r), cx, y + 62);
    });
    y += 140;
  }
  // reactions
  const tally = {};
  Object.values(reactions || {}).forEach((m) => Object.entries(m || {}).forEach(([e, n]) => { tally[e] = (tally[e] || 0) + (n || 0); }));
  const top = Object.entries(tally).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 4);
  if (top.length) {
    ctx.font = F(700, 44);
    const parts = top.map(([e, n]) => `${e} ${n}`);
    const total = parts.reduce((s, p) => s + ctx.measureText(p).width, 0) + (parts.length - 1) * 56;
    let x = W / 2 - total / 2;
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
    parts.forEach((p) => { ctx.fillText(p, x, y + 30); x += ctx.measureText(p).width + 56; });
    ctx.textAlign = 'center';
  }
  // footer
  ctx.fillStyle = '#fff'; ctx.font = F(800, 38, display); ctx.fillText('CineScroll', W / 2, H - 110);
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = F(600, 26); ctx.fillText('Watch together · this-scine.vercel.app', W / 2, H - 66);
  return new Promise((res) => c.toBlob((b) => res(b), 'image/png'));
}

export function RecapPanel({ party, self, peer, movie, accent, myReactions, onRate, onClose }) {
  const me = self?.user_id;
  const ratings = party?.recap?.ratings || {};
  const myRating = ratings[me];
  const [hover, setHover] = useState(0);
  const [img, setImg] = useState(null); // { blob, url }
  const [busy, setBusy] = useState(null);
  const [done, setDone] = useState(null);
  const durationMs = Number(party?.clock_offset_ms || 0);
  const key = JSON.stringify([ratings, party?.recap?.reactions]);

  useEffect(() => {
    if (!myRating) return;
    let alive = true;
    drawRecap({ movie, self, peer, ratings, reactions: party?.recap?.reactions, durationMs, endedAt: party?.ended_at, accent }).then((blob) => {
      if (!alive || !blob) return;
      setImg((old) => { if (old?.url) URL.revokeObjectURL(old.url); return { blob, url: URL.createObjectURL(blob) }; });
    });
    return () => { alive = false; };
  }, [myRating, key]); // eslint-disable-line react-hooks/exhaustive-deps

  const share = async () => {
    if (!img) return;
    track('share', { via: 'party_recap' });
    const file = new File([img.blob], 'watch-party.png', { type: 'image/png' });
    try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text: `Watched ${movie.title} with ${firstName(peer)} on CineScroll 🍿` }); return; } } catch (e) { if (e?.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = img.url; a.download = 'watch-party.png'; a.click();
  };
  const postStatus = async () => {
    if (!img || busy) return;
    setBusy('status');
    try {
      const form = new FormData(); form.append('file', new File([img.blob], 'watch-party.png', { type: 'image/png' })); form.append('kind', 'image');
      const up = await fetch('/api/upload-chat-media', { method: 'POST', body: form }).then((r) => r.json());
      if (!up?.url) throw new Error('upload');
      const r = await fetch('/api/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'image', media_url: up.url, meta: { ar: 1080 / 1920 } }) });
      if (!r.ok) throw new Error('status');
      track('status_post', { from: 'party_recap' });
      setDone('Posted to your status ✓');
    } catch { setDone('Couldn’t post — try again'); }
    setBusy(null);
  };

  if (!myRating) {
    return (
      <div style={{ textAlign: 'center', animation: 'pUp .3s ease' }}>
        <div style={{ fontSize: 34 }}>🎉</div>
        <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 800, marginTop: 4 }}>You finished it together</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 6 }}>How was it?</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }} onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onMouseEnter={() => setHover(n)} onClick={() => onRate(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 38, lineHeight: 1, padding: 4, color: n <= hover ? accent : 'rgba(255,255,255,0.3)', transition: 'transform .15s, color .15s', transform: n <= hover ? 'scale(1.12)' : 'none' }}>★</button>
          ))}
        </div>
        <button onClick={onClose} style={{ marginTop: 12, background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>Skip</button>
      </div>
    );
  }

  const theirs = ratings[peer?.user_id];
  const btn = { ...glass, height: 48, borderRadius: 24, padding: '0 18px', color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 };
  return (
    <div style={{ animation: 'pUp .3s ease' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{ width: 92, aspectRatio: '9/16', borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.06)', boxShadow: '0 12px 30px rgba(0,0,0,0.5)' }}>
          {img && <img src={img.url} alt="Your watch party recap" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: T.serif, fontSize: 19, fontWeight: 800 }}>Your recap is ready</div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.65)', marginTop: 4, lineHeight: 1.45 }}>You gave it {'★'.repeat(myRating)}{theirs ? ` · ${firstName(peer)} gave it ${'★'.repeat(theirs)}` : ` · waiting for ${firstName(peer)}’s rating`}</div>
          {done && <div style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', marginTop: 6 }}>{done}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button onClick={postStatus} disabled={!img || !!busy} style={{ ...btn, flex: 1.3, background: `${accent}2e`, borderColor: accent, opacity: !img || busy ? 0.6 : 1 }}>{busy === 'status' ? 'Posting…' : '⭕ Post to status'}</button>
        <button onClick={share} disabled={!img} style={{ ...btn, flex: 1, opacity: img ? 1 : 0.6 }}>Share</button>
      </div>
      <button onClick={onClose} style={{ display: 'block', margin: '12px auto 0', background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>Close</button>
    </div>
  );
}
