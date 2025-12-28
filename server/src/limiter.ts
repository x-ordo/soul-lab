type Bucket = { windowStart: number; count: number };

export class FixedWindowLimiter {
  private buckets = new Map<string, Bucket>();

  allow(key: string, limit: number, windowMs: number, now = Date.now()): { ok: boolean; remaining: number; resetAt: number } {
    const b = this.buckets.get(key);
    if (!b || now - b.windowStart >= windowMs) {
      const nb: Bucket = { windowStart: now, count: 1 };
      this.buckets.set(key, nb);
      return { ok: true, remaining: Math.max(0, limit - 1), resetAt: nb.windowStart + windowMs };
    }

    if (b.count >= limit) {
      return { ok: false, remaining: 0, resetAt: b.windowStart + windowMs };
    }

    b.count += 1;
    this.buckets.set(key, b);
    return { ok: true, remaining: Math.max(0, limit - b.count), resetAt: b.windowStart + windowMs };
  }

  // keep memory in check
  sweep(windowMs: number, now = Date.now()) {
    for (const [k, b] of this.buckets.entries()) {
      if (now - b.windowStart >= windowMs * 2) this.buckets.delete(k);
    }
  }
}
