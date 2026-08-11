'use client'

import { useCallback, useEffect, useState } from 'react'
import { CalendarClock, Check, Clock3, Loader2, Send, X } from 'lucide-react'

interface CalendarPost {
  id: string
  theme: string
  content: string
  status: string
  scheduledAt: string | null
  createdAt: string
  client: { name: string } | null
}

export default function CalendarPage() {
  const [posts, setPosts] = useState<CalendarPost[]>([])
  const [databaseConfigured, setDatabaseConfigured] = useState(true)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [dates, setDates] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)

  const loadPosts = useCallback(async () => {
    const response = await fetch('/api/calendar', { cache: 'no-store' })
    const payload = await response.json() as { posts?: CalendarPost[]; databaseConfigured?: boolean; error?: string }
    if (!response.ok) throw new Error(payload.error || 'Falha ao carregar o calendário.')
    setPosts(payload.posts || [])
    setDatabaseConfigured(payload.databaseConfigured !== false)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/calendar', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as { posts?: CalendarPost[]; databaseConfigured?: boolean; error?: string }
        if (!response.ok) throw new Error(payload.error || 'Falha ao carregar o calendário.')
        return payload
      })
      .then((payload) => {
        setPosts(payload.posts || [])
        setDatabaseConfigured(payload.databaseConfigured !== false)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setMessage(error instanceof Error ? error.message : 'Erro inesperado.')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  async function schedule(postId: string) {
    const value = dates[postId]
    if (!value) return setMessage('Escolha data e hora para agendar.')
    setBusy(postId)
    const response = await fetch(`/api/calendar/${postId}/schedule`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt: new Date(value).toISOString() }),
    })
    const payload = await response.json() as { error?: string }
    setMessage(response.ok ? 'Agendamento criado e aguardando aprovação.' : payload.error || 'Falha ao agendar.')
    if (response.ok) await loadPosts()
    setBusy(null)
  }

  async function decide(postId: string, approved: boolean) {
    setBusy(postId)
    const response = await fetch(`/api/calendar/${postId}/approval`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved, comment: approved ? 'Aprovado no calendário editorial' : 'Rejeitado no calendário editorial' }),
    })
    const payload = await response.json() as { error?: string }
    setMessage(response.ok ? (approved ? 'Post aprovado.' : 'Post rejeitado.') : payload.error || 'Falha ao registrar decisão.')
    setBusy(null)
    if (response.ok) setTimeout(() => void loadPosts(), 700)
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:p-8">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-400">Publicação</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Calendário editorial</h1>
        <p className="mt-2 text-sm text-slate-400">Agende, aprove e acompanhe o estado de cada conteúdo.</p>
      </header>
      {message ? <p role="status" className="mb-5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-300">{message}</p> : null}
      {!databaseConfigured ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-8 text-amber-200">Configure DATABASE_URL e execute as migrações para ativar o calendário durável.</div>
      ) : loading ? (
        <div className="flex items-center gap-3 text-slate-400"><Loader2 className="size-5 animate-spin" /> Carregando agenda…</div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <article key={post.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-400"><CalendarClock className="size-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-semibold text-slate-900 dark:text-white">{post.theme}</h2><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800">{post.status}</span></div>
                  <p className="mt-1 text-xs text-slate-500">{post.client?.name || 'Sem cliente'} · {post.scheduledAt ? new Date(post.scheduledAt).toLocaleString('pt-BR') : 'Sem agendamento'}</p>
                </div>
                {post.status === 'PENDING_APPROVAL' ? (
                  <div className="flex gap-2"><button onClick={() => void decide(post.id, true)} disabled={busy === post.id} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950"><Check className="size-4" /> Aprovar</button><button onClick={() => void decide(post.id, false)} disabled={busy === post.id} className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 px-3 py-2 text-sm text-rose-400"><X className="size-4" /> Rejeitar</button></div>
                ) : (
                  <div className="flex flex-wrap gap-2"><label className="relative"><Clock3 className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-500" /><input type="datetime-local" value={dates[post.id] || ''} onChange={(event) => setDates((current) => ({ ...current, [post.id]: event.target.value }))} className="rounded-xl border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label><button onClick={() => void schedule(post.id)} disabled={busy === post.id} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-sm font-semibold text-white"><Send className="size-4" /> Agendar</button></div>
                )}
              </div>
            </article>
          ))}
          {posts.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center text-slate-500">Nenhum post persistido no banco.</div> : null}
        </div>
      )}
    </div>
  )
}
