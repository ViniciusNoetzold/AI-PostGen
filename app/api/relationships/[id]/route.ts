import { NextResponse } from 'next/server'
import { authorizeRequest } from '@/lib/server/authorization'
import { deactivateRelationship } from '@/lib/server/crm-repository'
import { apiErrorResponse, safeFileId } from '@/lib/server/security'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await authorizeRequest(request, 'editor')
  if (denied) return denied
  try {
    await deactivateRelationship(safeFileId((await params).id))
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return apiErrorResponse(error, request.headers.get('x-request-id') || undefined)
  }
}
