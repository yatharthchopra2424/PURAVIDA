import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting for public endpoints.
 *
 * Uses Upstash Redis when configured, and degrades to an in-process
 * counter otherwise so the protection is never simply absent.
 *
 * The in-memory path is a genuine fallback, not an equivalent: each
 * serverless instance keeps its own map, so the effective limit is
 * (limit × instances). It stops casual abuse and accidental double
 * submits; it will not stop a determined spammer. Set
 * UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (free tier is
 * ample) to get a correct distributed limit.
 */

const hasUpstash = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const upstashLimiter = hasUpstash
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      // 5 submissions per IP per hour — generous for a real buyer
      // requesting quotes, restrictive for a script.
      limiter: Ratelimit.slidingWindow(5, "1 h"),
      analytics: true,
      prefix: "puravida/contact",
    })
  : null;

// ── In-memory fallback ──────────────────────────────────────
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 5;

function pruneExpired(now: number) {
  // Bounded cleanup so a long-lived instance cannot grow unbounded.
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function inMemoryLimit(identifier: string) {
  const now = Date.now();
  pruneExpired(now);

  const existing = buckets.get(identifier);

  if (!existing || existing.resetAt <= now) {
    buckets.set(identifier, { count: 1, resetAt: now + WINDOW_MS });
    return { success: true, remaining: MAX_REQUESTS - 1, reset: now + WINDOW_MS };
  }

  existing.count += 1;

  return {
    success: existing.count <= MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - existing.count),
    reset: existing.resetAt,
  };
}

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  reset: number;
  backend: "upstash" | "memory";
};

export async function checkRateLimit(
  identifier: string
): Promise<RateLimitResult> {
  if (upstashLimiter) {
    try {
      const result = await upstashLimiter.limit(identifier);
      return {
        success: result.success,
        remaining: result.remaining,
        reset: result.reset,
        backend: "upstash",
      };
    } catch (error) {
      // Never let a Redis outage take down the contact form — fall
      // through to the in-memory limiter rather than rejecting.
      console.error("[rate-limit] Upstash failed, using in-memory", error);
    }
  }

  return { ...inMemoryLimit(identifier), backend: "memory" };
}

/**
 * Best-effort client IP.
 *
 * On Vercel, x-forwarded-for is set by the platform edge and its first
 * entry is the real client. Do not trust this for anything security
 * critical — it is spoofable off-platform — but it is the right key
 * for abuse throttling.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}
