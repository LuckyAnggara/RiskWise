
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
  } catch (error) {
    // This might happen if i18n.ts itself throws an error before returning messages
    console.error(`[LocaleLayout] Error fetching messages for locale ${locale}:`, error);
    notFound();
  }

  // Ensure messages is an object, even if empty, for NextIntlClientProvider
  const messagesForProvider = (typeof messages === 'object' && messages !== null) ? messages : {};
  if (typeof messages !== 'object' || messages === null) {
    console.warn(`[LocaleLayout] Messages for locale ${locale} were not a valid object. Using empty object for provider.`);
  }
 
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messagesForProvider}>
          <AppLayout>
            {children}
          </AppLayout>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

// Optional: If you want locale-specific metadata, you can generate it here too.
// export async function generateMetadata({params: {locale}}: Props) {
//   const messages = await getMessages();
//   // Example: const t = createTranslator({locale, messages});
//   return {
//     title: "My App - " + locale, // Example
//   };
// }
