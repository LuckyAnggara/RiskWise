
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import {AppLayout} from '@/components/layout/app-layout';
import {notFound} from 'next/navigation';

type Props = {
  children: React.ReactNode;
  params: {locale: string};
};
 
export default async function LocaleLayout({children, params: {locale}}: Props) {
  const supportedLocales = ['en', 'id'];
  if (!supportedLocales.includes(locale)) {
    notFound();
  }
 
  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();
 
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AppLayout>
        {children}
      </AppLayout>
    </NextIntlClientProvider>
  );
}
