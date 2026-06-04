import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeLeadPolicy,
  DEFAULT_LEAD_POLICY,
  LEAD_POLICY_LIMITS,
} from '../src/leads/policy.js';

describe('normalizeLeadPolicy', () => {
  it('uses defaults for empty / invalid input', () => {
    assert.deepEqual(normalizeLeadPolicy(null), DEFAULT_LEAD_POLICY);
    assert.deepEqual(normalizeLeadPolicy('garbage'), DEFAULT_LEAD_POLICY);
    assert.deepEqual(normalizeLeadPolicy({}), DEFAULT_LEAD_POLICY);
  });

  it('clamps below min and above max', () => {
    const r = normalizeLeadPolicy({ maxActive: 1, maxArchived: 9_999_999 });
    assert.equal(r.maxActive, LEAD_POLICY_LIMITS.min);
    assert.equal(r.maxArchived, LEAD_POLICY_LIMITS.max);
  });

  it('rounds and keeps valid custom limits', () => {
    const r = normalizeLeadPolicy({ maxActive: 500.6, maxArchived: 50 });
    assert.equal(r.maxActive, 501);
    assert.equal(r.maxArchived, 50);
  });

  it('falls back per-field when one value is broken', () => {
    const r = normalizeLeadPolicy({ maxActive: 'x', maxArchived: 30 });
    assert.equal(r.maxActive, DEFAULT_LEAD_POLICY.maxActive);
    assert.equal(r.maxArchived, 30);
  });
});
