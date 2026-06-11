/**
 * Retries an async function with exponential backoff.
 * Used for all Sui RPC calls to handle transient failures gracefully.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 4,
  baseDelayMs = 800,
): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}
