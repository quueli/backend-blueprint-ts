import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getPageBlock,
  savePageBlockDraft,
  publishPageBlocks,
  resolveSiteContent,
  seedSiteFacts,
} from '../src/cms/content-resolver.js';
import { createFakePrisma } from './helpers/fake-prisma.js';

describe('getPageBlock', () => {
  it('returns defaults when the block is missing', async () => {
    const prisma = createFakePrisma();
    const res = await getPageBlock(prisma as any, 'site.hero', { ru: { a: 1 }, en: { a: 2 } });
    assert.deepEqual(res, { ru: { a: 1 }, en: { a: 2 } });
  });

  it('merges published value over defaults', async () => {
    const prisma = createFakePrisma([], {
      pageBlocks: [{ key: 'site.hero', publishedValue: { ru: { h: 'Hi' } } }],
    });
    const res: any = await getPageBlock(prisma as any, 'site.hero', { ru: { a: 1 }, en: { a: 2 } });
    assert.equal(res.ru.h, 'Hi');
    assert.equal(res.ru.a, 1);
    assert.equal(res.en.a, 2);
  });

  it('returns the published value when no defaults', async () => {
    const prisma = createFakePrisma([], {
      pageBlocks: [{ key: 'site.hero', publishedValue: { ru: { h: 'Pub' } } }],
    });
    const res: any = await getPageBlock(prisma as any, 'site.hero');
    assert.deepEqual(res, { ru: { h: 'Pub' } });
  });

  it('falls back to value when there is no published value', async () => {
    const prisma = createFakePrisma([], {
      pageBlocks: [{ key: 'site.hero', value: { ru: { h: 'Val' } }, publishedValue: null }],
    });
    const res: any = await getPageBlock(prisma as any, 'site.hero');
    assert.deepEqual(res, { ru: { h: 'Val' } });
  });

  it('returns {} when block and defaults are absent', async () => {
    const prisma = createFakePrisma();
    assert.deepEqual(await getPageBlock(prisma as any, 'missing'), {});
  });
});

describe('savePageBlockDraft + publishPageBlocks', () => {
  it('saves a draft then promotes it to published', async () => {
    const prisma = createFakePrisma();
    await savePageBlockDraft(prisma as any, 'site.hero', { ru: { h: 'Draft' } }, 'editor');

    let row = await prisma.pageBlock.findUnique({ where: { key: 'site.hero' } });
    assert.deepEqual(row!.draftValue, { ru: { h: 'Draft' } });
    assert.equal(row!.publishedValue, null);

    const count = await publishPageBlocks(prisma as any, ['site.hero']);
    assert.equal(count, 1);

    row = await prisma.pageBlock.findUnique({ where: { key: 'site.hero' } });
    assert.deepEqual(row!.publishedValue, { ru: { h: 'Draft' } });
    assert.ok(row!.publishedAt, 'publishedAt is set');
  });
});

describe('resolveSiteContent', () => {
  it('merges siteFacts, structure, theme and published blocks', async () => {
    const prisma = createFakePrisma([], {
      settings: [
        { key: 'siteFacts', value: { name: 'Acme' } },
        { key: 'structure', value: { order: ['hero'] } },
        { key: 'theme', value: { color: 'red' } },
      ],
      pageBlocks: [{ key: 'site.hero', publishedValue: { ru: { h: 'Hi' } } }],
    });

    const dto = await resolveSiteContent(prisma as any, ['site.hero']);
    assert.deepEqual(dto.siteFacts, { name: 'Acme' });
    assert.deepEqual(dto.structure, { order: ['hero'] });
    assert.deepEqual(dto.theme, { color: 'red' });
    assert.deepEqual(dto.blocks['site.hero'], { ru: { h: 'Hi' } });
  });
});

describe('seedSiteFacts', () => {
  it('upserts the siteFacts setting', async () => {
    const prisma = createFakePrisma();
    await seedSiteFacts(prisma as any, { name: 'Acme', phone: '+7' });
    const row = await prisma.setting.findUnique({ where: { key: 'siteFacts' } });
    assert.deepEqual(row!.value, { name: 'Acme', phone: '+7' });
  });
});
