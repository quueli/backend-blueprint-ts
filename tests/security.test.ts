import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter, MemoryRateLimitStore } from '../src/security/rate-limit.js';
import { verifyCaptcha } from '../src/security/captcha.js';

describe('rate limiter', () => {
  it('allows up to max then blocks within the window', () => {
    const limit = createRateLimiter(new MemoryRateLimitStore());
    const opts = { max: 2, windowMs: 10_000 };
    assert.equal(limit('ip', opts), true);
    assert.equal(limit('ip', opts), true);
    assert.equal(limit('ip', opts), false);
  });

  it('keys are independent', () => {
    const limit = createRateLimiter(new MemoryRateLimitStore());
    const opts = { max: 1, windowMs: 10_000 };
    assert.equal(limit('a', opts), true);
    assert.equal(limit('b', opts), true);
    assert.equal(limit('a', opts), false);
  });

  it('resets after the window elapses', async () => {
    const limit = createRateLimiter(new MemoryRateLimitStore());
    const opts = { max: 1, windowMs: 1 };
    assert.equal(limit('ip', opts), true);
    assert.equal(limit('ip', opts), false);
    await new Promise((r) => setTimeout(r, 5));
    assert.equal(limit('ip', opts), true);
  });
});

describe('verifyCaptcha', () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = (async () => {
      throw new Error('fetch should be stubbed per test');
    }) as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('is a no-op (true) when no captcha provider is configured', async () => {
    assert.equal(await verifyCaptcha('any', '1.2.3.4', {}), true);
  });

  it('rejects when enabled but no token is supplied', async () => {
    assert.equal(await verifyCaptcha(undefined, '1.2.3.4', { TURNSTILE_SECRET: 's' }), false);
  });

  it('verifies Turnstile success/failure', async () => {
    globalThis.fetch = (async () => ({ json: async () => ({ success: true }) })) as unknown as typeof fetch;
    assert.equal(await verifyCaptcha('tok', '1.2.3.4', { TURNSTILE_SECRET: 's' }), true);
    globalThis.fetch = (async () => ({ json: async () => ({ success: false }) })) as unknown as typeof fetch;
    assert.equal(await verifyCaptcha('tok', '1.2.3.4', { TURNSTILE_SECRET: 's' }), false);
  });

  it('honours reCAPTCHA score threshold', async () => {
    globalThis.fetch = (async () => ({ json: async () => ({ success: true, score: 0.9 }) })) as unknown as typeof fetch;
    assert.equal(await verifyCaptcha('tok', undefined, { RECAPTCHA_SECRET: 's', RECAPTCHA_MIN_SCORE: '0.5' }), true);
    globalThis.fetch = (async () => ({ json: async () => ({ success: true, score: 0.3 }) })) as unknown as typeof fetch;
    assert.equal(await verifyCaptcha('tok', undefined, { RECAPTCHA_SECRET: 's', RECAPTCHA_MIN_SCORE: '0.5' }), false);
  });

  it('returns false when the verification request throws', async () => {
    globalThis.fetch = (async () => {
      throw new Error('network down');
    }) as typeof fetch;
    assert.equal(await verifyCaptcha('tok', undefined, { TURNSTILE_SECRET: 's' }), false);
  });
});
