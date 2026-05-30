export const LIMIT_ARCHIVE_TAG = 'archive:limit';

export const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  WORKING: 'In progress',
  CONTRACT: 'Contract',
  WON: 'Won',
  LOST: 'Lost',
  SPAM: 'Spam',
  ARCHIVED: 'Archived',
};

export function isLimitArchived(tags: string[] = []): boolean {
  return tags.includes(LIMIT_ARCHIVE_TAG);
}

export function leadStatusLabel(status: string): string {
  return LEAD_STATUS_LABELS[status] ?? status;
}

export function activeLeadWhere() {
  return { archivedAt: null };
}

export function archivedLeadWhere() {
  return { archivedAt: { not: null } };
}
