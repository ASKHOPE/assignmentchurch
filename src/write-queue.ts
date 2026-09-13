/**
 * Keyed Asynchronous Write Queue / Mutex
 * Ensures operations for the exact same key (e.g. Sunday date) run strictly in sequence,
 * preventing SQLite write lock contention and race conditions.
 */

export class KeyedWriteQueue {
  private queues: Map<string, Promise<any>> = new Map();

  /**
   * Enqueues an async task under the specified key.
   * Tasks with the same key execute sequentially; tasks with different keys run concurrently.
   */
  public async run<T>(key: string, task: () => Promise<T> | T): Promise<T> {
    const currentQueue = this.queues.get(key) || Promise.resolve();

    let taskResolve: (val: T) => void;
    let taskReject: (err: any) => void;

    const taskCompletionPromise = new Promise<T>((resolve, reject) => {
      taskResolve = resolve;
      taskReject = reject;
    });

    // Chain the task to execute after the previous task finishes (even if previous failed)
    const nextQueue = currentQueue
      .catch(() => {})
      .then(async () => {
        try {
          const result = await task();
          taskResolve(result);
        } catch (err) {
          taskReject(err);
        }
      });

    this.queues.set(key, nextQueue);

    // Clean up queue entry when the chain completes and no other task is waiting
    nextQueue.finally(() => {
      if (this.queues.get(key) === nextQueue) {
        this.queues.delete(key);
      }
    });

    return taskCompletionPromise;
  }

  /**
   * Gets the number of currently active / queued keys.
   */
  public get activeQueuesCount(): number {
    return this.queues.size;
  }
}

// Global default write queue singleton
export const defaultWriteQueue = new KeyedWriteQueue();
