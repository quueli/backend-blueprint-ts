import { NextResponse } from 'next/server';
import { guard, countUnreadLeads, markAllLeadsRead, notifyLeadsChanged } from 'backend-blueprint';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await guard(authOptions);
  if (!session) return new Response('unauthorized', { status: 401 });

  const count = await countUnreadLeads(prisma);
  return NextResponse.json({ count });
}

export async function POST() {
  const session = await guard(authOptions);
  if (!session) return new Response('unauthorized', { status: 401 });

  const marked = await markAllLeadsRead(prisma);
  if (marked > 0) notifyLeadsChanged('lead.read');
  return NextResponse.json({ ok: true, marked });
}
