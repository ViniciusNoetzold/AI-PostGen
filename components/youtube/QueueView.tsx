'use client';

import { useState, useEffect, useRef } from "react";
import { QueueItem, PlaylistInfo } from "@/lib/youtube/playlist";
import { VideoData } from "@/lib/youtube/types";
import { formatTime } from "@/lib/youtube/extractor";
import {
  ListPlus,
  Play,
  Pause,
  Trash2,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  ExternalLink,
  Layers,
  FileText,
  Copy,
  Check,
  Timer,
  Hourglass,
} from "lucide-react";

interface QueueViewProps {
  queue: QueueItem[];
  onUpdateQueue: (queue: QueueItem[]) => void;
  onOpenVideo: (video: VideoData) => void;
  showToast: (text: string, type?: "success" | "error" | "info") => void;
}

export function QueueView({
  queue,
  onUpdateQueue,
  onOpenVideo,
  showToast,
}: QueueViewProps) {
  const [playlistInput, setPlaylistInput] = useState("");
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);
  const [playlistPreview, setPlaylistPreview] = useState<PlaylistInfo | null>(null);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [currentProcessingTitle, setCurrentProcessingTitle] = useState("");
  const [queueElapsedSeconds, setQueueElapsedSeconds] = useState(0);
  const [currentVideoElapsedSeconds, setCurrentVideoElapsedSeconds] = useState(0);
  const [avgSecondsPerVideo, setAvgSecondsPerVideo] = useState(3.5);

  const queueTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Carregar playlist
  const handleLoadPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistInput.trim()) return;

    setLoadingPlaylist(true);
    setPlaylistPreview(null);

    try {
      const res = await fetch("/api/youtube/playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: playlistInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Erro ao carregar a playlist.");
      }

      setPlaylistPreview(data);
      showToast(`Playlist carregada com ${data.videoCount} vídeos!`, "success");
    } catch (err: any) {
      showToast(err?.message || "Falha ao carregar playlist.", "error");
    } finally {
      setLoadingPlaylist(false);
    }
  };

  // Adicionar vídeos da playlist na fila
  const handleAddPlaylistToQueue = () => {
    if (!playlistPreview) return;

    const newItems: QueueItem[] = playlistPreview.videos.map((v) => ({
      id: "q_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      videoId: v.videoId,
      url: v.url,
      title: v.title,
      channel: v.channel,
      thumbnailUrl: v.thumbnailUrl,
      duration: v.duration,
      status: "pending",
      addedAt: new Date().toISOString(),
    }));

    const existingVideoIds = new Set(queue.map((q) => q.videoId));
    const toAdd = newItems.filter((item) => !existingVideoIds.has(item.videoId));

    const updatedQueue = [...queue, ...toAdd];
    onUpdateQueue(updatedQueue);
    setPlaylistPreview(null);
    setPlaylistInput("");
    showToast(`${toAdd.length} vídeos adicionados à fila de transcrição!`, "success");
  };

  // Processar um item individual da fila com timer
  const processQueueItem = async (itemId: string, currentQueue: QueueItem[]) => {
    const item = currentQueue.find((q) => q.id === itemId);
    if (!item) return;

    setCurrentProcessingTitle(item.title);
    setCurrentVideoElapsedSeconds(0);

    const videoStart = Date.now();
    if (videoTimerRef.current) clearInterval(videoTimerRef.current);
    videoTimerRef.current = setInterval(() => {
      setCurrentVideoElapsedSeconds(Math.floor((Date.now() - videoStart) / 1000));
    }, 500);

    const updatedWithProcessing = currentQueue.map((q) =>
      q.id === itemId ? { ...q, status: "processing" as const } : q
    );
    onUpdateQueue(updatedWithProcessing);

    try {
      const res = await fetch("/api/youtube/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: item.url }),
      });

      const videoData: VideoData = await res.json();
      if (!res.ok || (videoData as any).error) {
        throw new Error((videoData as any).error || "Erro ao transcrever.");
      }

      const durationThis = Math.max(1, (Date.now() - videoStart) / 1000);
      setAvgSecondsPerVideo((prev) => (prev * 0.7 + durationThis * 0.3));

      const finalQueue = updatedWithProcessing.map((q) =>
        q.id === itemId
          ? {
              ...q,
              status: "completed" as const,
              videoData,
              title: videoData.title || q.title,
              duration: videoData.duration || q.duration,
            }
          : q
      );
      onUpdateQueue(finalQueue);
      return finalQueue;
    } catch (err: any) {
      const errorQueue = updatedWithProcessing.map((q) =>
        q.id === itemId
          ? {
              ...q,
              status: "error" as const,
              error: err?.message || "Erro desconhecido",
            }
          : q
      );
      onUpdateQueue(errorQueue);
      return errorQueue;
    } finally {
      if (videoTimerRef.current) {
        clearInterval(videoTimerRef.current);
        videoTimerRef.current = null;
      }
    }
  };

  // Iniciar processamento sequencial da fila com timer global
  const handleStartQueue = async () => {
    setIsProcessingQueue(true);
    setQueueElapsedSeconds(0);

    const queueStart = Date.now();
    if (queueTimerRef.current) clearInterval(queueTimerRef.current);
    queueTimerRef.current = setInterval(() => {
      setQueueElapsedSeconds(Math.floor((Date.now() - queueStart) / 1000));
    }, 1000);

    let workingQueue = [...queue];
    const pendingItems = workingQueue.filter(
      (q) => q.status === "pending" || q.status === "error"
    );

    for (const item of pendingItems) {
      const updated = await processQueueItem(item.id, workingQueue);
      if (updated) {
        workingQueue = updated;
      }
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    if (queueTimerRef.current) {
      clearInterval(queueTimerRef.current);
      queueTimerRef.current = null;
    }
    setIsProcessingQueue(false);
    setCurrentProcessingTitle("");
    showToast("Processamento da fila finalizado com sucesso!", "success");
  };

  const handleDeleteItem = (id: string) => {
    const updated = queue.filter((q) => q.id !== id);
    onUpdateQueue(updated);
  };

  const handleClearCompleted = () => {
    const updated = queue.filter((q) => q.status !== "completed");
    onUpdateQueue(updated);
    showToast("Vídeos concluídos removidos da fila.", "info");
  };

  const handleClearAll = () => {
    if (window.confirm("Deseja limpar toda a fila de transcrições?")) {
      onUpdateQueue([]);
      showToast("Fila limpa.", "info");
    }
  };

  const handleExportAll = (format: "txt" | "md" | "json") => {
    const completed = queue.filter((q) => q.status === "completed" && q.videoData);
    if (completed.length === 0) {
      showToast("Nenhuma transcrição concluída para exportar.", "error");
      return;
    }

    let content = "";
    let filename = `transcricoes_batch_${new Date().toISOString().slice(0, 10)}`;
    let mime = "text/plain";

    if (format === "json") {
      content = JSON.stringify(
        completed.map((q) => q.videoData),
        null,
        2
      );
      filename += ".json";
      mime = "application/json";
    } else if (format === "md") {
      content = completed
        .map((q) => {
          const v = q.videoData!;
          const header = `# ${v.title}\n\n- **Canal:** ${v.channel}\n- **URL:** ${v.url}\n- **Duração:** ${formatTime(v.duration)}\n\n### Transcrição:\n\n`;
          const lines = v.transcript_data
            .map((s) => `> **[${formatTime(s.start)}]** ${s.text}`)
            .join("\n\n");
          return `${header}${lines}\n\n---\n`;
        })
        .join("\n\n");
      filename += ".md";
      mime = "text/markdown";
    } else {
      content = completed
        .map((q) => {
          const v = q.videoData!;
          const lines = v.transcript_data
            .map((s) => `[${formatTime(s.start)}] ${s.text}`)
            .join("\n");
          return `========================================\n${v.title} (${v.channel})\nURL: ${v.url}\n========================================\n\n${lines}\n`;
        })
        .join("\n\n");
      filename += ".txt";
      mime = "text/plain";
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Arquivo ${filename} baixado com sucesso!`, "success");
  };

  const completedCount = queue.filter((q) => q.status === "completed").length;
  const pendingCount = queue.filter((q) => q.status === "pending").length;
  const errorCount = queue.filter((q) => q.status === "error").length;

  const totalRemainingCount = pendingCount + (isProcessingQueue ? 1 : 0);
  const estimatedRemainingSecs = Math.max(
    1,
    Math.round(totalRemainingCount * avgSecondsPerVideo)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-red-600 to-rose-600 rounded-2xl text-white shadow-md shadow-red-500/20">
            <ListPlus size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Fila & Transcrição de Playlists
            </h1>
            <p className="text-xs text-slate-500">
              Cole o link de uma playlist inteira ou enfileire vários vídeos para transcrever em lote.
            </p>
          </div>
        </div>

        {/* Bulk Action Buttons */}
        {queue.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleStartQueue}
              disabled={isProcessingQueue || (pendingCount === 0 && errorCount === 0)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition cursor-pointer ${
                isProcessingQueue || (pendingCount === 0 && errorCount === 0)
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 shadow-red-500/20"
              }`}
            >
              {isProcessingQueue ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processando Fila...</span>
                </>
              ) : (
                <>
                  <Play size={14} />
                  <span>Transcrever Fila ({pendingCount + errorCount})</span>
                </>
              )}
            </button>

            {completedCount > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleExportAll("txt")}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
                  title="Baixar todos os textos concluídos em um .txt"
                >
                  <Download size={13} className="inline mr-1" /> .TXT
                </button>
                <button
                  type="button"
                  onClick={() => handleExportAll("md")}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
                  title="Baixar todos os textos em Markdown"
                >
                  <Download size={13} className="inline mr-1" /> .MD
                </button>
                <button
                  type="button"
                  onClick={() => handleExportAll("json")}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
                  title="Baixar JSON estruturado"
                >
                  <Download size={13} className="inline mr-1" /> .JSON
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Playlist Input Form */}
      <form
        onSubmit={handleLoadPlaylist}
        className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Link da Playlist do YouTube
          </label>
          <span className="text-[11px] text-slate-400">
            Ex: https://www.youtube.com/playlist?list=PL...
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={playlistInput}
            onChange={(e) => setPlaylistInput(e.target.value)}
            placeholder="Cole o link da playlist aqui..."
            className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button
            type="submit"
            disabled={loadingPlaylist || !playlistInput.trim()}
            className={`px-6 py-3 rounded-xl font-bold text-xs md:text-sm text-white shadow transition flex items-center justify-center gap-2 cursor-pointer ${
              loadingPlaylist || !playlistInput.trim()
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700"
            }`}
          >
            {loadingPlaylist ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Carregando Playlist...</span>
              </>
            ) : (
              <>
                <ListPlus size={16} />
                <span>Carregar Playlist</span>
              </>
            )}
          </button>
        </div>

        {/* Playlist Loaded Preview Banner */}
        {playlistPreview && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="font-bold text-xs text-red-900 dark:text-red-200">
                {playlistPreview.title}
              </h3>
              <p className="text-[11px] text-red-600 dark:text-red-400">
                {playlistPreview.videoCount} vídeos identificados • Canal:{" "}
                {playlistPreview.channel || "YouTube"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddPlaylistToQueue}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow transition cursor-pointer"
            >
              Adicionar Todos à Fila ({playlistPreview.videoCount} Vídeos)
            </button>
          </div>
        )}
      </form>

      {/* Progress & Live ETA Timer Bar */}
      {queue.length > 0 && (
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 dark:text-white">
                Progresso: {completedCount} de {queue.length} vídeos
              </span>
              {isProcessingQueue && (
                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold text-[10px] animate-pulse">
                  Transcrevendo: {currentProcessingTitle.slice(0, 32)}...
                </span>
              )}
            </div>

            {/* LIVE ETA TIMER BADGES */}
            <div className="flex items-center gap-3 text-[11px] font-mono flex-wrap">
              {isProcessingQueue ? (
                <>
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <Clock size={12} /> Decorrido: <strong>{formatTime(queueElapsedSeconds)}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-bold border border-red-200 dark:border-red-900/50">
                    <Timer size={12} className="animate-spin text-red-500" />
                    Tempo Estimado Restante: ~{formatTime(estimatedRemainingSecs)}
                  </span>
                </>
              ) : (
                <span className="text-slate-400">
                  Tempo estimado total: ~{formatTime(Math.round(queue.length * avgSecondsPerVideo))}
                </span>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{
                width: `${queue.length > 0 ? (completedCount / queue.length) * 100 : 0}%`,
              }}
            />
          </div>

          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
            <div className="flex items-center gap-3">
              <span className="text-emerald-600 font-bold">✓ {completedCount} Concluídos</span>
              <span className="text-blue-600 font-bold">⏳ {pendingCount} Pendentes</span>
              {errorCount > 0 && (
                <span className="text-rose-600 font-bold">✗ {errorCount} Erros</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClearCompleted}
                disabled={completedCount === 0}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-white disabled:opacity-30 cursor-pointer"
              >
                Limpar Concluídos
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-rose-600 hover:underline cursor-pointer"
              >
                Esvaziar Fila
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Queue Items List */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
        {queue.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <ListPlus className="mx-auto mb-2 opacity-30" size={40} />
            <p className="text-sm font-semibold">A fila de transcrição está vazia.</p>
            <p className="text-xs text-slate-500 mt-1">
              Cole o link de uma playlist acima para carregar vídeos em lote.
            </p>
          </div>
        ) : (
          queue.map((item, idx) => (
            <div
              key={item.id}
              className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <span className="font-mono text-xs font-bold text-slate-400 w-6 shrink-0 text-center">
                  #{idx + 1}
                </span>
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="w-24 aspect-video object-cover rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-100 dark:border-slate-800"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {item.channel || "YouTube"}
                  </p>
                  {item.error && (
                    <p className="text-[11px] text-rose-500 font-semibold mt-1">
                      {item.error}
                    </p>
                  )}
                </div>
              </div>

              {/* Status & Actions */}
              <div className="flex items-center gap-3 shrink-0">
                {item.status === "completed" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] font-bold">
                    <CheckCircle size={12} /> Concluído
                  </span>
                )}
                {item.status === "processing" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 text-[10px] font-bold">
                    <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    Transcrevendo ({currentVideoElapsedSeconds}s)...
                  </span>
                )}
                {item.status === "pending" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-bold">
                    <Clock size={12} /> Aguardando (~3s)
                  </span>
                )}
                {item.status === "error" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 text-[10px] font-bold">
                    <AlertCircle size={12} /> Erro
                  </span>
                )}

                {item.videoData ? (
                  <button
                    type="button"
                    onClick={() => onOpenVideo(item.videoData!)}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 transition cursor-pointer"
                  >
                    Ver Resultado
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => processQueueItem(item.id, queue)}
                    disabled={isProcessingQueue || item.status === "processing"}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                  >
                    Transcrever
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer"
                  title="Remover da Fila"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
