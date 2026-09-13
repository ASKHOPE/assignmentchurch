import { describe, it, expect, beforeEach } from "bun:test";
import { RateLimiter } from "../src/rate-limiter";

describe("Sliding Window Rate Limiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(
      { maxRequests: 3, windowSeconds: 2 }, // 3 write requests per 2 sec
      { maxRequests: 5, windowSeconds: 2 }  // 5 read requests per 2 sec
    );
  });

  it("allows requests under the threshold", () => {
    const res1 = limiter.check("client-1", true);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = limiter.check("client-1", true);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = limiter.check("client-1", true);
    expect(res3.allowed).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it("blocks requests exceeding the threshold with reset estimate", () => {
    limiter.check("client-1", true);
    limiter.check("client-1", true);
    limiter.check("client-1", true);

    const blocked = limiter.check("client-1", true);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetInSec).toBeGreaterThanOrEqual(1);
    expect(blocked.resetInSec).toBeLessThanOrEqual(2);
  });

  it("tracks different clients independently", () => {
    limiter.check("client-1", true);
    limiter.check("client-1", true);
    limiter.check("client-1", true);

    // client-1 is blocked
    expect(limiter.check("client-1", true).allowed).toBe(false);

    // client-2 is unaffected
    const c2 = limiter.check("client-2", true);
    expect(c2.allowed).toBe(true);
    expect(c2.remaining).toBe(2);
  });

  it("differentiates read vs write limits", () => {
    limiter.check("client-1", true);
    limiter.check("client-1", true);
    limiter.check("client-1", true);

    // Writes are blocked
    expect(limiter.check("client-1", true).allowed).toBe(false);

    // Reads have separate bucket (limit is 5)
    const readRes = limiter.check("client-1", false);
    expect(readRes.allowed).toBe(true);
    expect(readRes.remaining).toBe(4);
  });

  it("cleans up expired entries after window expires", async () => {
    limiter.check("client-1", true);
    limiter.check("client-1", true);
    limiter.check("client-1", true);
    expect(limiter.check("client-1", true).allowed).toBe(false);

    // Wait for 2.1 seconds for window to slide
    await new Promise((r) => setTimeout(r, 2100));

    const refreshed = limiter.check("client-1", true);
    expect(refreshed.allowed).toBe(true);
  });
});
