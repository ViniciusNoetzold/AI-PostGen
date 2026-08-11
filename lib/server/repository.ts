import { PostStatus, UserRole } from "@/app/generated/prisma/enums";
import { Prisma } from "@/app/generated/prisma/client";
import { createHash } from "node:crypto";
import { ApiError } from "@/lib/server/security";
import type { DashboardStats } from "@/lib/dashboard";
import type { AppRole } from "@/lib/auth";
import { getDb, isDatabaseConfigured } from "@/lib/server/db";

function slugify(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "sem-cliente";
}

function toDatabaseRole(role: AppRole): UserRole {
  return {
    viewer: UserRole.VIEWER,
    editor: UserRole.EDITOR,
    approver: UserRole.APPROVER,
    admin: UserRole.ADMIN,
  }[role];
}

export interface CreatePostRecordInput {
  actorExternalId: string;
  actorRole: AppRole;
  clientName?: string | null;
  theme: string;
  content: string;
  language: string;
  tone?: string;
  isCarousel: boolean;
  sourceFile?: string;
  requestId: string;
}

export async function createPostRecord(input: CreatePostRecordInput): Promise<string | null> {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();

  return db.$transaction(async (tx) => {
    const actor = await tx.appUser.upsert({
      where: { clerkId: input.actorExternalId },
      update: { role: toDatabaseRole(input.actorRole), active: true },
      create: { clerkId: input.actorExternalId, role: toDatabaseRole(input.actorRole) },
    });
    const client = input.clientName ? await tx.client.upsert({
      where: { slug: slugify(input.clientName) },
      update: { name: input.clientName, active: true },
      create: { slug: slugify(input.clientName), name: input.clientName },
    }) : null;
    const post = await tx.post.create({
      data: {
        clientId: client?.id,
        createdById: actor.id,
        theme: input.theme,
        content: input.content,
        language: input.language,
        tone: input.tone,
        isCarousel: input.isCarousel,
        sourceFile: input.sourceFile,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        requestId: input.requestId,
        action: "CREATE",
        entityType: "Post",
        entityId: post.id,
        metadata: { source: input.sourceFile ? "vault-compatible" : "database" },
      },
    });
    return post.id;
  });
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getDatabaseDashboardStats(): Promise<DashboardStats> {
  const db = getDb();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);

  const [posts, clients, imageAssets, studioVideos, archivedPosts, carouselPosts] = await Promise.all([
    db.post.findMany({
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.client.findMany({ select: { id: true, name: true, active: true } }),
    db.mediaAsset.count({ where: { kind: "IMAGE" } }),
    db.mediaAsset.count({ where: { kind: "VIDEO" } }),
    db.post.count({ where: { status: PostStatus.ARCHIVED } }),
    db.post.count({ where: { isCarousel: true } }),
  ]);

  const countsByDate = new Map<string, number>();
  const countsByClient = new Map<string, number>();
  for (const post of posts) {
    if (post.createdAt >= start) {
      const key = dateKey(post.createdAt);
      countsByDate.set(key, (countsByDate.get(key) || 0) + 1);
    }
    const client = post.client?.name || "Sem cliente";
    countsByClient.set(client, (countsByClient.get(client) || 0) + 1);
  }

  const postsByDay = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(start);
    date.setDate(date.getDate() + offset);
    const key = dateKey(date);
    return {
      date: key,
      label: new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit" }).format(date),
      posts: countsByDate.get(key) || 0,
    };
  });

  const today = dateKey(new Date());
  return {
    totals: {
      postsGenerated: posts.length,
      postsToday: posts.filter((post) => dateKey(post.createdAt) === today).length,
      imageAssets,
      carouselPosts,
      archivedPosts,
      studioVideos,
      clients: clients.length,
      activeClients: clients.filter((client) => client.active).length,
    },
    postsByDay,
    postsByClient: [...countsByClient].map(([name, count]) => ({ name, posts: count }))
      .sort((left, right) => right.posts - left.posts),
    recentActivity: posts.slice(0, 8).map((post) => ({
      id: post.id,
      client: post.client?.name || "Sem cliente",
      theme: post.theme,
      date: post.createdAt.toISOString(),
      kind: "post" as const,
    })),
    generatedAt: new Date().toISOString(),
  };
}

export interface CreateIntegrationJobInput {
  provider: "GEMINI" | "META" | "TELEGRAM";
  operation: string;
  payload: Record<string, unknown>;
  postId?: string;
  idempotencyKey: string;
}

export async function createIntegrationJob(input: CreateIntegrationJobInput) {
  const db = getDb();
  const requestHash = createHash("sha256").update(JSON.stringify({
    provider: input.provider,
    operation: input.operation,
    payload: input.payload,
    postId: input.postId,
  })).digest("hex");
  const existing = await db.integrationJob.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) {
    const existingHash = typeof existing.input === "object" && existing.input && "requestHash" in existing.input
      ? String((existing.input as { requestHash: unknown }).requestHash)
      : "";
    if (existingHash !== requestHash) throw new ApiError(409, "Idempotency key was already used for another request", "IDEMPOTENCY_CONFLICT");
    return { job: existing, duplicate: true };
  }

  const job = await db.integrationJob.create({
    data: {
      provider: input.provider,
      operation: input.operation,
      postId: input.postId,
      idempotencyKey: input.idempotencyKey,
      input: { requestHash, payload: input.payload } as Prisma.InputJsonValue,
    },
  });
  return { job, duplicate: false };
}

export async function attachWorkflowRun(jobId: string, workflowRunId: string): Promise<void> {
  await getDb().integrationJob.update({ where: { id: jobId }, data: { workflowRunId } });
}
