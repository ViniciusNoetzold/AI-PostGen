'use client'

import Image from 'next/image'
import { useDeferredValue, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  FileText,
  GitBranch,
  LayoutGrid,
  Link2,
  List,
  Loader2,
  MapPin,
  MapPinned,
  Pencil,
  Plus,
  Search,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { hasRole, type AppRole } from '@/lib/auth'
import type { CrmCompany, CrmContact, CrmSnapshot } from '@/lib/server/crm-repository'
import { PanZoomControls } from '@/components/PanZoomControls'
import { usePanZoom } from '@/lib/hooks/use-pan-zoom'

type ViewMode = 'city' | 'network' | 'list'
type DialogKind = 'company' | 'contact' | 'relationship' | null
type NetworkNode = { id: string; name: string; kind: 'company' | 'contact'; x: number; y: number }
type NetworkField = { id: string; kind: 'company' | 'community'; x: number; y: number; width: number; height: number; memberCount: number; radius: string }
type NetworkEdge = { id: string; source: string; target: string; strength: number; kind: 'membership' | 'relationship' }

const MIN_NETWORK_ZOOM = 0.6
const MAX_NETWORK_ZOOM = 2.5
const NETWORK_ZOOM_STEP = 0.2

const relationshipLabels = {
  CUSTOMER: 'Cliente',
  PARTNER: 'Parceiro',
  SUPPLIER: 'Fornecedor',
  REFERRAL: 'Indicação',
  TEAM: 'Equipe',
  OTHER: 'Outro',
} as const

const personCategoryLabels = {
  OWNER: 'Proprietário(a)',
  COFOUNDER: 'Cofundador(a)',
  EMPLOYEE: 'Funcionário(a)',
  CUSTOMER: 'Consumidor(a)',
  LEAD: 'Potencial cliente',
  PARTNER: 'Parceiro(a)',
  OTHER: 'Outro',
} as const

function Avatar({ name, url, size = 42 }: { name: string; url: string | null; size?: number }) {
  const [imageFailed, setImageFailed] = useState(false)
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  if (url && !imageFailed) {
    const source = url.startsWith('/api/media/') ? url : `/api/image-proxy?url=${encodeURIComponent(url)}`
    return (
      <Image
        src={source}
        alt={`Foto de ${name}`}
        width={size}
        height={size}
        sizes={`${size}px`}
        unoptimized
        onError={() => setImageFailed(true)}
        className="shrink-0 rounded-full object-cover ring-2 ring-slate-700"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 font-bold text-white ring-2 ring-slate-700"
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.28) }}
    >
      {initials || '•'}
    </span>
  )
}

function CompanyMark({ company, size = 44 }: { company: CrmCompany; size?: number }) {
  if (company.logoUrl) return <Avatar name={company.name} url={company.logoUrl} size={size} />
  return (
    <span className="grid shrink-0 place-items-center rounded-xl bg-cyan-500/10 text-cyan-400" style={{ width: size, height: size }}>
      <Building2 className="size-5" />
    </span>
  )
}

function EditableContactAvatar({ contact, onEdit, size = 38 }: { contact: CrmContact; onEdit?: (contact: CrmContact) => void; size?: number }) {
  if (!onEdit) return <Avatar name={contact.name} url={contact.photoUrl} size={size} />
  return (
    <button type="button" onClick={() => onEdit(contact)} className="group relative rounded-full outline-none ring-cyan-400 focus-visible:ring-2" aria-label={`Editar pessoa ${contact.name}`} title={`Editar ${contact.name}`}>
      <Avatar name={contact.name} url={contact.photoUrl} size={size} />
      <span className="absolute inset-0 grid place-items-center rounded-full bg-slate-950/70 text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"><Pencil className="size-3.5" /></span>
    </button>
  )
}

function EmptyState({ icon: Icon, children }: { icon: typeof Users; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center text-slate-500">
      <Icon className="mx-auto mb-3 size-8" /> {children}
    </div>
  )
}

function CityView({ companies, contacts, onEditContact }: { companies: CrmCompany[]; contacts: CrmContact[]; onEditContact?: (contact: CrmContact) => void }) {
  const unassigned = contacts.filter((contact) => !contact.companyId)
  if (companies.length === 0 && contacts.length === 0) {
    return <EmptyState icon={MapPinned}>A cidade ainda está vazia. Cadastre a primeira empresa para criar um novo bairro.</EmptyState>
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-5 sm:p-7">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(30deg,transparent_48%,#334155_49%,#334155_51%,transparent_52%),linear-gradient(-30deg,transparent_48%,#334155_49%,#334155_51%,transparent_52%)] [background-size:180px_120px]" />
      <div className="relative mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Cidade de negócios</p>
          <h2 className="mt-1 text-xl font-bold text-white">Cada empresa é um endereço. Cada pessoa, uma conexão.</h2>
        </div>
        <span className="hidden rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-400 sm:block">{companies.length} bairros ativos</span>
      </div>
      <div className="relative grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {companies.map((company, index) => {
          const residents = contacts.filter((contact) => contact.companyId === company.id && contact.active)
          const heightClass = ['min-h-56', 'min-h-64', 'min-h-60'][index % 3]
          return (
            <article key={company.id} className={`${heightClass} flex flex-col rounded-t-3xl rounded-b-xl border border-slate-700 bg-gradient-to-b from-slate-800 to-slate-900 p-5 shadow-xl transition hover:-translate-y-1 hover:border-cyan-500/50`}>
              <div className="flex items-start justify-between gap-3">
                <CompanyMark company={company} />
                <span className="rounded-full bg-slate-950/70 px-2.5 py-1 text-[11px] text-slate-400">{company.industry || 'Negócio local'}</span>
              </div>
              <h3 className="mt-4 text-lg font-bold text-white">{company.name}</h3>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                <MapPin className="size-3.5" /> {[company.city, company.state].filter(Boolean).join(' · ') || 'Endereço a definir'}
              </p>
              <div className="mt-auto pt-6">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{residents.length} {residents.length === 1 ? 'pessoa' : 'pessoas'}</span>
                  <span>{company.postCount} posts</span>
                </div>
                <div className="mt-3 flex min-h-10 -space-x-2">
                  {residents.slice(0, 6).map((contact) => <EditableContactAvatar key={contact.id} contact={contact} onEdit={onEditContact} />)}
                  {residents.length > 6 ? <span className="grid size-[38px] place-items-center rounded-full bg-slate-700 text-xs font-bold text-white ring-2 ring-slate-900">+{residents.length - 6}</span> : null}
                  {residents.length === 0 ? <span className="self-center text-xs text-slate-600">Espaço disponível para novos contatos</span> : null}
                </div>
              </div>
            </article>
          )
        })}
      </div>
      {unassigned.length > 0 ? (
        <section className="relative mt-5 rounded-2xl border border-dashed border-violet-500/40 bg-violet-500/5 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">Praça central · aguardando empresa</p>
          <div className="flex flex-wrap gap-3">
            {unassigned.map((contact) => <button type="button" key={contact.id} disabled={!onEditContact} onClick={() => onEditContact?.(contact)} className="flex items-center gap-2 rounded-full bg-slate-900 py-1.5 pl-1.5 pr-3 text-sm text-slate-200 enabled:hover:bg-slate-800 disabled:cursor-default"><Avatar name={contact.name} url={contact.photoUrl} size={30} />{contact.name}{onEditContact ? <Pencil className="size-3 text-slate-500" /> : null}</button>)}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function NetworkView({ data }: { data: CrmSnapshot }) {
  const {
    containerRef: networkCanvasRef,
    viewport: networkViewport,
    isPanning: isNetworkPanning,
    minScale: networkMinScale,
    maxScale: networkMaxScale,
    canReset: canResetNetwork,
    zoomBy: zoomNetworkBy,
    reset: resetNetwork,
    handlers: networkPanHandlers,
  } = usePanZoom<HTMLDivElement>({ minScale: MIN_NETWORK_ZOOM, maxScale: MAX_NETWORK_ZOOM })
  const layout = useMemo(() => {
    const companies = data.companies.filter((company) => company.active).slice(0, 10)
    const contacts = data.contacts.filter((contact) => contact.active).slice(0, 20)
    const companyIds = new Set(companies.map((company) => company.id))
    const unassigned = contacts.filter((contact) => !contact.companyId || !companyIds.has(contact.companyId))
    const fieldSources: Array<{ id: string; kind: 'company' | 'community'; company: CrmCompany | null; contacts: CrmContact[] }> = companies.map((company) => ({
      id: company.id,
      kind: 'company',
      company,
      contacts: contacts.filter((contact) => contact.companyId === company.id),
    }))

    if (unassigned.length > 0) {
      fieldSources.push({ id: 'community-unassigned', kind: 'community', company: null, contacts: unassigned })
    }

    const columnCount = fieldSources.length <= 1 ? 1 : fieldSources.length <= 4 ? 2 : 3
    const rowCount = Math.max(1, Math.ceil(fieldSources.length / columnCount))
    const marginX = 3.5
    const marginTop = 11
    const marginBottom = 10
    const gapX = 3
    const gapY = 3.5
    const fieldWidth = (100 - marginX * 2 - gapX * (columnCount - 1)) / columnCount
    const fieldHeight = (100 - marginTop - marginBottom - gapY * (rowCount - 1)) / rowCount
    const radii = ['42px 58px 48px 54px', '58px 44px 60px 46px', '50px 62px 42px 58px']
    const nodes: NetworkNode[] = []
    const fields: NetworkField[] = []

    fieldSources.forEach((source, fieldIndex) => {
      const column = fieldIndex % columnCount
      const row = Math.floor(fieldIndex / columnCount)
      const x = marginX + column * (fieldWidth + gapX)
      const y = marginTop + row * (fieldHeight + gapY)
      const centerX = x + fieldWidth / 2
      const companyY = y + fieldHeight * 0.28

      fields.push({
        id: source.id,
        kind: source.kind,
        x,
        y,
        width: fieldWidth,
        height: fieldHeight,
        memberCount: source.contacts.length,
        radius: radii[fieldIndex % radii.length],
      })

      if (source.company) {
        nodes.push({ id: source.company.id, name: source.company.name, kind: 'company', x: centerX, y: companyY })
      }

      source.contacts.forEach((contact, contactIndex, members) => {
        let contactX = centerX
        let contactY = y + fieldHeight * 0.68

        if (source.kind === 'company' && members.length > 1 && members.length <= 4) {
          const startAngle = Math.PI * 0.2
          const endAngle = Math.PI * 0.8
          const angle = startAngle + (contactIndex / (members.length - 1)) * (endAngle - startAngle)
          contactX = centerX + Math.cos(angle) * fieldWidth * 0.34
          contactY = companyY + Math.sin(angle) * fieldHeight * 0.5
        } else if (members.length > 1) {
          const contactColumns = Math.min(3, members.length)
          const contactRows = Math.ceil(members.length / contactColumns)
          const contactColumn = contactIndex % contactColumns
          const contactRow = Math.floor(contactIndex / contactColumns)
          contactX = x + fieldWidth * (contactColumns === 1 ? 0.5 : 0.18 + (contactColumn / (contactColumns - 1)) * 0.64)
          contactY = y + fieldHeight * (contactRows === 1 ? 0.62 : 0.52 + (contactRow / (contactRows - 1)) * 0.3)
        }

        nodes.push({ id: contact.id, name: contact.name, kind: 'contact', x: contactX, y: contactY })
      })
    })

    return { nodes, fields, canvasHeight: Math.max(620, rowCount * 300) }
  }, [data.companies, data.contacts])
  const positions = new Map(layout.nodes.map((node) => [node.id, node]))
  const membershipEdges: NetworkEdge[] = data.contacts.flatMap((contact) => contact.companyId && positions.has(contact.id) && positions.has(contact.companyId) ? [{ id: `membership-${contact.id}`, source: contact.id, target: contact.companyId, strength: 1, kind: 'membership' as const }] : [])
  const relationEdges: NetworkEdge[] = data.relationships.filter((relationship) => relationship.active).map((relationship) => ({ id: relationship.id, source: relationship.sourceClientId, target: relationship.targetClientId, strength: relationship.strength, kind: 'relationship' }))
  const edges = [...membershipEdges, ...relationEdges].filter((edge) => positions.has(edge.source) && positions.has(edge.target))

  if (layout.nodes.length === 0) return <EmptyState icon={GitBranch}>Cadastre empresas e pessoas para desenhar a rede.</EmptyState>
  return (
    <div
      ref={networkCanvasRef}
      {...networkPanHandlers}
      className={`relative min-h-[620px] touch-none overscroll-contain overflow-hidden rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_center,_#172554_0,_#0f172a_35%,_#020617_75%)] ${isNetworkPanning ? 'cursor-grabbing' : ''}`}
      style={{ height: layout.canvasHeight }}
      role="region"
      aria-label={`Rede interativa organizada em ${layout.fields.length} campos, com ${layout.nodes.length} nós e ${edges.length} conexões. Use a roda do mouse para zoom e Shift mais arraste para mover.`}
    >
      <div
        data-pan-zoom-layer
        className="absolute inset-0 will-change-transform"
        style={{
          transform: `translate3d(${networkViewport.x}px, ${networkViewport.y}px, 0) scale(${networkViewport.scale})`,
          transformOrigin: '0 0',
        }}
      >
        {layout.fields.map((field, index) => (
          <div
            key={field.id}
            data-network-field={field.id}
            className={`pointer-events-none absolute overflow-hidden border ${field.kind === 'company' ? 'border-cyan-400/20 bg-cyan-400/[0.035]' : 'border-amber-400/25 bg-amber-400/[0.035]'}`}
            style={{ left: `${field.x}%`, top: `${field.y}%`, width: `${field.width}%`, height: `${field.height}%`, borderRadius: field.radius }}
          >
            <div className={`absolute inset-0 opacity-50 ${index % 2 === 0 ? 'bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.12),transparent_55%)]' : 'bg-[radial-gradient(circle_at_70%_80%,rgba(139,92,246,0.12),transparent_55%)]'}`} />
            <span className={`absolute left-4 top-3 text-[9px] font-semibold uppercase tracking-[0.16em] ${field.kind === 'company' ? 'text-cyan-400/70' : 'text-amber-300/70'}`}>{field.kind === 'company' ? 'Núcleo empresarial' : 'Praça central'}</span>
            <span className="absolute right-4 top-3 text-[9px] text-slate-500">{field.memberCount} {field.memberCount === 1 ? 'pessoa' : 'pessoas'}</span>
          </div>
        ))}
        <svg className="pointer-events-none absolute inset-0 z-10 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {edges.map((edge, index) => {
            const source = positions.get(edge.source)!
            const target = positions.get(edge.target)!
            if (edge.kind === 'membership') {
              return <line key={edge.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="#475569" strokeWidth="1" strokeOpacity="0.55" vectorEffect="non-scaling-stroke" />
            }
            const middleX = (source.x + target.x) / 2
            const middleY = (source.y + target.y) / 2
            const curve = index % 2 === 0 ? 3.5 : -3.5
            return <path key={edge.id} d={`M ${source.x} ${source.y} Q ${middleX + curve} ${middleY - curve} ${target.x} ${target.y}`} fill="none" stroke="#22d3ee" strokeWidth={Math.max(1.5, edge.strength * 0.65)} strokeOpacity="0.85" vectorEffect="non-scaling-stroke" />
          })}
        </svg>
        {layout.nodes.map((node) => (
          <div key={node.id} data-network-node={node.id} data-network-node-kind={node.kind} className="absolute z-20 -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${node.x}%`, top: `${node.y}%` }}>
            <span className={`mx-auto grid place-items-center shadow-xl ${node.kind === 'company' ? 'size-14 rounded-2xl bg-cyan-500 text-slate-950 ring-4 ring-cyan-950/60' : 'size-9 rounded-full bg-violet-500 text-white ring-2 ring-slate-950'}`}>
              {node.kind === 'company' ? <Building2 className="size-6" /> : <UserRound className="size-4" />}
            </span>
            <span className={`mt-1.5 block truncate rounded bg-slate-950/85 px-1.5 py-0.5 text-[10px] text-slate-200 shadow ${node.kind === 'company' ? 'max-w-36 font-semibold text-cyan-50' : 'max-w-20'}`}>{node.name}</span>
          </div>
        ))}
      </div>
      <PanZoomControls scale={networkViewport.scale} minScale={networkMinScale} maxScale={networkMaxScale} canReset={canResetNetwork} onZoomOut={() => zoomNetworkBy(-NETWORK_ZOOM_STEP)} onZoomIn={() => zoomNetworkBy(NETWORK_ZOOM_STEP)} onReset={resetNetwork} />
      <div className="pointer-events-none absolute left-1/2 top-4 z-10 hidden -translate-x-1/2 rounded-full border border-slate-700 bg-slate-950/75 px-3 py-1.5 text-[11px] text-slate-400 backdrop-blur sm:block">Scroll: zoom · Shift + arraste: mover</div>
      <div className="absolute bottom-4 left-4 rounded-xl border border-slate-700 bg-slate-950/80 p-3 text-xs text-slate-400 backdrop-blur">
        <span className="mr-3 text-cyan-300">■ Empresas</span><span className="text-violet-300">● Pessoas</span>
      </div>
    </div>
  )
}

function ListView({ companies, contacts, onEditContact }: { companies: CrmCompany[]; contacts: CrmContact[]; onEditContact?: (contact: CrmContact) => void }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="flex items-center gap-2 font-semibold text-white"><Building2 className="size-5 text-cyan-400" /> Empresas</h2>
        <div className="mt-4 space-y-2">
          {companies.map((company) => <div key={company.id} className="flex items-center gap-3 rounded-xl bg-slate-950/70 p-3"><CompanyMark company={company} size={40} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{company.name}</p><p className="truncate text-xs text-slate-500">{company.industry || 'Segmento não informado'} · {company.contactCount} contatos</p></div><span className="text-xs font-semibold text-cyan-400">{company.postCount} posts</span></div>)}
          {companies.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">Nenhuma empresa encontrada.</p> : null}
        </div>
      </section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="flex items-center gap-2 font-semibold text-white"><Users className="size-5 text-violet-400" /> Pessoas</h2>
        <div className="mt-4 space-y-2">
          {contacts.map((contact) => <div key={contact.id} className="flex items-center gap-3 rounded-xl bg-slate-950/70 p-3"><Avatar name={contact.name} url={contact.photoUrl} size={40} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{contact.name}</p><p className="truncate text-xs text-slate-500">{contact.jobTitle || 'Contato'} · {contact.companyName || 'Sem empresa'}</p></div>{contact.tags[0] ? <span className="rounded-full bg-violet-500/10 px-2 py-1 text-[10px] text-violet-300">{contact.tags[0]}</span> : null}{onEditContact ? <button type="button" onClick={() => onEditContact(contact)} className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-cyan-300" aria-label={`Editar pessoa ${contact.name}`}><Pencil className="size-4" /></button> : null}</div>)}
          {contacts.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">Nenhum contato encontrado.</p> : null}
        </div>
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-xs font-medium text-slate-300"><span>{label}</span>{children}</label>
}

const inputClass = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition [color-scheme:dark] placeholder:text-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500'

function MissingResourceToggle({ checked, onChange, children }: { checked: boolean; onChange: (checked: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs font-normal text-slate-400">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 rounded border-slate-600 bg-slate-950 accent-cyan-500"
      />
      {children}
    </label>
  )
}

function CrmDialog({ kind, companies, contacts, contactToEdit, onClose }: { kind: Exclude<DialogKind, null>; companies: CrmCompany[]; contacts: CrmContact[]; contactToEdit: CrmContact | null; onClose: () => void }) {
  const router = useRouter()
  const [refreshing, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noWebsite, setNoWebsite] = useState(false)
  const [noLogo, setNoLogo] = useState(false)
  const titles = { company: 'Cadastrar empresa', contact: contactToEdit ? 'Editar pessoa' : 'Adicionar pessoa', relationship: 'Criar relacionamento' }
  const activeContacts = contacts.filter((contact) => contact.active)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const values = Object.fromEntries(new FormData(event.currentTarget))
    let endpoint = '/api/companies'
    let method = 'POST'
    let body: Record<string, unknown> = {
      name: values.name,
      legalName: values.legalName,
      document: values.document,
      industry: values.industry,
      description: values.description,
      city: values.city,
      state: values.state,
      website: noWebsite ? '' : values.website,
      logoUrl: noLogo ? '' : values.logoUrl,
      country: 'Brasil',
      active: true,
    }
    if (kind === 'contact') {
      endpoint = contactToEdit ? `/api/contacts/${contactToEdit.id}` : '/api/contacts'
      method = contactToEdit ? 'PATCH' : 'POST'
      body = { name: values.name, email: values.email, phone: values.phone, companyId: values.companyId, photoUrl: values.photoUrl, jobTitle: values.jobTitle, category: values.category, city: values.city, state: values.state, notes: values.notes, tags: String(values.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean), active: true }
    }
    if (kind === 'relationship') {
      if (values.sourceClientId === values.targetClientId) {
        setError('Escolha duas pessoas diferentes para criar o relacionamento.')
        return
      }
      endpoint = '/api/relationships'
      body = { sourceClientId: values.sourceClientId, targetClientId: values.targetClientId, type: values.type, label: values.label, notes: values.notes, strength: Number(values.strength), active: true }
    }
    setSaving(true)
    try {
      const logoFile = values.logoFile
      if (kind === 'company' && !noLogo && logoFile instanceof File && logoFile.size > 0) {
        const uploadForm = new FormData()
        uploadForm.append('file', logoFile)
        const uploadResponse = await fetch('/api/media/upload', { method: 'POST', body: uploadForm })
        const uploadPayload = await uploadResponse.json() as { url?: string; error?: string }
        if (!uploadResponse.ok || !uploadPayload.url) {
          setError(uploadPayload.error || 'Não foi possível enviar o logo.')
          return
        }
        body.logoUrl = uploadPayload.url
      }

      const response = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const payload = await response.json() as { error?: string }
      if (!response.ok) {
        setError(payload.error || 'Não foi possível salvar. Revise os dados e tente novamente.')
        return
      }
      onClose()
      startTransition(() => router.refresh())
    } catch {
      setError('A conexão falhou durante o salvamento. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="crm-dialog-title" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:p-6">
        <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-400">CRM</p><h2 id="crm-dialog-title" className="mt-1 text-xl font-bold text-white">{titles[kind]}</h2></div><button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Fechar"><X className="size-5" /></button></div>
        <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
          {kind === 'company' ? <>
            <Field label="Nome da empresa"><input className={inputClass} name="name" required maxLength={120} autoFocus /></Field>
            <Field label="Razão social"><input className={inputClass} name="legalName" maxLength={180} /></Field>
            <Field label="CNPJ ou documento"><input className={inputClass} name="document" maxLength={40} placeholder="Somente para identificação interna" /></Field>
            <Field label="Segmento"><input className={inputClass} name="industry" maxLength={100} placeholder="Ex.: gastronomia" /></Field>
            <Field label="Cidade"><input className={inputClass} name="city" maxLength={120} /></Field>
            <Field label="Estado"><input className={inputClass} name="state" maxLength={80} /></Field>
            <div>
              <Field label="Site (HTTPS)"><input className={inputClass} name="website" type="url" placeholder="https://" disabled={noWebsite} /></Field>
              <MissingResourceToggle checked={noWebsite} onChange={setNoWebsite}>Esta empresa não possui site</MissingResourceToggle>
            </div>
            <div>
              <Field label="Logo (URL HTTPS)"><input className={inputClass} name="logoUrl" type="url" placeholder="https://" disabled={noLogo} /></Field>
              <label className="mt-3 grid gap-1.5 text-xs font-medium text-slate-300">
                <span>Ou enviar logo do computador</span>
                <input
                  className="w-full rounded-xl border border-dashed border-slate-600 bg-slate-950 px-3 py-2 text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-500/10 file:px-3 file:py-1.5 file:font-semibold file:text-cyan-300 hover:border-cyan-500/60 disabled:cursor-not-allowed disabled:opacity-40"
                  name="logoFile"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={noLogo}
                />
                <span className="font-normal text-slate-500">PNG, JPEG ou WebP · máximo de 2 MB. O arquivo substitui a URL.</span>
              </label>
              <MissingResourceToggle checked={noLogo} onChange={setNoLogo}>Esta empresa não possui logo</MissingResourceToggle>
            </div>
            <div className="sm:col-span-2"><Field label="Descrição do negócio"><textarea className={`${inputClass} min-h-24 resize-y`} name="description" maxLength={2000} placeholder="Conte brevemente o que a empresa oferece e para quem." /></Field></div>
          </> : null}
          {kind === 'contact' ? <>
            <Field label="Nome"><input className={inputClass} name="name" required maxLength={120} autoFocus defaultValue={contactToEdit?.name || ''} /></Field>
            <Field label="Empresa"><select className={inputClass} name="companyId" defaultValue={contactToEdit?.companyId || ''}><option value="">Sem empresa</option>{companies.filter((company) => company.active).map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></Field>
            <Field label="Papel na rede"><select className={inputClass} name="category" defaultValue={contactToEdit?.category || 'OTHER'}>{Object.entries(personCategoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            <Field label="Cargo / função"><input className={inputClass} name="jobTitle" maxLength={120} defaultValue={contactToEdit?.jobTitle || ''} /></Field>
            <Field label="E-mail"><input className={inputClass} name="email" type="email" maxLength={320} defaultValue={contactToEdit?.email || ''} /></Field>
            <Field label="Telefone"><input className={inputClass} name="phone" maxLength={40} defaultValue={contactToEdit?.phone || ''} /></Field>
            <Field label="Foto (URL HTTPS)"><input className={inputClass} name="photoUrl" type="url" placeholder="https://" defaultValue={contactToEdit?.photoUrl || ''} /></Field>
            <Field label="Cidade"><input className={inputClass} name="city" maxLength={120} defaultValue={contactToEdit?.city || ''} /></Field>
            <Field label="Estado"><input className={inputClass} name="state" maxLength={80} defaultValue={contactToEdit?.state || ''} /></Field>
            <div className="sm:col-span-2"><Field label="Tags (separadas por vírgula)"><input className={inputClass} name="tags" placeholder="lead, vip, parceiro" defaultValue={contactToEdit?.tags.join(', ') || ''} /></Field></div>
            <div className="sm:col-span-2"><Field label="Observações"><textarea className={`${inputClass} min-h-24 resize-y`} name="notes" maxLength={5000} defaultValue={contactToEdit?.notes || ''} /></Field></div>
          </> : null}
          {kind === 'relationship' ? <>
            <div className="sm:col-span-2 rounded-2xl border border-cyan-500/25 bg-cyan-500/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-white">Quer montar a rede por bolhas e setas?</p><p className="mt-1 text-xs text-slate-400">Use a empresa como centro, arraste as pessoas e puxe conexões visualmente.</p></div><button type="button" onClick={() => router.push('/contacts/network')} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950"><GitBranch className="size-4" /> Abrir construtor visual</button></div>
            </div>
            <p className="sm:col-span-2 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 text-xs leading-relaxed text-slate-400">Escolha duas pessoas ativas. A origem indica quem iniciou ou mantém a conexão; o destino indica quem recebe essa relação.</p>
            <Field label="Pessoa de origem"><select className={inputClass} name="sourceClientId" required defaultValue=""><option value="" disabled>Selecione uma pessoa</option>{activeContacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}{contact.companyName ? ` — ${contact.companyName}` : ''}</option>)}</select></Field>
            <Field label="Pessoa de destino"><select className={inputClass} name="targetClientId" required defaultValue=""><option value="" disabled>Selecione uma pessoa</option>{activeContacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}{contact.companyName ? ` — ${contact.companyName}` : ''}</option>)}</select></Field>
            <Field label="Tipo de relacionamento"><select className={inputClass} name="type" defaultValue="PARTNER">{Object.entries(relationshipLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            <Field label="Força da conexão"><select className={inputClass} name="strength" defaultValue="3">{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} de 5</option>)}</select></Field>
            <div className="sm:col-span-2"><Field label="Nome da relação"><input className={inputClass} name="label" maxLength={100} placeholder="Ex.: indicação comercial, parceria de conteúdo" /></Field></div>
            <div className="sm:col-span-2"><Field label="Observações"><textarea className={`${inputClass} min-h-24 resize-y`} name="notes" maxLength={1000} placeholder="Contexto, oportunidade, próximo contato ou acordo existente." /></Field></div>
          </> : null}
          {error ? <p role="alert" className="sm:col-span-2 text-sm text-rose-400">{error}</p> : null}
          <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={onClose} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-800 disabled:opacity-50">Cancelar</button><button disabled={saving || refreshing} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60">{saving || refreshing ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} {saving ? 'Enviando...' : 'Salvar'}</button></div>
        </form>
      </div>
    </div>
  )
}

export function CrmWorkspace({ initialData, role }: { initialData: CrmSnapshot; role: AppRole }) {
  const [view, setView] = useState<ViewMode>('city')
  const [dialog, setDialog] = useState<DialogKind>(null)
  const [contactToEdit, setContactToEdit] = useState<CrmContact | null>(null)
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase('pt-BR'))
  const canEdit = hasRole(role, 'editor')
  const activeContactCount = initialData.contacts.filter((contact) => contact.active).length
  const companies = initialData.companies.filter((company) => company.active && (!deferredQuery || [company.name, company.industry, company.city].some((value) => value?.toLocaleLowerCase('pt-BR').includes(deferredQuery))))
  const contacts = initialData.contacts.filter((contact) => contact.active && (!deferredQuery || [contact.name, contact.email, contact.companyName, contact.jobTitle, ...contact.tags].some((value) => value?.toLocaleLowerCase('pt-BR').includes(deferredQuery))))
  const filteredData = { ...initialData, companies, contacts }
  const closeDialog = () => {
    setDialog(null)
    setContactToEdit(null)
  }
  const editContact = (contact: CrmContact) => {
    setContactToEdit(contact)
    setDialog('contact')
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 md:p-8">
      <header className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-400">CRM vivo</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Cidade de clientes</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Empresas viram bairros, pessoas viram moradores e cada relacionamento ajuda a visualizar oportunidades.</p></div>
        {canEdit ? <div><div className="flex flex-wrap gap-2"><button onClick={() => setDialog('company')} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-white hover:border-cyan-500/50"><Building2 className="size-4 text-cyan-400" /> Empresa</button><button onClick={() => { setContactToEdit(null); setDialog('contact') }} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-3.5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"><UserRound className="size-4" /> Pessoa</button><button disabled={activeContactCount < 2} title={activeContactCount < 2 ? 'Cadastre pelo menos duas pessoas ativas' : 'Criar relacionamento'} onClick={() => setDialog('relationship')} className="inline-flex items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/10 px-3.5 py-2.5 text-sm font-semibold text-violet-200 hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-40"><Link2 className="size-4" /> Relacionar</button></div>{activeContactCount < 2 ? <p className="mt-2 text-right text-xs text-slate-500">Cadastre {2 - activeContactCount} {activeContactCount === 1 ? 'pessoa ativa' : 'pessoas ativas'} para criar relações.</p> : null}</div> : <span className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-400">Acesso de visualização</span>}
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo do CRM">
        {[{ label: 'Empresas', value: initialData.analytics.companies, icon: Building2, color: 'text-cyan-400' }, { label: 'Pessoas ativas', value: initialData.analytics.activeContacts, icon: Users, color: 'text-violet-400' }, { label: 'Relacionamentos', value: initialData.analytics.relationships, icon: GitBranch, color: 'text-pink-400' }, { label: 'Cobertura da rede', value: `${initialData.analytics.networkCoverage}%`, icon: MapPinned, color: 'text-emerald-400' }].map((item) => { const Icon = item.icon; return <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><Icon className={`size-5 ${item.color}`} /><span className="text-2xl font-bold text-slate-900 dark:text-white">{item.value}</span></div><p className="mt-3 text-xs font-medium text-slate-500">{item.label}</p></article> })}
      </section>

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block flex-1 lg:max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" /><span className="sr-only">Buscar empresas e pessoas</span><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder="Buscar nome, cidade, segmento ou tag..." /></label>
        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-950" aria-label="Modo de visualização">{([{ id: 'city', label: 'Cidade', icon: LayoutGrid }, { id: 'network', label: 'Rede', icon: GitBranch }, { id: 'list', label: 'Lista', icon: List }] as const).map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => setView(item.id)} aria-pressed={view === item.id} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${view === item.id ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}><Icon className="size-4" />{item.label}</button> })}</div>
      </div>

      {view === 'city' ? <CityView companies={companies} contacts={contacts} onEditContact={canEdit ? editContact : undefined} /> : null}
      {view === 'network' ? <NetworkView data={filteredData} /> : null}
      {view === 'list' ? <ListView companies={companies} contacts={contacts} onEditContact={canEdit ? editContact : undefined} /> : null}

      <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><FileText className="size-3.5" /> Persistência: {initialData.persistence === 'postgresql' ? 'PostgreSQL' : 'arquivo local atômico (desenvolvimento)'}</span><span>Perfil atual: {role}</span></footer>
      {dialog ? <CrmDialog kind={dialog} companies={initialData.companies} contacts={initialData.contacts} contactToEdit={contactToEdit} onClose={closeDialog} /> : null}
    </div>
  )
}
