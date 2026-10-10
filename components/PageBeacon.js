'use client';
import { useEffect } from 'react';

// Tiny view beacon for public pages (no app bundle): same payload as track() in cine/shared.js
export default function PageBeacon({ name = 'title_page', props }) {
  useEffect(() => {
    try {
      let id = localStorage.getItem('cs_anon');
      if (!id) { id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2)).replace(/[^a-z0-9-]/gi, ''); localStorage.setItem('cs_anon', id); }
      const body = JSON.stringify({ name, props: { ...(props || {}), ref: document.referrer ? new URL(document.referrer).hostname.slice(0, 60) : null }, anonId: id });
      if (navigator.sendBeacon) navigator.sendBeacon('/api/track', new Blob([body], { type: 'text/plain' }));
      else fetch('/api/track', { method: 'POST', body, keepalive: true }).catch(() => {});
    } catch {}
  }, [name]);
  return null;
}
