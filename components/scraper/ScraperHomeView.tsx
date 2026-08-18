'use client';

import { useState } from "react";
import {
  Globe,
  ArrowRight,
  FileCode,
  Sparkles,
  Scale,
  Download,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Layers,
} from "lucide-react";
import { ScrapeResponse, HistoryItem } from "@/lib/scraper/types";

interface ScraperHomeViewProps {
  onAnalyze: (url: string) => Promise<void>;
  loading: boolean;
  history: HistoryItem[];
  onOpenAnalysis: (item: HistoryItem | ScrapeResponse) => void;
  onNavigateToHistory: () => void;
}

export function ScraperHomeView({
  onAnalyze,
  loading,
  history,
  onOpenAnalysis,
  onNavigateToHistory,
}: ScraperHomeViewProps) {
  const [inputUrl, setInputUrl] = useState("");
  const [validationError, setValidationError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    let url = inputUrl.trim();
    if (!url) return;

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    try {
      new URL(url);
    } catch {
      setValidationError("Por favor, insira uma URL válida (ex: https://exemplo.com)");
      return;
    }

    onAnalyze(url);
  };

  const sampleUrls = [
    { label: "Wikipedia (Brasil)", url: "https://pt.wikipedia.org/wiki/Brasil" },
    { label: "G1 Notícias", url: "https://g1.globo.com" },
    { label: "GitHub Explore", url: "https://github.com/explore" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-10 p-6 md:p-8">
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden p-8 md:p-14 text-center border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-blue-900/10 via-indigo-900/10 to-violet-900/10 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-slate-900 shadow-sm">
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-bold mb-4">
            <Sparkles size={14} /> Web Scraping & Análise de Sites Profissional
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4 leading-tight">
            Extraia, Analise e Arquive <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Qualquer Página Web
            </span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base mb-8">
            Obtenha metadados SEO, conteúdo limpo em Markdown, estrutura DOM completa, todas as imagens e estatísticas técnicas em segundos.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Globe size={18} />
              </div>
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://exemplo.com ou domínio..."
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !inputUrl.trim()}
              className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm text-white shadow-lg transition cursor-pointer ${
                loading || !inputUrl.trim()
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20"
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Analisando...</span>
                </>
              ) : (
                <>
                  <span>Analisar Site</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {validationError && (
            <p className="text-xs text-rose-500 font-semibold mt-2">{validationError}</p>
          )}

          {/* Quick Presets */}
          <div className="flex items-center justify-center gap-2 flex-wrap mt-4 text-xs text-slate-500">
            <span>Exemplos rápidos:</span>
            {sampleUrls.map((sample) => (
              <button
                key={sample.url}
                type="button"
                onClick={() => {
                  setInputUrl(sample.url);
                  onAnalyze(sample.url);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700 transition"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: <FileCode className="text-blue-500" size={24} />,
            title: "Extração Limpa",
            desc: "HTML purificado, nós semânticos (H1-H6, parágrafos) e conversão para Markdown.",
          },
          {
            icon: <Layers className="text-indigo-500" size={24} />,
            title: "Metadados & SEO",
            desc: "OpenGraph, Twitter Cards, Schema.org JSON-LD, favicon e tags canônicas.",
          },
          {
            icon: <Scale className="text-cyan-500" size={24} />,
            title: "Comparador de URLs",
            desc: "Diff visual e semântico entre duas páginas com cálculo de similaridade.",
          },
          {
            icon: <Download className="text-emerald-500" size={24} />,
            title: "Exportação Multiformato",
            desc: "Exporte dados completos em JSON, Markdown, HTML ou relatório estruturado.",
          },
        ].map((feature, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition"
          >
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 inline-block mb-3">
              {feature.icon}
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
              {feature.title}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">{feature.desc}</p>
          </div>
        ))}
      </section>

      {/* Recent History Table */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-base text-slate-900 dark:text-white">
              Análises Recentes
            </h2>
            <p className="text-xs text-slate-500">
              Histórico das últimas páginas raspadas e analisadas.
            </p>
          </div>
          {history.length > 0 && (
            <button
              type="button"
              onClick={onNavigateToHistory}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todas ({history.length})</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="py-10 text-center text-slate-400">
            <Globe className="mx-auto mb-2 opacity-30" size={36} />
            <p className="text-xs font-medium">Nenhuma análise realizada ainda.</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Digite uma URL acima para iniciar o primeiro scraping.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {history.slice(0, 5).map((item) => (
              <div
                key={item.id}
                onClick={() => onOpenAnalysis(item)}
                className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 px-3 rounded-xl transition cursor-pointer"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Globe size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.title || item.url}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{item.url}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
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
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    {new Date(item.created_at).toLocaleDateString("pt-BR")}
                  </span>
                  <ExternalLink size={14} className="text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
