import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/server/authorization";
import { contactSchema } from "@/lib/schemas/api";
import { createContact, getCrmSnapshot } from "@/lib/server/crm-repository";
import { apiErrorResponse, validateJsonRequest } from "@/lib/server/security";

export async function GET(request: Request) {
  const denied = await authorizeRequest(request, "viewer");
  if (denied) return denied;
  try {
    const snapshot = await getCrmSnapshot();
    return NextResponse.json(
      { contacts: snapshot.contacts, persistence: snapshot.persistence },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, request.headers.get("x-request-id") || undefined);
  }
}

export async function POST(request: Request) {
  const denied = await authorizeRequest(request, "editor");
  if (denied) return denied;
  const validated = await validateJsonRequest(request, contactSchema);
  if (!validated.ok) return validated.response;
  try {
    const contact = await createContact(validated.data);
    return NextResponse.json({ contact }, { status: 201 });
  } catch (error: unknown) {
    return apiErrorResponse(error, request.headers.get("x-request-id") || undefined);
  }
}
