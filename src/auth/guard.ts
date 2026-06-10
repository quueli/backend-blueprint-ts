import { getServerSession } from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import type { Session } from 'next-auth';
import type { PrismaClientLike } from '../prisma.js';
import type { AdminRole } from './roles.js';
import { hasRole } from './roles.js';

export function sessionUserId(session: Session | null): string | undefined {
  return (session?.user as { id?: string } | undefined)?.id;
}

export function sessionRole(session: Session | null): string | undefined {
  return (session?.user as { role?: string } | undefined)?.role;
}

export async function guard(
  authOptions: NextAuthOptions,
  roles: AdminRole[] = ['OWNER', 'ADMIN', 'EDITOR'],
): Promise<Session | null> {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  if (!hasRole(sessionRole(session), roles)) return null;
  return session;
}

export async function logActivity(
  prisma: PrismaClientLike,
  session: Session | null,
  kind: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await prisma.activity.create({
    data: {
      userId: sessionUserId(session) ?? null,
      kind,
      payload: payload as object,
    },
  });
}
