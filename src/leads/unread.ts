import { unreadLeadWhere } from './labels.js';

export type UnreadStore = {
  lead: {
    count(args?: any): Promise<number>;
    update(args: any): Promise<any>;
    updateMany(args: any): Promise<{ count: number }>;
  };
};

export async function countUnreadLeads(prisma: UnreadStore): Promise<number> {
  return prisma.lead.count({ where: unreadLeadWhere() });
}

export async function markLeadRead(prisma: UnreadStore, id: string, at: Date = new Date()): Promise<void> {
  await prisma.lead.update({ where: { id }, data: { readAt: at } });
}

export async function markLeadUnread(prisma: UnreadStore, id: string): Promise<void> {
  await prisma.lead.update({ where: { id }, data: { readAt: null } });
}

export async function markAllLeadsRead(prisma: UnreadStore, at: Date = new Date()): Promise<number> {
  const res = await prisma.lead.updateMany({ where: unreadLeadWhere(), data: { readAt: at } });
  return res.count;
}

export function formatBadgeCount(count: number, max = 99): string {
  if (!Number.isFinite(count) || count <= 0) return '';
  const n = Math.floor(count);
  return n > max ? `${max}+` : String(n);
}
