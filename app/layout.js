import { ClerkProvider } from '@clerk/nextjs';
import { Inter, Inter_Tight } from 'next/font/google';
import './globals.css';
import { SITE_URL } from '@/lib/brand';

// UI + reading text
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-sans' });
// Titles, headings, big numbers
const interTight = Inter_Tight({ subsets: ['latin'], weight: ['500', '600', '700', '800', '900'], display: 'swap', variable: '--font-display' });
export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'CineScroll — Discover Movies',
  description: 'A cinematic movie discovery experience.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
  appleWebApp: { capable: true, title: 'CineScroll', statusBarStyle: 'black-translucent' },
};

export const viewport = { themeColor: '#06060B' };

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} ${interTight.variable}`}>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
