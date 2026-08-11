import { start } from "workflow/api";
import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/server/authorization";
import { integrationJobSchema } from "@/lib/schemas/api";
import { apiErrorResponse, ApiError, validateJsonRequest } from "@/lib/server/security";
import { isDatabaseConfigured } from "@/lib/server/db";
import { attachWorkflowRun, createIntegrationJob } from "@/lib/server/repository";
import { integrationJobWorkflow } from "@/workflows/integration-job";

export async function POST(request: Request) {
  const denied = await authorizeRequest(request, "editor");
  if (denied) return denied;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is required for durable jobs", code: "DATABASE_REQUIRED" }, { status: 503 });
  }

  try {
    const idempotencyKey = request.headers.get("idempotency-key")?.trim();
    if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 200) {
      throw new ApiError(400, "A valid Idempotency-Key header is required", "IDEMPOTENCY_KEY_REQUIRED");
    }
    const validated = await validateJsonRequest(request, integrationJobSchema);
    if (!validated.ok) return validated.response;
    const result = await createIntegrationJob({ ...validated.data, idempotencyKey });
    if (result.duplicate && result.job.workflowRunId) {
      return NextResponse.json({ jobId: result.job.id, runId: result.job.workflowRunId, duplicate: true }, { status: 200 });
    }
    const run = await start(integrationJobWorkflow, [result.job.id]);
    await attachWorkflowRun(result.job.id, run.runId);
    return NextResponse.json({ jobId: result.job.id, runId: run.runId, duplicate: false }, { status: 202 });
  } catch (error: unknown) {
    return apiErrorResponse(error, request.headers.get("x-request-id") || undefined);
  }
}
