const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, opts: { max: number; windowMs: number }): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return true;
  }
  if (bucket.count >= opts.max) return false;
  bucket.count++;
  return true;
}
