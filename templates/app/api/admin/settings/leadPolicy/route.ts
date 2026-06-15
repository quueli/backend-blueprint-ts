import { NextResponse } from 'next/server';
import {
  guard,
  logActivity,
  getLeadPolicy,
  normalizeLeadPolicy,
  enforceAllLeadStacks,
  notifyLeadsChanged,
} from 'backend-blueprint';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await guard(authOptions, ['OWNER', 'ADMIN', 'EDITOR']);
  if (!session) return new Response('unauthorized', { status: 401 });

  const value = await getLeadPolicy(prisma);
  return NextResponse.json({ key: 'leadPolicy', value });
}

export async function PUT(req: Request) {
  const session = await guard(authOptions, ['OWNER', 'ADMIN']);
  if (!session) return new Response('unauthorized', { status: 401 });

  let body: { value?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const value = normalizeLeadPolicy(body?.value ?? body);
  await prisma.setting.upsert({
    where: { key: 'leadPolicy' },
    create: { key: 'leadPolicy', value },
    update: { value },
  });

  const result = await enforceAllLeadStacks(prisma, value);
  await logActivity(prisma, session, 'setting.update', { key: 'leadPolicy', ...result });
  notifyLeadsChanged('lead.policy_updated');

  return NextResponse.json({ ok: true, value, ...result });
}
