import createMiddleware from 'next-intl/middleware';
import {NextRequest, NextResponse} from 'next/server';
import {auth} from '@/lib/auth/edge';
import {routing} from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

const protectedRoutes = ['/judge', '/athlete', '/manage'];
const authRoutes = ['/login'];

export default async function proxy(request: NextRequest) {
  const response = handleI18nRouting(request);
  const locale = response.headers.get('x-next-intl-locale') || routing.defaultLocale;

  const session = await auth();
  const isLoggedIn = !!session?.user;

  const pathname = request.nextUrl.pathname;

  if (isLoggedIn && authRoutes.some((route) => pathname.includes(route))) {
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  if (!isLoggedIn && protectedRoutes.some((route) => pathname.includes(route))) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
};
