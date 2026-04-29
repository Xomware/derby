import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/SiteHeader';
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
      <body className="min-h-screen antialiased">
        <SiteHeader />
        <main className="max-w-5xl mx-auto px-4 pb-16">
          <AuthGate>{children}</AuthGate>
        </main>
        <footer className="text-center text-xs text-bourbon/70 py-8">
          Sun God Derby. Built for Derby Day. Not affiliated with Churchill Downs.
        </footer>
      </body>
    </html>
  );
}
