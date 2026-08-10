'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Brain, PieChart as PieChartIcon, BarChart2 } from 'lucide-react'

type GraphData = {
  nodes: any[]
  links: any[]
}

type StatsData = {
  postsPerClient: { name: string; value: number }[]
  themes: { name: string; value: number }[]
}

export default function VaultVisualization() {
  const [view, setView] = useState<'neural' | 'pie' | 'bar'>('neural')
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

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight || 500
      })
    }
    
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || 500
        })
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [view]) // Re-measure on view change

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658']

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
      <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/50">
        <h2 className="text-lg font-semibold text-gray-800">Visualização do Banco de Dados</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setView('neural')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'neural' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Brain className="w-4 h-4" />
            Neural Brain
          </button>
          <button
            onClick={() => setView('pie')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'pie' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <PieChartIcon className="w-4 h-4" />
            Temas (Pizza)
          </button>
          <button
            onClick={() => setView('bar')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'bar' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            Posts por Cliente
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[500px] relative w-full" ref={containerRef}>
        {view === 'neural' && (
          <div className="absolute inset-0">
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
              linkColor={link => (link.type === 'hierarchy' ? '#cbd5e1' : '#f87171')}
              linkDirectionalParticles={link => (link.type === 'reference' ? 2 : 0)}
              linkDirectionalParticleSpeed={0.005}
              backgroundColor="#f8fafc"
            />
          </div>
        )}

        {view === 'pie' && (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            {statsData.themes.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statsData.themes}
                    cx="50%"
                    cy="50%"
                    outerRadius={150}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statsData.themes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, 'Quantidade']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-gray-400">Nenhum dado encontrado para temas</div>
            )}
          </div>
        )}

        {view === 'bar' && (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            {statsData.postsPerClient.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statsData.postsPerClient} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80} 
                    tick={{ fontSize: 12, fill: '#64748b' }} 
                  />
                  <YAxis tick={{ fill: '#64748b' }} />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]}>
                    {statsData.postsPerClient.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-gray-400">Nenhum dado encontrado para posts por cliente</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
