export const DEFAULT_PAGE_SIZE = 20;

export function parsePageParam(raw?: string | null): number {
  const n = Number.parseInt(raw ?? '1', 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function parsePageSizeParam(raw?: string | null, fallback: number = DEFAULT_PAGE_SIZE): number {
  const n = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  skip: number;
  take: number;
  hasPrev: boolean;
  hasNext: boolean;
};

export function computePagination(input: { total: number; page?: number; pageSize?: number }): Pagination {
  const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;
  const total = Math.max(0, input.total);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, input.page ?? 1), totalPages);
  return {
    page,
    pageSize,
    total,
    totalPages,
    skip: (page - 1) * pageSize,
    take: pageSize,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  };
}

export type PaginatedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
};
