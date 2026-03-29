import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-body' });

const BASE_URL = 'https://democracy-game-omega.vercel.app';

export const metadata: Metadata = {
  title: 'Democracy — Multiplayer Political Strategy',
  description: 'Rule the Republic of Novaria. Create your party, pass laws, handle crises, and outmaneuver your opponent to win the election.',
  metadataBase: new URL(BASE_URL),
  openGraph: {
    title: 'Democracy — Multiplayer Political Strategy',
    description: 'Rule the Republic of Novaria. Create your party, pass laws, handle crises, and outmaneuver your opponent to win the election.',
    url: BASE_URL,
    siteName: 'Democracy',
    images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: 'Democracy — Multiplayer Political Strategy Game' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Democracy — Multiplayer Political Strategy',
    description: 'Rule the Republic of Novaria. Create your party, pass laws, handle crises, and outmaneuver your opponent to win the election.',
    images: [`${BASE_URL}/og-image.png`],
  },
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#3b82f6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Instrument Serif for display headings */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
      </head>
      <body className={`${dmSans.className} bg-game-bg bg-dot-grid bg-gradient-mesh text-game-text min-h-screen`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
