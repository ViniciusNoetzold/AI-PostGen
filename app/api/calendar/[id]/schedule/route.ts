import { start } from "workflow/api";
import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/server/authorization";
import { schedulePostSchema } from "@/lib/schemas/api";
import { getDb, isDatabaseConfigured } from "@/lib/server/db";
import { safeFileId, validateJsonRequest } from "@/lib/server/security";
import { editorialWorkflow } from "@/workflows/editorial";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await authorizeRequest(request, "editor");
  if (denied) return denied;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const validated = await validateJsonRequest(request, schedulePostSchema);
  if (!validated.ok) return validated.response;
  const id = safeFileId((await params).id);
  const scheduledAt = new Date(validated.data.scheduledAt);
  if (scheduledAt.getTime() <= Date.now()) return NextResponse.json({ error: "Schedule must be in the future" }, { status: 422 });
  const existing = await getDb().post.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (existing.workflowRunId) return NextResponse.json({ postId: id, runId: existing.workflowRunId, duplicate: true });
  const run = await start(editorialWorkflow, [id, scheduledAt.toISOString()]);
  await getDb().post.update({ where: { id }, data: { scheduledAt, status: "PENDING_APPROVAL", workflowRunId: run.runId } });
  return NextResponse.json({ postId: id, runId: run.runId, duplicate: false }, { status: 202 });
}
