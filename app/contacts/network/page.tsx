import { headers } from 'next/headers'
import { normalizeRole } from '@/lib/auth'
import { getCrmSnapshot } from '@/lib/server/crm-repository'
import { RelationshipBuilder } from './RelationshipBuilder'

export const dynamic = 'force-dynamic'

export default async function RelationshipNetworkPage() {
  const [snapshot, requestHeaders] = await Promise.all([getCrmSnapshot(), headers()])
  return <RelationshipBuilder initialData={snapshot} role={normalizeRole(requestHeaders.get('x-app-role'))} />
}
