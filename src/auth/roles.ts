export type AdminRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'DESIGNER';

export const ROLE_HIERARCHY: AdminRole[] = ['OWNER', 'ADMIN', 'EDITOR', 'DESIGNER'];

export const FULL_ACCESS_ROLES: AdminRole[] = ['OWNER', 'ADMIN'];

export function isFullAccess(role?: string): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

export function hasRole(role: string | undefined, allowed: AdminRole[]): boolean {
  return !!role && allowed.includes(role as AdminRole);
}
