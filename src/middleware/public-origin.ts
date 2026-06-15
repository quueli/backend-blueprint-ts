import type { NextRequest } from 'next/server';

export function publicOrigin(req: NextRequest): string {
  const proto =
    req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
    (req.nextUrl.protocol === 'https:' ? 'https' : 'http');
  const host =
    req.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
    req.headers.get('host') ||
    req.nextUrl.host;
  return `${proto}://${host}`;
}
