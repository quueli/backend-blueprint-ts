import Link from 'next/link';

type Props = {
  page: number;
  totalPages: number;
  basePath: string;
  params?: Record<string, string | number | undefined>;
};

function hrefFor(basePath: string, page: number, params: Props['params']) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  if (page > 1) sp.set('page', String(page));
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function LeadsPagination({ page, totalPages, basePath, params }: Props) {
  if (totalPages <= 1) return null;

  return (
    <nav className="adm-pagination" aria-label="Pages">
      {page > 1 ? (
        <Link href={hrefFor(basePath, page - 1, params)} className="adm-btn adm-btn--sm">
          ← Back
        </Link>
      ) : (
        <span className="adm-btn adm-btn--sm adm-btn--disabled">← Back</span>
      )}

      <span className="adm-pagination__info">
        Page {page} of {totalPages}
      </span>

      {page < totalPages ? (
        <Link href={hrefFor(basePath, page + 1, params)} className="adm-btn adm-btn--sm">
          Next →
        </Link>
      ) : (
        <span className="adm-btn adm-btn--sm adm-btn--disabled">Next →</span>
      )}
    </nav>
  );
}
