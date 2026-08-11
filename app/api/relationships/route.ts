import { NextResponse } from 'next/server'
import { relationshipSchema } from '@/lib/schemas/api'
import { authorizeRequest } from '@/lib/server/authorization'
import { createRelationship, getCrmSnapshot } from '@/lib/server/crm-repository'
import { apiErrorResponse, validateJsonRequest } from '@/lib/server/security'

export async function GET(request: Request) {
  const denied = await authorizeRequest(request, 'viewer')
  if (denied) return denied
  try {
    const snapshot = await getCrmSnapshot()
    return NextResponse.json({ relationships: snapshot.relationships }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: unknown) {
    return apiErrorResponse(error, request.headers.get('x-request-id') || undefined)
  }
}

export async function POST(request: Request) {
  const denied = await authorizeRequest(request, 'editor')
  if (denied) return denied
  const validated = await validateJsonRequest(request, relationshipSchema)
  if (!validated.ok) return validated.response
  try {
    return NextResponse.json({ relationship: await createRelationship(validated.data) }, { status: 201 })
  } catch (error: unknown) {
    return apiErrorResponse(error, request.headers.get('x-request-id') || undefined)
  }
}
