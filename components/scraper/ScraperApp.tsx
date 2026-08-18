'use client';

import { useState, useEffect } from "react";
import {
  Globe,
  FileCode,
  Compass,
  Scale,
  History,
  Sparkles,
  X,
  Layers,
} from "lucide-react";
import { ScrapeResponse, HistoryItem } from "@/lib/scraper/types";
import { ScraperHomeView } from "./ScraperHomeView";
import { AnalysisView } from "./AnalysisView";
import { CrawlerView } from "./CrawlerView";
import { CompareView } from "./CompareView";
import { HistoryView } from "./HistoryView";

type TabType = "home" | "analysis" | "crawler" | "compare" | "history";

const HISTORY_STORAGE_KEY = "ai_postgen_scraper_history_v1";
const LAST_SCRAPE_KEY = "ai_postgen_scraper_last_v1";

export function ScraperApp() {
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [currentAnalysis, setCurrentAnalysis] = useState<ScrapeResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "info") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Carregar histórico do localStorage de forma segura
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
      const last = localStorage.getItem(LAST_SCRAPE_KEY);
      if (last) {
        setCurrentAnalysis(JSON.parse(last));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveHistory = (items: HistoryItem[]) => {
    setHistory(items);
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  };

  const handleAnalyze = async (url: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data: ScrapeResponse = await res.json();

      if (!res.ok || data.status === "error") {
        throw new Error(data.error || "Erro ao realizar scraping da página.");
      }

      setCurrentAnalysis(data);
      try {
        localStorage.setItem(LAST_SCRAPE_KEY, JSON.stringify(data));
      } catch {
        // ignore
      }

      // Adicionar ao histórico
      const newItem: HistoryItem = {
        id: data.id,
        url: data.url,
        title: data.metadata?.title,
        status: data.status,
        created_at: data.created_at,
        word_count: data.stats?.word_count,
        image_count: data.stats?.image_count,
      };

      const updatedHistory = [newItem, ...history.filter((h) => h.url !== data.url)];
      saveHistory(updatedHistory);

      setActiveTab("analysis");
      showToast("Página raspada e analisada com sucesso!", "success");
    } catch (err: any) {
      showToast(err?.message || "Falha ao analisar a URL.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenItem = (item: HistoryItem | ScrapeResponse) => {
    if ("metadata" in item) {
      setCurrentAnalysis(item as ScrapeResponse);
      setActiveTab("analysis");
    } else {
      // Se for apenas o item de histórico, executa a análise ou reabre
      handleAnalyze(item.url);
    }
  };

  const handleDeleteHistoryItem = (id: string) => {
    const updated = history.filter((h) => h.id !== id);
    saveHistory(updated);
    showToast("Item removido do histórico.", "info");
  };

  const handleClearHistory = () => {
    saveHistory([]);
    showToast("Histórico limpo com sucesso.", "info");
  };

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Subnav Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-2.5 flex items-center justify-between gap-4 flex-wrap z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Globe size={18} />
          </div>
          <div>
            <span className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">
              Web Scraping Pro
            </span>
            <span className="text-[10px] text-blue-500 font-bold ml-1.5 uppercase tracking-wider bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
              Ferramenta
            </span>
          </div>
        </div>

        {/* Sub tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1">
          <button
            type="button"
            onClick={() => setActiveTab("home")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "home"
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Globe size={14} />
            <span>Extração</span>
          </button>

          {currentAnalysis && (
            <button
              type="button"
              onClick={() => setActiveTab("analysis")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "analysis"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <FileCode size={14} />
              <span>Análise Detalhada</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab("crawler")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "crawler"
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Compass size={14} />
            <span>Web Crawler</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("compare")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "compare"
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Scale size={14} />
            <span>Comparar URLs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "history"
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <History size={14} />
            <span>Histórico ({history.length})</span>
          </button>
        </nav>
      </div>

      {/* Main View Body */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "home" && (
          <ScraperHomeView
            onAnalyze={handleAnalyze}
            loading={loading}
            history={history}
            onOpenAnalysis={handleOpenItem}
            onNavigateToHistory={() => setActiveTab("history")}
          />
        )}

        {activeTab === "analysis" && currentAnalysis && (
          <AnalysisView
            data={currentAnalysis}
            onBack={() => setActiveTab("home")}
            onReScrape={handleAnalyze}
          />
        )}

        {activeTab === "crawler" && (
          <CrawlerView
            onSelectScrapeUrl={(url) => {
              handleAnalyze(url);
            }}
          />
        )}

        {activeTab === "compare" && <CompareView />}

        {activeTab === "history" && (
          <HistoryView
            history={history}
            onOpenItem={handleOpenItem}
            onDeleteItem={handleDeleteHistoryItem}
            onClearHistory={handleClearHistory}
          />
        )}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-2 duration-200">
          <div
            className={`px-4 py-3 rounded-xl shadow-xl text-white text-xs font-semibold flex items-center gap-3 ${
              toastMessage.type === "success"
                ? "bg-emerald-600"
                : toastMessage.type === "error"
                ? "bg-rose-600"
                : "bg-blue-600"
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
