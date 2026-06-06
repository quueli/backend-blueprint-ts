export type LeadAccess = {
  ownerId: string | null;
  status: string;
};

export function canEditLead(lead: LeadAccess, userId: string | undefined, role: string | undefined): boolean {
  if (!userId) return false;
  if (role === 'OWNER') return true;
  if (!lead.ownerId) return true;
  return lead.ownerId === userId;
}

export function isLeadLocked(lead: LeadAccess, userId: string | undefined, role: string | undefined): boolean {
  if (!lead.ownerId) return false;
  if (role === 'OWNER') return false;
  return lead.ownerId !== userId;
}

export function ownerLabel(owner: { name: string } | null | undefined): string | null {
  return owner?.name ?? null;
}
