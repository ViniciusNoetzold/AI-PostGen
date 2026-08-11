'use client'

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import type { LinkObject, NodeObject } from 'react-force-graph-2d'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Brain, PieChart as PieChartIcon, BarChart2 } from 'lucide-react'
import { PanZoomControls } from '@/components/PanZoomControls'
import { usePanZoom } from '@/lib/hooks/use-pan-zoom'

// ForceGraph2D uses browser-only APIs (window/document), so it must be
// loaded dynamically on the client side only (ssr: false)
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
      Carregando grafo neural...
    </div>
  ),
})

interface VaultNodeData {
  id: string
  name: string
  group: 'root' | 'folder' | 'file'
  val: number
}

interface VaultLinkData {
  type: 'hierarchy' | 'reference'
}

type GraphData = {
  nodes: NodeObject<VaultNodeData>[]
  links: LinkObject<VaultNodeData, VaultLinkData>[]
}

type StatsData = {
  postsPerClient: { name: string; value: number }[]
  themes: { name: string; value: number }[]
}

export default function VaultVisualization({ darkMode = false }: { darkMode?: boolean }) {
  const [view, setView] = useState<'neural' | 'pie' | 'bar'>('neural')
  const {
    containerRef: chartCanvasRef,
    viewport: chartViewport,
    isPanning: isChartPanning,
    minScale: chartMinScale,
    maxScale: chartMaxScale,
    canReset: canResetChart,
    zoomBy: zoomChartBy,
    reset: resetChart,
    handlers: chartPanHandlers,
  } = usePanZoom<HTMLDivElement>({ minScale: 0.5, maxScale: 4 })
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] })
  const [statsData, setStatsData] = useState<StatsData>({ postsPerClient: [], themes: [] })
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/graph')
      .then(res => res.json())
      .then(data => {
        if (data.graph) setGraphData(data.graph)
        if (data.stats) setStatsData(data.stats)
      })
      .catch(console.error)
  }, [])

  const changeView = (nextView: 'neural' | 'pie' | 'bar') => {
    setView(nextView)
    resetChart()
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        setDimensions({
          width: container.clientWidth,
          height: container.clientHeight || 500,
        })
      })
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e']

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-slate-700">
      <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Visualização do Banco de Dados</h2>
        <div className="flex gap-2">
          <button
            onClick={() => changeView('neural')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'neural' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-600'
            }`}
          >
            <Brain className="w-4 h-4" />
            Neural Brain
          </button>
          <button
            onClick={() => changeView('pie')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'pie' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-600'
            }`}
          >
            <PieChartIcon className="w-4 h-4" />
            Temas (Pizza)
          </button>
          <button
            onClick={() => changeView('bar')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'bar' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-600'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            Posts por Cliente
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[500px] relative w-full" ref={containerRef}>
        {view === 'neural' && (
          <div className="absolute inset-0" data-native-pan-zoom>
            <ForceGraph2D
              graphData={graphData}
              width={dimensions.width}
              height={dimensions.height}
              nodeLabel="name"
              nodeColor={node => {
                if (node.group === 'root') return '#f59e0b'
                if (node.group === 'folder') return '#3b82f6'
                return '#10b981'
              }}
              nodeVal={node => node.val || 1}
              linkColor={link => (link.type === 'hierarchy' ? (darkMode ? '#475569' : '#cbd5e1') : '#f87171')}
              linkDirectionalParticles={link => (link.type === 'reference' ? 2 : 0)}
              linkDirectionalParticleSpeed={0.005}
              enablePanInteraction
              enableZoomInteraction
              backgroundColor={darkMode ? "#1e293b" : "#f8fafc"}
            />
            <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-full bg-slate-800/80 px-3 py-1.5 text-xs text-white">Scroll: zoom · Shift + arraste: mover</div>
          </div>
        )}

        {view === 'pie' && (
          <div
            ref={chartCanvasRef}
            {...chartPanHandlers}
            className={`absolute inset-0 flex touch-none items-center justify-center overflow-hidden bg-white p-4 dark:bg-slate-800 ${isChartPanning ? 'cursor-grabbing' : ''}`}
            aria-label="Gráfico de temas. Use o scroll para zoom e Shift mais arraste para mover."
          >
            <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-full bg-slate-800/80 px-3 py-1.5 text-xs text-white">Scroll: zoom · Shift + arraste: mover</div>
            <PanZoomControls scale={chartViewport.scale} minScale={chartMinScale} maxScale={chartMaxScale} canReset={canResetChart} onZoomOut={() => zoomChartBy(-0.2)} onZoomIn={() => zoomChartBy(0.2)} onReset={resetChart} />
            <div data-pan-zoom-layer style={{ transform: `translate3d(${chartViewport.x}px, ${chartViewport.y}px, 0) scale(${chartViewport.scale})`, transformOrigin: '0 0', width: '100%', height: '100%', willChange: 'transform' }}>
              {statsData.themes.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statsData.themes}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={140}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                      labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                    >
                      {statsData.themes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.1)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}
                      itemStyle={{ color: '#f8fafc' }}
                    />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-gray-400 flex items-center justify-center h-full">Nenhum dado encontrado para temas</div>
              )}
            </div>
          </div>
        )}

        {view === 'bar' && (
          <div
            ref={chartCanvasRef}
            {...chartPanHandlers}
            className={`absolute inset-0 flex touch-none items-center justify-center overflow-hidden bg-white p-4 dark:bg-slate-800 ${isChartPanning ? 'cursor-grabbing' : ''}`}
            aria-label="Gráfico de posts por cliente. Use o scroll para zoom e Shift mais arraste para mover."
          >
            <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-full bg-slate-800/80 px-3 py-1.5 text-xs text-white">Scroll: zoom · Shift + arraste: mover</div>
            <PanZoomControls scale={chartViewport.scale} minScale={chartMinScale} maxScale={chartMaxScale} canReset={canResetChart} onZoomOut={() => zoomChartBy(-0.2)} onZoomIn={() => zoomChartBy(0.2)} onReset={resetChart} />
            <div data-pan-zoom-layer style={{ transform: `translate3d(${chartViewport.x}px, ${chartViewport.y}px, 0) scale(${chartViewport.scale})`, transformOrigin: '0 0', width: '100%', height: '100%', willChange: 'transform' }}>
              {statsData.postsPerClient.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statsData.postsPerClient} margin={{ top: 30, right: 30, left: 20, bottom: 80 }}>
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80} 
                      tick={{ fontSize: 13, fill: '#94a3b8' }} 
                      tickMargin={10}
                      axisLine={{ stroke: '#334155' }}
                    />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 13 }} axisLine={{ stroke: '#334155' }} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}
                      itemStyle={{ color: '#f8fafc' }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                      {statsData.postsPerClient.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-gray-400 flex items-center justify-center h-full">Nenhum dado encontrado para posts por cliente</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
