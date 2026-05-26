export interface RateLimitStore {
  check(key: string, opts: { max: number; windowMs: number }): boolean;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private buckets = new Map<string, { count: number; resetAt: number }>();

  check(key: string, opts: { max: number; windowMs: number }): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt < now) {
      this.buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
      return true;
    }
    if (bucket.count >= opts.max) return false;
    bucket.count++;
    return true;
  }
}

const defaultStore = new MemoryRateLimitStore();

export function createRateLimiter(store: RateLimitStore = defaultStore) {
  return function rateLimit(key: string, opts: { max: number; windowMs: number }): boolean {
    return store.check(key, opts);
  };
}
