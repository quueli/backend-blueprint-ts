import { activeLeadWhere, archivedLeadWhere, LIMIT_ARCHIVE_TAG } from './labels.js';

export type LeadPolicy = {
  maxActive: number;
  maxArchived: number;
};

export const DEFAULT_LEAD_POLICY: LeadPolicy = {
  maxActive: 1000,
  maxArchived: 100,
};

export function normalizeLeadPolicy(value: unknown): LeadPolicy {
  const v = (value && typeof value === 'object' ? value : {}) as Partial<LeadPolicy>;
  return {
    maxActive: Number(v.maxActive) || DEFAULT_LEAD_POLICY.maxActive,
    maxArchived: Number(v.maxArchived) || DEFAULT_LEAD_POLICY.maxArchived,
  };
}

export type LeadStackStore = {
  lead: {
    count(args?: any): Promise<number>;
    findMany(args?: any): Promise<any[]>;
    update(args: any): Promise<any>;
    deleteMany(args: any): Promise<{ count: number }>;
  };
  activity: { create(args: any): Promise<any> };
  setting: { findUnique(args: any): Promise<{ value: unknown } | null> };
};

export async function getLeadPolicy(prisma: LeadStackStore): Promise<LeadPolicy> {
  const row = await prisma.setting.findUnique({ where: { key: 'leadPolicy' } });
  return normalizeLeadPolicy(row?.value);
}

export async function enforceActiveLeadStack(prisma: LeadStackStore, policy?: LeadPolicy): Promise<number> {
  const p = policy ?? (await getLeadPolicy(prisma));
  const active = await prisma.lead.count({ where: activeLeadWhere() });
  const overflow = active - p.maxActive;
  if (overflow <= 0) return 0;

  const victims = await prisma.lead.findMany({
    where: activeLeadWhere(),
    orderBy: { createdAt: 'asc' },
    take: overflow,
    select: { id: true, refNo: true, tags: true },
  });

  const now = new Date();
  for (const v of victims) {
    const tags: string[] = Array.isArray(v.tags) ? v.tags : [];
    await prisma.lead.update({
      where: { id: v.id },
      data: { archivedAt: now, tags: [...tags, LIMIT_ARCHIVE_TAG] },
    });
  }

  await prisma.activity.create({
    data: { kind: 'lead.stack_archive', payload: { ids: victims.map((v) => v.id), reason: 'limit' } },
  });

  return victims.length;
}

export async function enforceArchivedLeadStack(prisma: LeadStackStore, policy?: LeadPolicy): Promise<number> {
  const p = policy ?? (await getLeadPolicy(prisma));
  const archived = await prisma.lead.count({ where: archivedLeadWhere() });
  const overflow = archived - p.maxArchived;
  if (overflow <= 0) return 0;

  const victims = await prisma.lead.findMany({
    where: archivedLeadWhere(),
    orderBy: { archivedAt: 'asc' },
    take: overflow,
    select: { id: true, refNo: true },
  });

  const ids = victims.map((v) => v.id);
  await prisma.lead.deleteMany({ where: { id: { in: ids } } });
  await prisma.activity.create({ data: { kind: 'lead.stack_evict', payload: { ids, from: 'archive' } } });

  return victims.length;
}

export async function enforceAllLeadStacks(prisma: LeadStackStore, policy?: LeadPolicy) {
  const p = policy ?? (await getLeadPolicy(prisma));
  const archived = await enforceActiveLeadStack(prisma, p);
  const deleted = await enforceArchivedLeadStack(prisma, p);
  return { archived, deleted };
}
