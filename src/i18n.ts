
import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';
 
const locales = ['en', 'id'];
 
export default getRequestConfig(async ({locale}) => {
  // Basic console log to confirm function call and locale
  console.log(`[i18n.ts] getRequestConfig called with locale: ${locale}`);
  
  if (!locales.includes(locale as any)) {
    console.error(`[i18n.ts] Invalid locale: ${locale}. Calling notFound().`);
    notFound();
  }
 
  let messages;
  try {
    messages = (await import(`./locales/${locale}.json`)).default;
    // Log type and a snippet of messages to confirm loading
    console.log(`[i18n.ts] Attempted to load messages for locale: ${locale}. Type: ${typeof messages}, Value:`, JSON.stringify(messages || {}).substring(0, 100) + "...");

  } catch (error) {
    console.error(`[i18n.ts] Failed to load messages for locale: ${locale}`, error);
    notFound(); 
  }

  // Ensure messages is a valid object
  if (typeof messages !== 'object' || messages === null) {
    console.error(`[i18n.ts] Messages for locale ${locale} are not a valid object or are null after import. Received:`, messages, ". Calling notFound().");
    notFound();
  }
 
  return {
    messages,
    locale // Explicitly return the locale
  };
});

