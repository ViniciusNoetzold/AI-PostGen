import 'server-only'

import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { z } from 'zod'
import { companySchema, contactSchema, relationshipSchema } from '@/lib/schemas/api'
import { ApiError } from '@/lib/server/security'
import { atomicWriteText } from '@/lib/server/atomic-files'
import { getDb, isDatabaseConfigured } from '@/lib/server/db'
import { getDashboardStats } from '@/lib/server/dashboard-stats'
import { isNodeError } from '@/lib/errors'

export type CompanyInput = z.infer<typeof companySchema>
export type ContactInput = z.infer<typeof contactSchema>
export type RelationshipInput = z.infer<typeof relationshipSchema>
export type RelationshipType = RelationshipInput['type']

export interface CrmCompany {
  id: string
  slug: string
  name: string
  legalName: string | null
  document: string | null
  industry: string | null
  website: string | null
  logoUrl: string | null
  description: string | null
  city: string | null
  state: string | null
  country: string
  active: boolean
  contactCount: number
  postCount: number
  createdAt: string
  updatedAt: string
}

export interface CrmContact {
  id: string
  slug: string
  name: string
  email: string | null
  phone: string | null
  companyId: string | null
  companyName: string | null
  photoUrl: string | null
  jobTitle: string | null
  category: 'OWNER' | 'COFOUNDER' | 'EMPLOYEE' | 'CUSTOMER' | 'LEAD' | 'PARTNER' | 'OTHER'
  city: string | null
  state: string | null
  tags: string[]
  notes: string | null
  active: boolean
  postCount: number
  createdAt: string
  updatedAt: string
}

export interface CrmRelationship {
  id: string
  sourceClientId: string
  targetClientId: string
  sourceName: string
  targetName: string
  type: RelationshipType
  label: string | null
  strength: number
  notes: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CrmAnalytics {
  companies: number
  contacts: number
  activeContacts: number
  relationships: number
  assignedContacts: number
  unassignedContacts: number
  networkCoverage: number
  topCities: Array<{ name: string; count: number }>
  topIndustries: Array<{ name: string; count: number }>
}

export interface CrmSnapshot {
  companies: CrmCompany[]
  contacts: CrmContact[]
  relationships: CrmRelationship[]
  analytics: CrmAnalytics
  persistence: 'postgresql' | 'local-development'
  generatedAt: string
}

type LocalCompany = Omit<CrmCompany, 'contactCount' | 'postCount'>
type LocalContact = Omit<CrmContact, 'companyName' | 'postCount'>
type LocalRelationship = Omit<CrmRelationship, 'sourceName' | 'targetName'>

interface LocalCrmStore {
  version: 1
  companies: LocalCompany[]
  contacts: LocalContact[]
  relationships: LocalRelationship[]
}

const CRM_DATA_PATH = process.env.CRM_DATA_FILE || path.join(process.cwd(), '.data', 'crm.json')
let localMutationQueue: Promise<void> = Promise.resolve()

function now(): string {
  return new Date().toISOString()
}

function nullable(value: string | undefined): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70) || 'registro'
}

function uniqueSlug(value: string, existing: Iterable<string>): string {
  const base = slugify(value)
  const used = new Set(existing)
  if (!used.has(base)) return base
  let suffix = 2
  while (used.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}

function emptyStore(): LocalCrmStore {
  return { version: 1, companies: [], contacts: [], relationships: [] }
}

async function bootstrapStoreFromVault(): Promise<LocalCrmStore> {
  const store = emptyStore()
  try {
    const stats = await getDashboardStats()
    const timestamp = now()
    store.companies = stats.postsByClient.map((client) => ({
      id: randomUUID(),
      slug: uniqueSlug(client.name, store.companies.map((company) => company.slug)),
      name: client.name,
      legalName: null,
      document: null,
      industry: null,
      website: null,
      logoUrl: null,
      description: 'Empresa importada automaticamente do vault de conteúdo.',
      city: null,
      state: null,
      country: 'Brasil',
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    }))
  } catch {
    // Um vault vazio não impede o CRM local de iniciar.
  }
  return store
}

async function readLocalStore(): Promise<LocalCrmStore> {
  await localMutationQueue
  try {
    const parsed = JSON.parse(await fs.readFile(/* turbopackIgnore: true */ CRM_DATA_PATH, 'utf8')) as Partial<LocalCrmStore>
    if (parsed.version !== 1 || !Array.isArray(parsed.companies) || !Array.isArray(parsed.contacts) || !Array.isArray(parsed.relationships)) {
      throw new ApiError(500, 'Local CRM data is invalid', 'CRM_DATA_INVALID')
    }
    return parsed as LocalCrmStore
  } catch (error: unknown) {
    if (!isNodeError(error) || error.code !== 'ENOENT') throw error
    const initial = await bootstrapStoreFromVault()
    await atomicWriteText(CRM_DATA_PATH, JSON.stringify(initial, null, 2))
    return initial
  }
}

function mutateLocalStore<T>(mutation: (store: LocalCrmStore) => T | Promise<T>): Promise<T> {
  let resolveResult: (value: T | PromiseLike<T>) => void
  let rejectResult: (reason?: unknown) => void
  const result = new Promise<T>((resolve, reject) => {
    resolveResult = resolve
    rejectResult = reject
  })

  localMutationQueue = localMutationQueue
    .then(async () => {
      let store: LocalCrmStore
      try {
        store = JSON.parse(await fs.readFile(/* turbopackIgnore: true */ CRM_DATA_PATH, 'utf8')) as LocalCrmStore
      } catch (error: unknown) {
        if (!isNodeError(error) || error.code !== 'ENOENT') throw error
        store = await bootstrapStoreFromVault()
      }
      const value = await mutation(store)
      await atomicWriteText(CRM_DATA_PATH, JSON.stringify(store, null, 2))
      resolveResult(value)
    })
    .catch((error: unknown) => {
      rejectResult(error)
    })

  return result
}

function assertLocalPersistence(): void {
  // Permite persistência local em arquivo JSON (.data/crm.json) quando PostgreSQL não estiver configurado
}

function buildLocalSnapshot(store: LocalCrmStore): CrmSnapshot {
  const companyNames = new Map(store.companies.map((company) => [company.id, company.name]))
  const contactNames = new Map(store.contacts.map((contact) => [contact.id, contact.name]))
  const companies = store.companies.map((company) => ({
    ...company,
    contactCount: store.contacts.filter((contact) => contact.companyId === company.id && contact.active).length,
    postCount: 0,
  }))
  const contacts = store.contacts.map((contact) => ({
    ...contact,
    category: contact.category || 'OTHER',
    companyName: contact.companyId ? companyNames.get(contact.companyId) || null : null,
    postCount: 0,
  }))
  const relationships = store.relationships.map((relationship) => ({
    ...relationship,
    sourceName: contactNames.get(relationship.sourceClientId) || 'Contato removido',
    targetName: contactNames.get(relationship.targetClientId) || 'Contato removido',
  }))

  return {
    companies,
    contacts,
    relationships,
    analytics: buildCrmAnalytics(companies, contacts, relationships),
    persistence: 'local-development',
    generatedAt: now(),
  }
}

export function buildCrmAnalytics(
  companies: CrmCompany[],
  contacts: CrmContact[],
  relationships: CrmRelationship[],
): CrmAnalytics {
  const activeCompanies = companies.filter((company) => company.active)
  const activeContacts = contacts.filter((contact) => contact.active)
  const assignedContacts = activeContacts.filter((contact) => contact.companyId).length
  const count = (values: Array<string | null>) => {
    const totals = new Map<string, number>()
    for (const value of values) {
      if (value) totals.set(value, (totals.get(value) || 0) + 1)
    }
    return [...totals.entries()]
      .map(([name, total]) => ({ name, count: total }))
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, 'pt-BR'))
      .slice(0, 6)
  }

  return {
    companies: activeCompanies.length,
    contacts: contacts.length,
    activeContacts: activeContacts.length,
    relationships: relationships.filter((relationship) => relationship.active).length,
    assignedContacts,
    unassignedContacts: activeContacts.length - assignedContacts,
    networkCoverage: activeContacts.length === 0 ? 0 : Math.round((assignedContacts / activeContacts.length) * 100),
    topCities: count(activeCompanies.map((company) => company.city)),
    topIndustries: count(activeCompanies.map((company) => company.industry)),
  }
}

export function isCrmPersistenceAvailable(): boolean {
  return true;
}

export async function getCrmSnapshot(): Promise<CrmSnapshot> {
  if (!isDatabaseConfigured()) {
    assertLocalPersistence()
    return buildLocalSnapshot(await readLocalStore())
  }

  const db = getDb()
  const [companiesResult, contactsResult, relationshipsResult] = await Promise.all([
    db.company.findMany({ include: { _count: { select: { clients: true } } }, orderBy: { name: 'asc' } }),
    db.client.findMany({ include: { organization: { select: { name: true } }, _count: { select: { posts: true } } }, orderBy: { name: 'asc' } }),
    db.clientRelationship.findMany({ include: { source: { select: { name: true } }, target: { select: { name: true } } }, orderBy: { createdAt: 'desc' } }),
  ])

  const companies: CrmCompany[] = companiesResult.map((company) => ({
    ...company,
    contactCount: company._count.clients,
    postCount: 0,
    createdAt: company.createdAt.toISOString(),
    updatedAt: company.updatedAt.toISOString(),
    _count: undefined,
  }))
  const contacts: CrmContact[] = contactsResult.map((contact) => ({
    id: contact.id,
    slug: contact.slug,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    companyId: contact.companyId,
    companyName: contact.organization?.name || contact.company,
    photoUrl: contact.photoUrl,
    jobTitle: contact.jobTitle,
    category: contact.category,
    city: contact.city,
    state: contact.state,
    tags: contact.tags,
    notes: contact.notes,
    active: contact.active,
    postCount: contact._count.posts,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
  }))
  const relationships: CrmRelationship[] = relationshipsResult.map((relationship) => ({
    id: relationship.id,
    sourceClientId: relationship.sourceClientId,
    targetClientId: relationship.targetClientId,
    sourceName: relationship.source.name,
    targetName: relationship.target.name,
    type: relationship.type,
    label: relationship.label,
    strength: relationship.strength,
    notes: relationship.notes,
    active: relationship.active,
    createdAt: relationship.createdAt.toISOString(),
    updatedAt: relationship.updatedAt.toISOString(),
  }))

  return {
    companies,
    contacts,
    relationships,
    analytics: buildCrmAnalytics(companies, contacts, relationships),
    persistence: 'postgresql',
    generatedAt: now(),
  }
}

export async function createCompany(input: CompanyInput): Promise<CrmCompany> {
  if (isDatabaseConfigured()) {
    const db = getDb()
    const company = await db.company.create({
      data: {
        name: input.name,
        slug: `${slugify(input.name)}-${randomUUID().slice(0, 8)}`,
        legalName: nullable(input.legalName),
        document: nullable(input.document),
        industry: nullable(input.industry),
        website: nullable(input.website),
        logoUrl: nullable(input.logoUrl),
        description: nullable(input.description),
        city: nullable(input.city),
        state: nullable(input.state),
        country: input.country,
        active: input.active,
      },
    })
    return { ...company, contactCount: 0, postCount: 0, createdAt: company.createdAt.toISOString(), updatedAt: company.updatedAt.toISOString() }
  }

  assertLocalPersistence()
  return mutateLocalStore((store) => {
    const timestamp = now()
    const company: LocalCompany = {
      id: randomUUID(),
      slug: uniqueSlug(input.name, store.companies.map((item) => item.slug)),
      name: input.name,
      legalName: nullable(input.legalName),
      document: nullable(input.document),
      industry: nullable(input.industry),
      website: nullable(input.website),
      logoUrl: nullable(input.logoUrl),
      description: nullable(input.description),
      city: nullable(input.city),
      state: nullable(input.state),
      country: input.country,
      active: input.active,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    store.companies.push(company)
    return { ...company, contactCount: 0, postCount: 0 }
  })
}

export async function createContact(input: ContactInput): Promise<CrmContact> {
  const companyId = nullable(input.companyId)
  if (isDatabaseConfigured()) {
    const db = getDb()
    const contact = await db.client.create({
      data: {
        name: input.name,
        slug: `${slugify(input.name)}-${randomUUID().slice(0, 8)}`,
        email: nullable(input.email),
        phone: nullable(input.phone),
        company: nullable(input.company),
        companyId,
        photoUrl: nullable(input.photoUrl),
        jobTitle: nullable(input.jobTitle),
        category: input.category,
        city: nullable(input.city),
        state: nullable(input.state),
        tags: input.tags,
        notes: nullable(input.notes),
        active: input.active,
      },
      include: { organization: { select: { name: true } } },
    })
    return {
      id: contact.id, slug: contact.slug, name: contact.name, email: contact.email, phone: contact.phone,
      companyId: contact.companyId, companyName: contact.organization?.name || contact.company,
      photoUrl: contact.photoUrl, jobTitle: contact.jobTitle, category: contact.category, city: contact.city, state: contact.state,
      tags: contact.tags, notes: contact.notes, active: contact.active, postCount: 0,
      createdAt: contact.createdAt.toISOString(), updatedAt: contact.updatedAt.toISOString(),
    }
  }

  assertLocalPersistence()
  return mutateLocalStore((store) => {
    if (companyId && !store.companies.some((company) => company.id === companyId && company.active)) {
      throw new ApiError(422, 'Selected company does not exist', 'COMPANY_NOT_FOUND')
    }
    const timestamp = now()
    const contact: LocalContact = {
      id: randomUUID(),
      slug: uniqueSlug(input.name, store.contacts.map((item) => item.slug)),
      name: input.name,
      email: nullable(input.email),
      phone: nullable(input.phone),
      companyId,
      photoUrl: nullable(input.photoUrl),
      jobTitle: nullable(input.jobTitle),
      category: input.category,
      city: nullable(input.city),
      state: nullable(input.state),
      tags: input.tags,
      notes: nullable(input.notes),
      active: input.active,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    store.contacts.push(contact)
    return { ...contact, companyName: companyId ? store.companies.find((company) => company.id === companyId)?.name || null : null, postCount: 0 }
  })
}

export async function createRelationship(input: RelationshipInput): Promise<CrmRelationship> {
  if (isDatabaseConfigured()) {
    const relationship = await getDb().clientRelationship.create({
      data: input,
      include: { source: { select: { name: true } }, target: { select: { name: true } } },
    })
    return {
      id: relationship.id, sourceClientId: relationship.sourceClientId, targetClientId: relationship.targetClientId,
      sourceName: relationship.source.name, targetName: relationship.target.name, type: relationship.type,
      label: relationship.label, strength: relationship.strength, notes: relationship.notes, active: relationship.active,
      createdAt: relationship.createdAt.toISOString(), updatedAt: relationship.updatedAt.toISOString(),
    }
  }

  assertLocalPersistence()
  return mutateLocalStore((store) => {
    const source = store.contacts.find((contact) => contact.id === input.sourceClientId && contact.active)
    const target = store.contacts.find((contact) => contact.id === input.targetClientId && contact.active)
    if (!source || !target) throw new ApiError(422, 'Both contacts must exist', 'CONTACT_NOT_FOUND')
    const duplicate = store.relationships.some((relationship) =>
      relationship.active && relationship.sourceClientId === input.sourceClientId &&
      relationship.targetClientId === input.targetClientId && relationship.type === input.type,
    )
    if (duplicate) throw new ApiError(409, 'This relationship already exists', 'RELATIONSHIP_EXISTS')
    const timestamp = now()
    const relationship: LocalRelationship = {
      id: randomUUID(),
      sourceClientId: input.sourceClientId,
      targetClientId: input.targetClientId,
      type: input.type,
      label: nullable(input.label),
      strength: input.strength,
      notes: nullable(input.notes),
      active: input.active,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    store.relationships.push(relationship)
    return { ...relationship, sourceName: source.name, targetName: target.name }
  })
}

export async function updateCompany(id: string, input: Partial<CompanyInput>): Promise<CrmCompany> {
  if (isDatabaseConfigured()) {
    const company = await getDb().company.update({
      where: { id },
      data: {
        ...input,
        website: input.website === '' ? null : input.website,
        logoUrl: input.logoUrl === '' ? null : input.logoUrl,
      },
      include: { _count: { select: { clients: true } } },
    })
    return {
      id: company.id, slug: company.slug, name: company.name, legalName: company.legalName,
      document: company.document, industry: company.industry, website: company.website, logoUrl: company.logoUrl,
      description: company.description, city: company.city, state: company.state, country: company.country,
      active: company.active, contactCount: company._count.clients, postCount: 0,
      createdAt: company.createdAt.toISOString(), updatedAt: company.updatedAt.toISOString(),
    }
  }

  assertLocalPersistence()
  return mutateLocalStore((store) => {
    const company = store.companies.find((item) => item.id === id)
    if (!company) throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND')
    Object.assign(company, input, {
      website: input.website === '' ? null : input.website ?? company.website,
      logoUrl: input.logoUrl === '' ? null : input.logoUrl ?? company.logoUrl,
      updatedAt: now(),
    })
    return {
      ...company,
      contactCount: store.contacts.filter((contact) => contact.companyId === id && contact.active).length,
      postCount: 0,
    }
  })
}

export async function deactivateCompany(id: string): Promise<void> {
  if (isDatabaseConfigured()) {
    await getDb().company.update({ where: { id }, data: { active: false } })
    return
  }
  assertLocalPersistence()
  await mutateLocalStore((store) => {
    const company = store.companies.find((item) => item.id === id)
    if (!company) throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND')
    company.active = false
    company.updatedAt = now()
  })
}

export async function updateContact(id: string, input: Partial<ContactInput>): Promise<CrmContact> {
  if (isDatabaseConfigured()) {
    const contact = await getDb().client.update({
      where: { id },
      data: {
        ...input,
        companyId: input.companyId === '' ? null : input.companyId,
        email: input.email === '' ? null : input.email,
        photoUrl: input.photoUrl === '' ? null : input.photoUrl,
      },
      include: { organization: { select: { name: true } }, _count: { select: { posts: true } } },
    })
    return {
      id: contact.id, slug: contact.slug, name: contact.name, email: contact.email, phone: contact.phone,
      companyId: contact.companyId, companyName: contact.organization?.name || contact.company,
      photoUrl: contact.photoUrl, jobTitle: contact.jobTitle, category: contact.category, city: contact.city, state: contact.state,
      tags: contact.tags, notes: contact.notes, active: contact.active, postCount: contact._count.posts,
      createdAt: contact.createdAt.toISOString(), updatedAt: contact.updatedAt.toISOString(),
    }
  }

  assertLocalPersistence()
  return mutateLocalStore((store) => {
    const contact = store.contacts.find((item) => item.id === id)
    if (!contact) throw new ApiError(404, 'Contact not found', 'CONTACT_NOT_FOUND')
    if (input.companyId && !store.companies.some((company) => company.id === input.companyId && company.active)) {
      throw new ApiError(422, 'Selected company does not exist', 'COMPANY_NOT_FOUND')
    }
    Object.assign(contact, input, {
      companyId: input.companyId === '' ? null : input.companyId ?? contact.companyId,
      email: input.email === '' ? null : input.email ?? contact.email,
      photoUrl: input.photoUrl === '' ? null : input.photoUrl ?? contact.photoUrl,
      updatedAt: now(),
    })
    const companyName = contact.companyId ? store.companies.find((company) => company.id === contact.companyId)?.name || null : null
    return { ...contact, companyName, postCount: 0 }
  })
}

export async function deactivateContact(id: string): Promise<void> {
  if (isDatabaseConfigured()) {
    await getDb().client.update({ where: { id }, data: { active: false } })
    return
  }
  assertLocalPersistence()
  await mutateLocalStore((store) => {
    const contact = store.contacts.find((item) => item.id === id)
    if (!contact) throw new ApiError(404, 'Contact not found', 'CONTACT_NOT_FOUND')
    contact.active = false
    contact.updatedAt = now()
    for (const relationship of store.relationships) {
      if (relationship.sourceClientId === id || relationship.targetClientId === id) relationship.active = false
    }
  })
}

export async function deactivateRelationship(id: string): Promise<void> {
  if (isDatabaseConfigured()) {
    await getDb().clientRelationship.update({ where: { id }, data: { active: false } })
    return
  }
  assertLocalPersistence()
  await mutateLocalStore((store) => {
    const relationship = store.relationships.find((item) => item.id === id)
    if (!relationship) throw new ApiError(404, 'Relationship not found', 'RELATIONSHIP_NOT_FOUND')
    relationship.active = false
    relationship.updatedAt = now()
  })
}
