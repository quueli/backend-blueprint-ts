import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import {
  reviewSchema,
  userCreateSchema,
  userUpdateSchema,
  pageBlockPutSchema,
  settingPutSchema,
} from '../src/validators/lead.js';
import { extendLeadSchema, leadFieldPresets } from '../src/project/lead-schema.js';

describe('reviewSchema', () => {
  it('accepts a valid review and defaults rating', () => {
    const r = reviewSchema.safeParse({ authorName: 'Ivan', locale: 'ru', text: 'x'.repeat(25) });
    assert.equal(r.success, true);
    if (r.success) assert.equal(r.data.rating, 5);
  });
  it('rejects too-short text', () => {
    const r = reviewSchema.safeParse({ authorName: 'Ivan', locale: 'ru', text: 'short' });
    assert.equal(r.success, false);
  });
});

describe('user schemas', () => {
  it('userCreateSchema defaults role and validates password length', () => {
    const ok = userCreateSchema.safeParse({ email: 'a@b.com', name: 'Test User', password: '12345678' });
    assert.equal(ok.success, true);
    if (ok.success) assert.equal(ok.data.role, 'EDITOR');
    const bad = userCreateSchema.safeParse({ email: 'a@b.com', name: 'Test User', password: 'short' });
    assert.equal(bad.success, false);
  });
  it('userUpdateSchema is fully optional', () => {
    assert.equal(userUpdateSchema.safeParse({}).success, true);
    assert.equal(userUpdateSchema.safeParse({ role: 'ADMIN' }).success, true);
  });
});

describe('cms put schemas', () => {
  it('pageBlockPutSchema requires an object value', () => {
    assert.equal(pageBlockPutSchema.safeParse({ value: { ru: {} } }).success, true);
    assert.equal(pageBlockPutSchema.safeParse({}).success, false);
  });
  it('settingPutSchema accepts any value key', () => {
    assert.equal(settingPutSchema.safeParse({ value: { a: 1 } }).success, true);
    assert.equal(settingPutSchema.safeParse({ value: 'string' }).success, true);
  });
});

describe('extendLeadSchema', () => {
  const validBase = {
    name: 'Ivan',
    phone: '+12025550123',
    message: 'Need a consultation about your service',
    agreement: true,
  };

  it('returns the base schema when no extensions are given', () => {
    const schema = extendLeadSchema([]);
    assert.equal(schema.safeParse(validBase).success, true);
  });

  it('adds custom fields that are then validated', () => {
    const schema = extendLeadSchema([
      { key: 'serviceType', schema: leadFieldPresets.serviceType },
      { key: 'doorType', schema: z.string().max(5) },
    ]);
    assert.equal(schema.safeParse({ ...validBase, serviceType: 'Installation', doorType: 'metal' }).success, true);
    assert.equal(schema.safeParse({ ...validBase, doorType: 'too-long' }).success, false);
  });

  it('leadFieldPresets are optional strings', () => {
    assert.equal(leadFieldPresets.address.safeParse(undefined).success, true);
    assert.equal(leadFieldPresets.serviceType.safeParse('Survey').success, true);
  });
});
