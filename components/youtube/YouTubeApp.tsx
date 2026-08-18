'use client';

import { useState, useEffect, useRef } from "react";
import { VideoData, TranscribeHistoryItem } from "@/lib/youtube/types";
import { QueueItem, isPlaylistUrl } from "@/lib/youtube/playlist";
import { formatTime } from "@/lib/youtube/extractor";
import { VideoPlayer } from "./VideoPlayer";
import { TranscriptTimeline } from "./TranscriptTimeline";
import { ExportPanel } from "./ExportPanel";
import { TranscribeHistory } from "./TranscribeHistory";
import { QueueView } from "./QueueView";
import {
  Video,
  Sparkles,
  Link2,
  ArrowRight,
  History,
  FileText,
  Download,
  X,
  Layers,
  Clock,
  Play,
  ShieldCheck,
  RefreshCw,
  Cookie,
  CheckCircle,
  ListPlus,
  Hourglass,
  Timer,
} from "lucide-react";

const HISTORY_STORAGE_KEY = "ai_postgen_youtube_history_v1";
const LAST_VIDEO_KEY = "ai_postgen_youtube_last_v1";
const QUEUE_STORAGE_KEY = "ai_postgen_youtube_queue_v1";

export function YouTubeApp() {
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [estimatedTotalSeconds, setEstimatedTotalSeconds] = useState(5);
  const [currentStep, setCurrentStep] = useState("Iniciando transcrição...");
  const [currentVideo, setCurrentVideo] = useState<VideoData | null>(null);
  const [seekTime, setSeekTime] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<
    "transcribe" | "export" | "queue" | "history"
  >("transcribe");
  const [history, setHistory] = useState<TranscribeHistoryItem[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<any>(null);
  const [pullingSession, setPullingSession] = useState(false);
  const [customCookieInput, setCustomCookieInput] = useState("");
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "info") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Carregar histórico local e fila
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) setHistory(JSON.parse(stored));

      const last = localStorage.getItem(LAST_VIDEO_KEY);
      if (last) setCurrentVideo(JSON.parse(last));

      const savedQueue = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (savedQueue) setQueue(JSON.parse(savedQueue));
    } catch {
      // ignore
    }

    // Carrega status da sessão
    fetch("/api/youtube/auto-cookies")
      .then((res) => res.json())
      .then((data) => setSessionStatus(data))
      .catch(() => {});
  }, []);

  const saveHistory = (items: TranscribeHistoryItem[]) => {
    setHistory(items);
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  };

  const handleUpdateQueue = (newQueue: QueueItem[]) => {
    setQueue(newQueue);
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(newQueue));
    } catch {
      // ignore
    }
  };

  const handleAutoPullCookies = async () => {
    setPullingSession(true);
    try {
      const res = await fetch("/api/youtube/auto-cookies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.status) {
        setSessionStatus(data.status);
      }
      showToast(
        data.message || "Sessão do YouTube atualizada com sucesso!",
        "success"
      );
    } catch (err: any) {
      showToast("Falha ao puxar sessão automaticamente.", "error");
    } finally {
      setPullingSession(false);
    }
  };

  const handleSaveManualCookies = async () => {
    if (!customCookieInput.trim()) return;
    setPullingSession(true);
    try {
      const res = await fetch("/api/youtube/auto-cookies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manualCookies: customCookieInput }),
      });
      const data = await res.json();
      if (data.status) {
        setSessionStatus(data.status);
      }
      setCustomCookieInput("");
      showToast("Cookies salvos com sucesso!", "success");
    } catch {
      showToast("Erro ao salvar cookies.", "error");
    } finally {
      setPullingSession(false);
    }
  };

  const handleTranscribe = async (urlToTranscribe?: string) => {
    const targetUrl = (urlToTranscribe || videoUrl).trim();
    if (!targetUrl) return;

    // Se for link de Playlist, redireciona direto para a aba de Fila & Playlists
    if (isPlaylistUrl(targetUrl)) {
      setActiveTab("queue");
      showToast("Link de playlist detectado! Carregando na aba de Fila...", "info");
      return;
    }

    setLoading(true);
    setSeekTime(null);
    setElapsedSeconds(0);
    setEstimatedTotalSeconds(5);
    setCurrentStep("Conectando aos servidores do YouTube...");

    const startTime = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);

      if (elapsed === 1) {
        setCurrentStep("Identificando faixas de legendas e áudio...");
      } else if (elapsed === 2) {
        setCurrentStep("Baixando segmentos cronometrados (timestamps)...");
      } else if (elapsed === 3) {
        setCurrentStep("Decodificando texto e organizando falas...");
      } else if (elapsed >= 4) {
        setCurrentStep("Finalizando e estruturando blocos de texto...");
      }
    }, 500);

    try {
      const res = await fetch("/api/youtube/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Falha ao transcrever o vídeo.");
      }

      setCurrentVideo(data);
      try {
        localStorage.setItem(LAST_VIDEO_KEY, JSON.stringify(data));
      } catch {
        // ignore
      }

      const newItem: TranscribeHistoryItem = {
        id: "yt_" + Date.now(),
        video_id: data.video_id,
        url: data.url,
        title: data.title,
        channel: data.channel,
        thumbnail_url: data.thumbnail_url,
        duration: data.duration,
        segments_count: data.transcript_data?.length || 0,
        created_at: new Date().toISOString(),
      };

      const updated = [newItem, ...history.filter((h) => h.video_id !== data.video_id)];
      saveHistory(updated);

      setActiveTab("transcribe");
      showToast("Transcrição concluída com sucesso!", "success");
    } catch (err: any) {
      showToast(err?.message || "Erro ao processar vídeo.", "error");
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setLoading(false);
    }
  };

  const handleSeek = (time: number) => {
    setSeekTime(time);
  };

  const handleDeleteHistory = (id: string) => {
    const updated = history.filter((h) => h.id !== id);
    saveHistory(updated);
    showToast("Vídeo removido do histórico.", "info");
  };

  const handleClearHistory = () => {
    saveHistory([]);
    showToast("Histórico limpo.", "info");
  };

  const handleOpenVideoFromQueue = (videoData: VideoData) => {
    setCurrentVideo(videoData);
    try {
      localStorage.setItem(LAST_VIDEO_KEY, JSON.stringify(videoData));
    } catch {
      // ignore
    }
    setActiveTab("transcribe");
    showToast(`Abrindo: ${videoData.title}`, "info");
  };

  const remainingSeconds = Math.max(1, estimatedTotalSeconds - elapsedSeconds);
  const progressPercent = Math.min(
    95,
    Math.round((elapsedSeconds / Math.max(elapsedSeconds + 1, estimatedTotalSeconds)) * 100)
  );

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Subnav Top Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-2.5 flex items-center justify-between gap-4 flex-wrap z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 via-rose-600 to-pink-600 flex items-center justify-center text-white shadow-md shadow-red-500/20">
            <Video size={18} />
          </div>
          <div>
            <span className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">
              YouTube Transcriber
            </span>
            <span className="text-[10px] text-red-500 font-bold ml-1.5 uppercase tracking-wider bg-red-50 dark:bg-red-950/50 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800">
              Vídeo & Playlists
            </span>
          </div>
        </div>

        {/* Action button & Sub Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Auto Session Badge Button */}
          <button
            type="button"
            onClick={() => setShowSessionModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition cursor-pointer"
            title="Gerenciar Sessão & Cookies Automáticos do YouTube"
          >
            <ShieldCheck size={14} className="text-emerald-600" />
            <span className="hidden sm:inline">Sessão YouTube:</span>
            <span className="text-emerald-600 dark:text-emerald-400">Ativa (Sem Extensão)</span>
          </button>

          <nav className="flex items-center gap-1 overflow-x-auto py-1">
            <button
              type="button"
              onClick={() => setActiveTab("transcribe")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "transcribe"
                  ? "bg-red-600 text-white shadow-sm shadow-red-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Video size={14} />
              <span>Transcrição</span>
            </button>

            {/* Fila & Playlists Tab */}
            <button
              type="button"
              onClick={() => setActiveTab("queue")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "queue"
                  ? "bg-red-600 text-white shadow-sm shadow-red-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <ListPlus size={14} />
              <span>Fila & Playlists</span>
              {queue.length > 0 && (
                <span className="bg-red-700 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                  {queue.length}
                </span>
              )}
            </button>

            {currentVideo && (
              <button
                type="button"
                onClick={() => setActiveTab("export")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === "export"
                    ? "bg-red-600 text-white shadow-sm shadow-red-500/20"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Download size={14} />
                <span>Exportar & IA</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "history"
                  ? "bg-red-600 text-white shadow-sm shadow-red-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <History size={14} />
              <span>Histórico ({history.length})</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "queue" ? (
          <QueueView
            queue={queue}
            onUpdateQueue={handleUpdateQueue}
            onOpenVideo={handleOpenVideoFromQueue}
            showToast={showToast}
          />
        ) : activeTab === "history" ? (
          <TranscribeHistory
            history={history}
            onOpenVideo={(item) => {
              setVideoUrl(item.url);
              handleTranscribe(item.url);
            }}
            onDeleteItem={handleDeleteHistory}
            onClearHistory={handleClearHistory}
          />
        ) : (
          <div className="max-w-6xl mx-auto space-y-8 p-6 md:p-8">
            {/* Input Hero Section */}
            <div className="p-6 md:p-10 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-bold">
                <Sparkles size={13} /> Suporta Vídeos Únicos & Playlists Completas
              </div>
              <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Transcreva Qualquer Vídeo ou Playlist
              </h1>
              <p className="text-xs md:text-sm text-slate-500 max-w-xl mx-auto">
                Cole o link de um vídeo individual ou de uma <strong>playlist inteira</strong> para transcrever tudo em lote e exportar com facilidade.
              </p>

              {/* Form Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleTranscribe();
                }}
                className="flex flex-col sm:flex-row gap-3 pt-2 max-w-2xl mx-auto"
              >
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <Link2 size={18} />
                  </div>
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="Cole o link de um vídeo ou de uma Playlist..."
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !videoUrl.trim()}
                  className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs md:text-sm text-white shadow-lg transition cursor-pointer ${
                    loading || !videoUrl.trim()
                      ? "bg-slate-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-red-500/20"
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Transcrevendo...</span>
                    </>
                  ) : (
                    <>
                      <Video size={16} />
                      <span>Transcrever</span>
                    </>
                  )}
                </button>
              </form>

              {/* LIVE ETA TIMER DISPLAY (quando transcrevendo) */}
              {loading && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-red-200 dark:border-red-900/40 max-w-2xl mx-auto space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 flex-wrap gap-2">
                    <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-bold">
                      <Timer size={14} className="animate-spin text-red-500" />
                      <span>{currentStep}</span>
                    </span>
                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="text-slate-400">
                        Decorrido: <strong className="text-slate-700 dark:text-slate-200">00:0{elapsedSeconds}s</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-bold">
                        Restante: ~00:0{remainingSeconds}s
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Progress Pulse Bar */}
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 via-rose-500 to-red-600 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Auto Cookie Pull Button in Hero */}
              <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-slate-500 flex-wrap">
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <CheckCircle size={12} /> Bypassa proteção antibot automaticamente
                </span>
                <span>•</span>
                <button
                  type="button"
                  onClick={handleAutoPullCookies}
                  disabled={pullingSession}
                  className="text-blue-600 dark:text-blue-400 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={11} className={pullingSession ? "animate-spin" : ""} />
                  <span>Renovar Sessão Automática</span>
                </button>
              </div>
            </div>

            {/* Current Video Content */}
            {currentVideo && (
              <div className="space-y-6">
                {/* Header Video Info */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col md:flex-row items-center gap-5">
                  <img
                    src={currentVideo.thumbnail_url}
                    alt={currentVideo.title}
                    className="w-full md:w-52 aspect-video object-cover rounded-xl border border-slate-100 dark:border-slate-800 shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-2 text-center md:text-left">
                    <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white leading-snug">
                      {currentVideo.title}
                    </h2>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs text-slate-500">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {currentVideo.channel}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock size={13} /> {formatTime(currentVideo.duration)}
                      </span>
                      <span>•</span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold text-[11px]">
                        {currentVideo.source}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub Tab: Transcribe / Player */}
                {activeTab === "transcribe" && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Video Player */}
                    <div className="lg:col-span-7 space-y-4">
                      <VideoPlayer videoId={currentVideo.video_id} seekTime={seekTime} />
                      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-500 flex items-center justify-between">
                        <span>💡 Clique em qualquer marcador de tempo ao lado para pular o vídeo.</span>
                      </div>
                    </div>

                    {/* Timeline List */}
                    <div className="lg:col-span-5 h-[560px]">
                      <TranscriptTimeline
                        video={currentVideo}
                        onSeek={handleSeek}
                        onOpenAiSummary={() => setActiveTab("export")}
                      />
                    </div>
                  </div>
                )}

                {/* Sub Tab: Export */}
                {activeTab === "export" && <ExportPanel video={currentVideo} />}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Session Management Modal */}
      {showSessionModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowSessionModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600">
                  <Cookie size={20} />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Sessão & Cookies do YouTube
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSessionModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                <CheckCircle size={16} />
                <span>Zero Extensão Necessária</span>
              </div>
              <p className="text-emerald-600 dark:text-emerald-400/90 leading-relaxed text-[11px]">
                O AI-PostGen utiliza o motor direto <strong>Innertube Android/TV Engine</strong>, que solicita as legendas diretamente dos servidores do YouTube sem disparar bloqueios ou exigir exportação manual de arquivos .txt!
              </p>
            </div>

            {/* Quick Auto-Pull Button */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Auto-Sessão Instantânea
              </span>
              <button
                type="button"
                onClick={handleAutoPullCookies}
                disabled={pullingSession}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow transition cursor-pointer"
              >
                <RefreshCw size={14} className={pullingSession ? "animate-spin" : ""} />
                <span>Puxar / Renovar Sessão do YouTube Agora</span>
              </button>
            </div>

            {/* Optional Manual Paste */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Inserir Cookies Personalizados (Opcional)
              </label>
              <textarea
                value={customCookieInput}
                onChange={(e) => setCustomCookieInput(e.target.value)}
                placeholder="Cole os cookies aqui se desejar usar uma conta autenticada específica..."
                rows={3}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleSaveManualCookies}
                disabled={!customCookieInput.trim() || pullingSession}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs disabled:opacity-50 transition cursor-pointer"
              >
                Salvar Cookies
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-2 duration-200">
          <div
            className={`px-4 py-3 rounded-xl shadow-xl text-white text-xs font-semibold flex items-center gap-3 ${
              toastMessage.type === "success"
                ? "bg-emerald-600"
                : toastMessage.type === "error"
                ? "bg-rose-600"
                : "bg-red-600"
            }`}
          >
            <span>{toastMessage.text}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="opacity-80 hover:opacity-100 p-0.5"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
