import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'pt', 'es', 'fr', 'de', 'it', 'ja', 'ko', 'uk'],

  // Used when no locale matches
  defaultLocale: 'en',

  // Always use a locale prefix (e.g., /en/events)
  localePrefix: 'always',
});

// Lightweight wrappers around Next.js' navigation
export const {Link, redirect, usePathname, useRouter} =
  createNavigation(routing);
