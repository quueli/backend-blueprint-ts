import { computePagination, type PaginatedResult } from './pagination.js';
import { activeLeadWhere, archivedLeadWhere } from './labels.js';

export const LEAD_TABLE_SELECT = {
  id: true,
  refNo: true,
  name: true,
  phone: true,
  status: true,
  tags: true,
  readAt: true,
  createdAt: true,
  archivedAt: true,
} as const;

export const LEAD_API_LIST_SELECT = {
  id: true,
  refNo: true,
  name: true,
  phone: true,
  email: true,
  status: true,
  tags: true,
  source: true,
  ownerId: true,
  readAt: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  owner: { select: { name: true } },
} as const;

export type LeadListScope = 'active' | 'archived' | 'all';

export function leadScopeWhere(scope: LeadListScope) {
  if (scope === 'active') return activeLeadWhere();
  if (scope === 'archived') return archivedLeadWhere();
  return {};
}

export type ListLeadsStore = {
  lead: {
    count(args?: any): Promise<number>;
    findMany(args?: any): Promise<any[]>;
  };
};

export type ListLeadsParams = {
  page?: number;
  pageSize?: number;
  scope?: LeadListScope;
  select?: unknown;
  orderBy?: unknown;
};

export async function listLeads<T = any>(
  prisma: ListLeadsStore,
  params: ListLeadsParams = {},
): Promise<PaginatedResult<T>> {
  const scope = params.scope ?? 'active';
  const where = leadScopeWhere(scope);

  const total = await prisma.lead.count({ where });
  const pg = computePagination({ total, page: params.page, pageSize: params.pageSize });

  const items = await prisma.lead.findMany({
    where,
    orderBy: params.orderBy ?? { createdAt: 'desc' },
    skip: pg.skip,
    take: pg.take,
    select: params.select ?? LEAD_TABLE_SELECT,
  });

  return {
    items: items as T[],
    page: pg.page,
    pageSize: pg.pageSize,
    total: pg.total,
    totalPages: pg.totalPages,
    hasPrev: pg.hasPrev,
    hasNext: pg.hasNext,
  };
}
