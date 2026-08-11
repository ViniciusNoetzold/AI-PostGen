import { NextResponse } from 'next/server'
import { getDashboardStats } from '@/lib/server/dashboard-stats'
import { authorizeRequest } from '@/lib/server/authorization'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const denied = await authorizeRequest(request, 'viewer')
  if (denied) return denied
  try {
    const stats = await getDashboardStats()
    return NextResponse.json(
      {
        ...stats,
        // Compatibility fields for consumers of the original dashboard endpoint.
        totalContacts: stats.totals.clients,
        totalInteractions: stats.totals.postsGenerated + stats.totals.studioVideos,
        activeLeads: stats.totals.activeClients,
        conversionRate: 0,
        statusCounts: stats.postsByClient.map(({ name, posts }) => ({ name, value: posts })),
        upcomingReminders: [],
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error: unknown) {
    console.error('Error generating legacy dashboard data:', error)
    return NextResponse.json(
      { error: 'Unable to read dashboard statistics' },
      { status: 500 },
    )
  }
}
