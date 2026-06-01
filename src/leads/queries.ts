import { computePagination, type PaginatedResult } from './pagination.js';
import { activeLeadWhere } from './labels.js';

export const LEAD_TABLE_SELECT = {
  id: true,
  refNo: true,
  name: true,
  phone: true,
  status: true,
  tags: true,
  readAt: true,
  createdAt: true,
} as const;

export type ListLeadsStore = {
  lead: {
    count(args?: any): Promise<number>;
    findMany(args?: any): Promise<any[]>;
  };
};

export async function listLeads<T = any>(
  prisma: ListLeadsStore,
  params: { page?: number; pageSize?: number } = {},
): Promise<PaginatedResult<T>> {
  const where = activeLeadWhere();
  const total = await prisma.lead.count({ where });
  const pg = computePagination({ total, page: params.page, pageSize: params.pageSize });

  const items = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: pg.skip,
    take: pg.take,
    select: LEAD_TABLE_SELECT,
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
