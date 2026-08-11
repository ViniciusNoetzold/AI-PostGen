import { promises as dns } from "node:dns";
import path from "node:path";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = "BAD_REQUEST",
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiErrorResponse(error: unknown, requestId?: string): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code, details: error.details, requestId },
      { status: error.status },
    );
  }

  return NextResponse.json(
    { error: "Internal server error", code: "INTERNAL_ERROR", requestId },
    { status: 500 },
  );
}

export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
  maxBytes = 1_000_000,
): Promise<T> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ApiError(415, "Content-Type must be application/json", "UNSUPPORTED_MEDIA_TYPE");
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new ApiError(413, "Request payload is too large", "PAYLOAD_TOO_LARGE");
  }

  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    throw new ApiError(413, "Request payload is too large", "PAYLOAD_TOO_LARGE");
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new ApiError(400, "Malformed JSON payload", "INVALID_JSON");
  }

  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new ApiError(422, "Payload validation failed", "VALIDATION_ERROR", parsed.error.flatten());
  }
  return parsed.data;
}

export async function validateJsonRequest<T>(
  request: Request,
  schema: ZodType<T>,
  maxBytes = 1_000_000,
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  try {
    return { ok: true, data: await parseJsonBody(request, schema, maxBytes) };
  } catch (error: unknown) {
    return {
      ok: false,
      response: apiErrorResponse(error, request.headers.get("x-request-id") || undefined),
    };
  }
}

export function safeResolvePath(baseDirectory: string, untrustedPath: string): string {
  if (!untrustedPath || untrustedPath.includes("\0")) {
    throw new ApiError(400, "Invalid path", "INVALID_PATH");
  }

  const base = path.resolve(baseDirectory);
  const target = path.resolve(base, untrustedPath);
  const relative = path.relative(base, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new ApiError(400, "Path escapes the allowed directory", "PATH_TRAVERSAL_BLOCKED");
  }
  return target;
}

export function safeFileId(value: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(value) || value.includes("..")) {
    throw new ApiError(400, "Invalid file identifier", "INVALID_FILE_ID");
  }
  return value;
}

function isPrivateIp(address: string): boolean {
  const normalized = address.replace(/^::ffff:/, "");
  if (isIP(normalized) === 4) {
    const [a, b] = normalized.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }

  const lower = normalized.toLowerCase();
  return lower === "::1" || lower === "::" || lower.startsWith("fc") ||
    lower.startsWith("fd") || lower.startsWith("fe8") || lower.startsWith("fe9") ||
    lower.startsWith("fea") || lower.startsWith("feb");
}

export async function assertSafeRemoteUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ApiError(400, "Invalid remote URL", "INVALID_URL");
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    throw new ApiError(400, "Only credential-free HTTPS URLs are allowed", "SSRF_BLOCKED");
  }
  if (url.port && url.port !== "443") {
    throw new ApiError(400, "Non-standard remote ports are not allowed", "SSRF_BLOCKED");
  }

  const addresses = await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new ApiError(400, "Private or unresolved network targets are not allowed", "SSRF_BLOCKED");
  }

  return url;
}
