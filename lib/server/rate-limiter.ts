/**
 * In-memory sliding-window rate limiter for costly AI parsing endpoints.
 * Limits users to maxRequests per windowMs (default: 5 requests / 60 seconds).
 */

interface RateLimitRecord {
  timestamps: number[];
}

const windowMs = 60 * 1000; // 1 minute
const maxRequests = 5;

const rateLimitStore = new Map<string, RateLimitRecord>();

// Periodic cleanup of stale entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  const cleanupInterval = setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter((ts) => ts > cutoff);
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  // Unref interval if running in Node.js environment
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
  remaining?: number;
}

export function checkRateLimit(
  identifier: string,
  limit = maxRequests,
  window = windowMs
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - window;

  let record = rateLimitStore.get(identifier);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(identifier, record);
  }

  // Filter timestamps within the current sliding window
  record.timestamps = record.timestamps.filter((ts) => ts > cutoff);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0];
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + window - now) / 1000)
    );

    return {
      allowed: false,
      retryAfterSeconds,
      remaining: 0,
    };
  }

  record.timestamps.push(now);

  return {
    allowed: true,
    remaining: limit - record.timestamps.length,
  };
}

/**
 * Testing helper: reset the rate limit store
 */
export function resetRateLimits() {
  rateLimitStore.clear();
}
