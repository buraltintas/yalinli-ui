import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import { getLanguage } from '@/lib/i18n/dictionaries';
import './globals.css';

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_SITE_NAME || 'Yalınlı İçin',
  description: 'Yalınlı Mahallesi sorun, çözüm ve sosyal paylaşım platformu',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'https://yalinli.org',
  ),
  openGraph: {
    title: 'Yalınlı İçin',
    description: 'Yalınlı Mahallesi sorun, çözüm ve sosyal paylaşım platformu',
    type: 'website',
    locale: 'tr_TR',
    siteName: 'Yalınlı İçin',
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Yalınlı İçin',
    description: 'Yalınlı Mahallesi sorun, çözüm ve sosyal paylaşım platformu',
    images: ['/twitter-image'],
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/apple-touch-icon.svg',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const lang = await getLanguage();

  return (
    <html lang={lang} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
