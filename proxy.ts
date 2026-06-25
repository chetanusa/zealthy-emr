import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './lib/auth';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/portal')) {
    const token = request.cookies.get('zealthy_session')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    const user = verifyToken(token);

    if (!user) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/portal/:path*'],
};