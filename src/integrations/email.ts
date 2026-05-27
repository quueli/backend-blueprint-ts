import nodemailer from 'nodemailer';
import { smtpConfigured } from '../env.js';

let cached: nodemailer.Transporter | null = null;

export function getMailer(env: Record<string, string | undefined> = process.env) {
  if (cached) return cached;
  cached = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT ?? 465),
    secure: true,
    auth: { user: env.SMTP_USER!, pass: env.SMTP_PASS! },
  });
  return cached;
}

export async function sendMail(
  opts: { to: string; subject: string; html: string },
  env: Record<string, string | undefined> = process.env,
) {
  return getMailer(env).sendMail({
    from: env.SMTP_FROM ?? env.SMTP_USER!,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderLeadEmail(lead: { name: string; phone?: string | null; message: string }): string {
  return `
    <h2>New lead</h2>
    <p><b>${escapeHtml(lead.name)}</b> ${lead.phone ? escapeHtml(lead.phone) : ''}</p>
    <p style="white-space: pre-wrap">${escapeHtml(lead.message)}</p>
  `;
}

export { smtpConfigured };
