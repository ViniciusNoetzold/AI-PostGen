import { Activity, Archive, BarChart3, Building2, Film, GitBranch, Images, MapPinned, Users } from 'lucide-react'
import { getDashboardStats } from '@/lib/server/dashboard-stats'
import { getCrmSnapshot } from '@/lib/server/crm-repository'

export const dynamic = 'force-dynamic'

function ProgressList({ items, emptyLabel }: { items: Array<{ name: string; count: number }>; emptyLabel: string }) {
  const maximum = Math.max(1, ...items.map((item) => item.count))
  if (items.length === 0) return <p className="py-8 text-center text-sm text-slate-500">{emptyLabel}</p>
  return (
    <div className="mt-6 space-y-4">
      {items.map((item) => (
        <div key={item.name}>
          <div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="truncate text-slate-300">{item.name}</span><span className="font-semibold text-white">{item.count}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-400" style={{ width: `${Math.max(6, (item.count / maximum) * 100)}%` }} /></div>
        </div>
      ))}
    </div>
  )
}

export default async function ReportsPage() {
  const [stats, crm] = await Promise.all([getDashboardStats(), getCrmSnapshot()])
  const maxPosts = Math.max(1, ...stats.postsByClient.map((client) => client.posts))
  const coverage = crm.analytics.networkCoverage

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 md:p-8">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-400">Análise operacional e comercial</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Relatórios</h1>
        <p className="mt-2 text-sm text-slate-400">Conteúdo, empresas e relacionamentos consolidados a partir das fontes realmente persistidas.</p>
      </header>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo comercial">
        {[
          { label: 'Empresas ativas', value: crm.analytics.companies, icon: Building2, color: 'text-cyan-400' },
          { label: 'Pessoas ativas', value: crm.analytics.activeContacts, icon: Users, color: 'text-violet-400' },
          { label: 'Conexões ativas', value: crm.analytics.relationships, icon: GitBranch, color: 'text-pink-400' },
          { label: 'Pessoas vinculadas', value: `${coverage}%`, icon: MapPinned, color: 'text-emerald-400' },
        ].map((item) => {
          const Icon = item.icon
          return <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><Icon className={`size-5 ${item.color}`} /><p className="mt-5 text-3xl font-bold text-slate-900 dark:text-white">{item.value}</p><p className="mt-1 text-sm text-slate-500">{item.label}</p></article>
        })}
      </section>

      <div className="mb-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><BarChart3 className="size-5 text-violet-400" /> Distribuição por cidade</h2>
          <ProgressList items={crm.analytics.topCities} emptyLabel="Informe a cidade das empresas para gerar esta leitura." />
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <h2 className="font-semibold text-slate-900 dark:text-white">Saúde da rede</h2>
          <div className="mt-6 flex items-center gap-5">
            <div className="grid size-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#22d3ee ${coverage * 3.6}deg, #1e293b 0deg)` }}><div className="grid size-20 place-items-center rounded-full bg-slate-900 text-2xl font-bold text-white">{coverage}%</div></div>
            <div className="space-y-3 text-sm"><p className="text-slate-300"><strong className="text-white">{crm.analytics.assignedContacts}</strong> pessoas estão dentro de uma empresa.</p><p className="text-slate-400"><strong className="text-amber-300">{crm.analytics.unassignedContacts}</strong> ainda aguardam vínculo.</p><p className="text-xs text-slate-500">Fonte: {crm.persistence === 'postgresql' ? 'PostgreSQL' : 'CRM local de desenvolvimento'}</p></div>
          </div>
        </section>
      </div>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo de conteúdo">
        {[
          { label: 'Posts', value: stats.totals.postsGenerated, icon: Activity, color: 'text-cyan-400' },
          { label: 'Imagens vinculadas', value: stats.totals.imageAssets, icon: Images, color: 'text-pink-400' },
          { label: 'Vídeos', value: stats.totals.studioVideos, icon: Film, color: 'text-violet-400' },
          { label: 'Arquivados', value: stats.totals.archivedPosts, icon: Archive, color: 'text-amber-400' },
        ].map((item) => {
          const Icon = item.icon
          return <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><Icon className={`size-5 ${item.color}`} /><p className="mt-5 text-3xl font-bold text-slate-900 dark:text-white">{item.value}</p><p className="mt-1 text-sm text-slate-500">{item.label}</p></article>
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><BarChart3 className="size-5 text-cyan-500" /> Produção por cliente</h2>
          <div className="mt-6 space-y-5">
            {stats.postsByClient.map((client) => <div key={client.name}><div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="truncate text-slate-300">{client.name}</span><span className="font-semibold text-white">{client.posts}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${Math.max(client.posts > 0 ? 6 : 0, (client.posts / maxPosts) * 100)}%` }} /></div></div>)}
            {stats.postsByClient.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Nenhum post registrado.</p> : null}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <h2 className="font-semibold text-slate-900 dark:text-white">Últimos 7 dias</h2>
          <div className="mt-6 grid grid-cols-7 items-end gap-2" role="img" aria-label="Posts gerados nos últimos sete dias">
            {stats.postsByDay.map((day) => {
              const maxDay = Math.max(1, ...stats.postsByDay.map((item) => item.posts))
              return <div key={day.date} className="flex h-52 min-w-0 flex-col items-center justify-end gap-2"><span className="text-xs font-semibold text-cyan-300">{day.posts}</span><div className="flex h-36 w-full items-end overflow-hidden rounded-lg bg-slate-950"><div className="w-full rounded-lg bg-gradient-to-t from-violet-600 to-pink-400" style={{ height: `${Math.max(3, (day.posts / maxDay) * 100)}%` }} /></div><span className="max-w-full truncate text-[10px] capitalize text-slate-500">{day.label}</span></div>
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
