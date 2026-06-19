export type BackendModule =
  | 'leads'
  | 'cms-blocks'
  | 'cms-structure'
  | 'cms-theme'
  | 'reviews'
  | 'portfolio'
  | 'media-upload'
  | 'activity'
  | 'users'
  | 'health'
  | 'imap-replies';

export type ProjectManifestInput = {
  pageBlockKeys: readonly string[];
  blockFields: Record<string, string[]>;
  structure?: {
    structure?: string;
    sections?: Record<string, { enabled?: boolean }>;
  };
  siteFacts?: Record<string, unknown>;
  locales?: string[];
  features?: Partial<Record<BackendModule, boolean>>;
};

export type ProjectManifest = {
  modules: BackendModule[];
  adminRoutes: string[];
  settingKeys: string[];
  prismaPlugins: Array<'auth' | 'leads' | 'cms' | 'content' | 'audit'>;
  leadFormFieldKeys: string[];
  cmsBlockKeys: string[];
  optionalIntegrations: string[];
  notes: string[];
};

const SECTION_MODULE_MAP: Record<string, BackendModule[]> = {
  gallery: ['media-upload'],
  reviews: ['reviews'],
  portfolio: ['portfolio'],
  trust: [],
  faq: [],
  contacts: ['leads'],
  leadForm: ['leads'],
  services: [],
  hero: [],
};

const BLOCK_KEY_HINTS: Record<string, BackendModule[]> = {
  review: ['reviews'],
  portfolio: ['portfolio'],
  project: ['portfolio'],
  gallery: ['media-upload'],
  contact: ['leads'],
  form: ['leads'],
};

function sectionEnabled(
  sections: Record<string, { enabled?: boolean }> | undefined,
  name: string,
): boolean {
  if (!sections) return true;
  const s = sections[name];
  if (!s) return false;
  return s.enabled !== false;
}

function detectModulesFromBlocks(keys: readonly string[]): BackendModule[] {
  const found = new Set<BackendModule>();
  for (const key of keys) {
    const lower = key.toLowerCase();
    for (const [hint, mods] of Object.entries(BLOCK_KEY_HINTS)) {
      if (lower.includes(hint)) mods.forEach((m) => found.add(m));
    }
  }
  return [...found];
}

function detectLeadFields(blockFields: Record<string, string[]>): string[] {
  const candidates = new Set<string>();
  for (const [key, fields] of Object.entries(blockFields)) {
    if (!/contact|form|lead/i.test(key)) continue;
    for (const f of fields) {
      if (/^(f|field)/i.test(f) || /phone|email|telegram|message|budget|name|agreement/i.test(f)) {
        candidates.add(f);
      }
    }
  }
  return [...candidates];
}

export function deriveProjectManifest(input: ProjectManifestInput): ProjectManifest {
  const notes: string[] = [];
  const modules = new Set<BackendModule>([
    'leads',
    'cms-blocks',
    'cms-structure',
    'cms-theme',
    'activity',
    'users',
    'health',
  ]);

  const sections = input.structure?.sections ?? {};
  for (const [sectionName, mods] of Object.entries(SECTION_MODULE_MAP)) {
    if (sectionEnabled(sections, sectionName)) {
      mods.forEach((m) => modules.add(m));
    }
  }

  detectModulesFromBlocks(input.pageBlockKeys).forEach((m) => modules.add(m));

  if (input.features) {
    for (const [mod, enabled] of Object.entries(input.features)) {
      const m = mod as BackendModule;
      if (enabled) modules.add(m);
      else modules.delete(m);
    }
  }

  if (input.siteFacts?.rating && input.siteFacts?.ratingCount) {
    notes.push('siteFacts has a rating, the front end may show a trust badge; only enable the reviews table when the reviews section is on.');
  }

  const hasReviews = modules.has('reviews');
  const hasPortfolio = modules.has('portfolio');
  const hasMedia = modules.has('media-upload');

  const prismaPlugins: ProjectManifest['prismaPlugins'] = ['auth', 'leads', 'cms', 'audit'];
  if (hasReviews || hasPortfolio) prismaPlugins.push('content');

  const adminRoutes = [
    '/admin',
    '/admin/login',
    '/admin/leads',
    '/admin/pages',
    '/admin/settings',
    '/admin/activity',
    '/admin/users',
  ];
  if (hasReviews) adminRoutes.push('/admin/reviews');
  if (hasPortfolio) adminRoutes.push('/admin/portfolio');

  const settingKeys = ['siteFacts', 'structure', 'theme'];
  if (modules.has('leads')) settingKeys.push('contacts');

  const optionalIntegrations: string[] = ['SMTP', 'Telegram', 'CRM_WEBHOOK', 'S3', 'Captcha'];
  if (modules.has('imap-replies')) optionalIntegrations.push('IMAP');

  const leadFormFieldKeys = detectLeadFields(input.blockFields);
  if (leadFormFieldKeys.length === 0) {
    notes.push('No form fields found in BLOCK_FIELDS, fall back to the base leadSchema.');
  }

  return {
    modules: [...modules],
    adminRoutes,
    settingKeys,
    prismaPlugins,
    leadFormFieldKeys,
    cmsBlockKeys: [...input.pageBlockKeys],
    optionalIntegrations,
    notes,
  };
}

export function manifestIncludes(manifest: ProjectManifest, mod: BackendModule): boolean {
  return manifest.modules.includes(mod);
}
