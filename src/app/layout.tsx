
import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/app-layout';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context'; // Import AuthProvider

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});
 
export const metadata: Metadata = {
  title: 'RiskWise - Manajemen Risiko',
  description: 'Aplikasi manajemen risiko komprehensif.',
};
 
export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider> {/* Bungkus dengan AuthProvider */}
          <AppLayout>
            {children}
          </AppLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
