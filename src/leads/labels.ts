export const LIMIT_ARCHIVE_TAG = 'archive:limit';

// never auto-deleted when the archive overflows, losing a won deal to a ring buffer is not ok
export const PROTECTED_STATUSES = ['WON', 'CONTRACT'] as const;

export function isProtectedStatus(status: string): boolean {
  return (PROTECTED_STATUSES as readonly string[]).includes(status);
}

export const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  WORKING: 'In progress',
  BRIEF: 'Brief',
  CONTRACT: 'Contract',
  WON: 'Won',
  LOST: 'Lost',
  SPAM: 'Spam',
  ARCHIVED: 'Archived',
};

export function isLimitArchived(tags: string[] = []): boolean {
  return tags.includes(LIMIT_ARCHIVE_TAG);
}

export function leadStatusLabel(status: string, tags: string[] = []): string {
  return LEAD_STATUS_LABELS[status] ?? status;
}

export function leadArchiveReason(status: string, tags: string[] = []): 'limit' | 'won' | 'lost' | 'spam' | 'manual' {
  if (isLimitArchived(tags)) return 'limit';
  if (status === 'WON') return 'won';
  if (status === 'LOST') return 'lost';
  if (status === 'SPAM') return 'spam';
  return 'manual';
}

// pool membership comes from archivedAt, status is orthogonal
export function activeLeadWhere() {
  return { archivedAt: null };
}

export function archivedLeadWhere() {
  return { archivedAt: { not: null } };
}

export function unreadLeadWhere() {
  return { readAt: null, archivedAt: null };
}
