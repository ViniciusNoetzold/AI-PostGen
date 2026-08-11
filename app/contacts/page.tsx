import { headers } from 'next/headers'
import { normalizeRole } from '@/lib/auth'
import { getDashboardStats } from '@/lib/server/dashboard-stats'
import { getCrmSnapshot } from '@/lib/server/crm-repository'
import { CrmWorkspace } from './CrmWorkspace'

export const dynamic = 'force-dynamic'

export default async function ContactsPage() {
  const [snapshot, stats, requestHeaders] = await Promise.all([
    getCrmSnapshot(),
    getDashboardStats(),
    headers(),
  ])
  const postCounts = new Map(stats.postsByClient.map((client) => [client.name.toLocaleLowerCase('pt-BR'), client.posts]))
  const companies = snapshot.companies.map((company) => ({
    ...company,
    postCount: company.postCount || postCounts.get(company.name.toLocaleLowerCase('pt-BR')) || 0,
  }))

  return (
    <CrmWorkspace
      initialData={{ ...snapshot, companies }}
      role={normalizeRole(requestHeaders.get('x-app-role'))}
    />
  )
}
