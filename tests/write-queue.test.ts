import { describe, it, expect } from "bun:test";
import { KeyedWriteQueue } from "../src/write-queue";

describe("Keyed Write Queue (Mutex)", () => {
  it("serializes concurrent tasks for the exact same key", async () => {
    const queue = new KeyedWriteQueue();
    const order: number[] = [];

    const task1 = queue.run("date-2026-09-13", async () => {
      await new Promise((r) => setTimeout(r, 50));
      order.push(1);
      return "result1";
    });

    const task2 = queue.run("date-2026-09-13", async () => {
      await new Promise((r) => setTimeout(r, 10));
      order.push(2);
      return "result2";
    });

    const [r1, r2] = await Promise.all([task1, task2]);

    expect(r1).toBe("result1");
    expect(r2).toBe("result2");
    // Even though task2 has a shorter delay (10ms vs 50ms), it waited for task1 to complete
    expect(order).toEqual([1, 2]);
  });

  it("executes tasks for different keys concurrently without blocking", async () => {
    const queue = new KeyedWriteQueue();
    const order: string[] = [];

    const slowDateTask = queue.run("date-A", async () => {
      await new Promise((r) => setTimeout(r, 60));
      order.push("slow-A");
      return "A";
    });

    const fastDateTask = queue.run("date-B", async () => {
      await new Promise((r) => setTimeout(r, 10));
      order.push("fast-B");
      return "B";
    });

    await Promise.all([slowDateTask, fastDateTask]);

    // fast-B finishes first because it belongs to an independent key
    expect(order).toEqual(["fast-B", "slow-A"]);
  });

  it("continues processing subsequent tasks even if a prior task throws an error", async () => {
    const queue = new KeyedWriteQueue();

    const failingTask = queue.run("key-err", async () => {
      throw new Error("Simulated DB failure");
    });

    const succeedingTask = queue.run("key-err", async () => {
      return "success";
    });

    expect(failingTask).rejects.toThrow("Simulated DB failure");
    const result = await succeedingTask;
    expect(result).toBe("success");
  });
});
