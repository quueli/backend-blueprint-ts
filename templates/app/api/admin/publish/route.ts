import { NextResponse } from 'next/server';
import { guard, logActivity, publishPageBlocks } from 'backend-blueprint';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST() {
  const session = await guard(authOptions, ['OWNER', 'ADMIN', 'EDITOR']);
  if (!session) return new Response('unauthorized', { status: 401 });

  const count = await publishPageBlocks(prisma);
  await logActivity(prisma, session, 'cms.publish', { count });

  return NextResponse.json({ ok: true, count });
}
