export function getErrorMessage(
  error: unknown,
  fallback = 'Unexpected error',
): string {
  if (error instanceof Error && error.message.trim()) return error.message
  if (typeof error === 'string' && error.trim()) return error
  return fallback
}

export function getProviderErrorMessage(
  error: unknown,
  fallback = 'Provider request failed',
): string {
  if (typeof error === 'object' && error !== null && 'body' in error) {
    const body = (error as { body?: unknown }).body
    if (typeof body === 'string' && body.trim()) return body
  }
  return getErrorMessage(error, fallback)
}

export function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}
