
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
// import {AppLayout} from '@/components/layout/app-layout'; // Temporarily remove AppLayout
import {notFound} from 'next/navigation';
import { Geist, Geist_Mono } from 'next/font/google';
import '../globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// A minimal client component for testing translations
function TestTranslationComponent() {
  "use client";
  const t = useTranslations("SidebarNav"); // Use a known namespace from your en.json
  try {
    return <p style={{ border: '2px solid red', padding: '10px' }}>Translated Dashboard Label: '{t('dashboard')}'</p>;
  } catch (e) {
    console.error("Error in TestTranslationComponent:", e);
    return <p style={{ border: '2px solid red', padding: '10px', color: 'red' }}>Error rendering test translation.</p>;
  }
}


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
    console.log(`[LocaleLayout] Messages received from getMessages() for locale ${locale}. Type: ${typeof messages}, Keys: ${messages ? Object.keys(messages).length : 'N/A'}`);
    
    if (typeof messages !== 'object' || messages === null || (locale === 'en' && Object.keys(messages).length === 0)) {
      console.error(`[LocaleLayout] Critical: Messages for locale ${locale} were not a valid object or were empty. Received:`, messages, ". Calling notFound().");
      notFound(); 
    }
  } catch (error) {
    console.error(`[LocaleLayout] Critical: Error fetching messages for locale ${locale}:`, error);
    notFound();
  }
 
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div style={{border: '2px dashed blue', padding: '20px'}}>
            <h1>Minimal Locale Layout (Diagnostic)</h1>
            <TestTranslationComponent />
            <hr />
            <main>{children}</main>
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
