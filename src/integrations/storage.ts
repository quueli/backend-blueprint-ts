import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { s3Configured } from '../env.js';

export async function saveUpload(
  file: File,
  env: Record<string, string | undefined> = process.env,
  cwd = process.cwd(),
): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const key = `${randomUUID()}.${ext}`;

  if (s3Configured(env)) {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = new S3Client({
      region: env.S3_REGION ?? 'us-east-1',
      endpoint: env.S3_ENDPOINT || undefined,
      forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true',
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID!,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
      },
    });
    await client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET!,
        Key: key,
        Body: buf,
        ContentType: file.type || 'application/octet-stream',
        ACL: 'public-read',
      }),
    );
    const base = (env.S3_PUBLIC_URL || `${env.S3_ENDPOINT}/${env.S3_BUCKET}`).replace(/\/$/, '');
    return `${base}/${key}`;
  }

  const dir = join(cwd, 'public', 'uploads');
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, key), buf);
  return `/uploads/${key}`;
}

export { s3Configured };
