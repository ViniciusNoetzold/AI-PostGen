'use client';

import { useState } from "react";
import { CrawlResponse, CrawlPageItem } from "@/lib/scraper/types";
import {
  Compass,
  ArrowRight,
  Download,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  FileCode,
  Layers,
  Copy,
  Check,
} from "lucide-react";

interface CrawlerViewProps {
  onSelectScrapeUrl?: (url: string) => void;
}

export function CrawlerView({ onSelectScrapeUrl }: CrawlerViewProps) {
  const [baseUrl, setBaseUrl] = useState("");
  const [depth, setDepth] = useState(2);
  const [maxPages, setMaxPages] = useState(15);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CrawlResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSitemap, setShowSitemap] = useState(false);
  const [copiedSitemap, setCopiedSitemap] = useState(false);

  const handleCrawl = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    let targetUrl = baseUrl.trim();
    if (!targetUrl) return;
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }

    try {
      new URL(targetUrl);
    } catch {
      setError("Por favor, insira uma URL base válida.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/scraper/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base_url: targetUrl,
          max_depth: depth,
          max_pages: maxPages,
        }),
      });

      const data: CrawlResponse = await res.json();
      if (!res.ok || data.status === "error") {
        throw new Error(data.error || "Falha ao rastrear o domínio.");
      }

      setResult(data);
    } catch (err: any) {
      setError(err?.message || "Erro durante o rastreamento.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSitemap = () => {
    if (!result?.sitemap) return;
    const blob = new Blob([result.sitemap], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sitemap-${new Date().toISOString().slice(0, 10)}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySitemap = () => {
    if (!result?.sitemap) return;
    navigator.clipboard.writeText(result.sitemap);
    setCopiedSitemap(true);
    setTimeout(() => setCopiedSitemap(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400">
          <Compass size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Web Crawler & Mapa do Site
          </h1>
          <p className="text-xs text-slate-500">
            Descubra automaticamente links internos, arquitetura do domínio e gere sitemaps XML.
          </p>
        </div>
      </div>

      {/* Crawl Config Form */}
      <form
        onSubmit={handleCrawl}
        className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6"
      >
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            URL Base do Domínio
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://exemplo.com"
            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>Profundidade Máxima (Depth)</span>
              <span className="text-blue-600 dark:text-blue-400">{depth} níveis</span>
            </div>
            <input
              type="range"
              min="1"
              max="4"
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              1 = apenas links diretos da página inicial; 2-4 = navegação profunda.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>Limite de Páginas</span>
              <span className="text-blue-600 dark:text-blue-400">{maxPages} páginas</span>
            </div>
            <input
              type="range"
              min="5"
              max="40"
              step="5"
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Quantidade máxima de páginas a serem indexadas na execução.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !baseUrl.trim()}
          className={`w-full py-3.5 rounded-xl font-bold text-sm text-white shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
            loading || !baseUrl.trim()
              ? "bg-slate-400 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20"
          }`}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Rastreando Domínio... (Aguarde alguns segundos)</span>
            </>
          ) : (
            <>
              <span>Iniciar Web Crawler</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      {/* Crawl Results */}
      {result && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <span className="text-xs text-slate-400 block mb-1">Páginas Encontradas</span>
              <p className="text-xl font-black text-slate-900 dark:text-white">
                {result.pages_found}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <span className="text-xs text-slate-400 block mb-1">Páginas Rastradas</span>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                {result.pages_scraped}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <span className="text-xs text-slate-400 block mb-1">Profundidade Configurada</span>
              <p className="text-xl font-black text-blue-600 dark:text-blue-400">{depth} níveis</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block mb-1">Sitemap XML</span>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Pronto</p>
              </div>
              <button
                type="button"
                onClick={handleDownloadSitemap}
                className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-100 transition cursor-pointer"
                title="Download Sitemap.xml"
              >
                <Download size={16} />
              </button>
            </div>
          </div>

          {/* Toggle Sitemap View */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Lista de Páginas Descobertas
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSitemap(!showSitemap)}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                {showSitemap ? "Ver Lista de Páginas" : "Ver XML Sitemap"}
              </button>
            </div>
          </div>

          {showSitemap ? (
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-200 font-mono text-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400 font-sans font-bold">sitemap.xml</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopySitemap}
                    className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                  >
                    {copiedSitemap ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedSitemap ? "Copiado!" : "Copiar"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadSitemap}
                    className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Download size={12} />
                    <span>Download</span>
                  </button>
                </div>
              </div>
              <pre className="whitespace-pre-wrap max-h-96 overflow-auto">{result.sitemap}</pre>
            </div>
          ) : (
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
              {result.pages?.map((page, i) => (
                <div
                  key={i}
                  className="py-3 flex items-center justify-between gap-4 flex-wrap text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 dark:text-white truncate">
                      {page.title || page.url}
                    </p>
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-400 hover:text-blue-600 truncate block mt-0.5"
                    >
                      {page.url}
                    </a>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                      Nível {page.depth}
                    </span>
                    {page.status_code ? (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          page.status_code >= 200 && page.status_code < 400
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"
                            : "bg-rose-50 text-rose-600 dark:bg-rose-950/40"
                        }`}
                      >
                        HTTP {page.status_code}
                      </span>
                    ) : null}
                    {onSelectScrapeUrl && (
                      <button
                        type="button"
                        onClick={() => onSelectScrapeUrl(page.url)}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-100 transition cursor-pointer"
                      >
                        Analisar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
