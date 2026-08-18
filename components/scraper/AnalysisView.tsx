'use client';

import { useState } from "react";
import {
  ScrapeResponse,
  ContentNode,
  ImageInfo,
  StructureNode,
} from "@/lib/scraper/types";
import {
  ArrowLeft,
  Copy,
  Check,
  Download,
  ExternalLink,
  FileCode,
  FileText,
  Image as ImageIcon,
  Layers,
  Sparkles,
  Tag,
  Code,
  Eye,
  X,
  FileDown,
} from "lucide-react";

interface AnalysisViewProps {
  data: ScrapeResponse;
  onBack: () => void;
  onReScrape?: (url: string) => void;
}

export function AnalysisView({ data, onBack, onReScrape }: AnalysisViewProps) {
  const [activeTab, setActiveTab] = useState<
    "content" | "html" | "images" | "structure" | "seo" | "markdown"
  >("content");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageInfo | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownload = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: "content", label: "Texto & Conteúdo", icon: <FileText size={15} /> },
    { id: "images", label: `Imagens (${data.images?.length || 0})`, icon: <ImageIcon size={15} /> },
    { id: "seo", label: "Metadados & SEO", icon: <Tag size={15} /> },
    { id: "structure", label: "Estrutura DOM", icon: <Layers size={15} /> },
    { id: "markdown", label: "Markdown", icon: <Sparkles size={15} /> },
    { id: "html", label: "Código HTML", icon: <FileCode size={15} /> },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6 md:p-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition cursor-pointer"
        >
          <ArrowLeft size={14} /> Voltar ao Início
        </button>

        <div className="flex items-center gap-2">
          {onReScrape && (
            <button
              type="button"
              onClick={() => onReScrape(data.url)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-300 transition"
            >
              Re-analisar
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              handleDownload(
                JSON.stringify(data, null, 2),
                `scrape-${new Date().toISOString().slice(0, 10)}.json`,
                "application/json"
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow transition cursor-pointer"
          >
            <Download size={14} /> Exportar JSON
          </button>
        </div>
      </div>

      {/* Header Info Card */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {data.metadata?.favicon ? (
              <img
                src={data.metadata.favicon}
                alt=""
                className="w-10 h-10 rounded-xl object-contain p-1 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 shrink-0"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-black shrink-0">
                🌐
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-black text-slate-900 dark:text-white truncate">
                {data.metadata?.title || data.url}
              </h1>
              <a
                href={data.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline mt-0.5 truncate max-w-xl"
              >
                <span>{data.url}</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase shrink-0 ${
              data.status === "complete" || data.status === "completed"
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                : "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
            }`}
          >
            {data.status}
          </span>
        </div>

        {/* Technologies badges */}
        {data.technologies && data.technologies.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400">Tecnologias:</span>
            {data.technologies.map((tech) => (
              <span
                key={tech}
                className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40 text-[11px] font-bold"
              >
                {tech}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stats Counters */}
      {data.stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "Palavras", value: data.stats.word_count, icon: "📝" },
            { label: "Caracteres", value: data.stats.char_count, icon: "🔤" },
            { label: "Imagens", value: data.stats.image_count, icon: "🖼️" },
            { label: "Links", value: data.stats.link_count, icon: "🔗" },
            { label: "Headings (H1-H6)", value: data.stats.heading_count, icon: "🏷️" },
            { label: "Parágrafos", value: data.stats.paragraph_count, icon: "📄" },
          ].map((stat, i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
            >
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>{stat.label}</span>
                <span>{stat.icon}</span>
              </div>
              <p className="text-lg font-black text-slate-900 dark:text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Main Tabs Container */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto bg-slate-50/50 dark:bg-slate-950/50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold whitespace-nowrap transition cursor-pointer border-b-2 ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 flex-1 overflow-auto">
          {/* CONTENT TAB */}
          {activeTab === "content" && (
            <div className="space-y-4 max-w-4xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase">
                  Estrutura Semântica de Textos ({data.content?.length || 0} blocos)
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(data.text_content || "", "text_content")}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 font-bold hover:underline"
                >
                  {copiedKey === "text_content" ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedKey === "text_content" ? "Copiado!" : "Copiar Texto Puro"}</span>
                </button>
              </div>

              {data.content && data.content.length > 0 ? (
                <div className="space-y-3">
                  {data.content.map((node, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-200"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-mono font-black uppercase text-slate-600 dark:text-slate-400">
                          {node.tag}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed whitespace-pre-wrap">{node.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  {data.text_content || "Nenhum bloco de conteúdo detectado."}
                </p>
              )}
            </div>
          )}

          {/* IMAGES TAB */}
          {activeTab === "images" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase">
                  Galeria de Imagens Extraídas ({data.images?.length || 0})
                </span>
              </div>

              {data.images && data.images.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {data.images.map((img, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedImage(img)}
                      className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-hidden hover:border-blue-400 transition cursor-pointer shadow-sm flex flex-col"
                    >
                      <div className="aspect-video bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-2 overflow-hidden">
                        <img
                          src={img.absolute_url}
                          alt={img.alt_text || img.filename}
                          className="max-w-full max-h-full object-contain group-hover:scale-105 transition"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpolyline points='21 15 16 10 5 21'/%3E%3C/svg%3E";
                          }}
                        />
                      </div>
                      <div className="p-3 text-xs flex-1 flex flex-col justify-between">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {img.alt_text || img.filename}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                          <span>{img.format?.toUpperCase() || "IMG"}</span>
                          {img.width && img.height && (
                            <span>
                              {img.width}x{img.height}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-12">
                  Nenhuma imagem encontrada nesta página.
                </p>
              )}

              {/* Lightbox Modal */}
              {selectedImage && (
                <div
                  className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                  onClick={() => setSelectedImage(null)}
                >
                  <div
                    className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-md">
                        {selectedImage.alt_text || selectedImage.filename}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setSelectedImage(null)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4 max-h-80">
                      <img
                        src={selectedImage.absolute_url}
                        alt=""
                        className="max-h-72 object-contain"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <span className="text-slate-400 block text-[10px]">Arquivo</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                          {selectedImage.filename}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <span className="text-slate-400 block text-[10px]">Texto Alternativo (Alt)</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                          {selectedImage.alt_text || "Nenhum"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 col-span-2">
                        <span className="text-slate-400 block text-[10px]">URL Absoluta</span>
                        <a
                          href={selectedImage.absolute_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-blue-600 dark:text-blue-400 hover:underline truncate block"
                        >
                          {selectedImage.absolute_url}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SEO TAB */}
          {activeTab === "seo" && (
            <div className="space-y-6 max-w-4xl">
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase">Tags Principais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                    <span className="text-slate-400 text-[10px] block mb-1">Título (Title)</span>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {data.metadata?.title || "N/A"}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                    <span className="text-slate-400 text-[10px] block mb-1">Meta Descrição</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-300">
                      {data.metadata?.description || "N/A"}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                    <span className="text-slate-400 text-[10px] block mb-1">URL Canônica</span>
                    <p className="font-mono text-slate-700 dark:text-slate-300 truncate">
                      {data.metadata?.canonical_url || data.url}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                    <span className="text-slate-400 text-[10px] block mb-1">Idioma (Lang)</span>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {data.metadata?.language || "pt-BR (ou não definido)"}
                    </p>
                  </div>
                </div>
              </div>

              {/* OpenGraph */}
              {data.metadata?.og_tags && Object.keys(data.metadata.og_tags).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase">OpenGraph (Facebook / WhatsApp)</h3>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                    {Object.entries(data.metadata.og_tags).map(([k, v]) => (
                      <div key={k} className="p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 min-w-32">{k}</span>
                        <span className="text-slate-700 dark:text-slate-300 break-all">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STRUCTURE TAB */}
          {activeTab === "structure" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase">Árvore de Elementos DOM</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs max-h-[500px] overflow-auto">
                <pre>{JSON.stringify(data.structure, null, 2)}</pre>
              </div>
            </div>
          )}

          {/* MARKDOWN TAB */}
          {activeTab === "markdown" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase">Conteúdo em Formato Markdown (.md)</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(data.markdown || "", "md")}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 font-bold hover:underline"
                  >
                    {copiedKey === "md" ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedKey === "md" ? "Copiado!" : "Copiar"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleDownload(
                        data.markdown || "",
                        `page-${new Date().toISOString().slice(0, 10)}.md`,
                        "text/markdown"
                      )
                    }
                    className="inline-flex items-center gap-1 text-xs text-blue-600 font-bold hover:underline"
                  >
                    <FileDown size={13} /> Download .md
                  </button>
                </div>
              </div>
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs whitespace-pre-wrap max-h-[500px] overflow-auto leading-relaxed">
                {data.markdown || "Nenhum markdown gerado."}
              </pre>
            </div>
          )}

          {/* HTML TAB */}
          {activeTab === "html" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase">HTML Purificado</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(data.clean_html || data.raw_html || "", "html")}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 font-bold hover:underline"
                  >
                    {copiedKey === "html" ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedKey === "html" ? "Copiado!" : "Copiar HTML"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleDownload(
                        data.clean_html || data.raw_html || "",
                        `page-${new Date().toISOString().slice(0, 10)}.html`,
                        "text/html"
                      )
                    }
                    className="inline-flex items-center gap-1 text-xs text-blue-600 font-bold hover:underline"
                  >
                    <FileDown size={13} /> Download .html
                  </button>
                </div>
              </div>
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs whitespace-pre-wrap max-h-[500px] overflow-auto leading-relaxed">
                {data.clean_html || data.raw_html || "HTML indisponível."}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
