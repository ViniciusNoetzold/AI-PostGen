'use client';

import { useState } from "react";
import { HistoryItem } from "@/lib/scraper/types";
import {
  History,
  Search,
  Trash2,
  ExternalLink,
  Download,
  CheckCircle,
  AlertCircle,
  Globe,
  ArrowRight,
} from "lucide-react";

interface HistoryViewProps {
  history: HistoryItem[];
  onOpenItem: (item: HistoryItem) => void;
  onDeleteItem: (id: string) => void;
  onClearHistory: () => void;
}

export function HistoryView({
  history,
  onOpenItem,
  onDeleteItem,
  onClearHistory,
}: HistoryViewProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredHistory = history.filter(
    (item) =>
      item.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.title && item.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleExportHistory = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scraper-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-violet-50 dark:bg-violet-900/30 rounded-2xl text-violet-600 dark:text-violet-400">
            <History size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Histórico de Páginas Raspadas
            </h1>
            <p className="text-xs text-slate-500">
              Gerencie e acesse todas as análises realizadas anteriormente.
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportHistory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition cursor-pointer"
            >
              <Download size={14} /> Exportar
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Deseja realmente limpar todo o histórico?")) {
                  onClearHistory();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-100 transition cursor-pointer"
            >
              <Trash2 size={14} /> Limpar Tudo
            </button>
          </div>
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
          placeholder="Buscar por URL ou título..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* History List */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
        {filteredHistory.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Globe className="mx-auto mb-2 opacity-30" size={40} />
            <p className="text-sm font-semibold">Nenhuma análise encontrada no histórico.</p>
            <p className="text-xs text-slate-500 mt-1">
              {searchTerm ? "Tente buscar por outro termo." : "Execute um scraping para salvar resultados aqui."}
            </p>
          </div>
        ) : (
          filteredHistory.map((item) => (
            <div
              key={item.id}
              className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
            >
              <div
                onClick={() => onOpenItem(item)}
                className="min-w-0 flex items-center gap-3.5 flex-1 cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Globe size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {item.title || item.url}
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate">{item.url}</p>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1.5 flex-wrap">
                    <span>📅 {new Date(item.created_at).toLocaleString("pt-BR")}</span>
                    {item.word_count !== undefined && (
                      <span>📝 {item.word_count} palavras</span>
                    )}
                    {item.image_count !== undefined && (
                      <span>🖼️ {item.image_count} imagens</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                    item.status === "complete" || item.status === "completed"
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                  }`}
                >
                  {item.status === "complete" || item.status === "completed" ? (
                    <CheckCircle size={11} />
                  ) : (
                    <AlertCircle size={11} />
                  )}
                  {item.status}
                </span>

                <button
                  type="button"
                  onClick={() => onOpenItem(item)}
                  className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 transition cursor-pointer"
                >
                  Ver Análise
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteItem(item.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                  title="Excluir do Histórico"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
