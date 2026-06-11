import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { publicOrigin } from './public-origin.js';

export type AdminMiddlewareConfig = {
  loginPath?: string;
  publicPaths?: string[];
  authApiPrefix?: string;
};

export function createAdminMiddleware(config: AdminMiddlewareConfig = {}) {
  const loginPath = config.loginPath ?? '/admin/login';
  const publicPaths = config.publicPaths ?? [loginPath, '/api/auth'];
  const authApiPrefix = config.authApiPrefix ?? '/api/auth';

  return async function adminMiddleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    if (publicPaths.some((p) => pathname.startsWith(p)) || pathname.startsWith(authApiPrefix)) {
      return NextResponse.next();
    }

    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (!token) {
        const origin = publicOrigin(req);
        const loginUrl = new URL(loginPath, origin);
        loginUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(loginUrl);
      }
      const res = NextResponse.next();
      res.headers.set('X-Robots-Tag', 'noindex, nofollow');
      return res;
    }

    return NextResponse.next();
  };
}

export const defaultAdminMiddlewareMatcher = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
