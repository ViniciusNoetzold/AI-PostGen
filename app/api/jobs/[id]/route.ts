import { getRun } from "workflow/api";
import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/server/authorization";
import { getDb, isDatabaseConfigured } from "@/lib/server/db";
import { safeFileId } from "@/lib/server/security";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await authorizeRequest(request, "viewer");
  if (denied) return denied;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const id = safeFileId((await params).id);
  const job = await getDb().integrationJob.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  const workflowStatus = job.workflowRunId ? await getRun(job.workflowRunId).status.catch(() => null) : null;
  return NextResponse.json({ job, workflowStatus }, { headers: { "Cache-Control": "no-store" } });
}
