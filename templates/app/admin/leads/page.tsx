import Link from 'next/link';
import {
  listLeads,
  getLeadPolicy,
  countUnreadLeads,
  leadStatusLabel,
  parsePageParam,
  parsePageSizeParam,
  LEAD_TABLE_SELECT,
} from 'backend-blueprint';
import { prisma } from '@/lib/prisma';
import { LeadsPagination } from '../components/leads-pagination';
import { LeadsLive } from '../components/leads-live';

export const dynamic = 'force-dynamic';

type LeadRow = {
  id: string;
  refNo: number;
  name: string;
  phone: string | null;
  status: string;
  tags: string[];
  readAt: Date | null;
  createdAt: Date;
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { page?: string; pageSize?: string };
}) {
  const page = parsePageParam(searchParams.page);
  const pageSize = parsePageSizeParam(searchParams.pageSize);

  const [policy, unread, archivedTotal, result] = await Promise.all([
    getLeadPolicy(prisma),
    countUnreadLeads(prisma),
    prisma.lead.count({ where: { archivedAt: { not: null } } }),
    listLeads<LeadRow>(prisma, { page, pageSize, scope: 'active', select: LEAD_TABLE_SELECT }),
  ]);

  return (
    <div>
      <h1 className="adm-page-title">Leads</h1>
      <p className="adm-page-lead">
        Active: {result.total} / {policy.maxActive} ·{' '}
        <Link href="/admin/leads/archive">
          Archive: {archivedTotal} / {policy.maxArchived}
        </Link>{' '}
        · <Link href="/admin/settings">Limits</Link> · <LeadsLive initialUnread={unread} />
      </p>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Created</th>
              <th className="adm-table__actions-col" />
            </tr>
          </thead>
          <tbody>
            {result.items.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ color: 'var(--adm-muted)' }}>
                  No leads yet
                </td>
              </tr>
            ) : (
              result.items.map((l) => (
                <tr key={l.id} className={`adm-table__row${l.readAt ? '' : ' adm-table__row--unread'}`}>
                  <td>#{l.refNo}</td>
                  <td>
                    {l.readAt ? null : <span className="adm-dot" aria-label="unread" />} {l.name}
                  </td>
                  <td>{l.phone}</td>
                  <td>{leadStatusLabel(l.status, l.tags)}</td>
                  <td>{l.createdAt.toLocaleString()}</td>
                  <td className="adm-table__actions-col">
                    <Link href={`/admin/leads/${l.id}`} className="adm-btn adm-btn--primary adm-btn--sm">
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
        basePath="/admin/leads"
        params={{ pageSize: pageSize !== 20 ? pageSize : undefined }}
      />
    </div>
  );
}
