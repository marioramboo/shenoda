import type { Metadata, Viewport } from 'next';
import { Cairo } from 'next/font/google';
import './globals.css';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cairo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'نظام إدارة الخدمة الكنسية | Church Service Management',
  description: 'نظام متابعة الخدام والمخدومين وافتقاد الكنيسة القبطية الأرثوذكسية',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.jpg',
    apple: '/logo.jpg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0D3B66',
};


import { ClientProviders } from '@/components/providers/ClientProviders';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="bg-bg-app text-text-primary font-cairo min-h-screen antialiased selection:bg-brand-primary-soft selection:text-brand-primary">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
