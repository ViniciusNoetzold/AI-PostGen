import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/server/authorization";
import { approvalSchema } from "@/lib/schemas/api";
import { safeFileId, validateJsonRequest } from "@/lib/server/security";
import { editorialApproval } from "@/workflows/editorial";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await authorizeRequest(request, "approver");
  if (denied) return denied;
  const validated = await validateJsonRequest(request, approvalSchema);
  if (!validated.ok) return validated.response;
  const id = safeFileId((await params).id);
  try {
    const result = await editorialApproval.resume(`approval:${id}`, validated.data);
    return NextResponse.json({ success: true, runId: result.runId });
  } catch {
    return NextResponse.json({ error: "Approval workflow is not waiting or does not exist" }, { status: 409 });
  }
}
