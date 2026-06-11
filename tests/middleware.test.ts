import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { publicOrigin } from '../src/middleware/public-origin.js';
import { createAdminMiddleware } from '../src/middleware/create-admin-middleware.js';

function fakeReq(headers: Record<string, string>, nextUrl: { protocol: string; host: string }) {
  return {
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
    nextUrl,
  } as any;
}

describe('publicOrigin', () => {
  it('prefers x-forwarded-* headers', () => {
    const req = fakeReq(
      { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'example.com' },
      { protocol: 'http:', host: 'localhost:3000' },
    );
    assert.equal(publicOrigin(req), 'https://example.com');
  });
  it('falls back to host + nextUrl protocol', () => {
    const req = fakeReq({ host: 'localhost:3000' }, { protocol: 'http:', host: 'localhost:3000' });
    assert.equal(publicOrigin(req), 'http://localhost:3000');
  });
});

describe('createAdminMiddleware', () => {
  const prevSecret = process.env.NEXTAUTH_SECRET;
  process.env.NEXTAUTH_SECRET = 'test-secret-at-least-16-chars-long';
  const mw = createAdminMiddleware();

  it('redirects unauthenticated /admin to login', async () => {
    const res = await mw(new NextRequest('http://localhost/admin/secret'));
    assert.equal(res.status, 307);
    const loc = res.headers.get('location') ?? '';
    assert.ok(loc.includes('/admin/login'), `expected login redirect, got ${loc}`);
    assert.ok(loc.includes('next=%2Fadmin%2Fsecret'));
  });

  it('protects /api/admin too', async () => {
    const res = await mw(new NextRequest('http://localhost/api/admin/leads'));
    assert.equal(res.status, 307);
  });

  it('lets the login page through', async () => {
    const res = await mw(new NextRequest('http://localhost/admin/login'));
    assert.notEqual(res.status, 307);
  });

  it('ignores non-admin paths', async () => {
    const res = await mw(new NextRequest('http://localhost/'));
    assert.notEqual(res.status, 307);
  });

  if (prevSecret === undefined) {
    process.env.NEXTAUTH_SECRET = prevSecret as unknown as string;
  }
});
