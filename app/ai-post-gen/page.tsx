'use client';

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Brain, Bell, UserCircle, Search, Trash2, Edit3, 
  Copy, Image as ImageIcon, Zap, ChevronLeft, ChevronRight, X, Settings, BarChart2, Sun, Moon, CheckCircle, AlertCircle, Info, UploadCloud, Film, Eye
} from 'lucide-react'
import VaultVisualization from '../components/VaultVisualization'
import InstagramPreviewModal from '../components/InstagramPreviewModal'

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  timestamp: number;
  read: boolean;
}

interface UserProfile {
  name: string;
  role: string;
  avatarUrl: string;
}

export default function Home() {
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
  const [history, setHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [publishing, setPublishing] = useState<Record<string, boolean>>({})
  const [generatingVideo, setGeneratingVideo] = useState<Record<string, boolean>>({})
  const [generatingImage, setGeneratingImage] = useState<Record<string, boolean>>({})
  
  // Pagination & Search
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")
  const itemsPerPage = 5
  
  // Rate limiting states
  const [usageCount, setUsageCount] = useState(0)
  const [timeLeft, setTimeLeft] = useState('')
  const MAX_LIMIT = 20
  const [showStats, setShowStats] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

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

  // Profile
  const [profile, setProfile] = useState<UserProfile>({
    name: 'Admin',
    role: 'Creator',
    avatarUrl: 'https://i.pravatar.cc/150?u=aipostgen'
  })
  const [profileModalOpen, setProfileModalOpen] = useState(false)

  useEffect(() => {
    const storedProfile = localStorage.getItem('userProfile')
    if (storedProfile) {
      try {
        setProfile(JSON.parse(storedProfile))
      } catch (e) {}
    }
  }, [])

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem('userProfile', JSON.stringify(profile))
    setProfileModalOpen(false)
    addNotification('success', 'Perfil atualizado com sucesso!')
  }

  // Initialize dark mode from localStorage
  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true'
    setDarkMode(isDark)
    if (isDark) document.documentElement.classList.add('dark')
  }, [])

  const toggleDarkMode = () => {
    const newDark = !darkMode
    setDarkMode(newDark)
    localStorage.setItem('darkMode', String(newDark))
    if (newDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // New UI states
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({})
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set())
  
  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<any>(null)
  const [editContent, setEditContent] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  
  // Config Modal State
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [vaultPath, setVaultPath] = useState('')
  const [instagramToken, setInstagramToken] = useState('')
  const [instagramAccountId, setInstagramAccountId] = useState('')
  const [defaultLanguage, setDefaultLanguage] = useState('pt-BR')
  const [savingConfig, setSavingConfig] = useState(false)

  // Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewPost, setPreviewPost] = useState<any>(null)

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
    fetchConfig()
    
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

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config')
      if (res.ok) {
        const data = await res.json()
        if (data.vaultPath) setVaultPath(data.vaultPath)
        if (data.instagramToken) setInstagramToken(data.instagramToken)
        if (data.instagramAccountId) setInstagramAccountId(data.instagramAccountId)
        if (data.defaultLanguage) {
          setDefaultLanguage(data.defaultLanguage)
          setSelectedLanguage(data.defaultLanguage) // Sync the per-generation selector
        }
      }
    } catch (err) {
      console.error('Error fetching config:', err)
    }
  }

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
    } catch (e) {
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

  const handleArchive = async (client: string, id: string) => {
    addNotification('info', 'Função de arquivamento em desenvolvimento.')
  }
  
  const handleEdit = (post: any) => {
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
    } catch (e) {
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
    } catch (e) {
      addNotification('error', 'Erro de conexão ao salvar imagens.')
    }
  }

  const handlePublishToInstagram = async (post: any) => {
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

  const handleGenerateImage = async (post: any) => {
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

  const handleGenerateVideo = async (post: any) => {
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

    } catch (err: any) {
      console.error(err);
      addNotification('error', err.message || 'Erro ao gerar ou publicar vídeo.');
    } finally {
      setGeneratingVideo(prev => ({ ...prev, [post.id]: false }));
    }
  }

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingConfig(true)
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          vaultPath: vaultPath, 
          instagramToken: instagramToken, 
          instagramAccountId: instagramAccountId,
          defaultLanguage: defaultLanguage,
        })
      })
      const data = await res.json()
      if (res.ok) {
        addNotification('success', 'Configurações globais salvas com sucesso!')
        setConfigModalOpen(false)
      } else {
        addNotification('error', 'Erro ao salvar configurações: ' + data.error)
      }
    } catch (err) {
      addNotification('error', 'Erro de conexão ao salvar configuração.')
    } finally {
      setSavingConfig(false)
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] flex flex-col font-sans text-slate-800 dark:text-slate-200 transition-colors duration-300">
      
      {/* Navbar */}
      <header className="bg-[#2a3645] dark:bg-[#1e293b] text-white py-3 px-8 flex justify-between items-center shadow-md z-10 sticky top-0 transition-colors duration-300">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-pink-400" />
            <span className="font-semibold text-xl tracking-tight">AI-PostGen</span>
          </div>
          <Link href="/studio" className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 rounded-lg transition-colors border border-indigo-500/30 text-sm font-medium">
            <Film className="w-4 h-4" />
            Product Studio
          </Link>
        </div>
        <div className="flex items-center gap-5">
          <button 
            onClick={toggleDarkMode}
            className="relative p-1 hover:bg-slate-700 rounded-full transition-colors"
            title={darkMode ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
          >
            {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-blue-200" />}
          </button>
          <button 
            onClick={() => setConfigModalOpen(true)}
            className="relative p-1 hover:bg-slate-700 rounded-full transition-colors"
            title="Configurações Globais"
          >
            <Settings className="w-5 h-5 text-gray-300" />
          </button>
          <div className="relative flex items-center gap-4">
            <button 
              onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) markAllRead(); }}
              className="relative p-1 hover:bg-slate-700 rounded-full transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-300" />
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
          
          <button 
            onClick={() => setProfileModalOpen(true)}
            className="w-8 h-8 rounded-full bg-slate-300 overflow-hidden border border-slate-600 hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer flex-shrink-0 ml-1 block z-20 relative"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
          </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8">
        
        {/* Left Column - Form */}
        <section className="flex flex-col gap-6">
          {/* Wood Corkboard Style Container */}
          <div className="bg-[#a87c51] dark:bg-[#5c4028] p-3 rounded-[20px] shadow-xl relative overflow-hidden transition-colors duration-300">
            {/* Inner White Paper */}
            <div className="bg-white dark:bg-[#1e293b] rounded-xl p-6 shadow-inner relative flex flex-col gap-6 h-full border border-[#f0eade] dark:border-slate-700 transition-colors duration-300">
              
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
                  <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base mb-2">Posts Gerados Hoje</h3>
                  <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2 mb-2">
                    <div 
                      className={`h-2 rounded-full ${usageCount >= MAX_LIMIT ? 'bg-red-500' : 'bg-slate-300'}`} 
                      style={{ width: `${Math.min((usageCount / MAX_LIMIT) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">O limite reinicia em {timeLeft}</p>
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

              {generatedPostId && history.find(p => p.id === generatedPostId) && (
                <div className="pt-4 border-t border-gray-100 dark:border-slate-700">
                  <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-3">Ações Rápidas para este Post:</h3>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => handleGenerateImage(history.find(p => p.id === generatedPostId))}
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
                      onClick={() => handleGenerateVideo(history.find(p => p.id === generatedPostId))}
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
                      onClick={() => handlePublishToInstagram(history.find(p => p.id === generatedPostId))}
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
                        {coverImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={coverImage} alt={post.theme} className="w-full h-full object-cover" />
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
                        <div className="flex justify-between items-start gap-4 mb-1">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg truncate" title={post.theme}>
                              {post.theme}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Cliente: {post.client || 'Nenhum'} • {new Date(post.date).toLocaleString()}
                            </p>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex gap-2 flex-shrink-0">
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
      <footer className="mt-auto py-6 px-8 border-t border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-gray-500 dark:text-gray-400 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex gap-6">
          <a href="#" className="hover:text-gray-800 dark:text-gray-100">Sobre nós</a>
          <a href="#" className="hover:text-gray-800 dark:text-gray-100">Termos de Serviço</a>
          <a href="#" className="hover:text-gray-800 dark:text-gray-100">Suporte</a>
        </div>
        <div>
          Powered by <span className="font-semibold text-gray-700 dark:text-gray-200">AI-PostGen</span>
        </div>
      </footer>

      
      {/* Profile Modal */}
      {profileModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Meu Perfil</h2>
              <button onClick={() => setProfileModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-300">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={saveProfile}>
              <div className="p-6 flex flex-col gap-4">
                
                <div className="flex justify-center mb-2">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-100 dark:border-slate-700 relative group cursor-pointer bg-slate-200">
                    <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <UploadCloud className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">URL da Foto</label>
                  <input
                    type="text"
                    required
                    value={profile.avatarUrl}
                    onChange={(e) => setProfile({...profile, avatarUrl: e.target.value})}
                    className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-blue-400 text-sm bg-transparent dark:text-gray-100"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">Nome</label>
                  <input
                    type="text"
                    required
                    value={profile.name}
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                    className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-blue-400 text-sm bg-transparent dark:text-gray-100"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">Cargo / Role</label>
                  <input
                    type="text"
                    value={profile.role}
                    onChange={(e) => setProfile({...profile, role: e.target.value})}
                    className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-blue-400 text-sm bg-transparent dark:text-gray-100"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setProfileModalOpen(false)}
                  className="px-5 py-2 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-800/80 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* Config Modal */}
      {configModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Configurações Globais</h2>
              <button onClick={() => setConfigModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-300">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={saveConfig}>
              <div className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[60vh]">
                
                {/* Vault Section */}
                <div className="mb-2">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2 border-b pb-1">Banco de Dados (Cofre)</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Caminho absoluto para a pasta principal do cofre no seu computador. (ex: E:\\Caminho\\Para\\Cofre)
                  </p>
                  <div>
                    <label className="block text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">Caminho do Cofre</label>
                    <input
                      type="text"
                      required
                      value={vaultPath}
                      onChange={(e) => setVaultPath(e.target.value)}
                      className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-blue-400 font-mono text-sm"
                      placeholder="C:\Users\User\Documents\Obsidian Vault"
                    />
                  </div>
                </div>

                {/* Idioma Padrão */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2 border-b pb-1">🌐 Idioma Padrão dos Posts</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Idioma padrão para geração de conteúdo. Pode ser alterado pontualmente no formulário principal.
                  </p>
                  <div className="relative">
                    <select
                      value={defaultLanguage}
                      onChange={(e) => {
                        setDefaultLanguage(e.target.value)
                        setSelectedLanguage(e.target.value)
                      }}
                      className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-blue-400 text-sm appearance-none cursor-pointer"
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
                </div>

                {/* Instagram Section */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2 border-b pb-1">Instagram</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Credenciais globais da API do Instagram (Graph API) para publicar automaticamente.
                  </p>
                  <div className="mb-3">
                    <label className="block text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">Access Token</label>
                    <input
                      type="text"
                      value={instagramToken}
                      onChange={(e) => setInstagramToken(e.target.value)}
                      className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-blue-400 font-mono text-sm"
                      placeholder="EAA..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">Account ID</label>
                    <input
                      type="text"
                      value={instagramAccountId}
                      onChange={(e) => setInstagramAccountId(e.target.value)}
                      className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-blue-400 font-mono text-sm"
                      placeholder="178414..."
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setConfigModalOpen(false)}
                  className="px-5 py-2 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:bg-slate-800/80 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={savingConfig}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {savingConfig ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
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