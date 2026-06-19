import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deriveProjectManifest, manifestIncludes } from '../src/project/manifest.js';

describe('deriveProjectManifest: detection branches', () => {
  it('detects reviews/portfolio modules from block keys', () => {
    const m = deriveProjectManifest({
      pageBlockKeys: ['site.reviews', 'site.portfolio'],
      blockFields: {},
    });
    assert.ok(m.modules.includes('reviews'));
    assert.ok(m.modules.includes('portfolio'));
    assert.ok(m.adminRoutes.includes('/admin/reviews'));
    assert.ok(m.prismaPlugins.includes('content'));
  });

  it('features flag can disable an auto-detected module', () => {
    const m = deriveProjectManifest({
      pageBlockKeys: ['site.reviews'],
      blockFields: {},
      features: { reviews: false },
    });
    assert.ok(!m.modules.includes('reviews'));
  });

  it('features flag can enable a module explicitly', () => {
    const m = deriveProjectManifest({
      pageBlockKeys: [],
      blockFields: {},
      features: { portfolio: true },
    });
    assert.ok(m.modules.includes('portfolio'));
  });

  it('extracts custom lead fields from BLOCK_FIELDS', () => {
    const m = deriveProjectManifest({
      pageBlockKeys: [],
      blockFields: { 'site.contacts': ['fName', 'phone', 'ignored'] },
    });
    assert.ok(m.leadFormFieldKeys.includes('fName'));
    assert.ok(m.leadFormFieldKeys.includes('phone'));
    assert.ok(!m.leadFormFieldKeys.includes('ignored'));
  });

  it('notes a rating in siteFacts', () => {
    const m = deriveProjectManifest({
      pageBlockKeys: [],
      blockFields: {},
      siteFacts: { rating: 4.9, ratingCount: 120 },
    });
    assert.ok(m.notes.some((n) => n.toLowerCase().includes('rating')));
    assert.equal(manifestIncludes(m, 'leads'), true);
    assert.equal(manifestIncludes(m, 'reviews'), false);
  });

  it('enables a module when its structure section is enabled', () => {
    const m = deriveProjectManifest({
      pageBlockKeys: [],
      blockFields: {},
      structure: { sections: { reviews: { enabled: true } } },
    });
    assert.ok(m.modules.includes('reviews'));
  });
});
