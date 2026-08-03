import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AppExperienceProvider } from '@/components/layout/AppExperienceProvider';
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Pranjay - Wholesale Cosmetics Platform',
    description: 'Your trusted wholesale cosmetics ecommerce platform',
    manifest: '/manifest.webmanifest',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Pranjay',
    },
    icons: {
        icon: '/icons/icon.svg',
        apple: '/icons/icon.svg',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    viewportFit: 'cover',
    themeColor: '#e91e63',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <AppExperienceProvider>
                    {children}
                </AppExperienceProvider>
                <Toaster />
                <Analytics />
            </body>
        </html>
    );
}
