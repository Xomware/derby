import type { Metadata } from 'next';
import './globals.css';
import { Suspense } from 'react';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Ticker } from '@/components/Ticker';
import { UsernameGate } from '@/components/UsernameGate';
import { VisitTracker } from '@/components/VisitTracker';

export const metadata: Metadata = {
  metadataBase: new URL('https://derby.xomware.com'),
  title: "Sun God Derby — Grant's Picks",
  description: 'Pick Grant or fade him. Live results, live leaderboard.',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'Sun God Derby',
    description: 'Pick Grant or fade him. Live results, live leaderboard.',
    url: 'https://derby.xomware.com',
    images: [{ url: '/banner.png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col antialiased pb-12 sm:pb-14">
        <SiteHeader />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 pb-16">
          <UsernameGate>{children}</UsernameGate>
        </main>
        <SiteFooter />
        <Ticker />
        <Suspense fallback={null}>
          <VisitTracker />
        </Suspense>
      </body>
    </html>
  );
}
