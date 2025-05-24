
import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';
 
// Can be imported from a shared config
const locales = ['en', 'id'];
 
export default getRequestConfig(async ({locale}) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) {
    console.error(`Invalid locale detected in getRequestConfig: ${locale}`);
    notFound();
  }
 
  let messages;
  try {
    messages = (await import(`./locales/${locale}.json`)).default;
  } catch (error) {
    console.error(`Failed to load messages for locale: ${locale}`, error);
    notFound(); 
  }

  if (!messages) {
    console.error(`Messages for locale ${locale} are undefined after import.`);
    notFound();
  }
 
  return {
    messages
  };
});

