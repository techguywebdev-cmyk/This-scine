'use client';
import { useEffect } from 'react';
import StatusPage, { Icon } from '@/components/cine/Backdrop';

// Any page that crashes lands here — designed, reported, and one tap to retry
export default function Error({ error, reset }) {
  useEffect(() => {
    try {
      const body = JSON.stringify({ name: 'client_error', props: { msg: String(error?.message || error).slice(0, 300), src: 'error-boundary', path: location.pathname, stack: String(error?.stack || '').slice(0, 400) } });
      navigator.sendBeacon ? navigator.sendBeacon('/api/track', body) : fetch('/api/track', { method: 'POST', body, keepalive: true });
    } catch {}
  }, [error]);
  return (
    <StatusPage
      icon={<Icon d={<><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></>} />}
      title="That scene didn’t load"
      body="Something went wrong on this page. We’ve been told about it — try again, and if it keeps happening, head back to the feed."
      primary={{ label: 'Try again', onClick: () => reset() }}
      secondary={{ label: 'Back to your feed', href: '/' }}
    />
  );
}
