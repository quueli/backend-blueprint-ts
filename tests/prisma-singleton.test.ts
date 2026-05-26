import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPrismaSingleton } from '../src/prisma.js';

describe('createPrismaSingleton', () => {
  it('caches the client on globalThis outside production', () => {
    const g = globalThis as typeof globalThis & { __studioPrisma?: unknown };
    delete g.__studioPrisma;

    let constructed = 0;
    class FakeClient {
      constructor() {
        constructed++;
      }
    }

    const a = createPrismaSingleton(FakeClient as any);
    const b = createPrismaSingleton(FakeClient as any);

    assert.equal(constructed, 1, 'second call reuses the cached singleton');
    assert.equal(a, b);
    assert.equal(g.__studioPrisma, a);

    delete g.__studioPrisma;
  });
});
