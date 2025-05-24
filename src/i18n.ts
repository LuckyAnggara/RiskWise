
import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';
 
// Can be imported from a shared config
const locales = ['en', 'id'];
 
export default getRequestConfig(async ({locale}) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) {
    // console.error(`[i18n.ts] Invalid locale detected: ${locale}`); // Keep for debugging if needed
    notFound();
  }
 
  let messages;
  try {
    // The `default` import is important for JSON files
    messages = (await import(`./locales/${locale}.json`)).default;
  } catch (error) {
    // console.error(`[i18n.ts] Failed to load messages for locale: ${locale}`, error); // Keep for debugging
    // If the specific locale JSON file is missing or there's an error importing it,
    // treat it as not found.
    notFound(); 
  }

  // After attempting to load, ensure messages is a valid, non-null object.
  // This is a safeguard in case the JSON file is empty or malformed in a way
  // that `default` resolves but isn't a proper object.
  if (typeof messages !== 'object' || messages === null) {
    // console.error(`[i18n.ts] Messages for locale ${locale} are not a valid object after import. Received:`, messages); // Keep for debugging
    notFound();
  }
 
  return {
    messages
  };
});

