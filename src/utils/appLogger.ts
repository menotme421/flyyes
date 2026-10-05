// WHY: Centralized logger so errors carry timestamp + context for debugging.
// NEVER log document content or personal info — only ids and counts (per project rules).

type LogContext = Record<string, string | number | boolean | undefined>;

export function logInfo(message: string, context: LogContext = {}): void {
  console.info(`[${new Date().toISOString()}] INFO ${message}`, context);
}

export function logError(message: string, context: LogContext = {}): void {
  // Intentionally no stack traces to end user in production — console only for developer.
  console.error(`[${new Date().toISOString()}] ERROR ${message}`, context);
}
