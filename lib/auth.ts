export const APP_ROLES = ["viewer", "editor", "approver", "admin"] as const;

export type AppRole = (typeof APP_ROLES)[number];

const ROLE_LEVEL: Record<AppRole, number> = {
  viewer: 0,
  editor: 1,
  approver: 2,
  admin: 3,
};

export function normalizeRole(value: unknown): AppRole {
  if (typeof value !== "string") return "viewer";
  const normalized = value.toLowerCase().replace(/^org:/, "");
  return APP_ROLES.includes(normalized as AppRole) ? (normalized as AppRole) : "viewer";
}

export function hasRole(actual: AppRole, required: AppRole): boolean {
  return ROLE_LEVEL[actual] >= ROLE_LEVEL[required];
}

export function isClerkConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
  );
}
