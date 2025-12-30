/**
 * Operation Lock Service
 * Provides per-user locking mechanism to prevent concurrent stream operations
 * This prevents race conditions when multiple start/stop requests are made simultaneously
 */

type Operation = 'start' | 'stop';

interface LockInfo {
  operation: Operation;
  acquiredAt: number;
  promise: Promise<void>;
  resolve: () => void;
}

// Map of userId -> lock info
const userLocks = new Map<string, LockInfo>();

// Lock timeout (30 seconds) - if lock is held longer, consider it stale
const LOCK_TIMEOUT_MS = 30000;

/**
 * Acquires a lock for a stream operation for a specific user
 * If another operation is in progress, waits for it to complete
 * @param userId The user ID
 * @param operation The operation type (start or stop)
 * @returns A release function to call when the operation is complete
 */
export async function acquireStreamLock(
  userId: string,
  operation: Operation
): Promise<() => void> {
  const existingLock = userLocks.get(userId);

  // If there's an existing lock, wait for it or check if it's stale
  if (existingLock) {
    const lockAge = Date.now() - existingLock.acquiredAt;

    if (lockAge > LOCK_TIMEOUT_MS) {
      // Lock is stale, force release it
      console.warn(
        `[operation-lock] Force releasing stale lock for user ${userId} (held for ${lockAge}ms)`
      );
      existingLock.resolve();
      userLocks.delete(userId);
    } else {
      // Wait for the existing operation to complete
      console.log(
        `[operation-lock] Waiting for existing ${existingLock.operation} operation for user ${userId}`
      );
      await existingLock.promise;
    }
  }

  // Create new lock
  let resolveFunc: () => void = () => {};
  const lockPromise = new Promise<void>((resolve) => {
    resolveFunc = resolve;
  });

  const lockInfo: LockInfo = {
    operation,
    acquiredAt: Date.now(),
    promise: lockPromise,
    resolve: resolveFunc,
  };

  userLocks.set(userId, lockInfo);
  console.log(`[operation-lock] Acquired ${operation} lock for user ${userId}`);

  // Return release function
  return () => {
    const currentLock = userLocks.get(userId);
    // Only release if this is still our lock
    if (currentLock === lockInfo) {
      userLocks.delete(userId);
      resolveFunc();
      console.log(`[operation-lock] Released ${operation} lock for user ${userId}`);
    }
  };
}

/**
 * Checks if a user has an active lock
 * @param userId The user ID
 * @returns Lock info if locked, undefined otherwise
 */
export function hasActiveLock(userId: string): { operation: Operation; duration: number } | undefined {
  const lock = userLocks.get(userId);
  if (lock) {
    return {
      operation: lock.operation,
      duration: Date.now() - lock.acquiredAt,
    };
  }
  return undefined;
}

/**
 * Force releases all locks (for graceful shutdown)
 */
export function releaseAllLocks(): void {
  for (const [userId, lock] of userLocks) {
    console.log(`[operation-lock] Force releasing lock for user ${userId} during shutdown`);
    lock.resolve();
  }
  userLocks.clear();
}

/**
 * Wraps an async operation with automatic lock acquisition and release
 * @param userId The user ID
 * @param operation The operation type
 * @param fn The async function to execute
 * @returns The result of the function
 */
export async function withStreamLock<T>(
  userId: string,
  operation: Operation,
  fn: () => Promise<T>
): Promise<T> {
  const release = await acquireStreamLock(userId, operation);
  try {
    return await fn();
  } finally {
    release();
  }
}
