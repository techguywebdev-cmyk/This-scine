'use client';
import StatusPage, { Icon } from '@/components/cine/Backdrop';

export default function NotFound() {
  return (
    <StatusPage
      icon={<Icon d={<><rect x="2" y="2" width="20" height="20" rx="2.5" /><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5" /></>} />}
      title="This scene got cut"
      body="That page doesn’t exist any more — the link may be old or mistyped."
      primary={{ label: 'Back to your feed', href: '/' }}
    />
  );
}
