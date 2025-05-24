
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
  console.log(`[LocaleLayout] Rendering for locale: ${locale}`);
  const supportedLocales = ['en', 'id'];
  if (!supportedLocales.includes(locale)) {
    console.error(`[LocaleLayout] Unsupported locale: ${locale}. Calling notFound().`);
    notFound();
  }
 
  let messages;
  try {
    messages = await getMessages();
    console.log(`[LocaleLayout] Messages received from getMessages() for locale ${locale}. Type: ${typeof messages}, Value:`, messages ? Object.keys(messages).length > 0 ? "{...}" : "{}" : messages);
    // Explicitly check if messages is a non-null object.
    if (typeof messages !== 'object' || messages === null) {
      console.error(`[LocaleLayout] Critical: Messages for locale ${locale} resolved by getMessages() were not a valid object. Received:`, messages, ". Calling notFound().");
      notFound(); 
    }
     if (Object.keys(messages).length === 0 && locale !== 'id') { // Allow 'id' to be initially empty
        console.warn(`[LocaleLayout] Messages for locale ${locale} is an empty object after getMessages(). This might lead to issues.`);
        // Potentially call notFound() if empty messages are not allowed for a primary locale like 'en'
        // For now, we let it pass to see provider behavior with {}
     }
  } catch (error) {
    console.error(`[LocaleLayout] Critical: Error fetching messages via getMessages() for locale ${locale}:`, error, ". Calling notFound().");
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
