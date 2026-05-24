import type { PrismaClient } from '@prisma/client';

export type PrismaClientLike = Pick<
  PrismaClient,
  | 'user'
  | 'lead'
  | 'comment'
  | 'activity'
  | 'pageBlock'
  | 'setting'
  | 'project'
  | 'review'
  | '$connect'
  | '$disconnect'
>;

export function createPrismaSingleton(Client: new (args?: object) => PrismaClient): PrismaClient {
  const globalForPrisma = globalThis as typeof globalThis & { __studioPrisma?: PrismaClient };
  const client =
    globalForPrisma.__studioPrisma ??
    new Client({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  if (process.env.NODE_ENV !== 'production') globalForPrisma.__studioPrisma = client;
  return client;
}
