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
  | 'health';

export type ProjectManifestInput = {
  pageBlockKeys: readonly string[];
  blockFields: Record<string, string[]>;
  structure?: {
    structure?: string;
    sections?: Record<string, { enabled?: boolean }>;
  };
  siteFacts?: Record<string, unknown>;
  locales?: string[];
};

export type ProjectManifest = {
  modules: BackendModule[];
  adminRoutes: string[];
  settingKeys: string[];
  prismaPlugins: Array<'auth' | 'leads' | 'cms' | 'content' | 'audit'>;
  cmsBlockKeys: string[];
  notes: string[];
};

export function deriveProjectManifest(input: ProjectManifestInput): ProjectManifest {
  const modules: BackendModule[] = [
    'leads',
    'cms-blocks',
    'cms-structure',
    'cms-theme',
    'activity',
    'users',
    'health',
  ];

  const sections = input.structure?.sections ?? {};
  if (sections.reviews?.enabled !== false) modules.push('reviews');
  if (sections.portfolio?.enabled !== false) modules.push('portfolio');
  if (sections.gallery?.enabled !== false) modules.push('media-upload');

  return {
    modules,
    adminRoutes: ['/admin', '/admin/login', '/admin/leads', '/admin/pages', '/admin/settings'],
    settingKeys: ['siteFacts', 'structure', 'theme'],
    prismaPlugins: ['auth', 'leads', 'cms', 'audit'],
    cmsBlockKeys: [...input.pageBlockKeys],
    notes: [],
  };
}
