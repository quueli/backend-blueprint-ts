import type { PrismaClientLike } from '../prisma.js';
import { leadSchema, type LeadInput } from '../validators/lead.js';
import { sendMail, smtpConfigured, renderLeadEmail } from '../integrations/email.js';

export type LeadPipelineConfig = {
  prisma: PrismaClientLike;
  env?: Record<string, string | undefined>;
  siteName?: string;
};

export type LeadPipelineRequest = {
  body: unknown;
  ip: string;
  userAgent?: string | null;
  source?: string | null;
};

export type LeadPipelineResult =
  | { ok: true; id: string; status: 201 }
  | { ok: false; error: string; status: number; fields?: Record<string, string[]> };

export function createLeadPipeline(config: LeadPipelineConfig) {
  const env = config.env ?? process.env;
  const siteName = config.siteName ?? env.SITE_NAME ?? 'Site';

  return async function processLead(req: LeadPipelineRequest): Promise<LeadPipelineResult> {
    const parsed = leadSchema.safeParse(req.body);
    if (!parsed.success) {
      return {
        ok: false,
        error: 'validation',
        status: 422,
        fields: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const data: LeadInput = parsed.data;

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
          source: data.source || req.source || null,
          ip: req.ip,
          userAgent: req.userAgent ?? null,
        },
      });
    } catch (e) {
      console.error('[leads] db error', e);
      return { ok: false, error: 'server', status: 500 };
    }

    if (smtpConfigured(env) && env.LEADS_NOTIFY_EMAIL) {
      await sendMail(
        {
          to: env.LEADS_NOTIFY_EMAIL,
          subject: `[${siteName}] New lead: ${lead.name}`,
          html: renderLeadEmail(lead),
        },
        env,
      );
    }

    return { ok: true, id: lead.id, status: 201 };
  };
}
