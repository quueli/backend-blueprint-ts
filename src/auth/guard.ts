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
  const role = sessionRole(session);
  if (!hasRole(role, roles)) return null;
  return session;
}

export type AdminHandlerContext = {
  session: Session;
  userId: string;
  role: string;
  req: Request;
  params?: Record<string, string>;
};

export type CreateAdminHandlerConfig<TBody = unknown> = {
  authOptions: NextAuthOptions;
  roles?: AdminRole[];
  schema?: { safeParse: (data: unknown) => { success: true; data: TBody } | { success: false } };
  handler: (ctx: AdminHandlerContext & { body?: TBody }) => Promise<Response>;
};

export function createAdminHandler<TBody = unknown>(config: CreateAdminHandlerConfig<TBody>) {
  const { authOptions, roles = ['OWNER', 'ADMIN', 'EDITOR'], schema, handler } = config;

  return async function adminRoute(req: Request, routeCtx?: { params?: Record<string, string> }): Promise<Response> {
    const session = await guard(authOptions, roles);
    if (!session) {
      const role = sessionRole(await getServerSession(authOptions));
      if (!role) return new Response('unauthorized', { status: 401 });
      return new Response('forbidden', { status: 403 });
    }

    const userId = sessionUserId(session);
    if (!userId) return new Response('unauthorized', { status: 401 });

    let body: TBody | undefined;
    if (schema && req.method !== 'GET' && req.method !== 'DELETE') {
      try {
        const json = await req.json();
        const parsed = schema.safeParse(json);
        if (!parsed.success) {
          return Response.json({ error: 'validation' }, { status: 422 });
        }
        body = parsed.data;
      } catch {
        return Response.json({ error: 'invalid_json' }, { status: 400 });
      }
    }

    return handler({
      session,
      userId,
      role: sessionRole(session) ?? 'EDITOR',
      req,
      params: routeCtx?.params,
      body,
    });
  };
}

export async function logActivity(
  prisma: PrismaClientLike,
  session: Session | null,
  kind: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.activity.create({
      data: {
        userId: sessionUserId(session) ?? null,
        kind,
        payload: payload as object,
      },
    });
  } catch {
    /* audit must not break main flow */
  }
}
