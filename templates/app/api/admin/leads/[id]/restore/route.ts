import { NextResponse } from 'next/server';
import {
  guard,
  logActivity,
  enforceAllLeadStacks,
  notifyLeadsChanged,
  LIMIT_ARCHIVE_TAG,
} from 'backend-blueprint';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await guard(authOptions, ['OWNER', 'ADMIN', 'EDITOR']);
  if (!session) return new Response('unauthorized', { status: 401 });

  const current = await prisma.lead.findUnique({ where: { id: params.id }, select: { tags: true } });
  const tags = (current?.tags ?? []).filter((t: string) => t !== LIMIT_ARCHIVE_TAG);

  await prisma.lead.update({ where: { id: params.id }, data: { archivedAt: null, tags } });

  await enforceAllLeadStacks(prisma);

  await logActivity(prisma, session, 'lead.restore', { id: params.id });
  notifyLeadsChanged('lead.restored');

  return NextResponse.json({ ok: true });
}
