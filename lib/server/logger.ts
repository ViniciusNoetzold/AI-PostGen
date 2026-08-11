import { createHash, randomUUID } from "node:crypto";

type LogLevel = "debug" | "info" | "warn" | "error";
type LogFields = Record<string, unknown>;

const REDACTED_KEY = /(authorization|cookie|password|secret|token|api[-_]?key)/i;

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      REDACTED_KEY.test(key) ? "[REDACTED]" : redact(entry),
    ]),
  );
}

function write(level: LogLevel, message: string, fields: LogFields = {}): void {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...redact(fields) as LogFields,
  });

  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else if (level === "debug") console.debug(entry);
  else console.info(entry);
}

export const logger = {
  debug: (message: string, fields?: LogFields) => write("debug", message, fields),
  info: (message: string, fields?: LogFields) => write("info", message, fields),
  warn: (message: string, fields?: LogFields) => write("warn", message, fields),
  error: (message: string, fields?: LogFields) => write("error", message, fields),
};

export function requestIdFrom(request: Request): string {
  return request.headers.get("x-request-id") || randomUUID();
}

export function hashIp(ip: string | null): string | undefined {
  if (!ip) return undefined;
  const salt = process.env.LOG_HASH_SALT || "development-only-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 24);
}
