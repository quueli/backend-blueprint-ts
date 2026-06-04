export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export function parsePageParam(raw?: string | null): number {
  const n = Number.parseInt(raw ?? '1', 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function parsePageSizeParam(raw?: string | null, fallback: number = DEFAULT_PAGE_SIZE): number {
  const n = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(n) || n <= 0) return clampPageSize(fallback);
  return clampPageSize(n);
}

export function clampPageSize(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(n)));
}

export function clampPage(raw: unknown, totalPages: number): number {
  const max = Math.max(1, Math.floor(totalPages) || 1);
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(Math.max(1, Math.floor(n)), max);
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
  const pageSize = clampPageSize(input.pageSize);
  const total = Math.max(0, Math.floor(input.total) || 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = clampPage(input.page, totalPages);
  const skip = (page - 1) * pageSize;
  return {
    page,
    pageSize,
    total,
    totalPages,
    skip,
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
