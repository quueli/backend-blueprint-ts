import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deriveProjectManifest, manifestIncludes } from '../src/project/manifest.js';
import { buildLeadSchemaFromKeys } from '../src/project/lead-schema.js';

describe('deriveProjectManifest', () => {
  it('includes core modules by default', () => {
    const m = deriveProjectManifest({
      pageBlockKeys: ['site.hero', 'site.contacts'],
      blockFields: {
        'site.hero': ['h1'],
        'site.contacts': ['fName', 'fPhone', 'fMsg'],
      },
    });
    assert.ok(manifestIncludes(m, 'leads'));
    assert.ok(manifestIncludes(m, 'cms-blocks'));
    assert.ok(m.modules.includes('users'));
  });

  it('enables reviews when section enabled', () => {
    const m = deriveProjectManifest({
      pageBlockKeys: ['site.reviews'],
      blockFields: { 'site.reviews': ['items'] },
      structure: { sections: { reviews: { enabled: true } } },
    });
    assert.ok(manifestIncludes(m, 'reviews'));
    assert.ok(m.prismaPlugins.includes('content'));
  });

  it('detects gallery media module', () => {
    const m = deriveProjectManifest({
      pageBlockKeys: ['site.gallery'],
      blockFields: { 'site.gallery': ['images'] },
      structure: { sections: { gallery: { enabled: true } } },
    });
    assert.ok(manifestIncludes(m, 'media-upload'));
  });
});

describe('buildLeadSchemaFromKeys', () => {
  it('extends schema with known fields', () => {
    const schema = buildLeadSchemaFromKeys(['fPhone', 'fAddress', 'fBudget']);
    const r = schema.safeParse({
      name: 'Test User',
      phone: '+12025550123',
      message: 'A reasonably long test message',
      agreement: true,
      address: 'Sample Street 1',
    });
    assert.equal(r.success, true);
  });
});
