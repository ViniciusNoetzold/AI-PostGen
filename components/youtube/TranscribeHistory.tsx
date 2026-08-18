'use client';

import { useState } from "react";
import { TranscribeHistoryItem } from "@/lib/youtube/types";
import { formatTime } from "@/lib/youtube/extractor";
import {
  History,
  Search,
  Trash2,
  Play,
  Clock,
  Video,
  ExternalLink,
} from "lucide-react";

interface TranscribeHistoryProps {
  history: TranscribeHistoryItem[];
  onOpenVideo: (item: TranscribeHistoryItem) => void;
  onDeleteItem: (id: string) => void;
  onClearHistory: () => void;
}

export function TranscribeHistory({
  history,
  onOpenVideo,
  onDeleteItem,
  onClearHistory,
}: TranscribeHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = history.filter(
    (h) =>
      h.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.channel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-2xl text-red-600 dark:text-red-400">
            <History size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Histórico de Vídeos Transcritos
            </h1>
            <p className="text-xs text-slate-500">
              Acesse rapidamente transcrições realizadas anteriormente.
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Deseja limpar todo o histórico de transcrições?")) {
                onClearHistory();
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-100 transition cursor-pointer"
          >
            <Trash2 size={14} /> Limpar Histórico
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search size={16} />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por título, canal ou link..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>

      {/* Grid of history videos */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-slate-400 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <Video className="mx-auto mb-2 opacity-30" size={40} />
          <p className="text-sm font-semibold">Nenhum vídeo no histórico.</p>
          <p className="text-xs text-slate-500 mt-1">
            Cole um link do YouTube para transcrever o primeiro vídeo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex gap-4 hover:border-red-400 transition"
            >
              <div
                onClick={() => onOpenVideo(item)}
                className="w-32 aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden shrink-0 relative group cursor-pointer"
              >
                <img
                  src={item.thumbnail_url}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white">
                  <Play size={20} />
                </div>
              </div>

              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <h3
                    onClick={() => onOpenVideo(item)}
                    className="font-bold text-xs text-slate-900 dark:text-white line-clamp-2 hover:text-red-600 transition cursor-pointer"
                  >
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate mt-1">
                    {item.channel}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> {formatTime(item.duration)}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenVideo(item)}
                      className="text-red-600 dark:text-red-400 font-bold hover:underline"
                    >
                      Abrir
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteItem(item.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Excluir"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
