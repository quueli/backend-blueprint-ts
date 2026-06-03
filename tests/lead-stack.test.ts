import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  enforceActiveLeadStack,
  enforceArchivedLeadStack,
  enforceAllLeadStacks,
  getLeadPolicy,
} from '../src/leads/policy.js';
import { LIMIT_ARCHIVE_TAG } from '../src/leads/labels.js';
import { createFakePrisma } from './helpers/fake-prisma.js';

const ts = (n: number) => new Date(1_700_000_000_000 + n * 1000);

describe('enforceActiveLeadStack: active overflow pushes oldest to archive', () => {
  it('moves the oldest active leads to the archive and tags them', async () => {
    const db = createFakePrisma(
      [1, 2, 3, 4, 5].map((n) => ({
        id: `a${n}`,
        status: 'WORKING',
        createdAt: ts(n),
        archivedAt: null,
      })),
    );

    const archived = await enforceActiveLeadStack(db as any, { maxActive: 3, maxArchived: 100 });

    assert.equal(archived, 2);
    assert.equal(await db.lead.count({ where: { archivedAt: null } }), 3);
    assert.equal(await db.lead.count({ where: { archivedAt: { not: null } } }), 2);

    const oldest = await db.lead.findUnique({ where: { id: 'a1' } });
    assert.ok(oldest!.archivedAt, 'oldest gets archivedAt');
    assert.ok(oldest!.tags.includes(LIMIT_ARCHIVE_TAG), 'oldest tagged archive:limit');
    assert.equal(oldest!.status, 'WORKING', 'status is preserved on auto-archive');

    const newest = await db.lead.findUnique({ where: { id: 'a5' } });
    assert.equal(newest!.archivedAt, null);
  });

  it('no-op when under the limit', async () => {
    const db = createFakePrisma([{ id: 'a1' }, { id: 'a2' }]);
    const archived = await enforceActiveLeadStack(db as any, { maxActive: 5, maxArchived: 100 });
    assert.equal(archived, 0);
    assert.equal(db._state.leads().length, 2);
  });
});

describe('enforceArchivedLeadStack: archive overflow deletes oldest, protects WON/CONTRACT', () => {
  it('deletes the oldest NON-protected archived leads', async () => {
    const db = createFakePrisma([
      { id: 'r1', status: 'WON', archivedAt: ts(1), createdAt: ts(1) }, // protected, oldest
      { id: 'r2', status: 'LOST', archivedAt: ts(2), createdAt: ts(2) },
      { id: 'r3', status: 'NEW', archivedAt: ts(3), createdAt: ts(3) },
      { id: 'r4', status: 'NEW', archivedAt: ts(4), createdAt: ts(4) },
    ]);

    const deleted = await enforceArchivedLeadStack(db as any, { maxActive: 100, maxArchived: 2 });

    assert.equal(deleted, 2);
    const ids = db._state.leads().map((l) => l.id).sort();
    assert.deepEqual(ids, ['r1', 'r4']); // r2, r3 (oldest non-protected) deleted
    assert.ok(
      db._state.leads().some((l) => l.id === 'r1'),
      'WON deal survives even though it is the oldest',
    );
  });

  it('never deletes protected deals, even past the limit', async () => {
    const db = createFakePrisma([
      { id: 'r1', status: 'WON', archivedAt: ts(1), createdAt: ts(1) },
      { id: 'r2', status: 'CONTRACT', archivedAt: ts(2), createdAt: ts(2) },
      { id: 'r3', status: 'WON', archivedAt: ts(3), createdAt: ts(3) },
    ]);

    const deleted = await enforceArchivedLeadStack(db as any, { maxActive: 100, maxArchived: 1 });

    assert.equal(deleted, 0);
    assert.equal(db._state.leads().length, 3, 'archive may exceed the limit when full of protected deals');
  });
});

describe('full stack cascade: new active lead can evict the oldest archive entry', () => {
  it('active overflow archives, then evicts the oldest archived', async () => {
    const db = createFakePrisma([
      { id: 'A1', status: 'NEW', createdAt: ts(10), archivedAt: null },
      { id: 'A2', status: 'NEW', createdAt: ts(11), archivedAt: null },
      { id: 'A3', status: 'NEW', createdAt: ts(12), archivedAt: null },
      { id: 'R1', status: 'NEW', createdAt: ts(1), archivedAt: ts(1) },
      { id: 'R2', status: 'NEW', createdAt: ts(2), archivedAt: ts(2) },
    ]);

    const res = await enforceAllLeadStacks(db as any, { maxActive: 2, maxArchived: 2 });

    assert.equal(res.archived, 1, 'one active lead pushed to archive');
    assert.equal(res.deleted, 1, 'one archived lead permanently evicted');
    assert.equal(await db.lead.count({ where: { archivedAt: null } }), 2);
    assert.equal(await db.lead.count({ where: { archivedAt: { not: null } } }), 2);

    assert.ok(await db.lead.findUnique({ where: { id: 'A1' } }), 'A1 now archived');
    assert.equal(await db.lead.findUnique({ where: { id: 'R1' } }), null, 'R1 evicted for good');
    assert.ok(await db.lead.findUnique({ where: { id: 'R2' } }), 'R2 survives');
  });
});

describe('policy from settings + enforceAllLeadStacks', () => {
  it('reads leadPolicy from the settings store', async () => {
    const db = createFakePrisma([]);
    await db.setting.upsert({
      where: { key: 'leadPolicy' },
      create: { key: 'leadPolicy', value: { maxActive: 700, maxArchived: 30 } },
      update: { value: { maxActive: 700, maxArchived: 30 } },
    });
    const policy = await getLeadPolicy(db as any);
    assert.deepEqual(policy, { maxActive: 700, maxArchived: 30 });
  });

  it('returns archived + deleted counts', async () => {
    const db = createFakePrisma([
      { id: 'a1', createdAt: ts(5), archivedAt: null },
      { id: 'a2', createdAt: ts(6), archivedAt: null },
      { id: 'r1', status: 'NEW', createdAt: ts(1), archivedAt: ts(1) },
    ]);
    const res = await enforceAllLeadStacks(db as any, { maxActive: 1, maxArchived: 1 });
    assert.equal(res.archived, 1); // a1 pushed
    assert.equal(res.deleted, 1); // oldest archived deleted (r1)
  });
});
