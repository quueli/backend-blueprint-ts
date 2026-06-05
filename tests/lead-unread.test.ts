import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  countUnreadLeads,
  markLeadRead,
  markLeadUnread,
  markAllLeadsRead,
  formatBadgeCount,
} from '../src/leads/unread.js';
import { createFakePrisma } from './helpers/fake-prisma.js';

const ts = (n: number) => new Date(1_700_000_000_000 + n * 1000);

describe('unread leads', () => {
  it('counts only unread leads in the active pool', async () => {
    const db = createFakePrisma([
      { id: 'u1', readAt: null, archivedAt: null },
      { id: 'u2', readAt: null, archivedAt: null },
      { id: 'r1', readAt: new Date(), archivedAt: null }, // read
      { id: 'arc', readAt: null, archivedAt: ts(1) }, // unread but archived → excluded
    ]);
    assert.equal(await countUnreadLeads(db as any), 2);
  });

  it('markLeadRead / markLeadUnread toggle a single lead', async () => {
    const db = createFakePrisma([
      { id: 'u1', readAt: null, archivedAt: null },
      { id: 'u2', readAt: null, archivedAt: null },
    ]);
    await markLeadRead(db as any, 'u1');
    assert.equal(await countUnreadLeads(db as any), 1);
    await markLeadUnread(db as any, 'u1');
    assert.equal(await countUnreadLeads(db as any), 2);
  });

  it('markAllLeadsRead clears the active unread set', async () => {
    const db = createFakePrisma([
      { id: 'u1', readAt: null, archivedAt: null },
      { id: 'u2', readAt: null, archivedAt: null },
      { id: 'arc', readAt: null, archivedAt: ts(1) },
    ]);
    const marked = await markAllLeadsRead(db as any);
    assert.equal(marked, 2);
    assert.equal(await countUnreadLeads(db as any), 0);
  });
});

describe('formatBadgeCount', () => {
  it('renders compact badge labels', () => {
    assert.equal(formatBadgeCount(0), '');
    assert.equal(formatBadgeCount(-5), '');
    assert.equal(formatBadgeCount(7), '7');
    assert.equal(formatBadgeCount(99), '99');
    assert.equal(formatBadgeCount(150), '99+');
    assert.equal(formatBadgeCount(150, 9), '9+');
  });
});
