import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { leadSchema } from '../src/validators/lead.js';
import { canEditLead, isLeadLocked } from '../src/leads/access.js';
import { isHoneypotTriggered } from '../src/security/honeypot.js';
import { validateBlockValue } from '../src/cms/content-resolver.js';

describe('leadSchema', () => {
  it('accepts valid lead', () => {
    const r = leadSchema.safeParse({
      name: 'Ivan',
      phone: '+12025550123',
      message: 'Need a consultation about your service',
      agreement: true,
    });
    assert.equal(r.success, true);
  });

  it('rejects without contact', () => {
    const r = leadSchema.safeParse({
      name: 'Ivan',
      message: 'A sufficiently long test message',
      agreement: true,
    });
    assert.equal(r.success, false);
  });
});

describe('lead access', () => {
  it('owner can edit any lead', () => {
    assert.equal(canEditLead({ ownerId: 'u2', status: 'NEW' }, 'u1', 'OWNER'), true);
  });

  it('locked when owned by other', () => {
    assert.equal(isLeadLocked({ ownerId: 'u2', status: 'NEW' }, 'u1', 'EDITOR'), true);
  });
});

describe('honeypot', () => {
  it('triggers on non-empty website', () => {
    assert.equal(isHoneypotTriggered('spam'), true);
    assert.equal(isHoneypotTriggered(''), false);
  });
});

describe('validateBlockValue', () => {
  const fields = { 'site.hero': ['h1', 'subheadline'] };
  it('rejects unknown key', () => {
    const r = validateBlockValue('unknown', {}, fields);
    assert.equal(r.ok, false);
  });
  it('accepts object value', () => {
    const r = validateBlockValue('site.hero', { ru: { h1: 'Hi' } }, fields);
    assert.equal(r.ok, true);
  });
});
