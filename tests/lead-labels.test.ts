import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isProtectedStatus,
  activeLeadWhere,
  archivedLeadWhere,
  unreadLeadWhere,
  isLimitArchived,
  leadStatusLabel,
  leadArchiveReason,
  LIMIT_ARCHIVE_TAG,
  PROTECTED_STATUSES,
} from '../src/leads/labels.js';

describe('lead labels & pool predicates', () => {
  it('protects WON / CONTRACT only', () => {
    assert.equal(isProtectedStatus('WON'), true);
    assert.equal(isProtectedStatus('CONTRACT'), true);
    assert.equal(isProtectedStatus('NEW'), false);
    assert.equal(isProtectedStatus('LOST'), false);
    assert.deepEqual([...PROTECTED_STATUSES], ['WON', 'CONTRACT']);
  });

  it('derives pool where-clauses from archivedAt', () => {
    assert.deepEqual(activeLeadWhere(), { archivedAt: null });
    assert.deepEqual(archivedLeadWhere(), { archivedAt: { not: null } });
    assert.deepEqual(unreadLeadWhere(), { readAt: null, archivedAt: null });
  });

  it('recognises the limit-archive tag', () => {
    assert.equal(isLimitArchived([LIMIT_ARCHIVE_TAG]), true);
    assert.equal(isLimitArchived(['other']), false);
    assert.equal(isLimitArchived([]), false);
  });

  it('labels statuses and archive reasons', () => {
    assert.equal(leadStatusLabel('NEW'), 'New');
    assert.equal(leadStatusLabel('WON'), 'Won');
    assert.equal(leadStatusLabel('WEIRD'), 'WEIRD');
    assert.equal(leadArchiveReason('NEW', [LIMIT_ARCHIVE_TAG]), 'limit');
    assert.equal(leadArchiveReason('WON', []), 'won');
    assert.equal(leadArchiveReason('NEW', []), 'manual');
  });
});
