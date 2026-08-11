import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/server/authorization";
import { contactSchema } from "@/lib/schemas/api";
import { deactivateContact, updateContact } from "@/lib/server/crm-repository";
import { apiErrorResponse, safeFileId, validateJsonRequest } from "@/lib/server/security";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await authorizeRequest(request, "editor");
  if (denied) return denied;
  const validated = await validateJsonRequest(request, contactSchema.partial().strict());
  if (!validated.ok) return validated.response;
  const id = safeFileId((await params).id);
  try {
    const contact = await updateContact(id, validated.data);
    return NextResponse.json({ contact });
  } catch (error: unknown) {
    return apiErrorResponse(error, request.headers.get("x-request-id") || undefined);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await authorizeRequest(request, "admin");
  if (denied) return denied;
  const id = safeFileId((await params).id);
  try {
    await deactivateContact(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return apiErrorResponse(error, request.headers.get("x-request-id") || undefined);
  }
}
