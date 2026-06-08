import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createLeadPipeline } from '../src/leads/pipeline.js';
import { leadEvents } from '../src/leads/events.js';
import { createFakePrisma } from './helpers/fake-prisma.js';

const ts = (n: number) => new Date(1_700_000_000_000 + n * 1000);
const validBody = {
  name: 'Ivan',
  phone: '+12025550123',
  message: 'Need a consultation about your service',
  agreement: true,
};
const env = {}; // no captcha, no smtp, no telegram, no crm → no network

describe('createLeadPipeline', () => {
  it('creates a lead, logs activity and emits an event', async () => {
    const prisma = createFakePrisma();
    const reasons: string[] = [];
    const off = leadEvents.subscribe((e) => reasons.push(e.reason));

    const process = createLeadPipeline({ prisma: prisma as any, env, rateLimit: () => true });
    const r = await process({ body: validBody, ip: '1.1.1.1' });
    off();

    assert.equal(r.ok, true);
    assert.equal(r.status, 201);
    assert.equal(prisma.lead._rows().length, 1);
    assert.ok(prisma.activity._rows().some((a) => a.kind === 'lead.create'));
    assert.ok(reasons.includes('lead.created'));
  });

  it('returns 429 when rate-limited', async () => {
    const prisma = createFakePrisma();
    const process = createLeadPipeline({ prisma: prisma as any, env, rateLimit: () => false });
    const r = await process({ body: validBody, ip: '1.1.1.1' });
    assert.equal(r.status, 429);
    assert.equal(prisma.lead._rows().length, 0);
  });

  it('returns 403 without a captcha token', async () => {
    const prisma = createFakePrisma();
    const process = createLeadPipeline({
      prisma: prisma as any,
      env: { TURNSTILE_SECRET: 's' },
      rateLimit: () => true,
    });
    const r = await process({ body: validBody, ip: '1.1.1.1' });
    assert.equal(r.status, 403);
    assert.equal(prisma.lead._rows().length, 0);
  });

  it('returns 422 on invalid input', async () => {
    const prisma = createFakePrisma();
    const process = createLeadPipeline({ prisma: prisma as any, env, rateLimit: () => true });

    const short = await process({ body: { name: 'x' }, ip: '1.1.1.1' });
    assert.equal(short.status, 422);

    const spam = await process({ body: { ...validBody, website: 'spam-bot' }, ip: '1.1.1.1' });
    assert.equal(spam.status, 422); // non-empty honeypot fails the schema
    assert.equal(prisma.lead._rows().length, 0);
  });

  // policy clamps maxActive to 10 minimum, so seed 10 to overflow it
  const tenActive = () => Array.from({ length: 10 }, (_, i) => ({ id: `a${i + 1}`, createdAt: ts(i + 1) }));
  const policy10 = { settings: [{ key: 'leadPolicy', value: { maxActive: 10, maxArchived: 100 } }] };

  it('enforces the active stack after a new lead', async () => {
    const prisma = createFakePrisma(tenActive(), policy10);
    const process = createLeadPipeline({ prisma: prisma as any, env, rateLimit: () => true });
    await process({ body: validBody, ip: '2.2.2.2' });

    assert.equal(await prisma.lead.count({ where: { archivedAt: null } }), 10);
    assert.equal(await prisma.lead.count({ where: { archivedAt: { not: null } } }), 1);
    const a1 = await prisma.lead.findUnique({ where: { id: 'a1' } });
    assert.ok(a1!.archivedAt, 'oldest active lead was archived');
  });

  it('respects enforceStacks: false', async () => {
    const prisma = createFakePrisma(tenActive(), policy10);
    const process = createLeadPipeline({
      prisma: prisma as any,
      env,
      rateLimit: () => true,
      enforceStacks: false,
    });
    await process({ body: validBody, ip: '3.3.3.3' });
    assert.equal(await prisma.lead.count({ where: { archivedAt: null } }), 11);
  });

  it('respects emitEvents: false', async () => {
    const prisma = createFakePrisma();
    const reasons: string[] = [];
    const off = leadEvents.subscribe((e) => reasons.push(e.reason));
    const process = createLeadPipeline({
      prisma: prisma as any,
      env,
      rateLimit: () => true,
      emitEvents: false,
    });
    await process({ body: validBody, ip: '4.4.4.4' });
    off();
    assert.ok(!reasons.includes('lead.created'));
  });

  it('returns 500 when the database write fails', async () => {
    const prisma = {
      lead: {
        create: async () => {
          throw new Error('db down');
        },
      },
      activity: { create: async () => ({}) },
    };
    const process = createLeadPipeline({ prisma: prisma as any, env, rateLimit: () => true });
    const r = await process({ body: validBody, ip: '5.5.5.5' });
    assert.equal(r.status, 500);
  });

  it('passes when captcha verification succeeds', async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({ json: async () => ({ success: true }) })) as unknown as typeof fetch;
    try {
      const prisma = createFakePrisma();
      const process = createLeadPipeline({
        prisma: prisma as any,
        env: { TURNSTILE_SECRET: 's' },
        rateLimit: () => true,
      });
      const r = await process({ body: { ...validBody, captchaToken: 'tok' }, ip: '6.6.6.6' });
      assert.equal(r.status, 201);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
