import { NextResponse } from 'next/server'
import { authorizeRequest } from '@/lib/server/authorization'
import { getCrmSnapshot } from '@/lib/server/crm-repository'
import { apiErrorResponse } from '@/lib/server/security'

export async function GET(request: Request) {
  const denied = await authorizeRequest(request, 'viewer')
  if (denied) return denied
  try {
    return NextResponse.json(await getCrmSnapshot(), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: unknown) {
    return apiErrorResponse(error, request.headers.get('x-request-id') || undefined)
  }
}
