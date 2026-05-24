import { z } from 'zod';

const optionalString = z.string().optional();

export const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(16).optional(),
  SMTP_HOST: optionalString,
  SMTP_PORT: optionalString,
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  SMTP_FROM: optionalString,
  SITE_URL: optionalString,
  SITE_NAME: optionalString,
  LEADS_NOTIFY_EMAIL: optionalString,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(env: Record<string, string | undefined> = process.env): ServerEnv {
  return serverEnvSchema.parse(env);
}

export function smtpConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}
