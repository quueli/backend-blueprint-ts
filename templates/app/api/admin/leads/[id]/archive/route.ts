import { NextResponse } from 'next/server';
import { guard, logActivity, enforceArchivedLeadStack, notifyLeadsChanged } from 'backend-blueprint';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await guard(authOptions, ['OWNER', 'ADMIN', 'EDITOR']);
  if (!session) return new Response('unauthorized', { status: 401 });

  await prisma.lead.update({ where: { id: params.id }, data: { archivedAt: new Date() } });

  await enforceArchivedLeadStack(prisma);

  await logActivity(prisma, session, 'lead.archive', { id: params.id });
  notifyLeadsChanged('lead.archived');

  return NextResponse.json({ ok: true });
}
