import { LegalPage } from '@/components/LegalPage';
import { APP_NAME, OPERATOR, CONTACT_EMAIL } from '@/lib/brand';

export const metadata = { title: `Privacy policy · ${APP_NAME}`, description: `How ${APP_NAME} collects, uses and protects your information.` };

const mail = <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#F5A623' }}>{CONTACT_EMAIL}</a>;

export default function Privacy() {
  return (
    <LegalPage
      eyebrow="Your data"
      title="Privacy policy"
      intro={<>{APP_NAME} is a film and TV discovery app with social features, run by {OPERATOR}. This policy explains what we collect, why, who helps us run the service, and the choices you have. We don’t sell your data and we don’t show ads.</>}
      other={{ href: '/terms', label: 'Terms of use' }}
      sections={[
        { h: 'What we collect', list: [
          <><b>Account details</b> — your name, username, email address and profile photo, handled by our sign-in provider.</>,
          <><b>What you add</b> — your watchlist, watched films, ratings, reviews, comments, folders, bio and cover photo, and anything you import from Letterboxd or IMDb.</>,
          <><b>Social activity</b> — who you follow, messages, voice notes, photos and statuses you send, reactions, watch parties (who, which film, when, ratings and reactions) and blocks.</>,
          <><b>Calls</b> — audio and video calls connect directly between devices where possible, or through a relay server when needed. We don’t record or store call audio or video; we only store a short “call started/ended” note in your chat.</>,
          <><b>Usage events</b> — simple first-party events like opening a title, saving, or starting a watch party, plus error reports when something crashes. We use these to understand what works and to fix bugs. We don’t use third-party advertising or tracking cookies.</>,
          <><b>On your device</b> — the app stores small preferences in your browser (for example, titles you’ve recently seen so the feed stays fresh).</>,
        ] },
        { h: 'How we use it', list: [
          'To run the app: show your feed, save your lists, deliver messages, run watch parties and calls.',
          'To personalise recommendations from the genres you save and watch.',
          'To send the notifications you’ve turned on (email or push) — you can switch each type off in Settings.',
          'To keep people safe: review reports, enforce blocks and our Terms.',
          'To understand usage and fix problems.',
        ] },
        { h: 'Who can see what', list: [
          'Your profile, followers and public folders are visible to other users and to anyone with your profile link.',
          'Your watchlist is public by default — you can make it private in Settings → Privacy.',
          'Statuses are visible to people who follow you, for 24 hours.',
          'Messages are visible only to you and the person you’re talking to.',
          'If you block someone, they can’t see your profile, message, call, follow or invite you.',
        ] },
        { h: 'Services that help us run CineScroll', p: ['We share data only with providers that process it on our behalf to run the service:'], list: [
          'Clerk — sign-in and account management.',
          'Supabase — database and real-time messaging.',
          'Cloudflare — storage for photos, voice notes and covers, and call relay servers.',
          'Vercel — hosting.',
          'Resend — email notifications.',
          'Browser and phone push services (such as Google and Apple) — to deliver push notifications.',
          'TMDB — film and TV information. We send search terms and title IDs, not your personal details.',
        ] },
        { h: 'How long we keep it', p: [
          'We keep your information while your account is open. Statuses expire after 24 hours. When you delete your account, we erase your profile, lists, reviews, messages, statuses, uploads, follows, watch parties and usage events, then close your sign-in account.',
          'If someone reported your account, we keep that report (without your other data) so we can handle safety issues and repeat abuse.',
        ] },
        { h: 'Your choices and rights', list: [
          'Edit your profile and settings at any time.',
          'Make your watchlist private, turn notifications off, and block people.',
          'Delete your account and data from Settings → Delete account. It’s immediate and permanent.',
          <>Ask us for a copy of your data, or to correct it, by emailing {mail}. Depending on where you live, you may also have the right to object to or restrict processing and to complain to your local data protection authority.</>,
        ] },
        { h: 'Children', p: ['CineScroll is not for children under 13. If you’re under the age required to use online services without parental consent in your country, don’t use CineScroll. If we learn a child under 13 has an account, we’ll delete it — you can tell us using the Report option or by email.'] },
        { h: 'Security', p: ['Data is encrypted in transit, our database is locked so only our servers can access it, and secret keys are never sent to your browser. No service is perfectly secure, so please use a strong password and tell us if you notice anything wrong.'] },
        { h: 'Changes and contact', p: [<>If we change this policy in a meaningful way we’ll let you know in the app. Questions or requests: {mail}.</>] },
      ]}
    />
  );
}
