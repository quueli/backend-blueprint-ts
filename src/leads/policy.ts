import {
  activeLeadWhere,
  archivedLeadWhere,
  LIMIT_ARCHIVE_TAG,
  PROTECTED_STATUSES,
} from './labels.js';
import { notifyLeadsChanged } from './events.js';

export type LeadPolicy = {
  maxActive: number;
  maxArchived: number;
};

export const DEFAULT_LEAD_POLICY: LeadPolicy = {
  maxActive: 1000,
  maxArchived: 100,
};

export const LEAD_POLICY_LIMITS = { min: 10, max: 50_000 } as const;

function clampInt(n: unknown, fallback: number): number {
  const x = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.min(LEAD_POLICY_LIMITS.max, Math.max(LEAD_POLICY_LIMITS.min, Math.round(x)));
}

export function normalizeLeadPolicy(value: unknown): LeadPolicy {
  const v = (value && typeof value === 'object' ? value : {}) as Partial<LeadPolicy>;
  return {
    maxActive: clampInt(v.maxActive, DEFAULT_LEAD_POLICY.maxActive),
    maxArchived: clampInt(v.maxArchived, DEFAULT_LEAD_POLICY.maxArchived),
  };
}

// loose args so the real client and the in-memory test double both fit
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

export type EnforceResult = { archived: number; deleted: number };

export async function enforceAllLeadStacks(prisma: LeadStackStore, policy?: LeadPolicy): Promise<EnforceResult> {
  const p = policy ?? (await getLeadPolicy(prisma));
  const archived = await enforceActiveLeadStack(prisma, p);
  const deleted = await enforceArchivedLeadStack(prisma, p);
  return { archived, deleted };
}

export async function enforceActiveLeadStack(prisma: LeadStackStore, policy?: LeadPolicy): Promise<number> {
  const p = policy ?? (await getLeadPolicy(prisma));
  const active = await prisma.lead.count({ where: activeLeadWhere() });
  const overflow = active - p.maxActive;
  if (overflow <= 0) return 0;

  const archived = await pushOldestActiveToArchive(prisma, overflow);
  if (archived > 0) notifyLeadsChanged('lead.stack_archive');
  return archived;
}

export async function enforceArchivedLeadStack(prisma: LeadStackStore, policy?: LeadPolicy): Promise<number> {
  const p = policy ?? (await getLeadPolicy(prisma));
  const archivedCount = await prisma.lead.count({ where: archivedLeadWhere() });
  const overflow = archivedCount - p.maxArchived;
  if (overflow <= 0) return 0;

  const deleted = await deleteOldestArchived(prisma, overflow);
  if (deleted > 0) notifyLeadsChanged('lead.stack_evict');
  return deleted;
}

async function pushOldestActiveToArchive(prisma: LeadStackStore, count: number): Promise<number> {
  const victims = await prisma.lead.findMany({
    where: activeLeadWhere(),
    orderBy: { createdAt: 'asc' },
    take: count,
    select: { id: true, refNo: true, tags: true },
  });
  if (!victims.length) return 0;

  const now = new Date();
  for (const v of victims) {
    const tags: string[] = Array.isArray(v.tags) ? v.tags : [];
    const nextTags = tags.includes(LIMIT_ARCHIVE_TAG) ? tags : [...tags, LIMIT_ARCHIVE_TAG];
    // status stays as it was, a CONTRACT lead is still protected down here
    await prisma.lead.update({
      where: { id: v.id },
      data: { archivedAt: now, tags: nextTags },
    });
  }

  await prisma.activity.create({
    data: {
      kind: 'lead.stack_archive',
      payload: {
        ids: victims.map((v) => v.id),
        refNos: victims.map((v) => v.refNo),
        reason: 'limit',
      },
    },
  });

  return victims.length;
}

// the archive can grow past maxArchived if it is full of protected deals, that is on purpose
async function deleteOldestArchived(prisma: LeadStackStore, count: number): Promise<number> {
  const victims = await prisma.lead.findMany({
    where: { ...archivedLeadWhere(), status: { notIn: [...PROTECTED_STATUSES] } },
    orderBy: [{ archivedAt: 'asc' }, { createdAt: 'asc' }],
    take: count,
    select: { id: true, refNo: true },
  });
  if (!victims.length) return 0;

  const ids = victims.map((v) => v.id);
  await prisma.lead.deleteMany({ where: { id: { in: ids } } });

  await prisma.activity.create({
    data: {
      kind: 'lead.stack_evict',
      payload: { ids, refNos: victims.map((v) => v.refNo), from: 'archive' },
    },
  });

  return victims.length;
}
