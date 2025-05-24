import {NextIntlClientProvider, useMessages} from 'next-intl';
import {AppLayout} from '@/components/layout/app-layout';

type Props = {
  children: React.ReactNode;
  params: {locale: string};
};
 
export default function LocaleLayout({children, params: {locale}}: Props) {
  const messages = useMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AppLayout>
        {children}
      </AppLayout>
    </NextIntlClientProvider>
  );
}