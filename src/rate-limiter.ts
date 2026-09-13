/**
 * Sliding Window In-Memory Rate Limiter
 * Provides token bucket / sliding window rate limiting partitioned by client key
 * (IP address or ward_editor_id cookie).
 */

export interface RateLimitConfig {
  maxRequests: number; // Maximum allowed requests in window
  windowSeconds: number; // Time window duration in seconds
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSec: number;
  totalLimit: number;
}

interface RequestRecord {
  timestamps: number[];
}

export class RateLimiter {
  private store: Map<string, RequestRecord> = new Map();
  private cleanupInterval: any;

  constructor(
    private writeConfig: RateLimitConfig = { maxRequests: 60, windowSeconds: 60 },
    private readConfig: RateLimitConfig = { maxRequests: 300, windowSeconds: 60 }
  ) {
    // Periodically clean up stale client entries every 2 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 120_000);
    // Don't keep Node/Bun process alive solely for cleanup timer
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Checks whether a request under the given key and action type is allowed.
   */
  public check(key: string, isWrite: boolean = false): RateLimitResult {
    const config = isWrite ? this.writeConfig : this.readConfig;
    const now = Date.now();
    const windowStart = now - config.windowSeconds * 1000;
    const storeKey = `${isWrite ? "write" : "read"}:${key}`;

    let record = this.store.get(storeKey);
    if (!record) {
      record = { timestamps: [] };
      this.store.set(storeKey, record);
    }

    // Filter timestamps within the sliding window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= config.maxRequests) {
      // Calculate when the oldest request falls outside the window
      const oldest = record.timestamps[0];
      const resetInSec = Math.max(1, Math.ceil((oldest + config.windowSeconds * 1000 - now) / 1000));
      return {
        allowed: false,
        remaining: 0,
        resetInSec,
        totalLimit: config.maxRequests,
      };
    }

    record.timestamps.push(now);
    const remaining = Math.max(0, config.maxRequests - record.timestamps.length);

    return {
      allowed: true,
      remaining,
      resetInSec: config.windowSeconds,
      totalLimit: config.maxRequests,
    };
  }

  /**
   * Resets rate limit records for a given key (useful in tests).
   */
  public reset(key?: string) {
    if (key) {
      this.store.delete(`write:${key}`);
      this.store.delete(`read:${key}`);
    } else {
      this.store.clear();
    }
  }

  /**
   * Cleans up stale records from memory.
   */
  public cleanup() {
    const now = Date.now();
    const maxWindow = Math.max(this.writeConfig.windowSeconds, this.readConfig.windowSeconds) * 1000;
    const cutoff = now - maxWindow;

    for (const [key, record] of this.store.entries()) {
      record.timestamps = record.timestamps.filter((ts) => ts > cutoff);
      if (record.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }

  public destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Global default rate limiter singleton
export const defaultRateLimiter = new RateLimiter();
