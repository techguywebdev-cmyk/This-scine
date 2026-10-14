'use client';
import { useRef, useState } from 'react';

// Self-view during video calls: drag it anywhere, it glides to the nearest corner when you let go.
// Remembers the corner for next time.
const TOP = 'max(78px, calc(env(safe-area-inset-top) + 66px))';
const BOTTOM = 'calc(env(safe-area-inset-bottom) + 150px)';
const KEY = 'ts_pip_corner';

export default function DragPip({ style, children, zIndex = 4 }) {
  const [corner, setCorner] = useState(() => { try { return localStorage.getItem(KEY) || 'tr'; } catch { return 'tr'; } });
  const [drag, setDrag] = useState(null); // { dx, dy }
  const ref = useRef(null);
  const start = useRef(null);

  const down = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    try { ref.current.setPointerCapture(e.pointerId); } catch {}
  };
  const move = (e) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    setDrag({ dx: e.clientX - s.x, dy: e.clientY - s.y });
  };
  const up = (e) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    start.current = null;
    const el = ref.current, parent = el?.offsetParent;
    if (el && parent && drag && Math.hypot(drag.dx, drag.dy) > 6) {
      const r = el.getBoundingClientRect(), p = parent.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const next = `${cy < p.top + p.height / 2 ? 't' : 'b'}${cx < p.left + p.width / 2 ? 'l' : 'r'}`;
      setCorner(next);
      try { localStorage.setItem(KEY, next); } catch {}
      if (navigator.vibrate) navigator.vibrate(8);
    }
    setDrag(null);
  };

  const pos = {
    top: corner[0] === 't' ? TOP : 'auto',
    bottom: corner[0] === 'b' ? BOTTOM : 'auto',
    left: corner[1] === 'l' ? 14 : 'auto',
    right: corner[1] === 'r' ? 14 : 'auto',
  };

  return (
    <div
      ref={ref}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onClick={(e) => e.stopPropagation()}
      aria-label="Your camera — drag to move"
      style={{
        position: 'absolute', ...pos, zIndex,
        touchAction: 'none', cursor: drag ? 'grabbing' : 'grab', userSelect: 'none',
        transform: drag ? `translate(${drag.dx}px, ${drag.dy}px) scale(1.04)` : 'none',
        transition: drag ? 'none' : 'transform .32s cubic-bezier(.2,.9,.3,1.15), opacity .2s ease',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
