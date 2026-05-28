import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata = {
  title: 'CineScroll — Discover Movies',
  description: 'A cinematic movie discovery experience.',
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
