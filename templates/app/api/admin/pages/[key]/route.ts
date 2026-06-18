import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  guard,
  logActivity,
  validateBlockValue,
  savePageBlockDraft,
  pageBlockPutSchema,
} from 'backend-blueprint';
import { prisma } from '@/lib/prisma';
import { BLOCK_FIELDS } from '@/lib/blocks';

export async function GET(_req: Request, { params }: { params: { key: string } }) {
  const session = await guard(authOptions);
  if (!session) return new Response('unauthorized', { status: 401 });

  const row = await prisma.pageBlock.findUnique({ where: { key: params.key } });
  return NextResponse.json({
    key: params.key,
    value: row?.draftValue ?? row?.value ?? {},
    publishedValue: row?.publishedValue ?? null,
    publishedAt: row?.publishedAt ?? null,
  });
}

export async function PUT(req: Request, { params }: { params: { key: string } }) {
  const session = await guard(authOptions);
  if (!session) return new Response('unauthorized', { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = pageBlockPutSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'validation' }, { status: 422 });

  const validated = validateBlockValue(params.key, parsed.data.value, BLOCK_FIELDS);
  if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 422 });

  const userId = (session.user as { id?: string }).id;
  await savePageBlockDraft(prisma, params.key, validated.value, userId);
  await logActivity(prisma, session, 'page.update', { key: params.key });

  return NextResponse.json({ ok: true });
}
