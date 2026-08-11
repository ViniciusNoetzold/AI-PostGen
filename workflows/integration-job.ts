import { Prisma } from "@/app/generated/prisma/client";
import { executeGemini, executeMeta, executeTelegram } from "@/lib/server/integrations";
import { getDb } from "@/lib/server/db";

async function executeIntegrationJob(jobId: string): Promise<Record<string, unknown>> {
  "use step";
  const db = getDb();
  const job = await db.integrationJob.update({
    where: { id: jobId },
    data: { status: "RUNNING", attempts: { increment: 1 }, startedAt: new Date(), lastError: null },
  });
  const envelope = job.input as { payload?: unknown };
  let output: Record<string, unknown>;
  if (job.provider === "GEMINI") output = await executeGemini(envelope.payload);
  else if (job.provider === "META") output = await executeMeta(envelope.payload);
  else output = await executeTelegram(envelope.payload);

  await db.integrationJob.update({
    where: { id: jobId },
    data: { status: "SUCCEEDED", output: output as Prisma.InputJsonValue, completedAt: new Date() },
  });
  console.info(JSON.stringify({ message: "integration_job_succeeded", jobId, provider: job.provider }));
  return output;
}
executeIntegrationJob.maxRetries = 5;

async function markJobFailed(jobId: string, message: string): Promise<void> {
  "use step";
  await getDb().integrationJob.update({
    where: { id: jobId },
    data: { status: "FAILED", lastError: message.slice(0, 2000), completedAt: new Date() },
  });
  console.error(JSON.stringify({ message: "integration_job_failed", jobId, error: message.slice(0, 500) }));
}
markJobFailed.maxRetries = 3;

export async function integrationJobWorkflow(jobId: string) {
  "use workflow";
  console.info(JSON.stringify({ message: "integration_job_started", jobId }));
  try {
    return await executeIntegrationJob(jobId);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown integration error";
    await markJobFailed(jobId, message);
    throw error;
  }
}
