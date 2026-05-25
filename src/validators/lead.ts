import { z } from 'zod';

export const leadSchema = z
  .object({
    name: z.string().trim().min(2, 'Name is too short').max(120),
    phone: z.string().trim().max(40).optional().or(z.literal('')),
    telegram: z.string().trim().max(80).optional().or(z.literal('')),
    email: z.string().trim().email('Invalid email').max(160).optional().or(z.literal('')),
    channel: z.enum(['PHONE', 'TELEGRAM', 'EMAIL']).default('EMAIL'),
    budget: z.string().trim().max(80).optional().or(z.literal('')),
    message: z.string().trim().min(10, 'Message is too short').max(4000),
    agreement: z.literal(true, { errorMap: () => ({ message: 'Consent is required' }) }),
    website: z.string().max(0).optional(),
    source: z.string().max(120).optional(),
    captchaToken: z.string().optional(),
    token: z.string().optional(),
  })
  .refine((v) => !!(v.phone?.trim() || v.email?.trim() || v.telegram?.trim()), {
    message: 'Provide at least one contact method',
    path: ['phone'],
  });

export type LeadInput = z.infer<typeof leadSchema>;

export const reviewSchema = z.object({
  authorName: z.string().trim().min(2).max(80),
  role: z.string().trim().max(80).optional(),
  company: z.string().trim().max(120).optional(),
  locale: z.enum(['ru', 'en']),
  text: z.string().trim().min(20).max(2000),
  rating: z.number().int().min(1).max(5).default(5),
  siteUrl: z.string().trim().max(200).optional(),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

export const userCreateSchema = z.object({
  email: z.string().email().max(160),
  name: z.string().trim().min(2).max(80),
  password: z.string().min(8).max(128),
  role: z.enum(['OWNER', 'ADMIN', 'EDITOR', 'DESIGNER']).default('EDITOR'),
});

export const userUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  role: z.enum(['OWNER', 'ADMIN', 'EDITOR', 'DESIGNER']).optional(),
  password: z.string().min(8).max(128).optional(),
});

export const pageBlockPutSchema = z.object({
  value: z.record(z.unknown()),
  saveAsDraft: z.boolean().optional(),
});

export const settingPutSchema = z.object({
  value: z.unknown(),
});
