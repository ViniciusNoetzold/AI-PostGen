'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  Archive,
  ArrowRight,
  FileSpreadsheet,
  FileText,
  Film,
  Globe,
  Image as ImageIcon,
  Images,
  PenTool,
  Users,
  Video,
} from 'lucide-react'
import type { DashboardStats } from '@/lib/dashboard'

export default function DashboardPage() {
  const [data, setData] = useState<DashboardStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadStats() {
      try {
        const response = await fetch('/api/dashboard/stats', {
          cache: 'no-store',
          signal: controller.signal,
        })
        const payload: unknown = await response.json()
        if (!response.ok) throw new Error('Não foi possível carregar as estatísticas.')
        setData(payload as DashboardStats)
      } catch (fetchError: unknown) {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return
        setError(fetchError instanceof Error ? fetchError.message : 'Erro inesperado no dashboard.')
      }
    }

    void loadStats()
    return () => controller.abort()
  }, [])

  const maxDailyPosts = Math.max(1, ...(data?.postsByDay.map((item) => item.posts) ?? [0]))

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight dark:text-white">Visão geral</h1>
          <p className="text-slate-400 mt-1">Volumetria real do vault e do Product Studio.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/ai-post-gen" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-pink-500/20">
            <PenTool className="w-5 h-5" />
            AI Post Gen
          </Link>
          <Link href="/studio" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-cyan-500/20">
            <ImageIcon className="w-5 h-5" />
            Product Studio
          </Link>
          <Link href="/orcamentos" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20">
            <FileSpreadsheet className="w-5 h-5" />
            Orçamentos (QuotePRO)
          </Link>
          <Link href="/scraper" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-violet-500/20">
            <Globe className="w-5 h-5" />
            Web Scraping Pro
          </Link>
          <Link href="/transcricao" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-red-500/20">
            <Video className="w-5 h-5" />
            Transcritor YouTube
          </Link>
        </div>
      </header>

      {error ? (
        <div role="alert" className="rounded-2xl border border-pink-500/30 bg-pink-50 p-6 text-pink-700 dark:bg-slate-900 dark:text-pink-300">
          {error}
        </div>
      ) : !data ? (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-8 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <div className="w-5 h-5 border-2 border-t-transparent border-slate-400 rounded-full animate-spin" />
          Lendo estatísticas do vault...
        </div>
      ) : (
        <>
          <section aria-label="Indicadores principais" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {[
              { label: 'Posts gerados', value: data.totals.postsGenerated, detail: `${data.totals.postsToday} hoje`, icon: FileText },
              { label: 'Imagens vinculadas', value: data.totals.imageAssets, detail: `${data.totals.carouselPosts} carrosséis`, icon: Images },
              { label: 'Vídeos do Studio', value: data.totals.studioVideos, detail: 'rastreados localmente', icon: Film },
              { label: 'Clientes ativos', value: data.totals.activeClients, detail: `${data.totals.clients} no vault`, icon: Users },
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <article key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-6 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-400">{stat.label}</p>
                      <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                      <p className="text-xs text-slate-500 mt-2">{stat.detail}</p>
                    </div>
                    <span className="rounded-xl bg-slate-100 p-3 text-cyan-600 dark:bg-slate-800 dark:text-cyan-400">
                      <Icon className="w-5 h-5" />
                    </span>
                  </div>
                </article>
              )
            })}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 lg:col-span-3">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                    <Activity className="w-5 h-5 text-cyan-400" />
                    Posts nos últimos 7 dias
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Baseado na data dos arquivos Markdown.</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Archive className="w-4 h-4" />
                  {data.totals.archivedPosts} arquivados
                </div>
              </div>

              <div className="h-64 flex items-end gap-2 sm:gap-4" role="img" aria-label="Gráfico de posts gerados nos últimos sete dias">
                {data.postsByDay.map((point) => (
                  <div key={point.date} className="h-full flex-1 min-w-0 flex flex-col justify-end items-center gap-2 group">
                    <span className="text-xs font-semibold text-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity">
                      {point.posts}
                    </span>
                    <div className="flex h-44 w-full items-end overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-950">
                      <div
                        className="w-full min-h-1 bg-gradient-to-t from-cyan-600 to-blue-400 rounded-lg transition-[height] duration-500"
                        style={{ height: `${Math.max(3, (point.posts / maxDailyPosts) * 100)}%` }}
                        title={`${point.posts} posts em ${point.date}`}
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 capitalize truncate max-w-full">{point.label}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
              <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">Atividade recente</h2>
              <p className="text-sm text-slate-500 mb-5">Posts e vídeos registrados.</p>
              <div className="space-y-3">
                {data.recentActivity.length === 0 ? (
                  <p className="py-12 text-center text-slate-500">Nenhuma atividade encontrada.</p>
                ) : (
                  data.recentActivity.map((activity) => (
                    <Link
                      key={`${activity.kind}-${activity.id}`}
                      href={activity.kind === 'studio-video' ? '/studio' : '/ai-post-gen'}
                      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-cyan-500/40 dark:border-slate-800 dark:bg-slate-950"
                    >
                      <span className="rounded-lg bg-slate-200 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {activity.kind === 'studio-video' ? <Film className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">{activity.theme}</span>
                        <span className="block text-xs text-slate-500 truncate">
                          {activity.client} · {new Date(activity.date).toLocaleDateString('pt-BR')}
                        </span>
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                    </Link>
                  ))
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
