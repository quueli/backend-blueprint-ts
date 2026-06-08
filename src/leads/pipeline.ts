import type { PrismaClientLike } from '../prisma.js';
import { leadSchema, type LeadInput } from '../validators/lead.js';
import { createRateLimiter } from '../security/rate-limit.js';
import { verifyCaptcha } from '../security/captcha.js';
import { isHoneypotTriggered } from '../security/honeypot.js';
import { sendMail, smtpConfigured, type LeadEmailTemplates, defaultLeadEmailTemplates } from '../integrations/email.js';
import { notifyTelegram } from '../integrations/telegram.js';
import { pushToCrm } from '../integrations/crm.js';
import { enforceAllLeadStacks } from './policy.js';

export type LeadPipelineConfig = {
  prisma: PrismaClientLike;
  rateLimit?: ReturnType<typeof createRateLimiter>;
  emailTemplates?: LeadEmailTemplates;
  env?: Record<string, string | undefined>;
  siteName?: string;
  onLeadCreated?: (lead: { id: string; refNo: number; name: string }) => void;
  enforceStacks?: boolean;
};

export type LeadPipelineRequest = {
  body: unknown;
  ip: string;
  userAgent?: string | null;
  source?: string | null;
};

export type LeadPipelineResult =
  | { ok: true; id: string; status: 201 }
  | { ok: true; honeypot: true; status: 200 }
  | { ok: false; error: string; status: number; fields?: Record<string, string[]> };

export function createLeadPipeline(config: LeadPipelineConfig) {
  const env = config.env ?? process.env;
  const rateLimit = config.rateLimit ?? createRateLimiter();
  const templates = config.emailTemplates ?? defaultLeadEmailTemplates();
  const siteName = config.siteName ?? env.SITE_NAME ?? 'Site';

  return async function processLead(req: LeadPipelineRequest): Promise<LeadPipelineResult> {
    if (!rateLimit(`lead:${req.ip}`, { max: 5, windowMs: 60_000 })) {
      return { ok: false, error: 'too_many_requests', status: 429 };
    }

    const body = req.body as Record<string, unknown>;
    const captchaToken = (body?.captchaToken ?? body?.token) as string | undefined;
    const captchaOk = await verifyCaptcha(captchaToken, req.ip, env);
    if (!captchaOk) {
      return { ok: false, error: 'captcha', status: 403 };
    }

    const parsed = leadSchema.safeParse(body);
    if (!parsed.success) {
      return {
        ok: false,
        error: 'validation',
        status: 422,
        fields: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    if (isHoneypotTriggered(parsed.data.website)) {
      return { ok: true, honeypot: true, status: 200 };
    }

    const data: LeadInput = parsed.data;
    const source = data.source || req.source || null;

    let lead;
    try {
      lead = await config.prisma.lead.create({
        data: {
          name: data.name.trim(),
          phone: data.phone || null,
          email: data.email || null,
          telegram: data.telegram || null,
          channel: data.channel,
          budget: data.budget || null,
          message: data.message.trim(),
          source,
          ip: req.ip,
          userAgent: req.userAgent ?? null,
        },
      });
      await config.prisma.activity.create({
        data: { kind: 'lead.create', payload: { leadId: lead.id, name: lead.name } },
      });
    } catch (e) {
      console.error('[leads] db error', e);
      return { ok: false, error: 'server', status: 500 };
    }

    const siteUrl = (env.SITE_URL ?? '').replace(/\/$/, '');
    const jobs: Promise<unknown>[] = [];

    if (smtpConfigured(env) && env.LEADS_NOTIFY_EMAIL) {
      jobs.push(
        sendMail(
          {
            to: env.LEADS_NOTIFY_EMAIL,
            subject: `[${siteName}] New lead: ${lead.name}`,
            html: templates.renderLeadEmail(lead, siteUrl),
            replyTo: lead.email ?? undefined,
          },
          env,
        ),
      );
    }

    jobs.push(notifyTelegram(`<b>New lead</b>\n${lead.name}\n${lead.message.slice(0, 200)}`, env));
    jobs.push(
      pushToCrm(
        {
          id: lead.id,
          refNo: lead.refNo,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          message: lead.message,
          source: lead.source,
        },
        env,
      ),
    );

    Promise.all(jobs).catch((e) => console.error('lead notify failed', e));

    if (config.enforceStacks !== false) {
      try {
        await enforceAllLeadStacks(config.prisma);
      } catch (e) {
        console.error('[leads] stack enforcement failed', e);
      }
    }

    config.onLeadCreated?.(lead);

    return { ok: true, id: lead.id, status: 201 };
  };
}
