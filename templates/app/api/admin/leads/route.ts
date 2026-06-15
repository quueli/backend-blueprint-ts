import { NextResponse } from 'next/server';
import { guard, listLeads, parsePageParam, parsePageSizeParam, LEAD_API_LIST_SELECT } from 'backend-blueprint';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await guard(authOptions);
  if (!session) return new Response('unauthorized', { status: 401 });

  const url = new URL(req.url);
  const scopeParam = url.searchParams.get('scope');
  const scope = scopeParam === 'archived' || scopeParam === 'all' ? scopeParam : 'active';

  const result = await listLeads(prisma, {
    page: parsePageParam(url.searchParams.get('page')),
    pageSize: parsePageSizeParam(url.searchParams.get('pageSize')),
    scope,
    select: LEAD_API_LIST_SELECT,
  });

  return NextResponse.json(result);
}
