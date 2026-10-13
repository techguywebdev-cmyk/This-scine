import { LegalPage, accentFrom } from '@/components/LegalPage';
import { APP_NAME, CONTACT_EMAIL } from '@/lib/brand';

export const metadata = { title: `Delete your account · ${APP_NAME}`, description: `How to delete your ${APP_NAME} account and data.` };

export default function DeleteAccount({ searchParams }) {
  const accent = accentFrom(searchParams);
  const mail = <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Delete my ${APP_NAME} account`)}`} style={{ color: accent }}>{CONTACT_EMAIL}</a>;
  return (
    <LegalPage
      accent={accent}
      eyebrow="Your data"
      title="Delete your account"
      intro={<>You can delete your {APP_NAME} account and everything in it at any time, from the app or the website. It’s immediate and can’t be undone.</>}
      other={{ href: '/privacy', label: 'Privacy policy' }}
      sections={[
        { h: 'In the app or on the website', p: ['Sign in, then:'], list: [
          'Tap your profile picture (top right).',
          'Open Settings and scroll to Delete account.',
          'Type DELETE to confirm.',
        ] },
        { h: 'Can’t sign in any more?', p: [<>Email {mail} from the address on your account and ask us to delete it. We’ll confirm and delete it within 30 days.</>] },
        { h: 'What gets deleted', p: ['Your profile, photo and cover, watchlist and folders, reviews and comments, messages and voice notes, statuses, follows, watch parties and reminders, uploaded files, usage events, and your sign-in account.'] },
        { h: 'What may be kept', p: ['Reports other people made about your account are kept as safety records, without your other personal data. Anything someone else already saved outside Thiscene, such as a screenshot, is outside our control.'] },
      ]}
    />
  );
}
