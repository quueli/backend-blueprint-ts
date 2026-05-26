import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseServerEnv, smtpConfigured, s3Configured, captchaEnabled } from '../src/env.js';

describe('parseServerEnv', () => {
  it('accepts a minimal valid env', () => {
    const env = parseServerEnv({ DATABASE_URL: 'postgresql://u:p@localhost:5432/db' });
    assert.equal(env.DATABASE_URL, 'postgresql://u:p@localhost:5432/db');
  });
  it('requires DATABASE_URL', () => {
    assert.throws(() => parseServerEnv({}));
  });
  it('rejects a too-short NEXTAUTH_SECRET', () => {
    assert.throws(() => parseServerEnv({ DATABASE_URL: 'x', NEXTAUTH_SECRET: 'short' }));
  });
  it('rejects an invalid NEXTAUTH_URL', () => {
    assert.throws(() => parseServerEnv({ DATABASE_URL: 'x', NEXTAUTH_URL: 'not a url' }));
  });
});

describe('integration detectors', () => {
  it('smtpConfigured needs host + user + pass', () => {
    assert.equal(smtpConfigured({}), false);
    assert.equal(smtpConfigured({ SMTP_HOST: 'h', SMTP_USER: 'u' }), false);
    assert.equal(smtpConfigured({ SMTP_HOST: 'h', SMTP_USER: 'u', SMTP_PASS: 'p' }), true);
  });
  it('s3Configured needs bucket + keys', () => {
    assert.equal(s3Configured({}), false);
    assert.equal(
      s3Configured({ S3_BUCKET: 'b', S3_ACCESS_KEY_ID: 'a', S3_SECRET_ACCESS_KEY: 's' }),
      true,
    );
  });
  it('captchaEnabled when any provider secret is present', () => {
    assert.equal(captchaEnabled({}), false);
    assert.equal(captchaEnabled({ TURNSTILE_SECRET: 's' }), true);
    assert.equal(captchaEnabled({ RECAPTCHA_SECRET: 's' }), true);
  });
});
