'use client';

import { useState, useEffect } from 'react'
import { 
  Brain, Bell, UserCircle, Search, Trash2, Edit3, 
  Copy, Image as ImageIcon, Zap, ChevronLeft, ChevronRight 
} from 'lucide-react'

export default function Home() {
  const [theme, setTheme] = useState('')
  const [highMode, setHighMode] = useState(false)
  const [isCarousel, setIsCarousel] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // History state
  const [history, setHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [publishing, setPublishing] = useState<Record<string, boolean>>({})
  
  // Pagination & Search
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const itemsPerPage = 5
  
  // Rate limiting states
  const [usageCount, setUsageCount] = useState(0)
  const [timeLeft, setTimeLeft] = useState('')
  const MAX_LIMIT = 20

  useEffect(() => {
    const storedDate = localStorage.getItem('usageDate')
    const today = new Date().toDateString()
    
    if (storedDate !== today) {
      localStorage.setItem('usageDate', today)
      localStorage.setItem('usageCount', '0')
      setUsageCount(0)
    } else {
      const count = parseInt(localStorage.getItem('usageCount') || '0', 10)
      setUsageCount(count)
    }

    const updateTimer = () => {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setHours(24, 0, 0, 0)
      const diff = tomorrow.getTime() - now.getTime()
      
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      setTimeLeft(`${hours}h ${minutes}m`)
    }
    
    updateTimer()
    const interval = setInterval(updateTimer, 60000)
    fetchHistory()
    
    return () => clearInterval(interval)
  }, [])
  
  const fetchHistory = async () => {
    setLoadingHistory(true)
    try {
      const res = await fetch('/api/history')
      if (res.ok) {
        const data = await res.json()
        setHistory(data.history || [])
        setCurrentPage(1) // reset page on load
      }
    } catch (err) {
      console.error('Error fetching history:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleDelete = async (client: string, id: string) => {
    if (!confirm('Tem certeza que deseja excluir este post?')) return;
    try {
      const res = await fetch('/api/history/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client, id })
      })
      if (res.ok) fetchHistory()
      else alert('Erro ao excluir')
    } catch (err) {
      console.error(err)
      alert('Erro ao excluir')
    }
  }

  const handleArchive = async (client: string, id: string) => {
    alert('Função de arquivamento em desenvolvimento. No momento pode ser feito localmente no Obsidian.')
  }

  const handleEdit = () => {
    alert('A edição nativa na UI ainda está em desenvolvimento. Por favor, edite diretamente no Obsidian no momento.')
  }

  const handlePublishToInstagram = async (post: any) => {
    if (!post.imageUrl && (!post.imageUrls || post.imageUrls.length === 0)) {
      alert('Este post não tem uma URL de imagem válida. Gere um novo post para usar esta função.')
      return
    }
    
    setPublishing(prev => ({ ...prev, [post.id]: true }))
    
    try {
      const res = await fetch('/api/instagram/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: post.client,
          imageUrls: post.imageUrls && post.imageUrls.length > 0 ? post.imageUrls : [post.imageUrl],
          caption: post.content,
          fileName: post.id
        })
      })
      
      const data = await res.json()
      if (res.ok) {
        alert('✅ Post publicado com sucesso no Instagram!\nID: ' + data.id)
      } else {
        alert('❌ Erro: ' + data.error)
      }
    } catch (err) {
      console.error(err)
      alert('Erro de conexão ao tentar publicar')
    } finally {
      setPublishing(prev => ({ ...prev, [post.id]: false }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (usageCount >= MAX_LIMIT) {
      setError('Você atingiu o limite diário de gerações. O limite será reiniciado amanhã.')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme, highMode, isCarousel }),
      })

      if (!response.ok) throw new Error('Failed to generate')

      const data = await response.json()
      setResult(data.result)
      
      const newCount = usageCount + 1
      setUsageCount(newCount)
      localStorage.setItem('usageCount', newCount.toString())
      
      fetchHistory()
    } catch (err) {
      setError('Erro ao gerar conteúdo. Verifique o console para mais detalhes.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Circular Progress Calculation
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (usageCount / MAX_LIMIT) * circumference

  // Pagination Logic
  const filteredHistory = history.filter(item => 
    item.theme.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.client.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / itemsPerPage))
  const paginatedHistory = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      
      {/* Navbar */}
      <header className="bg-[#2a3645] text-white py-3 px-8 flex justify-between items-center shadow-md z-10 sticky top-0">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-pink-400" />
          <span className="font-semibold text-xl tracking-tight">AI-PostGen</span>
        </div>
        <div className="flex items-center gap-5">
          <button className="relative p-1 hover:bg-slate-700 rounded-full transition-colors">
            <Bell className="w-5 h-5 text-gray-300" />
            <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#2a3645]"></span>
          </button>
          <div className="w-8 h-8 rounded-full bg-slate-300 overflow-hidden border border-slate-600">
            {/* Using a placeholder avatar as per design */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://i.pravatar.cc/150?u=aipostgen" alt="User" className="w-full h-full object-cover" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8">
        
        {/* Left Column - Form */}
        <section className="flex flex-col gap-6">
          {/* Wood Corkboard Style Container */}
          <div className="bg-[#a87c51] p-3 rounded-[20px] shadow-xl relative overflow-hidden">
            {/* Inner White Paper */}
            <div className="bg-white rounded-xl p-6 shadow-inner relative flex flex-col gap-6 h-full border border-[#f0eade]">
              
              {/* Progress Indicator */}
              <div className="flex items-center gap-6 pb-6 border-b border-gray-100">
                <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
                  {/* Background Circle */}
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r={radius} stroke="#e2e8f0" strokeWidth="8" fill="none" />
                    {/* Foreground Circle */}
                    <circle 
                      cx="50" cy="50" r={radius} stroke="#3b82f6" strokeWidth="8" fill="none"
                      strokeLinecap="round"
                      style={{ 
                        strokeDasharray: circumference, 
                        strokeDashoffset: strokeDashoffset,
                        transition: "stroke-dashoffset 0.5s ease-in-out"
                      }} 
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-xl font-bold text-gray-800 leading-none">{usageCount}<span className="text-sm font-normal text-gray-400">/{MAX_LIMIT}</span></span>
                  </div>
                </div>
                
                <div className="flex flex-col justify-center w-full">
                  <h3 className="font-bold text-gray-800 text-base mb-2">Posts Gerados Hoje</h3>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                    <div 
                      className={`h-2 rounded-full ${usageCount >= MAX_LIMIT ? 'bg-red-500' : 'bg-slate-300'}`} 
                      style={{ width: `${Math.min((usageCount / MAX_LIMIT) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500">O limite reinicia em {timeLeft}</p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-5 flex-1">
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-2">
                    Tema do post <Brain className="w-4 h-4 text-pink-400" />
                  </label>
                  <input
                    type="text"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder="Ex: dicas de produtividade para freelancers"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 bg-white focus:ring-0 focus:border-blue-400 outline-none transition-colors"
                    required
                    disabled={usageCount >= MAX_LIMIT}
                  />
                </div>
                
                <div className="flex flex-col gap-3">
                  {/* Modo High Toggle */}
                  <label className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-colors ${highMode ? 'border-orange-200 bg-orange-50/50' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 text-sm">Modo High</div>
                        <div className="text-xs text-gray-500">Texto aprofundado e detalhado</div>
                      </div>
                    </div>
                    <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${highMode ? 'bg-orange-500' : 'bg-gray-300'}`}>
                      <input type="checkbox" className="sr-only" checked={highMode} onChange={(e) => setHighMode(e.target.checked)} disabled={usageCount >= MAX_LIMIT} />
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${highMode ? 'translate-x-4' : 'translate-x-1'}`} />
                    </div>
                  </label>

                  {/* Post Carrossel Toggle */}
                  <label className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-colors ${isCarousel ? 'border-teal-200 bg-teal-50/50' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-5 h-5 text-teal-500" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 text-sm">Post Carrossel</div>
                        <div className="text-xs text-gray-500">Gerar 3-5 imagens conectadas</div>
                      </div>
                    </div>
                    <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isCarousel ? 'bg-teal-500' : 'bg-gray-300'}`}>
                      <input type="checkbox" className="sr-only" checked={isCarousel} onChange={(e) => setIsCarousel(e.target.checked)} disabled={usageCount >= MAX_LIMIT} />
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isCarousel ? 'translate-x-4' : 'translate-x-1'}`} />
                    </div>
                  </label>
                </div>
                
                <div className="mt-auto pt-4">
                  <button
                    type="submit"
                    disabled={loading || usageCount >= MAX_LIMIT}
                    className="w-full flex justify-center py-3.5 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? 'Gerando Conteúdo...' : 'Gerar Sugestão de Post'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm shadow-sm">
              {error}
            </div>
          )}
          {result && (
            <div className="bg-white p-5 rounded-xl shadow-sm border border-green-200">
              <h2 className="mb-2 text-sm font-bold text-green-800">✅ Sugestão Gerada com Sucesso</h2>
              <p className="text-xs text-gray-600 mb-3">Veja o resultado final na lista de histórico ao lado.</p>
              <div className="max-h-32 overflow-y-auto text-xs text-gray-700 bg-gray-50 p-3 rounded-md border border-gray-100 whitespace-pre-wrap">
                {result}
              </div>
            </div>
          )}
        </section>

        {/* Right Column - History */}
        <section className="bg-white rounded-[20px] shadow-lg border border-gray-100 flex flex-col overflow-hidden">
          
          {/* History Header */}
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white z-10 relative">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📜</span>
              <h2 className="text-2xl font-bold text-gray-800">Histórico do Vault</h2>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button 
                onClick={fetchHistory}
                disabled={loadingHistory}
                className="px-4 py-2 border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
              >
                {loadingHistory ? 'Atualizando...' : 'Atualizar agora'}
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="px-6 py-4 border-b border-gray-50 flex justify-end gap-3 bg-gray-50/50">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white"
              />
            </div>
            <select className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:border-blue-400 cursor-pointer min-w-[120px]">
              <option value="all">Filtra</option>
              <option value="carousel">Carrosséis</option>
              <option value="high">Modo High</option>
            </select>
          </div>

          {/* History List */}
          <div className="flex-1 p-6 overflow-y-auto bg-gray-50/30">
            {loadingHistory && history.length === 0 ? (
              <div className="text-center text-gray-500 py-12">Carregando histórico...</div>
            ) : paginatedHistory.length === 0 ? (
              <div className="text-center text-gray-500 py-12 bg-white rounded-xl border border-dashed border-gray-300">
                {searchQuery ? "Nenhum post encontrado na busca." : "Nenhum post gerado ainda."}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {paginatedHistory.map((post, idx) => {
                  const coverImage = (post.imageUrls && post.imageUrls.length > 0) ? post.imageUrls[0] : post.imageUrl;
                  const snippet = post.content.substring(0, 120) + (post.content.length > 120 ? '...' : '');
                  
                  return (
                    <div key={post.id || idx} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col sm:flex-row h-auto sm:h-48">
                      {/* Image Side */}
                      <div className="w-full sm:w-48 h-48 sm:h-full flex-shrink-0 bg-gray-100 relative">
                        {coverImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={coverImage} alt={post.theme} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
                            <ImageIcon className="w-8 h-8 opacity-50" />
                          </div>
                        )}
                        {post.isCarousel && post.imageUrls && post.imageUrls.length > 1 && (
                          <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded">
                            1/{post.imageUrls.length}
                          </div>
                        )}
                      </div>
                      
                      {/* Content Side */}
                      <div className="flex-1 p-4 flex flex-col min-w-0">
                        
                        {/* Top row: Title and Actions */}
                        <div className="flex justify-between items-start gap-4 mb-1">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-gray-800 text-lg truncate" title={post.theme}>
                              {post.theme}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                              Cliente: {post.client || 'Nenhum'} • {new Date(post.date).toLocaleString()}
                            </p>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex gap-2 flex-shrink-0">
                            <button 
                              onClick={() => handlePublishToInstagram(post)}
                              disabled={publishing[post.id]}
                              title="Publicar no Instagram"
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-pink-100 text-pink-600 hover:bg-pink-200 transition-colors"
                            >
                              {publishing[post.id] ? (
                                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                              )}
                            </button>
                            <button 
                              onClick={() => handleDelete(post.client, post.id)}
                              title="Excluir"
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={handleEdit}
                              title="Editar"
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => { navigator.clipboard.writeText(post.content); alert('Copiado!') }}
                              title="Copiar texto"
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex gap-2 mb-3">
                           {post.mode === 'Turbo' && (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-orange-100 text-orange-600">Modo High</span>
                           )}
                           {post.isCarousel && (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-teal-100 text-teal-600">Carrossel</span>
                           )}
                        </div>

                        {/* Text Snippet */}
                        <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-xs text-gray-600 mt-auto relative">
                          <p className="line-clamp-2">{snippet}</p>
                          <div className="text-center mt-1">
                            <button 
                              onClick={() => alert('Para ler mais, verifique o arquivo original no Obsidian ou copie o texto!')}
                              className="text-blue-500 font-medium hover:underline text-[11px]"
                            >
                              Ler Mais v
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-gray-100 bg-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {/* Simple page numbers */}
              {Array.from({ length: totalPages }).map((_, i) => {
                const page = i + 1;
                // Only show a few pages around current to avoid overflow
                if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                  return (
                    <button 
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 flex items-center justify-center rounded text-sm font-medium ${currentPage === page ? 'bg-[#3b82f6] text-white' : 'hover:bg-gray-50 text-gray-600'}`}
                    >
                      {page}
                    </button>
                  )
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="text-gray-400">...</span>
                }
                return null;
              })}

              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="text-sm font-medium text-gray-600">
              Total: {filteredHistory.length}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 px-8 border-t border-gray-200 bg-white text-sm text-gray-500 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex gap-6">
          <a href="#" className="hover:text-gray-800">Sobre nós</a>
          <a href="#" className="hover:text-gray-800">Termos de Serviço</a>
          <a href="#" className="hover:text-gray-800">Suporte</a>
        </div>
        <div>
          Powered by <span className="font-semibold text-gray-700">AI-PostGen</span>
        </div>
      </footer>
    </div>
  )
}