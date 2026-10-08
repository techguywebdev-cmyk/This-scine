import { ClerkProvider } from '@clerk/nextjs';
import { Inter, Inter_Tight, Instrument_Serif } from 'next/font/google';
import './globals.css';

// UI + reading text
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-sans' });
// Titles, headings, big numbers
const interTight = Inter_Tight({ subsets: ['latin'], weight: ['500', '600', '700', '800', '900'], display: 'swap', variable: '--font-display' });
// Page and section titles — lighter, editorial
const instrumentSerif = Instrument_Serif({ subsets: ['latin'], weight: '400', display: 'swap', variable: '--font-page' });

export const metadata = {
  title: 'CineScroll — Discover Movies',
  description: 'A cinematic movie discovery experience.',
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} ${interTight.variable} ${instrumentSerif.variable}`}>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
