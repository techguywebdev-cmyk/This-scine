'use client';
import StatusPage, { Icon } from '@/components/cine/Backdrop';

// Last-resort screen if the whole app shell fails
export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#06060B' }}>
        <StatusPage
          icon={<Icon d={<><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></>} />}
          title="Thiscene hit a snag"
          body="Something went wrong loading the app. Try again in a moment."
          primary={{ label: 'Try again', onClick: () => reset() }}
          secondary={{ label: 'Reload', href: '/' }}
        />
      </body>
    </html>
  );
}
