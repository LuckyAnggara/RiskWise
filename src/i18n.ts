
import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';
 
const locales = ['en', 'id'];
 
export default getRequestConfig(async ({locale}) => {
  // Basic console log to confirm function call and locale
  // console.log(`[i18n.ts] getRequestConfig called for locale: ${locale}`);
  
  if (!locales.includes(locale as any)) {
    // console.error(`[i18n.ts] Invalid locale: ${locale}. Calling notFound().`);
    notFound();
  }
 
  let messages;
  try {
    messages = (await import(`./locales/${locale}.json`)).default;
    // console.log(`[i18n.ts] Loaded messages for ${locale}. Type: ${typeof messages}. Keys: ${messages ? Object.keys(messages).length : 'N/A'}`);
  } catch (error) {
    // console.error(`[i18n.ts] Failed to load messages for locale: ${locale}`, error);
    notFound(); 
  }

  if (typeof messages !== 'object' || messages === null) {
    // console.error(`[i18n.ts] Messages for locale ${locale} are not a valid object after import. Received:`, messages);
    notFound();
  }
 
  return {
    messages
  };
});
