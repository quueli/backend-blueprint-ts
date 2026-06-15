export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'WORKING'
  | 'BRIEF'
  | 'CONTRACT'
  | 'WON'
  | 'LOST'
  | 'SPAM'
  | 'ARCHIVED';

export type AdminLeadDTO = {
  id: string;
  refNo: number;
  name: string;
  phone: string | null;
  email: string | null;
  status: LeadStatus;
  tags: string[];
  ownerId: string | null;
  readAt: string | null;
  archivedAt: string | null;
  createdAt: string;
};

export type ActivityDTO = {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  createdAt: string;
  userName?: string | null;
};

export type PageBlockDTO = {
  key: string;
  value: Record<string, unknown>;
  draftValue?: Record<string, unknown> | null;
  publishedAt?: string | null;
};
