import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

interface LimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

interface MemoryBucket {
  count: number;
  reset: number;
}

const memoryBuckets = new Map<string, MemoryBucket>();
const upstashConfigured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

const redis = upstashConfigured ? Redis.fromEnv() : null;
const limiters = redis ? {
  standard: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, "1 m"), prefix: "rl:standard" }),
  mutation: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, "1 m"), prefix: "rl:mutation" }),
  generation: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "1 m"), prefix: "rl:generation" }),
} : null;

export type RateLimitTier = "standard" | "mutation" | "generation";

const MEMORY_LIMITS: Record<RateLimitTier, number> = {
  standard: 60,
  mutation: 20,
  generation: 5,
};

export async function checkRateLimit(key: string, tier: RateLimitTier): Promise<LimitResult> {
  if (limiters) return limiters[tier].limit(key);

  const now = Date.now();
  const limit = MEMORY_LIMITS[tier];
  const current = memoryBuckets.get(`${tier}:${key}`);
  if (!current || current.reset <= now) {
    const reset = now + 60_000;
    memoryBuckets.set(`${tier}:${key}`, { count: 1, reset });
    return { success: true, limit, remaining: limit - 1, reset };
  }

  current.count += 1;
  return {
    success: current.count <= limit,
    limit,
    remaining: Math.max(0, limit - current.count),
    reset: current.reset,
  };
}
