import { auth } from "@clerk/nextjs/server";
import { hasRole, isClerkConfigured, normalizeRole, type AppRole } from "@/lib/auth";
import { ApiError } from "@/lib/server/security";
import { apiErrorResponse } from "@/lib/server/security";
import type { NextResponse } from "next/server";

export interface RequestIdentity {
  userId: string;
  role: AppRole;
}

export async function requireRole(request: Request, required: AppRole): Promise<RequestIdentity> {
  if (isClerkConfigured()) {
    const session = await auth();
    if (!session.userId) throw new ApiError(401, "Authentication required", "UNAUTHENTICATED");
    const metadata = session.sessionClaims?.metadata as { role?: unknown } | undefined;
    const role = session.orgRole === "org:admin" ? "admin" : normalizeRole(metadata?.role);
    if (!hasRole(role, required)) {
      throw new ApiError(403, "Insufficient permissions", "FORBIDDEN");
    }
    return { userId: session.userId, role };
  }

  const hostname = new URL(request.url).hostname;
  const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(hostname);
  if (process.env.NODE_ENV === "development" && isLoopback) {
    return { userId: "local-development-admin", role: "admin" };
  }

  throw new ApiError(503, "Authentication is not configured", "AUTH_NOT_CONFIGURED");
}

export async function authorizeRequest(
  request: Request,
  required: AppRole,
): Promise<NextResponse | null> {
  try {
    await requireRole(request, required);
    return null;
  } catch (error: unknown) {
    return apiErrorResponse(error, request.headers.get("x-request-id") || undefined);
  }
}
