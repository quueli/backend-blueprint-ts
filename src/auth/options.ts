import type { NextAuthOptions } from 'next-auth';
import CredentialsProviderImport from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import type { PrismaClientLike } from '../prisma.js';

// next-auth CJS/ESM interop in compiled packages
const CredentialsProvider: (options: object) => unknown =
  typeof CredentialsProviderImport === 'function'
    ? (CredentialsProviderImport as (options: object) => unknown)
    : ((CredentialsProviderImport as { default: (options: object) => unknown }).default);

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export type CreateAuthOptionsConfig = {
  prisma: PrismaClientLike;
  signInPath?: string;
  sessionMaxAgeSeconds?: number;
};

export function createAuthOptions(config: CreateAuthOptionsConfig): NextAuthOptions {
  const { prisma, signInPath = '/admin/login', sessionMaxAgeSeconds = 60 * 60 * 24 * 14 } = config;

  return {
    session: { strategy: 'jwt', maxAge: sessionMaxAgeSeconds },
    pages: { signIn: signInPath },
    providers: [
      CredentialsProvider({
        name: 'credentials',
        credentials: {
          email: { label: 'Email', type: 'email' },
          password: { label: 'Password', type: 'password' },
        },
        async authorize(creds: Record<'email' | 'password', string> | undefined) {
          if (!creds?.email || !creds?.password) return null;
          const user = await prisma.user.findUnique({ where: { email: creds.email } });
          if (!user) return null;
          const ok = await bcrypt.compare(creds.password, user.passwordHash);
          if (!ok) return null;
          await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
          return { id: user.id, email: user.email, name: user.name, role: user.role };
        },
      }) as NextAuthOptions['providers'][number],
    ],
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.role = (user as AuthUser).role;
          token.uid = user.id;
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          (session.user as { id?: string; role?: string }).id = token.uid as string;
          (session.user as { id?: string; role?: string }).role = token.role as string;
        }
        return session;
      },
    },
  };
}

export async function hashPassword(plain: string, rounds = 10): Promise<string> {
  return bcrypt.hash(plain, rounds);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
