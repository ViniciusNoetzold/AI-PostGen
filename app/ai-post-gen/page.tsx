'use client';

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { 
  Brain, Bell, Search, Trash2, Edit3,
  Copy, Image as ImageIcon, Zap, ChevronLeft, ChevronRight, X, BarChart2, CheckCircle, AlertCircle, Info, Film, Eye
} from 'lucide-react'
import VaultVisualization from '../components/VaultVisualization'
import InstagramPreviewModal from '../components/InstagramPreviewModal'
import type { PublicConfigProfile } from '@/lib/config'
import { getErrorMessage } from '@/lib/errors'
import type { HistoryPost } from '@/lib/posts'
import { useDarkMode } from '@/components/ThemeToggle'
import { useUserProfile } from '@/lib/user-profile'

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  timestamp: number;
  read: boolean;
}

function readUsageCount(): number {
  if (typeof window === 'undefined') return 0
  const today = new Date().toDateString()
  if (localStorage.getItem('usageDate') !== today) return 0
  const count = Number.parseInt(localStorage.getItem('usageCount') ?? '0', 10)
  return Number.isFinite(count) ? count : 0
}

function readTimeLeft(): string {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setHours(24, 0, 0, 0)
  const diff = tomorrow.getTime() - now.getTime()
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes}m`
}

export default function Home() {
  const darkMode = useDarkMode()
  const profile = useUserProfile()
  const [theme, setTheme] = useState('')
  const [highMode, setHighMode] = useState(false)
  const [isCarousel, setIsCarousel] = useState(false)
  const [wantImage, setWantImage] = useState(false)
  const [customImagePrompt, setCustomImagePrompt] = useState('')
  const [wantVideo, setWantVideo] = useState(false)
  const [customVideoPrompt, setCustomVideoPrompt] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [generatedPostId, setGeneratedPostId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // History state
  const [history, setHistory] = useState<HistoryPost[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [publishing, setPublishing] = useState<Record<string, boolean>>({})
  const [generatingVideo, setGeneratingVideo] = useState<Record<string, boolean>>({})
  const [generatingImage, setGeneratingImage] = useState<Record<string, boolean>>({})
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({})
  
  // Pagination & Search
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")
  const itemsPerPage = 5
  
  // Rate limiting states
  const [usageCount, setUsageCount] = useState(readUsageCount)
  const [timeLeft, setTimeLeft] = useState(readTimeLeft)
  const MAX_LIMIT = 20
  const [showStats, setShowStats] = useState(true)

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const unreadCount = notifications.filter(n => !n.read).length

  const addNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotifications(prev => [{
      id: Date.now().toString() + Math.random().toString(),
      type,
      message,
      timestamp: Date.now(),
      read: false
    }, ...prev].slice(0, 50)) // Keep last 50
  }

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  // New UI states
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({})
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set())
  
  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<HistoryPost | null>(null)
  const [editContent, setEditContent] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  
  const [defaultLanguage, setDefaultLanguage] = useState('pt-BR')

  // Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewPost, setPreviewPost] = useState<HistoryPost | null>(null)

  // Language selector (per-generation, defaults to config)
  const [selectedLanguage, setSelectedLanguage] = useState('pt-BR')

  const LANGUAGES = [
    { code: 'pt-BR', label: '🇧🇷 Português (Brasil)' },
    { code: 'pt-PT', label: '🇵🇹 Português (Portugal)' },
    { code: 'en-US', label: '🇺🇸 English (US)' },
    { code: 'en-GB', label: '🇬🇧 English (UK)' },
    { code: 'es-ES', label: '🇪🇸 Español (España)' },
    { code: 'es-MX', label: '🇲🇽 Español (México)' },
    { code: 'fr-FR', label: '🇫🇷 Français' },
    { code: 'de-DE', label: '🇩🇪 Deutsch' },
    { code: 'it-IT', label: '🇮🇹 Italiano' },
    { code: 'ja-JP', label: '🇯🇵 日本語' },
    { code: 'zh-CN', label: '🇨🇳 中文 (简体)' },
    { code: 'ar-SA', label: '🇸🇦 العربية' },
  ]

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const res = await fetch('/api/history')
      if (res.ok) {
        const data = (await res.json()) as { history?: HistoryPost[] }
        setHistory(data.history || [])
        setCurrentPage(1) // reset page on load
      }
    } catch (err) {
      console.error('Error fetching history:', err)
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config')
      if (res.ok) {
        const data = (await res.json()) as PublicConfigProfile
        if (data.defaultLanguage) {
          setDefaultLanguage(data.defaultLanguage)
          setSelectedLanguage(data.defaultLanguage) // Sync the per-generation selector
        }
      }
    } catch (err) {
      console.error('Error fetching config:', err)
    }
  }, [])

  useEffect(() => {
    const today = new Date().toDateString()
    if (localStorage.getItem('usageDate') !== today) {
      localStorage.setItem('usageDate', today)
      localStorage.setItem('usageCount', '0')
    }

    const interval = setInterval(() => setTimeLeft(readTimeLeft()), 60000)
    queueMicrotask(() => {
      void fetchHistory()
      void fetchConfig()
    })

    return () => clearInterval(interval)
  }, [fetchConfig, fetchHistory])

  const handleSelectPost = (id: string) => {
    setSelectedPosts(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBulkDelete = async () => {
    if (selectedPosts.size === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selectedPosts.size} posts?`)) return;
    
    let deletedCount = 0;
    const postsToDelete = history.filter(p => selectedPosts.has(p.id));
    
    try {
      for (const post of postsToDelete) {
        const res = await fetch('/api/history/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client: post.client, id: post.id })
        })
        if (res.ok) deletedCount++;
      }
      
      if (deletedCount > 0) {
        addNotification('success', `${deletedCount} posts excluídos com sucesso.`);
        setSelectedPosts(new Set());
        fetchHistory();
      } else {
        addNotification('error', 'Nenhum post foi excluído.');
      }
    } catch {
      addNotification('error', 'Erro ao realizar exclusão em massa.');
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
      else addNotification('error', 'Erro ao excluir o post.')
    } catch (err) {
      console.error(err)
      addNotification('error', 'Erro ao excluir o post.')
    }
  }

  const handleEdit = (post: HistoryPost) => {
    setEditingPost(post)
    setEditContent(post.content)
    setEditModalOpen(true)
  }

  const saveEdit = async () => {
    if (!editingPost) return;
    setSavingEdit(true)
    try {
      const res = await fetch('/api/history/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client: editingPost.client, id: editingPost.id, newContent: editContent })
      })
      if (res.ok) {
        setEditModalOpen(false)
        fetchHistory()
      } else {
        addNotification('error', 'Erro ao salvar edição.')
      }
    } catch {
      addNotification('error', 'Erro de conexão ao salvar edição.')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleSaveOrder = async (newImageUrls: string[]) => {
    if (!previewPost) return;
    try {
      const res = await fetch('/api/history/edit-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client: previewPost.client, id: previewPost.id, imageUrls: newImageUrls })
      })
      if (res.ok) {
        addNotification('success', 'Ordem das imagens salva com sucesso!')
        setPreviewPost({ ...previewPost, imageUrls: newImageUrls })
        fetchHistory()
      } else {
        addNotification('error', 'Erro ao salvar a ordem das imagens.')
      }
    } catch {
      addNotification('error', 'Erro de conexão ao salvar imagens.')
    }
  }

  const handlePublishToInstagram = async (post: HistoryPost) => {
    if (!post.imageUrl && (!post.imageUrls || post.imageUrls.length === 0)) {
      addNotification('error', 'Este post não tem uma imagem válida para o Instagram.')
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
        alert('✅ Post publicado com sucesso no Instagram!\\nID: ' + data.id)
      } else {
        if (data.needsConfig) {
          alert('❌ Credenciais do Instagram não configuradas para este cliente. Clique no botão de engrenagem ⚙️ (Configurar Instagram) ao lado do botão de publicar.')
        } else {
          addNotification('error', 'Erro ao publicar no Instagram: ' + data.error)
        }
      }
    } catch (err) {
      console.error(err)
      addNotification('error', 'Erro de conexão ao tentar publicar no Instagram.')
    } finally {
      setPublishing(prev => ({ ...prev, [post.id]: false }))
    }
  }

  const handleGenerateImage = async (post: HistoryPost) => {
    setGeneratingImage(prev => ({ ...prev, [post.id]: true }))
    addNotification('info', 'Gerando imagem para o post...')

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client: post.client, id: post.id })
      })

      const data = await res.json()
      if (res.ok) {
        addNotification('success', 'Imagem gerada com sucesso!')
        fetchHistory()
      } else {
        addNotification('error', 'Erro ao gerar imagem: ' + data.error)
      }
    } catch (err) {
      console.error(err)
      addNotification('error', 'Erro de conexão ao tentar gerar imagem.')
    } finally {
      setGeneratingImage(prev => ({ ...prev, [post.id]: false }))
    }
  }

  const handleGenerateVideo = async (post: HistoryPost) => {
    const imageUrl = post.imageUrls && post.imageUrls.length > 0 ? post.imageUrls[0] : post.imageUrl;
    if (!imageUrl) {
      addNotification('error', 'Este post não tem uma imagem para gerar vídeo.');
      return;
    }

    setGeneratingVideo(prev => ({ ...prev, [post.id]: true }));
    addNotification('info', 'Iniciando geração de vídeo para o post...');

    try {
      let videoPrompt = "Cinematic, slow pan, high quality, professional product video";
      const promptMatch = post.content.match(/\[Prompt de V[ií]deo?:?([\s\S]*?)\]/i);
      if (promptMatch && promptMatch[1]) {
        videoPrompt = promptMatch[1].trim();
      }

      // 1. Start generation
      const res = await fetch('/api/studio/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPrompt,
          productImageUrl: imageUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao iniciar geração');

      const fileId = data.fileId;
      addNotification('info', `Vídeo em processamento (ID: ${fileId})...`);

      // 2. Poll status
      let isReady = false;
      let attempts = 0;
      while (!isReady && attempts < 30) { // max 5 minutes (30 * 10s)
        await new Promise(resolve => setTimeout(resolve, 10000));
        attempts++;

        const statusRes = await fetch(`/api/studio/file-status/${fileId}`);
        const statusData = await statusRes.json();
        
        if (statusData.state === 'ACTIVE') {
          isReady = true;
        } else if (statusData.state === 'FAILED') {
          throw new Error('Falha no processamento do vídeo pela API Gemini.');
        }
      }

      if (!isReady) {
        throw new Error('Tempo limite excedido aguardando o vídeo.');
      }

      // 3. Publish to Instagram
      const videoUrl = `${window.location.origin}/api/studio/video/${fileId}`;
      addNotification('success', 'Vídeo gerado! Iniciando publicação no Instagram...');

      const pubRes = await fetch('/api/instagram/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: post.client,
          videoUrl: videoUrl,
          caption: post.content,
          fileName: post.id
        })
      });

      const pubData = await pubRes.json();
      if (pubRes.ok) {
        alert('✅ Vídeo publicado com sucesso no Instagram!\\nID: ' + pubData.id);
        
        // Publish to Telegram
        addNotification('info', 'Enviando para o Telegram...');
        try {
          await fetch('/api/telegram/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: post.content,
              videoUrl: videoUrl
            })
          });
        } catch (tgErr) {
          console.error('Erro ao enviar para Telegram', tgErr);
        }
      } else {
        if (pubData.needsConfig) {
          alert('❌ Credenciais do Instagram não configuradas. Verifique as configurações.');
        } else {
          addNotification('error', 'Erro ao publicar vídeo no Instagram: ' + pubData.error);
        }
      }

    } catch (err: unknown) {
      console.error(err);
      addNotification('error', getErrorMessage(err, 'Erro ao gerar ou publicar vídeo.'));
    } finally {
      setGeneratingVideo(prev => ({ ...prev, [post.id]: false }));
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (usageCount >= MAX_LIMIT) {
      addNotification('error', 'Limite diário de gerações atingido.'); setError('Você atingiu o limite diário de gerações. O limite será reiniciado amanhã.')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setGeneratedPostId(null)

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          theme, 
          highMode, 
          isCarousel, 
          language: selectedLanguage,
          wantImage,
          customImagePrompt,
          wantVideo,
          customVideoPrompt 
        }),
      })

      if (!response.ok) throw new Error('Failed to generate')

      const data = await response.json()
      setResult(data.result)
      if (data.postId) {
        setGeneratedPostId(data.postId)
      }
      
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
  const filteredHistory = history.filter(item => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = item.theme.toLowerCase().includes(searchLower) || item.client.toLowerCase().includes(searchLower);
    if (!matchesSearch) return false;
    
    switch (filterType) {
      case 'carousel': return item.isCarousel;
      case 'high': return item.mode === 'Turbo';
      case 'with_images': return (item.imageUrls && item.imageUrls.length > 0) || item.imageUrl;
      case 'no_images': return (!item.imageUrls || item.imageUrls.length === 0) && !item.imageUrl;
      default: return true;
    }
  }).sort((a, b) => {
    if (filterType === 'oldest') {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    // Default newest first
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  })
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / itemsPerPage))
  const paginatedHistory = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const generatedPost = generatedPostId
    ? history.find((post) => post.id === generatedPostId)
    : undefined

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-200">
      
      {/* Navbar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 sm:px-6">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 dark:text-white">AI Post Gen</h1>
          <p className="hidden text-xs text-slate-500 sm:block">Criação e gestão de conteúdo</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative flex items-center gap-2 sm:gap-3">
            <button 
              onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) markAllRead(); }}
              className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label="Abrir notificações"
            >
              <Bell className="size-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 text-white text-[8px] font-bold flex items-center justify-center rounded-full border border-[#2a3645]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden z-50 transform origin-top-right transition-all">
                <div className="p-3 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/80">
                  <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">Notificações</h3>
                  {notifications.length > 0 && (
                    <button onClick={() => setNotifications([])} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                      Limpar
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">Nenhuma notificação</div>
                  ) : (
                    notifications.map(notif => (
                      <div key={notif.id} className="p-3 border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 flex gap-3 items-start transition-colors">
                        <div className="mt-0.5">
                          {notif.type === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                          {notif.type === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                          {notif.type === 'info' && <Info className="w-4 h-4 text-blue-500" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">{notif.message}</p>
                          <span className="text-[10px] text-gray-400 mt-1 block">
                            {new Date(notif.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 gap-6 p-4 sm:p-6 xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[400px_minmax(0,1fr)]">
        
        {/* Left Column - Form */}
        <section className="flex flex-col gap-6">
          {/* Generation form */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
            {/* Inner White Paper */}
            <div className="relative flex h-full flex-col gap-6 bg-transparent p-5 transition-colors sm:p-6">
              
              {/* Progress Indicator */}
              <div className="flex items-center gap-6 pb-6 border-b border-gray-100 dark:border-slate-700">
                <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
                  {/* Background Circle */}
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r={radius} stroke="currentColor" className="text-slate-200 dark:text-slate-600" strokeWidth="8" fill="none" />
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
                    <span className="text-xl font-bold text-gray-800 dark:text-gray-100 leading-none">{usageCount}<span className="text-sm font-normal text-gray-400 dark:text-gray-500 dark:text-gray-400">/{MAX_LIMIT}</span></span>
                  </div>
                </div>
                
                <div className="flex flex-col justify-center w-full">
                  <h3 className="mb-2 text-base font-bold text-gray-800 dark:text-gray-100">Uso diário neste navegador</h3>
                  <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2 mb-2">
                    <div 
                      className={`h-2 rounded-full ${usageCount >= MAX_LIMIT ? 'bg-red-500' : 'bg-slate-300'}`} 
                      style={{ width: `${Math.min((usageCount / MAX_LIMIT) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">O limite local reinicia em {timeLeft}</p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-5 flex-1">
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-100 mb-2">
                    Tema do post <Brain className="w-4 h-4 text-pink-400" />
                  </label>
                  <input
                    type="text"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder="Ex: dicas de produtividade para freelancers"
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 focus:ring-0 focus:border-blue-400 outline-none transition-colors"
                    required
                    disabled={usageCount >= MAX_LIMIT}
                  />
                </div>
                
                <div className="flex flex-col gap-3">
                  {/* Modo High Toggle */}
                  <label className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-colors ${highMode ? 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/20' : 'border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 dark:text-gray-100 text-sm">Modo High</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Texto aprofundado e detalhado</div>
                      </div>
                    </div>
                    <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${highMode ? 'bg-orange-500' : 'bg-gray-300'}`}>
                      <input type="checkbox" className="sr-only" checked={highMode} onChange={(e) => setHighMode(e.target.checked)} disabled={usageCount >= MAX_LIMIT} />
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-slate-800 transition-transform ${highMode ? 'translate-x-4' : 'translate-x-1'}`} />
                    </div>
                  </label>

                  {/* Post Carrossel Toggle */}
                  <label className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-colors ${isCarousel ? 'border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-900/20' : 'border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 dark:text-teal-400 flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-5 h-5 text-teal-500" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 dark:text-gray-100 text-sm">Post Carrossel</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Gerar 3-5 imagens conectadas</div>
                      </div>
                    </div>
                    <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isCarousel ? 'bg-teal-500' : 'bg-gray-300'}`}>
                      <input type="checkbox" className="sr-only" checked={isCarousel} onChange={(e) => setIsCarousel(e.target.checked)} disabled={usageCount >= MAX_LIMIT} />
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-slate-800 transition-transform ${isCarousel ? 'translate-x-4' : 'translate-x-1'}`} />
                    </div>
                  </label>

                  {/* Want Image Toggle */}
                  <label className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-colors ${wantImage ? 'border-pink-200 dark:border-pink-800 bg-pink-50/50 dark:bg-pink-900/20' : 'border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-pink-100 dark:bg-pink-900/30 dark:text-pink-400 flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-5 h-5 text-pink-500" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 dark:text-gray-100 text-sm">Quero Foto</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Gerar imagem para o post</div>
                      </div>
                    </div>
                    <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${wantImage ? 'bg-pink-500' : 'bg-gray-300'}`}>
                      <input type="checkbox" className="sr-only" checked={wantImage} onChange={(e) => setWantImage(e.target.checked)} disabled={usageCount >= MAX_LIMIT} />
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-slate-800 transition-transform ${wantImage ? 'translate-x-4' : 'translate-x-1'}`} />
                    </div>
                  </label>

                  {wantImage && (
                    <div className="pl-4 border-l-2 border-pink-200 dark:border-pink-800 ml-5">
                      <input
                        type="text"
                        value={customImagePrompt}
                        onChange={(e) => setCustomImagePrompt(e.target.value)}
                        placeholder="Prompt de Imagem (opcional, ex: cachorro feliz no parque)"
                        className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 focus:ring-0 focus:border-pink-400 outline-none transition-colors"
                        disabled={usageCount >= MAX_LIMIT}
                      />
                    </div>
                  )}

                  {/* Want Video Toggle */}
                  <label className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-colors ${wantVideo ? 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/20' : 'border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                        <Film className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 dark:text-gray-100 text-sm">Quero Vídeo</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Gerar vídeo (Product Studio)</div>
                      </div>
                    </div>
                    <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${wantVideo ? 'bg-purple-500' : 'bg-gray-300'}`}>
                      <input type="checkbox" className="sr-only" checked={wantVideo} onChange={(e) => setWantVideo(e.target.checked)} disabled={usageCount >= MAX_LIMIT} />
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-slate-800 transition-transform ${wantVideo ? 'translate-x-4' : 'translate-x-1'}`} />
                    </div>
                  </label>

                  {wantVideo && (
                    <div className="pl-4 border-l-2 border-purple-200 dark:border-purple-800 ml-5">
                      <input
                        type="text"
                        value={customVideoPrompt}
                        onChange={(e) => setCustomVideoPrompt(e.target.value)}
                        placeholder="Prompt de Vídeo (opcional, ex: cinematic panning)"
                        className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 focus:ring-0 focus:border-purple-400 outline-none transition-colors"
                        disabled={usageCount >= MAX_LIMIT}
                      />
                    </div>
                  )}
                </div>

                {/* Idioma do Post */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-100 mb-2">
                    🌐 Idioma do Post
                  </label>
                  <div className="relative">
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      disabled={usageCount >= MAX_LIMIT}
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 focus:ring-0 focus:border-blue-400 outline-none transition-colors appearance-none cursor-pointer disabled:opacity-50"
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {selectedLanguage !== defaultLanguage && (
                    <p className="text-xs text-blue-500 mt-1">
                      Padrão nas configurações: {LANGUAGES.find(l => l.code === defaultLanguage)?.label ?? defaultLanguage}
                    </p>
                  )}
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
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-green-200">
              <h2 className="mb-2 text-sm font-bold text-green-800">✅ Sugestão Gerada com Sucesso</h2>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">Sua sugestão de post foi gerada com base nos parâmetros selecionados.</p>
              
              <div className="max-h-32 overflow-y-auto text-xs text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-slate-800/80 p-3 rounded-md border border-gray-100 dark:border-slate-700 whitespace-pre-wrap mb-4">
                {result}
              </div>

              {generatedPostId && generatedPost && (
                <div className="pt-4 border-t border-gray-100 dark:border-slate-700">
                  <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-3">Ações Rápidas para este Post:</h3>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => handleGenerateImage(generatedPost)}
                      disabled={generatingImage[generatedPostId]}
                      className="flex items-center gap-2 px-3 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors text-xs font-medium"
                    >
                      {generatingImage[generatedPostId] ? (
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      ) : (
                        <ImageIcon className="w-4 h-4" />
                      )}
                      Gerar Imagem
                    </button>
                    
                    <button 
                      onClick={() => handleGenerateVideo(generatedPost)}
                      disabled={generatingVideo[generatedPostId]}
                      className="flex items-center gap-2 px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors text-xs font-medium"
                    >
                      {generatingVideo[generatedPostId] ? (
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      ) : (
                        <Film className="w-4 h-4" />
                      )}
                      Gerar Vídeo
                    </button>
                    
                    <button 
                      onClick={() => handlePublishToInstagram(generatedPost)}
                      disabled={publishing[generatedPostId]}
                      className="flex items-center gap-2 px-3 py-2 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-lg hover:bg-pink-200 dark:hover:bg-pink-900/50 transition-colors text-xs font-medium"
                    >
                      {publishing[generatedPostId] ? (
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                      )}
                      Publicar no Instagram
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Right Column - History & Viz */}
        <div className="flex flex-col gap-6 overflow-hidden">
          {/* Botão para mostrar/esconder estatísticas */}
          <div className="flex justify-end">
            <button 
              onClick={() => setShowStats(!showStats)}
              className="flex items-center gap-2 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 shadow-sm hover:bg-gray-50 dark:bg-slate-800/80 transition-colors font-medium text-sm"
            >
              {showStats ? (
                <><BarChart2 className="w-4 h-4" /> Ocultar Estatísticas</>
              ) : (
                <><BarChart2 className="w-4 h-4" /> Mostrar Estatísticas</>
              )}
            </button>
          </div>

          {/* Visualizations */}
          {showStats && (
            <div className="h-[400px] sm:h-[500px] rounded-[20px] shadow-lg overflow-hidden flex-shrink-0 transition-all duration-300">
              <VaultVisualization darkMode={darkMode} />
            </div>
          )}

          {/* History */}
          <section className="bg-white dark:bg-slate-800 rounded-[20px] shadow-lg border border-gray-100 dark:border-slate-700 flex flex-col overflow-hidden flex-1">
          
          {/* History Header */}
          <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 z-10 relative">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📜</span>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Histórico do Vault</h2>
                {selectedPosts.size > 0 && (
                  <button 
                    onClick={handleBulkDelete}
                    className="ml-4 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center gap-1 font-bold transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Excluir ({selectedPosts.size})
                  </button>
                )}
              </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button 
                onClick={fetchHistory}
                disabled={loadingHistory}
                className="px-4 py-2 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg text-sm font-medium transition-colors"
              >
                {loadingHistory ? 'Atualizando...' : 'Atualizar agora'}
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="px-6 py-4 border-b border-gray-50 flex justify-end gap-3 bg-gray-50 dark:bg-slate-800/80">
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
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-blue-400 bg-white dark:bg-slate-800"
              />
            </div>
            <select 
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                className="px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-blue-400 cursor-pointer min-w-[140px]"
              >
                <option value="all">Filtros (Todos)</option>
                <option value="carousel">🖼️ Apenas Carrosséis</option>
                <option value="high">⚡ Modo High (Turbo)</option>
                <option value="with_images">📸 Com Imagens</option>
                <option value="no_images">📝 Sem Imagens (Texto)</option>
                <option value="newest">🕒 Mais Recentes</option>
                <option value="oldest">🕰️ Mais Antigos</option>
              </select>
          </div>

          {/* History List */}
          <div className="flex-1 p-6 overflow-y-auto bg-gray-50 dark:bg-slate-800/80">
            {loadingHistory && history.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-12">Carregando histórico...</div>
            ) : paginatedHistory.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-12 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-300 dark:border-slate-500">
                {searchQuery ? "Nenhum post encontrado na busca." : "Nenhum post gerado ainda."}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {paginatedHistory.map((post, idx) => {
                  const coverImage = (post.imageUrls && post.imageUrls.length > 0) ? post.imageUrls[0] : post.imageUrl;
                  const snippet = post.content.substring(0, 120) + (post.content.length > 120 ? '...' : '');
                  
                  return (
                    <div key={post.id || idx} className={`relative bg-white dark:bg-slate-800 rounded-xl border shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col sm:flex-row h-auto ${expandedPosts[post.id] ? 'sm:min-h-48' : 'sm:h-48'} ${selectedPosts.has(post.id) ? 'border-blue-400 ring-1 ring-blue-400 bg-blue-50/10' : 'border-gray-200 dark:border-slate-600'}`}>
                        {/* Checkbox */}
                        <div className="absolute top-3 left-3 z-20">
                          <input 
                            type="checkbox" 
                            checked={selectedPosts.has(post.id)}
                            onChange={() => handleSelectPost(post.id)}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shadow-sm bg-white dark:bg-slate-800"
                          />
                        </div>
                      {/* Image Side */}
                      <div className="w-full sm:w-48 h-48 sm:h-full flex-shrink-0 bg-gray-100 dark:bg-slate-700 relative">
                        {coverImage && !failedImages[post.id] ? (
                          <Image
                            src={coverImage}
                            alt={post.theme}
                            fill
                            sizes="(max-width: 640px) 100vw, 192px"
                            unoptimized
                            className="object-cover"
                            onError={() => setFailedImages((current) => ({ ...current, [post.id]: true }))}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100 dark:bg-slate-700">
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
                        <div className="mb-1 flex flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-4">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg truncate" title={post.theme}>
                              {post.theme}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Cliente: {post.client || 'Nenhum'} • {new Date(post.date).toLocaleString()}
                            </p>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex flex-shrink-0 flex-wrap gap-2">
                            <button 
                              onClick={() => handlePublishToInstagram(post)}
                              disabled={publishing[post.id]}
                              title="Publicar no Instagram"
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 hover:bg-pink-200 dark:hover:bg-pink-900/50 transition-colors"
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
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleGenerateImage(post)}
                              disabled={generatingImage[post.id]}
                              title="Gerar Imagem"
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                            >
                              {generatingImage[post.id] ? (
                                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                              ) : (
                                <ImageIcon className="w-4 h-4" />
                              )}
                            </button>
                            <button 
                              onClick={() => handleGenerateVideo(post)}
                              disabled={generatingVideo[post.id]}
                              title="Criar Vídeo (Product Studio)"
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                            >
                              {generatingVideo[post.id] ? (
                                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                              ) : (
                                <Film className="w-4 h-4" />
                              )}
                            </button>
                            <button 
                              onClick={() => handleEdit(post)}
                              title="Editar"
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => { setPreviewPost(post); setPreviewModalOpen(true); }}
                              title="Preview Instagram"
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => { navigator.clipboard.writeText(post.content); alert('Copiado!') }}
                              title="Copiar texto"
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex gap-2 mb-3">
                           {post.mode === 'Turbo' && (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">Modo High</span>
                           )}
                           {post.isCarousel && (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">Carrossel</span>
                           )}
                        </div>

                        {/* Text Snippet */}
                        <div className="bg-gray-50 dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700 rounded-lg p-3 mt-auto relative flex flex-col min-h-0">
                          <div className={`text-xs text-gray-600 dark:text-gray-300 flex-1 overflow-y-auto ${expandedPosts[post.id] ? 'whitespace-pre-wrap max-h-60' : 'line-clamp-2'}`}>
                            {expandedPosts[post.id] ? post.content : snippet}
                          </div>
                          <div className="text-center mt-2 flex-shrink-0">
                            <button 
                              onClick={() => setExpandedPosts(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                              className="text-blue-500 font-medium hover:underline text-[11px]"
                            >
                              {expandedPosts[post.id] ? 'Ler Menos ^' : 'Ler Mais v'}
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
          <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center border border-gray-200 dark:border-slate-600 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:bg-slate-800/80 disabled:opacity-50"
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
                      className={`w-8 h-8 flex items-center justify-center rounded text-sm font-medium ${currentPage === page ? 'bg-[#3b82f6] text-white' : 'hover:bg-gray-50 dark:bg-slate-800/80 text-gray-600 dark:text-gray-300'}`}
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
                className="w-8 h-8 flex items-center justify-center border border-gray-200 dark:border-slate-600 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:bg-slate-800/80 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Total: {filteredHistory.length}
            </div>
          </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto flex flex-col items-center justify-between gap-2 border-t border-gray-200 bg-white px-6 py-5 text-xs text-gray-500 dark:border-slate-800 dark:bg-slate-900 dark:text-gray-400 sm:flex-row">
        <p>Workspace local conectado ao Obsidian Vault.</p>
        <p><span className="font-semibold text-gray-700 dark:text-gray-200">AI Post Gen</span> · Conteúdo e mídia em um só fluxo</p>
      </footer>

      {/* Edit Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Editar Post</h2>
              <button onClick={() => setEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-300">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-full min-h-[400px] p-4 border border-gray-200 dark:border-slate-600 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
              <button 
                onClick={() => setEditModalOpen(false)}
                className="px-5 py-2 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:bg-slate-800/80 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={saveEdit}
                disabled={savingEdit}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewModalOpen && previewPost && (
        <InstagramPreviewModal
          post={previewPost}
          profile={profile}
          onClose={() => {
            setPreviewModalOpen(false)
            setPreviewPost(null)
          }}
          onSaveOrder={handleSaveOrder}
        />
      )}
    </div>
  )
}
