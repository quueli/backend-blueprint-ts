import type { Prisma } from '@prisma/client';
import type { PrismaClientLike } from '../prisma.js';

// prisma refuses Record<string, unknown> for Json columns, everything written there goes through this
type JsonIn = Prisma.InputJsonValue;

export type Locale = string;

export type BlockFieldSchema = Record<string, string[]>;

export type PageBlockConfig = {
  keys: readonly string[];
  fields: BlockFieldSchema;
  defaults?: Record<string, Record<Locale, Record<string, unknown>>>;
};

export function validateBlockValue(
  key: string,
  value: unknown,
  fields: BlockFieldSchema,
): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  if (!fields[key]) {
    return { ok: false, error: `unknown_block_key:${key}` };
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, error: 'value_must_be_object' };
  }
  return { ok: true, value: value as Record<string, unknown> };
}

export async function getPageBlock(
  prisma: PrismaClientLike,
  key: string,
  defaults?: Record<Locale, Record<string, unknown>>,
): Promise<Record<Locale, Record<string, unknown>> | Record<string, unknown>> {
  const row = await prisma.pageBlock.findUnique({ where: { key } });
  const published = row?.publishedValue ?? row?.value;
  if (published && typeof published === 'object') {
    if (defaults) {
      const v = published as Record<string, Record<string, unknown>>;
      return {
        ru: { ...defaults.ru, ...(v.ru ?? {}) },
        en: { ...defaults.en, ...(v.en ?? {}) },
      };
    }
    return published as Record<string, unknown>;
  }
  if (defaults) return defaults;
  return {};
}

export async function savePageBlockDraft(
  prisma: PrismaClientLike,
  key: string,
  value: Record<string, unknown>,
  updatedBy?: string,
): Promise<void> {
  const json = value as JsonIn;
  await prisma.pageBlock.upsert({
    where: { key },
    create: { key, value: json, draftValue: json, updatedBy },
    update: { draftValue: json, value: json, updatedBy },
  });
}

export async function publishPageBlocks(
  prisma: PrismaClientLike,
  keys?: string[],
): Promise<number> {
  const rows = keys
    ? await Promise.all(keys.map((key) => prisma.pageBlock.findUnique({ where: { key } })))
    : await prisma.pageBlock.findMany();
  const toPublish = rows.filter(Boolean);
  let count = 0;
  const now = new Date();
  for (const row of toPublish) {
    if (!row) continue;
    const draft = (row.draftValue ?? row.value) as JsonIn;
    await prisma.pageBlock.update({
      where: { key: row.key },
      data: { publishedValue: draft, value: draft, publishedAt: now },
    });
    count++;
  }
  return count;
}

export type SiteContentDTO = {
  siteFacts: Record<string, unknown> | null;
  blocks: Record<string, unknown>;
  structure: Record<string, unknown> | null;
  theme: Record<string, unknown> | null;
};

export async function resolveSiteContent(
  prisma: PrismaClientLike,
  blockKeys: readonly string[],
): Promise<SiteContentDTO> {
  const [factsRow, structureRow, themeRow, blockRows] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'siteFacts' } }),
    prisma.setting.findUnique({ where: { key: 'structure' } }),
    prisma.setting.findUnique({ where: { key: 'theme' } }),
    prisma.pageBlock.findMany({ where: { key: { in: [...blockKeys] } } }),
  ]);

  const blocks: Record<string, unknown> = {};
  for (const key of blockKeys) {
    const row = blockRows.find((r: { key: string }) => r.key === key);
    blocks[key] = row?.publishedValue ?? row?.value ?? null;
  }

  return {
    siteFacts: (factsRow?.value as Record<string, unknown>) ?? null,
    blocks,
    structure: (structureRow?.value as Record<string, unknown>) ?? null,
    theme: (themeRow?.value as Record<string, unknown>) ?? null,
  };
}

export async function seedSiteFacts(
  prisma: PrismaClientLike,
  facts: Record<string, unknown>,
): Promise<void> {
  await prisma.setting.upsert({
    where: { key: 'siteFacts' },
    create: { key: 'siteFacts', value: facts as JsonIn },
    update: { value: facts as JsonIn },
  });
}
