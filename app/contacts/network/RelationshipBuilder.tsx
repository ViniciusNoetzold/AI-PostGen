'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Building2,
  Info,
  Link2,
  Loader2,
  MoveRight,
  Pencil,
  Plus,
  UserPlus,
  X,
} from 'lucide-react'
import { hasRole, type AppRole } from '@/lib/auth'
import type { CrmContact, CrmSnapshot } from '@/lib/server/crm-repository'
import { PanZoomControls } from '@/components/PanZoomControls'
import { usePanZoom } from '@/lib/hooks/use-pan-zoom'

type Position = { x: number; y: number }
type LinkDraft = { source: CrmContact; target: CrmContact }

const categoryLabels: Record<CrmContact['category'], string> = {
  OWNER: 'Proprietário(a)',
  COFOUNDER: 'Cofundador(a)',
  EMPLOYEE: 'Funcionário(a)',
  CUSTOMER: 'Consumidor(a)',
  LEAD: 'Potencial cliente',
  PARTNER: 'Parceiro(a)',
  OTHER: 'Outro',
}

const relationshipTypes = {
  CUSTOMER: 'Cliente', PARTNER: 'Parceiro', SUPPLIER: 'Fornecedor', REFERRAL: 'Indicação', TEAM: 'Equipe', OTHER: 'Outro',
} as const

const fieldClass = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none [color-scheme:dark] focus:border-cyan-500'
const MAP_ZOOM_STEP = 0.2

function imageSource(url: string): string {
  return url.startsWith('/api/media/') ? url : `/api/image-proxy?url=${encodeURIComponent(url)}`
}

function PersonAvatar({ contact, size = 48 }: { contact: CrmContact; size?: number }) {
  const [imageFailed, setImageFailed] = useState(false)
  if (contact.photoUrl && !imageFailed) return <Image src={imageSource(contact.photoUrl)} alt={`Foto de ${contact.name}`} width={size} height={size} sizes={`${size}px`} unoptimized onError={() => setImageFailed(true)} className="rounded-full object-cover" style={{ width: size, height: size }} />
  const initials = contact.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  return <span className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-pink-500 font-bold text-white" style={{ width: size, height: size }}>{initials}</span>
}

async function mutate(endpoint: string, method: 'POST' | 'PATCH', body: Record<string, unknown>): Promise<void> {
  const response = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const payload = await response.json() as { error?: string }
  if (!response.ok) throw new Error(payload.error || 'Não foi possível salvar.')
}

function LinkDialog({ draft, onClose, onSaved }: { draft: LinkDraft; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true); setError(null)
    const values = Object.fromEntries(new FormData(event.currentTarget))
    try {
      await mutate('/api/relationships', 'POST', { sourceClientId: draft.source.id, targetClientId: draft.target.id, type: values.type, label: values.label, notes: values.notes, strength: Number(values.strength), active: true })
      onSaved()
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível criar a conexão.')
    } finally { setSaving(false) }
  }
  return <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/80 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-label="Confirmar conexão"><form onSubmit={submit} className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-400">Nova seta</p><h2 className="mt-1 text-xl font-bold text-white">{draft.source.name} → {draft.target.name}</h2></div><button type="button" onClick={onClose} aria-label="Fechar" className="text-slate-400"><X /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-xs text-slate-300">Tipo<select name="type" defaultValue="TEAM" className={fieldClass}>{Object.entries(relationshipTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="grid gap-1.5 text-xs text-slate-300">Força<select name="strength" defaultValue="3" className={fieldClass}>{[1,2,3,4,5].map((value) => <option key={value}>{value} de 5</option>)}</select></label><label className="grid gap-1.5 text-xs text-slate-300 sm:col-span-2">Rótulo da seta<input name="label" maxLength={100} className={fieldClass} placeholder="Ex.: trabalha com, lidera, atende" /></label><label className="grid gap-1.5 text-xs text-slate-300 sm:col-span-2">Observações<textarea name="notes" maxLength={1000} className={`${fieldClass} min-h-20`} /></label>{error ? <p className="text-sm text-rose-400 sm:col-span-2">{error}</p> : null}<div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-400">Cancelar</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950">{saving ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />} Criar conexão</button></div></div></form></div>
}

function AddPersonDialog({ companyId, unassigned, onClose, onSaved }: { companyId: string | null; unassigned: CrmContact[]; onClose: () => void; onSaved: () => void }) {
  const [mode, setMode] = useState<'new' | 'existing'>('new')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(null)
    const values = Object.fromEntries(new FormData(event.currentTarget))
    try {
      if (mode === 'existing') {
        await mutate(`/api/contacts/${values.contactId}`, 'PATCH', { companyId: companyId || '', category: values.category, jobTitle: values.jobTitle, active: true })
      } else {
        await mutate('/api/contacts', 'POST', { name: values.name, email: values.email, companyId: companyId || '', category: values.category, jobTitle: values.jobTitle, tags: values.category === 'CUSTOMER' ? ['consumidor'] : [], active: true })
      }
      onSaved()
    } catch (caught: unknown) { setError(caught instanceof Error ? caught.message : 'Não foi possível adicionar a pessoa.') }
    finally { setSaving(false) }
  }
  const defaultCategory = companyId ? 'EMPLOYEE' : 'CUSTOMER'
  return <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/80 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-label="Adicionar pessoa à rede"><form onSubmit={submit} className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-400">Rede</p><h2 className="mt-1 text-xl font-bold text-white">{companyId ? 'Adicionar à empresa' : 'Novo consumidor'}</h2></div><button type="button" onClick={onClose} aria-label="Fechar" className="text-slate-400"><X /></button></div>{companyId && unassigned.length > 0 ? <div className="mt-5 flex rounded-xl bg-slate-950 p-1"><button type="button" onClick={() => setMode('new')} className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${mode === 'new' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>Nova pessoa</button><button type="button" onClick={() => setMode('existing')} className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${mode === 'existing' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>Pessoa existente</button></div> : null}<div className="mt-5 grid gap-4 sm:grid-cols-2">{mode === 'existing' ? <label className="grid gap-1.5 text-xs text-slate-300 sm:col-span-2">Pessoa<select required name="contactId" className={fieldClass} defaultValue=""><option value="" disabled>Selecione</option>{unassigned.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}</select></label> : <><label className="grid gap-1.5 text-xs text-slate-300">Nome<input required name="name" maxLength={120} className={fieldClass} autoFocus /></label><label className="grid gap-1.5 text-xs text-slate-300">E-mail<input name="email" type="email" maxLength={320} className={fieldClass} /></label></>}<label className="grid gap-1.5 text-xs text-slate-300">Papel<select name="category" defaultValue={defaultCategory} className={fieldClass}>{Object.entries(categoryLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="grid gap-1.5 text-xs text-slate-300">Cargo / função<input name="jobTitle" maxLength={120} className={fieldClass} placeholder={companyId ? 'Ex.: Comercial' : 'Ex.: Cliente recorrente'} /></label>{error ? <p className="text-sm text-rose-400 sm:col-span-2">{error}</p> : null}<div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-400">Cancelar</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950">{saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Adicionar</button></div></div></form></div>
}

function PersonPanel({ contact, companies, canEdit, onClose, onSaved }: { contact: CrmContact; companies: CrmSnapshot['companies']; canEdit: boolean; onClose: () => void; onSaved: () => void }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(null)
    const values = Object.fromEntries(new FormData(event.currentTarget))
    try { await mutate(`/api/contacts/${contact.id}`, 'PATCH', { name: values.name, companyId: values.companyId, category: values.category, jobTitle: values.jobTitle, email: values.email, phone: values.phone, active: true }); onSaved() }
    catch (caught: unknown) { setError(caught instanceof Error ? caught.message : 'Não foi possível atualizar.') }
    finally { setSaving(false) }
  }
  return <aside className="fixed inset-y-0 right-0 z-[75] w-full max-w-md overflow-y-auto border-l border-slate-700 bg-slate-900 p-6 shadow-2xl" aria-label={`Informações de ${contact.name}`}><div className="flex justify-between"><div className="flex items-center gap-3"><PersonAvatar contact={contact} size={54} /><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-400">Pessoa</p><h2 className="text-xl font-bold text-white">{contact.name}</h2></div></div><button onClick={onClose} aria-label="Fechar informações" className="text-slate-400"><X /></button></div>{editing ? <form onSubmit={submit} className="mt-7 grid gap-4"><label className="grid gap-1.5 text-xs text-slate-300">Nome<input name="name" required defaultValue={contact.name} className={fieldClass} /></label><label className="grid gap-1.5 text-xs text-slate-300">Empresa<select name="companyId" defaultValue={contact.companyId || ''} className={fieldClass}><option value="">Sem empresa</option>{companies.filter((company) => company.active).map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label><label className="grid gap-1.5 text-xs text-slate-300">Papel<select name="category" defaultValue={contact.category} className={fieldClass}>{Object.entries(categoryLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="grid gap-1.5 text-xs text-slate-300">Cargo / função<input name="jobTitle" defaultValue={contact.jobTitle || ''} className={fieldClass} /></label><label className="grid gap-1.5 text-xs text-slate-300">E-mail<input name="email" type="email" defaultValue={contact.email || ''} className={fieldClass} /></label><label className="grid gap-1.5 text-xs text-slate-300">Telefone<input name="phone" defaultValue={contact.phone || ''} className={fieldClass} /></label>{error ? <p className="text-sm text-rose-400">{error}</p> : null}<button disabled={saving} className="rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950">{saving ? 'Salvando...' : 'Salvar alterações'}</button></form> : <div className="mt-7 space-y-4"><div className="rounded-2xl bg-slate-950 p-4"><p className="text-xs text-slate-500">Papel na rede</p><p className="mt-1 font-semibold text-violet-300">{categoryLabels[contact.category]}</p><p className="mt-1 text-sm text-slate-400">{contact.jobTitle || 'Função não informada'}</p></div><dl className="grid gap-3 text-sm"><div><dt className="text-xs text-slate-500">Empresa</dt><dd className="text-slate-200">{contact.companyName || 'Contato independente'}</dd></div><div><dt className="text-xs text-slate-500">E-mail</dt><dd className="text-slate-200">{contact.email || 'Não informado'}</dd></div><div><dt className="text-xs text-slate-500">Telefone</dt><dd className="text-slate-200">{contact.phone || 'Não informado'}</dd></div><div><dt className="text-xs text-slate-500">Tags</dt><dd className="text-slate-200">{contact.tags.join(', ') || 'Nenhuma'}</dd></div></dl>{canEdit ? <button onClick={() => setEditing(true)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-white hover:border-cyan-500/50"><Pencil className="size-4" /> Editar cadastro</button> : null}</div>}</aside>
}

function AlphabeticalConsumers({ contacts, onSelect, onAdd }: { contacts: CrmContact[]; onSelect: (contact: CrmContact) => void; onAdd?: () => void }) {
  const sorted = [...contacts].sort((a,b) => a.name.localeCompare(b.name, 'pt-BR'))
  return <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">Rua dos consumidores</p><h2 className="mt-1 text-lg font-bold text-white">Pessoas sem empresa, em ordem alfabética</h2></div>{onAdd ? <button onClick={onAdd} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-3 py-2 text-xs font-bold text-slate-950"><UserPlus className="size-4" /> Novo consumidor</button> : null}</div><div className="relative mt-5 space-y-2 pl-10 before:absolute before:bottom-4 before:left-4 before:top-4 before:w-px before:bg-slate-600">{sorted.map((contact) => <button key={contact.id} onClick={() => onSelect(contact)} className="group relative flex w-full items-center gap-3 rounded-xl bg-slate-950/70 p-3 text-left hover:bg-slate-800 before:absolute before:-left-6 before:top-1/2 before:h-px before:w-6 before:bg-slate-600"><span className="grid size-8 place-items-center rounded-lg bg-amber-500/10 text-xs font-bold text-amber-300">{contact.name[0].toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-white">{contact.name}</span><span className="block text-xs text-slate-500">{categoryLabels[contact.category]} · {contact.email || 'sem e-mail'}</span></span><Info className="size-4 text-slate-600 group-hover:text-cyan-400" /></button>)}{sorted.length === 0 ? <p className="py-5 text-sm text-slate-500">Nenhum consumidor independente cadastrado.</p> : null}</div></section>
}

export function RelationshipBuilder({ initialData, role }: { initialData: CrmSnapshot; role: AppRole }) {
  const router = useRouter()
  const {
    containerRef: mapCanvasRef,
    viewport: mapViewport,
    isPanning: isMapPanning,
    minScale: mapMinScale,
    maxScale: mapMaxScale,
    canReset: canResetMap,
    zoomBy: zoomMapBy,
    reset: resetMap,
    handlers: mapPanHandlers,
  } = usePanZoom<HTMLElement>({ minScale: 0.55, maxScale: 2.5 })
  const [refreshing, startTransition] = useTransition()
  const activeCompanies = initialData.companies.filter((company) => company.active)
  const [companyId, setCompanyId] = useState(activeCompanies[0]?.id || '')
  const company = activeCompanies.find((item) => item.id === companyId) || null
  const members = useMemo(() => initialData.contacts.filter((contact) => contact.active && contact.companyId === companyId), [initialData.contacts, companyId])
  const independent = useMemo(() => initialData.contacts.filter((contact) => contact.active && (!contact.companyId || contact.category === 'CUSTOMER')), [initialData.contacts])
  const [overrides, setOverrides] = useState<Record<string, Record<string, Position>>>({})
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [linkingSource, setLinkingSource] = useState<string | null>(null)
  const linkingSourceRef = useRef<string | null>(null)
  const [cursor, setCursor] = useState<Position>({ x: 50, y: 50 })
  const [linkDraft, setLinkDraft] = useState<LinkDraft | null>(null)
  const [addMode, setAddMode] = useState<'company' | 'consumer' | null>(null)
  const [selectedPerson, setSelectedPerson] = useState<CrmContact | null>(null)
  const movedRef = useRef(false)
  const canEdit = hasRole(role, 'editor')
  const positions = useMemo(() => new Map(members.map((contact, index) => {
    const angle = (index / Math.max(1, members.length)) * Math.PI * 2 - Math.PI / 2
    const fallback = { x: 50 + Math.cos(angle) * 34, y: 50 + Math.sin(angle) * 32 }
    return [contact.id, overrides[companyId]?.[contact.id] || fallback]
  })), [members, overrides, companyId])
  const visibleRelationships = initialData.relationships.filter((relationship) => relationship.active && positions.has(relationship.sourceClientId) && positions.has(relationship.targetClientId))

  function point(event: React.PointerEvent): Position {
    const rect = mapCanvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 50, y: 50 }
    const localX = (event.clientX - rect.left - mapViewport.x) / mapViewport.scale
    const localY = (event.clientY - rect.top - mapViewport.y) / mapViewport.scale
    return { x: Math.max(5, Math.min(95, (localX / rect.width) * 100)), y: Math.max(8, Math.min(92, (localY / rect.height) * 100)) }
  }
  function move(event: React.PointerEvent) {
    const next = point(event)
    if (linkingSourceRef.current) { movedRef.current = true; setCursor(next) }
    if (draggingId) {
      movedRef.current = true
      setOverrides((current) => ({ ...current, [companyId]: { ...current[companyId], [draggingId]: next } }))
    }
  }
  function finishLink(target: CrmContact) {
    const sourceId = linkingSourceRef.current || linkingSource
    if (!sourceId || sourceId === target.id) return
    const source = members.find((contact) => contact.id === sourceId)
    if (source) { movedRef.current = true; setLinkDraft({ source, target }) }
    linkingSourceRef.current = null
    setLinkingSource(null)
  }
  function release(event: React.PointerEvent) {
    if (linkingSourceRef.current) {
      const targetElement = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-contact-id]')
      const target = members.find((contact) => contact.id === targetElement?.dataset.contactId)
      if (target && target.id !== linkingSourceRef.current) finishLink(target)
      setDraggingId(null)
      return
    }
    setDraggingId(null)
  }
  function refreshed() { startTransition(() => router.refresh()) }

  return <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 md:p-8"><header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><Link href="/contacts" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="size-4" /> Voltar para Clientes</Link><p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Construtor visual</p><h1 className="mt-1 text-3xl font-bold text-white">Mapa de relacionamentos</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Arraste as bolhas para organizar. Use Shift + arraste para mover o mapa e o scroll para dar zoom. Puxe o conector lateral para relacionar pessoas.</p></div><div className="flex flex-wrap gap-2"><select value={companyId} onChange={(event) => { setCompanyId(event.target.value); resetMap() }} className={`${fieldClass} min-w-56`} aria-label="Empresa central">{activeCompanies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{canEdit ? <button disabled={!company} onClick={() => setAddMode('company')} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-40"><UserPlus className="size-4" /> Adicionar à empresa</button> : null}</div></header>

  <section
    ref={mapCanvasRef}
    onWheel={mapPanHandlers.onWheel}
    onPointerDownCapture={mapPanHandlers.onPointerDownCapture}
    onPointerMove={(event) => { mapPanHandlers.onPointerMove(event); if (!isMapPanning) move(event) }}
    onPointerUp={(event) => { mapPanHandlers.onPointerUp(event); if (!isMapPanning) release(event) }}
    onPointerCancel={(event) => { mapPanHandlers.onPointerCancel(event); if (!isMapPanning) release(event) }}
    onLostPointerCapture={mapPanHandlers.onLostPointerCapture}
    onClickCapture={mapPanHandlers.onClickCapture}
    className={`relative h-[680px] touch-none overflow-hidden rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_center,_#172554_0,_#0f172a_38%,_#020617_78%)] select-none ${isMapPanning ? 'cursor-grabbing' : ''}`}
    aria-label="Área visual de relacionamentos. Use o scroll para zoom e Shift mais arraste para mover o mapa."
  >
    <div data-pan-zoom-layer className="absolute inset-0 will-change-transform" style={{ transform: `translate3d(${mapViewport.x}px, ${mapViewport.y}px, 0) scale(${mapViewport.scale})`, transformOrigin: '0 0' }}>
    <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#22d3ee" /></marker></defs>{members.map((contact) => { const target = positions.get(contact.id)!; return <line key={`member-${contact.id}`} x1="50" y1="50" x2={target.x} y2={target.y} stroke="#334155" strokeWidth="0.35" markerEnd="url(#arrow)" /> })}{visibleRelationships.map((relation) => { const source = positions.get(relation.sourceClientId)!; const target = positions.get(relation.targetClientId)!; return <line key={relation.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="#22d3ee" strokeWidth={0.25 + relation.strength * 0.08} markerEnd="url(#arrow)" /> })}{linkingSource && positions.get(linkingSource) ? <line x1={positions.get(linkingSource)!.x} y1={positions.get(linkingSource)!.y} x2={cursor.x} y2={cursor.y} stroke="#f472b6" strokeWidth="0.5" strokeDasharray="1 1" markerEnd="url(#arrow)" /> : null}</svg>
    {company ? <button type="button" className="absolute left-1/2 top-1/2 z-10 w-44 -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-cyan-400/50 bg-slate-900 p-5 text-center shadow-2xl shadow-cyan-950/50"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-cyan-500 text-slate-950"><Building2 className="size-7" /></span><span className="mt-3 block truncate font-bold text-white">{company.name}</span><span className="mt-1 block text-xs text-cyan-300">Centro da rede</span></button> : <div className="absolute inset-0 grid place-items-center text-slate-500">Cadastre uma empresa para iniciar o mapa.</div>}
    {members.map((contact) => { const position = positions.get(contact.id)!; return <div key={contact.id} data-contact-id={contact.id} className="absolute z-20 -translate-x-1/2 -translate-y-1/2" style={{ left: `${position.x}%`, top: `${position.y}%` }} onPointerDown={(event) => { if ((event.target as HTMLElement).closest('[data-connector]')) return; movedRef.current = false; if (!linkingSourceRef.current) setDraggingId(contact.id) }} onClick={() => { if (linkingSourceRef.current && linkingSourceRef.current !== contact.id) { finishLink(contact); return } if (!movedRef.current) setSelectedPerson(contact) }}><button type="button" className="group relative flex w-36 flex-col items-center rounded-2xl border border-slate-700 bg-slate-900/95 p-3 shadow-xl hover:border-violet-400"><PersonAvatar contact={contact} /><span className="mt-2 max-w-full truncate text-sm font-bold text-white">{contact.name}</span><span className="mt-1 max-w-full truncate text-[10px] text-violet-300">{categoryLabels[contact.category]}</span><span data-connector onPointerDown={(event) => { event.stopPropagation(); movedRef.current = false; linkingSourceRef.current = contact.id; setLinkingSource(contact.id); setCursor(position) }} onClick={(event) => event.stopPropagation()} className="absolute -right-3 top-1/2 grid size-7 -translate-y-1/2 cursor-crosshair place-items-center rounded-full bg-pink-500 text-white shadow-lg ring-4 ring-slate-950" title="Puxar conexão"><MoveRight className="size-4" /></span></button></div> })}
    {visibleRelationships.map((relation) => { const source = positions.get(relation.sourceClientId)!; const target = positions.get(relation.targetClientId)!; return <span key={`label-${relation.id}`} className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded bg-slate-950/90 px-2 py-1 text-[9px] text-cyan-300" style={{ left: `${(source.x + target.x) / 2}%`, top: `${(source.y + target.y) / 2}%` }}>{relation.label || relationshipTypes[relation.type]}</span> })}
    </div>
    <PanZoomControls scale={mapViewport.scale} minScale={mapMinScale} maxScale={mapMaxScale} canReset={canResetMap} onZoomOut={() => zoomMapBy(-MAP_ZOOM_STEP)} onZoomIn={() => zoomMapBy(MAP_ZOOM_STEP)} onReset={resetMap} />
    <div className="pointer-events-none absolute left-1/2 top-4 z-30 hidden -translate-x-1/2 rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1.5 text-[11px] text-slate-400 backdrop-blur sm:block">Scroll: zoom · Shift + arraste: mover</div>
    <div className="absolute bottom-4 left-4 rounded-xl border border-slate-700 bg-slate-950/85 px-3 py-2 text-xs text-slate-400"><span className="text-cyan-300">Seta cinza:</span> vínculo com a empresa · <span className="text-pink-300">Ponto rosa:</span> arraste para conectar pessoas</div>{refreshing ? <div className="absolute inset-0 z-40 grid place-items-center bg-slate-950/40"><Loader2 className="size-8 animate-spin text-cyan-400" /></div> : null}
  </section>

  <AlphabeticalConsumers contacts={independent} onSelect={setSelectedPerson} onAdd={canEdit ? () => setAddMode('consumer') : undefined} />
  {linkDraft ? <LinkDialog draft={linkDraft} onClose={() => setLinkDraft(null)} onSaved={() => { setLinkDraft(null); refreshed() }} /> : null}
  {addMode ? <AddPersonDialog companyId={addMode === 'company' ? companyId : null} unassigned={initialData.contacts.filter((contact) => contact.active && !contact.companyId)} onClose={() => setAddMode(null)} onSaved={() => { setAddMode(null); refreshed() }} /> : null}
  {selectedPerson ? <PersonPanel contact={selectedPerson} companies={initialData.companies} canEdit={canEdit} onClose={() => setSelectedPerson(null)} onSaved={() => { setSelectedPerson(null); refreshed() }} /> : null}
  </div>
}
