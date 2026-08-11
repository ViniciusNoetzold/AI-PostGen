import { randomUUID } from "node:crypto";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { hasRole, isClerkConfigured, normalizeRole, type AppRole } from "@/lib/auth";
import { checkRateLimit, type RateLimitTier } from "@/lib/server/rate-limit";

const PUBLIC_PATHS = new Set([
  "/sign-in",
  "/api/health",
  "/api/meta/oauth/callback",
]);

function requiredRole(request: NextRequest): AppRole {
  const { pathname } = request.nextUrl;
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") {
    return "viewer";
  }
  if (pathname.startsWith("/api/config") || pathname.startsWith("/api/instagram/config") ||
      pathname.startsWith("/api/meta/oauth") || pathname.startsWith("/api/settings")) {
    return "admin";
  }
  if (pathname.includes("/approve") || pathname.includes("/reject") ||
      pathname.startsWith("/api/instagram/publish")) {
    return "approver";
  }
  return "editor";
}

function rateLimitTier(request: NextRequest): RateLimitTier {
  if (request.nextUrl.pathname.includes("generate") || request.nextUrl.pathname.includes("publish")) {
    return "generation";
  }
  return request.method === "GET" || request.method === "HEAD" ? "standard" : "mutation";
}

function withIdentityHeaders(request: NextRequest, userId: string, role: AppRole): Headers {
  const headers = new Headers(request.headers);
  headers.set("x-request-id", request.headers.get("x-request-id") || randomUUID());
  headers.set("x-app-user-id", userId);
  headers.set("x-app-role", role);
  return headers;
}

async function enforceRateLimit(request: NextRequest, identity: string): Promise<NextResponse | null> {
  if (!request.nextUrl.pathname.startsWith("/api/")) return null;
  const result = await checkRateLimit(`${identity}:${request.nextUrl.pathname}`, rateLimitTier(request));
  if (result.success) return null;

  return NextResponse.json(
    { error: "Too many requests", code: "RATE_LIMITED" },
    {
      status: 429,
      headers: {
        "RateLimit-Limit": String(result.limit),
        "RateLimit-Remaining": String(result.remaining),
        "RateLimit-Reset": String(Math.ceil(result.reset / 1000)),
        "Retry-After": String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))),
      },
    },
  );
}

function rejectOversizedPayload(request: NextRequest): NextResponse | null {
  if (!["POST", "PUT", "PATCH"].includes(request.method)) return null;
  const length = Number(request.headers.get("content-length") || 0);
  const limit = request.nextUrl.pathname === "/api/studio/describe"
    ? 4_000_000
    : request.nextUrl.pathname === "/api/media/upload"
      ? 2_500_000
      : 1_000_000;
  if (Number.isFinite(length) && length > limit) {
    return NextResponse.json(
      { error: "Request payload is too large", code: "PAYLOAD_TOO_LARGE" },
      { status: 413 },
    );
  }
  return null;
}

const authenticatedProxy = clerkMiddleware(async (auth, request) => {
  if (PUBLIC_PATHS.has(request.nextUrl.pathname)) return NextResponse.next();

  const session = await auth();
  if (!session.userId) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentication required", code: "UNAUTHENTICATED" }, { status: 401 });
    }
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect_url", request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  const metadata = session.sessionClaims?.metadata as { role?: unknown } | undefined;
  const role = session.orgRole === "org:admin" ? "admin" : normalizeRole(metadata?.role);
  const required = requiredRole(request);
  if (!hasRole(role, required)) {
    return NextResponse.json({ error: "Insufficient permissions", code: "FORBIDDEN" }, { status: 403 });
  }

  const limited = await enforceRateLimit(request, session.userId);
  if (limited) return limited;

  return NextResponse.next({ request: { headers: withIdentityHeaders(request, session.userId, role) } });
});

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const oversized = rejectOversizedPayload(request);
  if (oversized) return oversized;
  if (PUBLIC_PATHS.has(request.nextUrl.pathname)) return NextResponse.next();

  if (isClerkConfigured()) return authenticatedProxy(request, event);

  const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(request.nextUrl.hostname);
  if (process.env.NODE_ENV === "development" && isLoopback) {
    const limited = await enforceRateLimit(request, "local-development-admin");
    if (limited) return limited;
    return NextResponse.next({
      request: { headers: withIdentityHeaders(request, "local-development-admin", "admin") },
    });
  }

  const message = "Authentication is not configured";
  return request.nextUrl.pathname.startsWith("/api/")
    ? NextResponse.json({ error: message, code: "AUTH_NOT_CONFIGURED" }, { status: 503 })
    : new NextResponse(message, { status: 503 });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.well-known/workflow/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
    "/(api)(.*)",
  ],
};
