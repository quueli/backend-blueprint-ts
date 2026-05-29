import nodemailer from 'nodemailer';
import { smtpConfigured } from '../env.js';

let cached: nodemailer.Transporter | null = null;

export function getMailer(env: Record<string, string | undefined> = process.env) {
  if (cached) return cached;
  cached = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT ?? 465),
    secure: env.SMTP_SECURE !== 'false',
    auth: { user: env.SMTP_USER!, pass: env.SMTP_PASS! },
  });
  return cached;
}

export async function sendMail(
  opts: {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    replyTo?: string;
  },
  env: Record<string, string | undefined> = process.env,
) {
  return getMailer(env).sendMail({
    from: env.SMTP_FROM ?? env.SMTP_USER!,
    to: Array.isArray(opts.to) ? opts.to.join(', ') : opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    replyTo: opts.replyTo,
  });
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export type LeadEmailData = {
  id: string;
  refNo: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  telegram?: string | null;
  channel: string;
  budget?: string | null;
  message: string;
};

export type LeadEmailTemplates = {
  renderLeadEmail: (lead: LeadEmailData, siteUrl: string) => string;
  renderAutoReply?: (lead: { name: string }, locale?: string) => string;
};

export function defaultLeadEmailTemplates(): LeadEmailTemplates {
  return {
    renderLeadEmail(lead, siteUrl) {
      const esc = escapeHtml;
      return `
    <h2 style="font-family: sans-serif">New lead #${String(lead.refNo).padStart(4, '0')}</h2>
    <table style="font-family: sans-serif; border-collapse: collapse;">
      <tr><td style="padding:4px 12px 4px 0; color:#888;">Name</td><td>${esc(lead.name)}</td></tr>
      ${lead.phone ? `<tr><td style="padding:4px 12px 4px 0; color:#888;">Phone</td><td>${esc(lead.phone)}</td></tr>` : ''}
      ${lead.email ? `<tr><td style="padding:4px 12px 4px 0; color:#888;">Email</td><td>${esc(lead.email)}</td></tr>` : ''}
      ${lead.telegram ? `<tr><td style="padding:4px 12px 4px 0; color:#888;">Telegram</td><td>${esc(lead.telegram)}</td></tr>` : ''}
      <tr><td style="padding:4px 12px 4px 0; color:#888;">Channel</td><td>${esc(lead.channel)}</td></tr>
      ${lead.budget ? `<tr><td style="padding:4px 12px 4px 0; color:#888;">Budget</td><td>${esc(lead.budget)}</td></tr>` : ''}
    </table>
    <h3 style="font-family: sans-serif">Message</h3>
    <p style="font-family: sans-serif; white-space: pre-wrap;">${esc(lead.message)}</p>
    <p><a href="${siteUrl}/admin/leads/${lead.id}">Open in admin →</a></p>
  `;
    },
    renderAutoReply(lead) {
      return `
      <div style="font-family: sans-serif; line-height: 1.6;">
        <h2>Thanks, ${escapeHtml(lead.name)}</h2>
        <p>We've received your request and will get back to you soon.</p>
      </div>`;
    },
  };
}

export { smtpConfigured };
