import { z } from 'zod';

const optionalString = z.string().optional();

export const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(16).optional(),
  SMTP_HOST: optionalString,
  SMTP_PORT: optionalString,
  SMTP_SECURE: optionalString,
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  SMTP_FROM: optionalString,
  IMAP_HOST: optionalString,
  IMAP_PORT: optionalString,
  IMAP_SECURE: optionalString,
  IMAP_USER: optionalString,
  IMAP_PASS: optionalString,
  TELEGRAM_BOT_TOKEN: optionalString,
  TELEGRAM_CHAT_ID: optionalString,
  CRON_SECRET: optionalString,
  SITE_URL: optionalString,
  SITE_NAME: optionalString,
  LEADS_NOTIFY_EMAIL: optionalString,
  AUTO_REPLY_ENABLED: optionalString,
  TURNSTILE_SECRET: optionalString,
  RECAPTCHA_SECRET: optionalString,
  RECAPTCHA_MIN_SCORE: optionalString,
  CRM_WEBHOOK_URL: optionalString,
  S3_BUCKET: optionalString,
  S3_REGION: optionalString,
  S3_ENDPOINT: optionalString,
  S3_ACCESS_KEY_ID: optionalString,
  S3_SECRET_ACCESS_KEY: optionalString,
  S3_PUBLIC_URL: optionalString,
  S3_FORCE_PATH_STYLE: optionalString,
  REDIS_URL: optionalString,
  CSP_ENFORCE: optionalString,
  SENTRY_DSN: optionalString,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(env: Record<string, string | undefined> = process.env): ServerEnv {
  return serverEnvSchema.parse(env);
}

export function smtpConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

export function s3Configured(env: Record<string, string | undefined> = process.env): boolean {
  return !!(env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY);
}

export function captchaEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return !!(env.TURNSTILE_SECRET || env.RECAPTCHA_SECRET);
}
