import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { logActivity } from '../src/auth/guard.js';
import { createFakePrisma } from './helpers/fake-prisma.js';

describe('logActivity', () => {
  it('records an activity with the session user id', async () => {
    const prisma = createFakePrisma();
    await logActivity(prisma as any, { user: { id: 'u1' } } as any, 'test.kind', { a: 1 });
    const acts = prisma.activity._rows();
    assert.equal(acts.length, 1);
    assert.equal(acts[0].kind, 'test.kind');
    assert.equal(acts[0].userId, 'u1');
    assert.deepEqual(acts[0].payload, { a: 1 });
  });

  it('uses a null user id when there is no session', async () => {
    const prisma = createFakePrisma();
    await logActivity(prisma as any, null, 'anon.kind', {});
    assert.equal(prisma.activity._rows()[0].userId, null);
  });

  it('never throws when the audit write fails', async () => {
    const broken = {
      activity: {
        create: async () => {
          throw new Error('db down');
        },
      },
    };
    await assert.doesNotReject(logActivity(broken as any, null, 'k', {}));
  });
});
