import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/SiteHeader';

export const metadata: Metadata = {
  title: "Sun Oracle — Grant's Derby Picks",
  description: 'Tail or fade Grant. Live results, live leaderboard.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <SiteHeader />
        <main className="max-w-5xl mx-auto px-4 pb-16">{children}</main>
        <footer className="text-center text-xs text-bourbon/70 py-8">
          Built for Derby Day. Run by Sun Oracle. Not affiliated with Churchill Downs.
        </footer>
      </body>
    </html>
  );
}
