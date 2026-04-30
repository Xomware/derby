import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { AuthGate } from '@/components/AuthGate';

export const metadata: Metadata = {
  metadataBase: new URL('https://derby.xomware.com'),
  title: "Sun God Derby — Grant's Picks",
  description: 'Tail or fade Grant. Live results, live leaderboard.',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'Sun God Derby',
    description: 'Tail or fade Grant. Live results, live leaderboard.',
    url: 'https://derby.xomware.com',
    images: [{ url: '/banner.png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col antialiased">
        <SiteHeader />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 pb-16">
          <AuthGate>{children}</AuthGate>
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
