import {getRequestConfig} from 'next-intl/server';
 
export default getRequestConfig(async ({locale}) => {
  // Provide a static locale, fetch a list of messages, or load
  // messages dynamically relevant to the user's request
  return {
    messages: (await import(`./locales/${locale}.json`)).default
  };
});