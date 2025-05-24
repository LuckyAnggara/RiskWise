
import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';
 
// Can be imported from a shared config
const locales = ['en', 'id'];
 
export default getRequestConfig(async ({locale}) => {
  console.log(`[i18n.ts] getRequestConfig called with locale: ${locale}`);
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) {
    console.error(`[i18n.ts] Invalid locale detected: ${locale}. Calling notFound().`);
    notFound();
  }
 
  let messages;
  try {
    // The `default` import is important for JSON files
    messages = (await import(`./locales/${locale}.json`)).default;
    console.log(`[i18n.ts] Attempted to load messages for locale: ${locale}. Type: ${typeof messages}, Value:`, messages ? Object.keys(messages).length > 0 ? "{...}" : "{}" : messages);

  } catch (error) {
    console.error(`[i18n.ts] Failed to load messages for locale: ${locale}`, error);
    notFound(); 
  }

  // After attempting to load, ensure messages is a valid, non-null object.
  if (typeof messages !== 'object' || messages === null) {
    console.error(`[i18n.ts] Messages for locale ${locale} are not a valid object after import. Received:`, messages, ". Calling notFound().");
    notFound();
  }
  
  if (Object.keys(messages).length === 0 && locale !== 'id') { // Allow 'id' to be initially empty for testing
     console.warn(`[i18n.ts] Messages for locale ${locale} is an empty object.`);
     // Depending on strictness, you might call notFound() here too,
     // but for now, let's allow it to proceed to see if provider handles empty messages.
  }
 
  return {
    messages
  };
});
