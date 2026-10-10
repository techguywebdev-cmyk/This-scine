import { LegalPage } from '@/components/LegalPage';
import { APP_NAME, OPERATOR, CONTACT_EMAIL } from '@/lib/brand';

export const metadata = { title: `Terms of use · ${APP_NAME}`, description: `The rules for using ${APP_NAME}.` };

const mail = <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#F5A623' }}>{CONTACT_EMAIL}</a>;

export default function Terms() {
  return (
    <LegalPage
      eyebrow="The rules"
      title="Terms of use"
      intro={<>These terms are an agreement between you and {OPERATOR}, who runs {APP_NAME}. By creating an account or using the app you agree to them. If you don’t agree, please don’t use {APP_NAME}.</>}
      other={{ href: '/privacy', label: 'Privacy policy' }}
      sections={[
        { h: 'Who can use it', p: ['You must be at least 13, and old enough in your country to use online services without a parent’s permission. You’re responsible for your account and for keeping your sign-in secure. One person per account — don’t impersonate anyone.'] },
        { h: 'Your content', p: [
          `You own what you post — reviews, comments, folders, messages, photos, voice notes and statuses. You give us a licence to store, display and share it inside ${APP_NAME} as needed to run the service (for example, showing your review to other users or delivering your message). This licence ends when you delete the content or your account, except for copies other people already received, such as messages.`,
          'Only post things you have the right to share.',
        ] },
        { h: 'Be decent', p: ['Don’t use CineScroll to:'], list: [
          'Harass, threaten, bully or stalk anyone, or keep contacting someone who blocked you.',
          'Post nudity or sexual content, graphic violence, hate speech, or anything involving minors in a sexual way.',
          'Spam, scam, phish or advertise without permission.',
          'Share pirated films, links to pirated streams, or other material that infringes someone’s rights.',
          'Break the law, or try to hack, overload, scrape or reverse-engineer the service.',
        ] },
        { h: 'Reporting and enforcement', p: [
          'Use Report on a profile, chat or status to tell us about a problem, and Block to cut someone off immediately. We review reports and may remove content, limit features, or suspend or delete accounts that break these terms — with or without notice when safety requires it.',
        ] },
        { h: 'Watch parties and calls', p: [
          `Watch parties sync play, pause and a shared timer between friends. ${APP_NAME} doesn’t stream films: each person watches on their own device using a service they’re entitled to use. Calls are between you and the person you call; don’t record anyone without their consent.`,
        ] },
        { h: 'Film data and third parties', p: [
          'Titles, posters, ratings and other film data come from TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB. Trailers and “where to watch” links may take you to other services, which have their own terms.',
        ] },
        { h: 'The service', p: [
          `We’re a small team improving ${APP_NAME} all the time, so features may change or be removed. The app is provided “as is”, without warranties. To the extent the law allows, we aren’t liable for indirect or consequential losses, or for content posted by other users. Nothing here limits rights you have under consumer law that can’t be excluded.`,
        ] },
        { h: 'Ending', p: ['You can delete your account any time from Settings → Delete account. We may suspend or end accounts that break these terms or put others at risk.'] },
        { h: 'Changes and contact', p: [<>We may update these terms; if a change is significant we’ll tell you in the app, and continuing to use {APP_NAME} means you accept the update. Questions: {mail}.</>] },
      ]}
    />
  );
}
