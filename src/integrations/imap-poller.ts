import { ImapFlow } from 'imapflow';
import type { PrismaClientLike } from '../prisma.js';

export type ImapPollerConfig = {
  prisma: PrismaClientLike;
  systemUserEmail?: string;
  env?: Record<string, string | undefined>;
};

export async function pollInbox(config: ImapPollerConfig) {
  const env = config.env ?? process.env;
  const client = new ImapFlow({
    host: env.IMAP_HOST!,
    port: Number(env.IMAP_PORT ?? 993),
    secure: env.IMAP_SECURE !== 'false',
    auth: { user: env.IMAP_USER!, pass: env.IMAP_PASS! },
    logger: false,
  });

  await client.connect();
  const systemEmail = config.systemUserEmail ?? 'system@internal.local';
  const system = await config.prisma.user.findUnique({ where: { email: systemEmail } });
  const lock = await client.getMailboxLock('INBOX');
  let attached = 0;

  try {
    for await (const msg of client.fetch({ seen: false }, { envelope: true, source: true })) {
      const subject = msg.envelope?.subject ?? '';
      const m = subject.match(/#(\d+)/);
      if (!m) continue;
      const refNo = Number(m[1]);
      const lead = await config.prisma.lead.findFirst({ where: { refNo } });
      if (!lead) continue;

      const from = msg.envelope?.from?.[0]?.address ?? 'unknown';
      const authorId = system?.id ?? lead.ownerId;
      if (!authorId) continue;

      await config.prisma.comment.create({
        data: {
          leadId: lead.id,
          authorId,
          text: `Reply from customer (${from}):\n\n${msg.source?.toString().slice(0, 4000) ?? ''}`,
        },
      });
      await client.messageFlagsAdd(msg.uid, ['\\Seen']);
      attached++;
    }
  } finally {
    lock.release();
    await client.logout();
  }

  return { attached };
}
