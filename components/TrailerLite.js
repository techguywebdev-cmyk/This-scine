'use client';
import { useState } from 'react';

// Thumbnail first, YouTube only loads after a tap — keeps the page fast.
export default function TrailerLite({ id, title, accent }) {
  const [on, setOn] = useState(false);
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 14, overflow: 'hidden', background: '#000', boxShadow: '0 18px 50px rgba(0,0,0,0.5)' }}>
      {on ? (
        <iframe src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`} title={`${title} trailer`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
      ) : (
        <button onClick={() => setOn(true)} aria-label={`Play ${title} trailer`} style={{ position: 'absolute', inset: 0, padding: 0, border: 0, cursor: 'pointer', background: 'none' }}>
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.85 }} />
          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: `1.5px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
