
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import {AppLayout} from '@/components/layout/app-layout';
import {notFound} from 'next/navigation';
import { Geist, Geist_Mono } from 'next/font/google';
import '../globals.css'; // Adjusted path for global styles

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

type Props = {
  children: React.ReactNode;
  params: {locale: string};
};
 
export default async function LocaleLayout({children, params: {locale}}: Props) {
  const supportedLocales = ['en', 'id'];
  if (!supportedLocales.includes(locale)) {
    notFound();
  }
 
  let messages;
  try {
    messages = await getMessages();
    // Explicitly check if messages is a non-null object.
    // If messages are still not a valid object here, something is fundamentally wrong
    // with the message-loading pipeline or getMessages itself.
    if (typeof messages !== 'object' || messages === null) {
      // console.error(`[LocaleLayout] Critical: Messages for locale ${locale} resolved by getMessages() were not a valid object. Received:`, messages);
      notFound(); 
    }
  } catch (error) {
    // This might happen if i18n.ts throws an error that isn't caught,
    // or if getMessages() itself throws.
    // console.error(`[LocaleLayout] Critical: Error fetching messages via getMessages() for locale ${locale}:`, error);
    notFound();
  }
 
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AppLayout>
            {children}
          </AppLayout>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

