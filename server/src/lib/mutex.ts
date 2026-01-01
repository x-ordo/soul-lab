/**
 * In-Memory Mutex for Concurrent Access Control
 *
 * Prevents race conditions when multiple requests modify the same data.
 * Uses a simple queue-based locking mechanism per key.
 */

type Release = () => void;

interface WaitingTask {
  resolve: (release: Release) => void;
}

const locks = new Map<string, {
  held: boolean;
  queue: WaitingTask[];
}>();

/**
 * Acquire a lock for a specific key.
 * Returns a release function that must be called when done.
 *
 * @example
 * const release = await mutex.acquire('user:abc123');
 * try {
 *   // Critical section
 *   balance.credits -= amount;
 *   await save();
 * } finally {
 *   release();
 * }
 */
export async function acquire(key: string): Promise<Release> {
  let lock = locks.get(key);

  if (!lock) {
    lock = { held: false, queue: [] };
    locks.set(key, lock);
  }

  if (!lock.held) {
    lock.held = true;
    return createRelease(key);
  }

  // Wait in queue
  return new Promise<Release>((resolve) => {
    lock!.queue.push({ resolve });
  });
}

function createRelease(key: string): Release {
  let released = false;

  return () => {
    if (released) return;
    released = true;

    const lock = locks.get(key);
    if (!lock) return;

    const next = lock.queue.shift();
    if (next) {
      next.resolve(createRelease(key));
    } else {
      lock.held = false;
      // Clean up empty locks to prevent memory leak
      if (lock.queue.length === 0) {
        locks.delete(key);
      }
    }
  };
}

/**
 * Execute a function with an exclusive lock on the given key.
 * The lock is automatically released when the function completes.
 *
 * @example
 * await mutex.withLock('user:abc123', async () => {
 *   balance.credits -= amount;
 *   await save();
 * });
 */
export async function withLock<T>(key: string, fn: () => T | Promise<T>): Promise<T> {
  const release = await acquire(key);
  try {
    return await fn();
  } finally {
    release();
  }
}

/**
 * Global lock for operations that affect all data (like full save).
 */
const GLOBAL_KEY = '__global__';

export async function acquireGlobal(): Promise<Release> {
  return acquire(GLOBAL_KEY);
}

export async function withGlobalLock<T>(fn: () => T | Promise<T>): Promise<T> {
  return withLock(GLOBAL_KEY, fn);
}

/**
 * Get current lock statistics (for debugging/monitoring).
 */
export function getStats(): { activeLocks: number; totalQueued: number } {
  let totalQueued = 0;
  locks.forEach((lock) => {
    totalQueued += lock.queue.length;
  });

  return {
    activeLocks: locks.size,
    totalQueued,
  };
}
