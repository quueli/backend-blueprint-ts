import { NextResponse } from 'next/server';
import { guard, logActivity, markLeadRead, notifyLeadsChanged } from 'backend-blueprint';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const PATCHABLE_STATUSES = [
  'NEW', 'CONTACTED', 'WORKING', 'BRIEF', 'CONTRACT', 'WON', 'LOST', 'SPAM', 'ARCHIVED',
];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await guard(authOptions);
  if (!session) return new Response('unauthorized', { status: 401 });

  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: { owner: { select: { name: true } }, comments: { orderBy: { createdAt: 'desc' } } },
  });
  if (!lead) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (!lead.readAt) {
    await markLeadRead(prisma, lead.id);
    notifyLeadsChanged('lead.read');
  }

  return NextResponse.json({ lead });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await guard(authOptions, ['OWNER', 'ADMIN', 'EDITOR']);
  if (!session) return new Response('unauthorized', { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.status === 'string' && PATCHABLE_STATUSES.includes(body.status)) {
    data.status = body.status;
  }
  if ('ownerId' in body) data.ownerId = (body.ownerId as string) || null;
  if (typeof body.read === 'boolean') data.readAt = body.read ? new Date() : null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'nothing_to_update' }, { status: 422 });
  }

  const lead = await prisma.lead.update({ where: { id: params.id }, data });
  await logActivity(prisma, session, 'lead.update', { id: params.id, fields: Object.keys(data) });
  notifyLeadsChanged('lead.updated');

  return NextResponse.json({ ok: true, lead });
}
