import { headers, cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createLeadPipeline } from 'backend-blueprint';
import { prisma } from '@/lib/prisma';

const processLead = createLeadPipeline({ prisma, siteName: process.env.SITE_NAME });

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const c = cookies();
  const utm = ['utm_source', 'utm_medium', 'utm_campaign']
    .map((k) => c.get(k)?.value)
    .filter(Boolean)
    .join(' / ');
  const source = utm || c.get('referrer')?.value || null;

  const result = await processLead({
    body,
    ip,
    userAgent: headers().get('user-agent'),
    source,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, fields: 'fields' in result ? result.fields : undefined },
      { status: result.status },
    );
  }

  if ('honeypot' in result && result.honeypot) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true, id: result.id }, { status: result.status });
}
