import createMiddleware from 'next-intl/middleware';
import {NextRequest, NextResponse} from 'next/server';
import {auth} from '@/lib/auth/edge';
import {routing} from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

const protectedRoutes = ['/judge', '/athlete', '/manage'];
const authRoutes = ['/login'];

export default function proxy(request: NextRequest) {
  const {nextUrl} = request;
  const pathname = nextUrl.pathname;

  const response = handleI18nRouting(request);

  const locale = response.headers.get('x-next-intl-locale') || routing.defaultLocale;

  const authResult = response.headers.get('x-middleware-next');
  const isLoggedIn = !!authResult && !authResult.includes('rewrite');

  if (isLoggedIn) {
    if (authRoutes.some((route) => pathname.includes(route))) {
      const redirectUrl = new URL(`/${locale}`, nextUrl);
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (!isLoggedIn) {
    if (protectedRoutes.some((route) => pathname.includes(route))) {
      const redirectUrl = new URL(`/${locale}/login`, nextUrl);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
};
