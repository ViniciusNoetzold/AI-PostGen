import { NextResponse } from 'next/server'
import { companySchema } from '@/lib/schemas/api'
import { authorizeRequest } from '@/lib/server/authorization'
import { deactivateCompany, updateCompany } from '@/lib/server/crm-repository'
import { apiErrorResponse, safeFileId, validateJsonRequest } from '@/lib/server/security'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await authorizeRequest(request, 'editor')
  if (denied) return denied
  const validated = await validateJsonRequest(request, companySchema.partial().strict())
  if (!validated.ok) return validated.response
  try {
    return NextResponse.json({ company: await updateCompany(safeFileId((await params).id), validated.data) })
  } catch (error: unknown) {
    return apiErrorResponse(error, request.headers.get('x-request-id') || undefined)
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await authorizeRequest(request, 'admin')
  if (denied) return denied
  try {
    await deactivateCompany(safeFileId((await params).id))
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return apiErrorResponse(error, request.headers.get('x-request-id') || undefined)
  }
}
