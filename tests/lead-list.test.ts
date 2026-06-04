import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { listLeads } from '../src/leads/queries.js';
import { createFakePrisma } from './helpers/fake-prisma.js';

const ts = (n: number) => new Date(1_700_000_000_000 + n * 1000);

describe('listLeads: mandatory pagination', () => {
  it('returns a clamped page slice with totals', async () => {
    const db = createFakePrisma(Array.from({ length: 25 }, () => ({})));
    const r = await listLeads(db as any, { page: 2, pageSize: 10, scope: 'active' });

    assert.equal(r.total, 25);
    assert.equal(r.totalPages, 3);
    assert.equal(r.page, 2);
    assert.equal(r.pageSize, 10);
    assert.equal(r.items.length, 10);
    assert.equal(r.hasPrev, true);
    assert.equal(r.hasNext, true);
    assert.equal(r.items[0].id, 'seed_15');
    assert.equal(r.items[9].id, 'seed_6');
  });

  it('clamps an overflow page to the last page', async () => {
    const db = createFakePrisma(Array.from({ length: 25 }, () => ({})));
    const r = await listLeads(db as any, { page: 99, pageSize: 10 });
    assert.equal(r.page, 3);
    assert.equal(r.items.length, 5);
    assert.equal(r.hasNext, false);
  });

  it('scopes by active / archived / all', async () => {
    const db = createFakePrisma([
      { id: 'act1', archivedAt: null },
      { id: 'arc1', archivedAt: ts(1) },
      { id: 'arc2', archivedAt: ts(2) },
    ]);
    assert.equal((await listLeads(db as any, { scope: 'active' })).total, 1);
    assert.equal((await listLeads(db as any, { scope: 'archived' })).total, 2);
    assert.equal((await listLeads(db as any, { scope: 'all' })).total, 3);
  });
});
