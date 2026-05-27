import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { notifyTelegram } from '../src/integrations/telegram.js';
import { pushToCrm } from '../src/integrations/crm.js';
import { defaultLeadEmailTemplates, escapeHtml, getMailer } from '../src/integrations/email.js';
import { saveUpload } from '../src/integrations/storage.js';

describe('notifyTelegram', () => {
  const realFetch = globalThis.fetch;
  let calls: string[] = [];
  beforeEach(() => {
    calls = [];
    globalThis.fetch = (async (url: any) => {
      calls.push(String(url));
      return { ok: true, json: async () => ({}) };
    }) as unknown as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('no-ops without bot token / chat id', async () => {
    await notifyTelegram('hi', {});
    assert.equal(calls.length, 0);
  });
  it('calls the Telegram API when configured', async () => {
    await notifyTelegram('hi', { TELEGRAM_BOT_TOKEN: 'T', TELEGRAM_CHAT_ID: '42' });
    assert.equal(calls.length, 1);
    assert.ok(calls[0].includes('/botT/sendMessage'));
  });
});

describe('pushToCrm', () => {
  const realFetch = globalThis.fetch;
  let calls: string[] = [];
  beforeEach(() => {
    calls = [];
    globalThis.fetch = (async (url: any) => {
      calls.push(String(url));
      return { ok: true };
    }) as unknown as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('no-ops without CRM_WEBHOOK_URL', async () => {
    await pushToCrm({ id: '1' }, {});
    assert.equal(calls.length, 0);
  });
  it('posts to the configured webhook', async () => {
    await pushToCrm({ id: '1' }, { CRM_WEBHOOK_URL: 'https://crm.example/hook' });
    assert.deepEqual(calls, ['https://crm.example/hook']);
  });
});

describe('email templates', () => {
  it('escapeHtml neutralises markup', () => {
    assert.equal(escapeHtml('<b>&'), '&lt;b&gt;&amp;');
  });
  it('renderLeadEmail escapes content and links to admin', () => {
    const html = defaultLeadEmailTemplates().renderLeadEmail(
      { id: 'lead_1', refNo: 42, name: '<Ivan>', channel: 'PHONE', message: 'hello' },
      'https://example.com',
    );
    assert.ok(html.includes('#0042'));
    assert.ok(html.includes('&lt;Ivan&gt;'));
    assert.ok(html.includes('https://example.com/admin/leads/lead_1'));
  });
  it('renderAutoReply renders a plain thank-you note', () => {
    const t = defaultLeadEmailTemplates();
    assert.ok(t.renderAutoReply!({ name: 'Ivan' }).includes('Thanks'));
  });
});

describe('saveUpload (local fallback)', () => {
  it('writes to public/uploads and returns the path', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'studio-upload-'));
    try {
      const file = new File([new Uint8Array([1, 2, 3])], 'Photo.PNG', { type: 'image/png' });
      const url = await saveUpload(file, {}, dir);
      assert.match(url, /^\/uploads\/[a-f0-9-]+\.png$/);
      const written = readdirSync(join(dir, 'public', 'uploads'));
      assert.equal(written.length, 1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('email transport', () => {
  it('getMailer builds a transporter from SMTP env', () => {
    const mailer = getMailer({ SMTP_HOST: 'smtp.example', SMTP_USER: 'u', SMTP_PASS: 'p' });
    assert.equal(typeof mailer.sendMail, 'function');
  });
});

describe('integration error handling', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('notifyTelegram swallows network errors', async () => {
    globalThis.fetch = (async () => {
      throw new Error('boom');
    }) as typeof fetch;
    await assert.doesNotReject(
      notifyTelegram('hi', { TELEGRAM_BOT_TOKEN: 'T', TELEGRAM_CHAT_ID: '1' }),
    );
  });

  it('pushToCrm swallows network errors', async () => {
    globalThis.fetch = (async () => {
      throw new Error('boom');
    }) as typeof fetch;
    await assert.doesNotReject(pushToCrm({ id: '1' }, { CRM_WEBHOOK_URL: 'https://x/y' }));
  });
});
