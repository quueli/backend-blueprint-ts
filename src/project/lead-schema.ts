import { z } from 'zod';
import { leadSchema as baseLeadSchema } from '../validators/lead.js';

export type LeadFieldExtension = {
  key: string;
  schema: z.ZodTypeAny;
};

export function extendLeadSchema(extensions: LeadFieldExtension[]) {
  if (extensions.length === 0) return baseLeadSchema;

  const shape: Record<string, z.ZodTypeAny> = {};
  for (const { key, schema } of extensions) {
    shape[key] = schema;
  }

  return baseLeadSchema.and(z.object(shape));
}

export const leadFieldPresets = {
  serviceType: z.string().trim().min(2).max(120).optional(),
  address: z.string().trim().max(200).optional(),
  preferredDate: z.string().trim().max(40).optional(),
  areaSqm: z.string().trim().max(20).optional(),
  productLine: z.string().trim().max(80).optional(),
} as const;

export function buildLeadSchemaFromKeys(fieldKeys: string[]) {
  const extensions: LeadFieldExtension[] = [];
  const presetMap: Record<string, z.ZodTypeAny> = {
    serviceType: leadFieldPresets.serviceType,
    service: leadFieldPresets.serviceType,
    address: leadFieldPresets.address,
    preferredDate: leadFieldPresets.preferredDate,
    areaSqm: leadFieldPresets.areaSqm,
    productLine: leadFieldPresets.productLine,
    product: leadFieldPresets.productLine,
    budget: z.string().trim().max(80).optional(),
  };

  for (const key of fieldKeys) {
    const normalized = key.replace(/^f/i, '').replace(/^field/i, '');
    const camel = normalized.charAt(0).toLowerCase() + normalized.slice(1);
    const preset = presetMap[camel] ?? presetMap[key];
    if (preset) {
      extensions.push({ key: camel, schema: preset });
    }
  }

  return extendLeadSchema(extensions);
}
