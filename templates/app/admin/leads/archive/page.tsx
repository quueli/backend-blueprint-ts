import Link from 'next/link';
import {
  listLeads,
  getLeadPolicy,
  leadStatusLabel,
  leadArchiveReason,
  parsePageParam,
  parsePageSizeParam,
  LEAD_TABLE_SELECT,
} from 'backend-blueprint';
import { prisma } from '@/lib/prisma';
import { LeadsPagination } from '../../components/leads-pagination';

export const dynamic = 'force-dynamic';

type LeadRow = {
  id: string;
  refNo: number;
  name: string;
  phone: string | null;
  status: string;
  tags: string[];
  createdAt: Date;
  archivedAt: Date | null;
};

const REASON_LABELS: Record<string, string> = {
  limit: 'Limit',
  won: 'Won',
  lost: 'Lost',
  spam: 'Spam',
  manual: 'Manual',
};

export default async function LeadsArchivePage({
  searchParams,
}: {
  searchParams: { page?: string; pageSize?: string };
}) {
  const page = parsePageParam(searchParams.page);
  const pageSize = parsePageSizeParam(searchParams.pageSize);

  const [policy, result] = await Promise.all([
    getLeadPolicy(prisma),
    listLeads<LeadRow>(prisma, {
      page,
      pageSize,
      scope: 'archived',
      select: LEAD_TABLE_SELECT,
      orderBy: [{ archivedAt: 'desc' }, { createdAt: 'desc' }],
    }),
  ]);

  return (
    <div>
      <h1 className="adm-page-title">Lead archive</h1>
      <p className="adm-page-lead">
        Archived: {result.total} / {policy.maxArchived} · <Link href="/admin/leads">← Active</Link>
      </p>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Status</th>
              <th>Reason</th>
              <th>Archived since</th>
              <th className="adm-table__actions-col" />
            </tr>
          </thead>
          <tbody>
            {result.items.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ color: 'var(--adm-muted)' }}>
                  Archive is empty
                </td>
              </tr>
            ) : (
              result.items.map((l) => (
                <tr key={l.id} className="adm-table__row">
                  <td>#{l.refNo}</td>
                  <td>{l.name}</td>
                  <td>{leadStatusLabel(l.status, l.tags)}</td>
                  <td>{REASON_LABELS[leadArchiveReason(l.status, l.tags)]}</td>
                  <td>{l.archivedAt?.toLocaleString() ?? '-'}</td>
                  <td className="adm-table__actions-col">
                    <Link href={`/admin/leads/${l.id}`} className="adm-btn adm-btn--sm">
                      Open
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <LeadsPagination
        page={result.page}
        totalPages={result.totalPages}
        basePath="/admin/leads/archive"
        params={{ pageSize: pageSize !== 20 ? pageSize : undefined }}
      />
    </div>
  );
}
