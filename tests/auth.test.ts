import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasRole, isFullAccess, ROLE_HIERARCHY, FULL_ACCESS_ROLES } from '../src/auth/roles.js';
import { sessionUserId, sessionRole } from '../src/auth/guard.js';
import { createAuthOptions, hashPassword, verifyPassword } from '../src/auth/options.js';
import { createFakePrisma } from './helpers/fake-prisma.js';

describe('roles', () => {
  it('hasRole checks membership', () => {
    assert.equal(hasRole('ADMIN', ['OWNER', 'ADMIN']), true);
    assert.equal(hasRole('EDITOR', ['OWNER', 'ADMIN']), false);
    assert.equal(hasRole(undefined, ['OWNER']), false);
  });
  it('isFullAccess only for OWNER/ADMIN', () => {
    assert.equal(isFullAccess('OWNER'), true);
    assert.equal(isFullAccess('ADMIN'), true);
    assert.equal(isFullAccess('EDITOR'), false);
    assert.equal(isFullAccess(undefined), false);
  });
  it('exposes hierarchy + full-access sets', () => {
    assert.deepEqual(ROLE_HIERARCHY, ['OWNER', 'ADMIN', 'EDITOR', 'DESIGNER']);
    assert.deepEqual(FULL_ACCESS_ROLES, ['OWNER', 'ADMIN']);
  });
});

describe('session extractors', () => {
  it('reads id and role from a session', () => {
    const session = { user: { id: 'u1', role: 'ADMIN' } } as any;
    assert.equal(sessionUserId(session), 'u1');
    assert.equal(sessionRole(session), 'ADMIN');
  });
  it('tolerates null / missing fields', () => {
    assert.equal(sessionUserId(null), undefined);
    assert.equal(sessionRole(null), undefined);
    assert.equal(sessionUserId({ user: {} } as any), undefined);
  });
});

describe('password hashing', () => {
  it('hashes and verifies', async () => {
    const hash = await hashPassword('s3cret-pass');
    assert.notEqual(hash, 's3cret-pass');
    assert.equal(await verifyPassword('s3cret-pass', hash), true);
    assert.equal(await verifyPassword('wrong', hash), false);
  });
});

function getAuthorize(opts: any): (creds: any) => Promise<any> {
  // next-auth wraps authorize, the real one is on provider.options
  const p = opts.providers[0];
  return (p.options?.authorize ?? p.authorize).bind(p);
}

describe('createAuthOptions', () => {
  it('builds jwt config with one credentials provider', () => {
    const prisma = createFakePrisma();
    const opts = createAuthOptions({ prisma: prisma as any });
    assert.equal(opts.session?.strategy, 'jwt');
    assert.equal(opts.pages?.signIn, '/admin/login');
    assert.equal(opts.providers.length, 1);
  });

  it('jwt + session callbacks propagate uid/role', async () => {
    const opts = createAuthOptions({ prisma: createFakePrisma() as any });
    const token = await opts.callbacks!.jwt!({ token: {}, user: { id: 'u9', role: 'OWNER' } } as any);
    assert.equal((token as any).uid, 'u9');
    assert.equal((token as any).role, 'OWNER');
    const session = await opts.callbacks!.session!({
      session: { user: {} },
      token: { uid: 'u9', role: 'OWNER' },
    } as any);
    assert.equal((session.user as any).id, 'u9');
    assert.equal((session.user as any).role, 'OWNER');
  });

  it('authorize accepts good creds and rejects bad ones', async () => {
    const passwordHash = await hashPassword('correct-horse');
    const prisma = createFakePrisma([], {
      users: [{ id: 'u1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN', passwordHash }],
    });
    const authorize = getAuthorize(createAuthOptions({ prisma: prisma as any }));

    const ok = await authorize({ email: 'admin@example.com', password: 'correct-horse' });
    assert.equal(ok?.id, 'u1');
    assert.equal(ok?.role, 'ADMIN');

    assert.equal(await authorize({ email: 'admin@example.com', password: 'nope' }), null);
    assert.equal(await authorize({ email: 'ghost@example.com', password: 'x' }), null);
    assert.equal(await authorize(undefined), null);
  });
});
