import { defineHook, FatalError, sleep } from "workflow";
import { approvalSchema } from "@/lib/schemas/api";
import { getDb } from "@/lib/server/db";
import { executeMeta } from "@/lib/server/integrations";

export const editorialApproval = defineHook({ schema: approvalSchema });

async function recordDecision(postId: string, approved: boolean, comment: string): Promise<void> {
  "use step";
  const db = getDb();
  await db.$transaction([
    db.approval.create({ data: { postId, approved, comment } }),
    db.post.update({ where: { id: postId }, data: { status: approved ? "APPROVED" : "REJECTED" } }),
  ]);
  console.info(JSON.stringify({ message: "editorial_decision", postId, approved }));
}
recordDecision.maxRetries = 3;

async function publishScheduledPost(postId: string): Promise<Record<string, unknown>> {
  "use step";
  const db = getDb();
  const post = await db.post.findUnique({ where: { id: postId }, include: { media: true } });
  if (!post) throw new FatalError("Scheduled post not found");
  const connection = await db.metaConnection.findFirst({ where: { active: true }, orderBy: { updatedAt: "desc" } });
  if (!connection) throw new FatalError("No active Meta connection is available");
  await db.post.update({ where: { id: postId }, data: { status: "PUBLISHING" } });
  const output = await executeMeta({
    connectionId: connection.id,
    imageUrls: post.media.filter((asset) => asset.kind === "IMAGE").map((asset) => asset.url),
    videoUrl: post.media.find((asset) => asset.kind === "VIDEO")?.url,
    caption: post.content,
  });
  await db.post.update({
    where: { id: postId },
    data: { status: "PUBLISHED", publishedAt: new Date(), externalPostId: String(output.postId || "") },
  });
  return output;
}
publishScheduledPost.maxRetries = 5;

export async function editorialWorkflow(postId: string, scheduledAt: string) {
  "use workflow";
  console.info(JSON.stringify({ message: "editorial_workflow_started", postId, scheduledAt }));
  using hook = editorialApproval.create({ token: `approval:${postId}` });
  const conflict = await hook.getConflict();
  if (conflict) return { dedupedTo: conflict.runId };
  const decision = await hook;
  await recordDecision(postId, decision.approved, decision.comment);
  if (!decision.approved) return { status: "rejected" };
  await sleep(new Date(scheduledAt));
  const output = await publishScheduledPost(postId);
  return { status: "published", output };
}
