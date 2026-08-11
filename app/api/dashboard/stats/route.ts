import { NextResponse } from 'next/server'
import { getDashboardStats } from '@/lib/server/dashboard-stats'
import { authorizeRequest } from '@/lib/server/authorization'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const denied = await authorizeRequest(request, 'viewer')
  if (denied) return denied
  try {
    const stats = await getDashboardStats()
    return NextResponse.json(stats, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error: unknown) {
    console.error('Error generating dashboard statistics:', error)
    return NextResponse.json(
      { error: 'Unable to read dashboard statistics' },
      { status: 500 },
    )
  }
}
