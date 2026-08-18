'use client';

import { useState } from "react";
import { VideoData } from "@/lib/youtube/types";
import {
  generateMarkdownContent,
  generateSrtContent,
  formatTime,
} from "@/lib/youtube/extractor";
import {
  Download,
  Copy,
  Check,
  FileText,
  Sparkles,
  Code,
  Layers,
  FileCode,
} from "lucide-react";

interface ExportPanelProps {
  video: VideoData;
}

export function ExportPanel({ video }: ExportPanelProps) {
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleDownload = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = (content: string, formatId: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFormat(formatId);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const handleGenerateAiSummary = async () => {
    setLoadingAi(true);
    setAiError(null);

    try {
      const res = await fetch("/api/youtube/ai-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: video.full_text,
          title: video.title,
          channel: video.channel,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Falha ao gerar resumo.");
      }

      setAiSummary(data.summary);
    } catch (err: any) {
      setAiError(err?.message || "Erro ao conectar à IA.");
    } finally {
      setLoadingAi(false);
    }
  };

  const rawTxt = video.transcript_data
    .map((s) => `[${formatTime(s.start)}] ${s.text}`)
    .join("\n");
  const plainTextOnly = video.full_text;
  const mdContent = generateMarkdownContent(video);
  const srtContent = generateSrtContent(video.transcript_data);
  const jsonContent = JSON.stringify(video, null, 2);

  const formats = [
    {
      id: "txt_timed",
      label: "Texto com Tempo (.txt)",
      desc: "Linhas organizadas com timestamps [01:23].",
      content: rawTxt,
      filename: `${video.video_id}_transcricao_tempo.txt`,
      mime: "text/plain",
      icon: <FileText size={20} className="text-blue-500" />,
    },
    {
      id: "txt_plain",
      label: "Texto Corrido (.txt)",
      desc: "Texto puro e fluido sem marcações de tempo.",
      content: plainTextOnly,
      filename: `${video.video_id}_texto_puro.txt`,
      mime: "text/plain",
      icon: <FileText size={20} className="text-indigo-500" />,
    },
    {
      id: "md",
      label: "Markdown (.md)",
      desc: "Ideal para Notion, Obsidian e documentação.",
      content: mdContent,
      filename: `${video.video_id}_documento.md`,
      mime: "text/markdown",
      icon: <Layers size={20} className="text-purple-500" />,
    },
    {
      id: "srt",
      label: "Legendas (.srt)",
      desc: "Formato padrão para CapCut, Premiere e players.",
      content: srtContent,
      filename: `${video.video_id}_legendas.srt`,
      mime: "text/plain",
      icon: <FileCode size={20} className="text-emerald-500" />,
    },
    {
      id: "json",
      label: "Dados Brutos (.json)",
      desc: "Array de objetos com text, start e duration.",
      content: jsonContent,
      filename: `${video.video_id}_dados.json`,
      mime: "application/json",
      icon: <Code size={20} className="text-cyan-500" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* AI Post Generation Card */}
      <div className="p-6 rounded-2xl border border-purple-200 dark:border-purple-900/40 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-slate-900 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-md shadow-purple-500/20">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Transformar em Post & Resumo com IA
              </h3>
              <p className="text-xs text-slate-500">
                Gere automaticamente um resumo executivo, tópicos-chave e roteiro de post para redes sociais.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerateAiSummary}
            disabled={loadingAi}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition cursor-pointer ${
              loadingAi
                ? "bg-purple-400 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-500/20"
            }`}
          >
            {loadingAi ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Gerando com IA...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>{aiSummary ? "Regerar com IA" : "Gerar com IA"}</span>
              </>
            )}
          </button>
        </div>

        {aiError && (
          <p className="text-xs text-rose-600 font-semibold">{aiError}</p>
        )}

        {aiSummary && (
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/40 text-xs text-slate-800 dark:text-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-purple-600 dark:text-purple-400 uppercase text-[11px]">
                Conteúdo Gerado pela IA
              </span>
              <button
                type="button"
                onClick={() => handleCopy(aiSummary, "ai_summary")}
                className="inline-flex items-center gap-1 text-xs text-purple-600 font-bold hover:underline"
              >
                {copiedFormat === "ai_summary" ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedFormat === "ai_summary" ? "Copiado!" : "Copiar Post"}</span>
              </button>
            </div>
            <div className="whitespace-pre-wrap leading-relaxed max-h-72 overflow-auto font-sans">
              {aiSummary}
            </div>
          </div>
        )}
      </div>

      {/* Export Format Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {formats.map((f) => (
          <div
            key={f.id}
            className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-start justify-between gap-3 hover:border-blue-400 transition"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 shrink-0">
                {f.icon}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                  {f.label}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{f.desc}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleCopy(f.content, f.id)}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Copiar para área de transferência"
              >
                {copiedFormat === f.id ? (
                  <Check size={15} className="text-emerald-500" />
                ) : (
                  <Copy size={15} />
                )}
              </button>
              <button
                type="button"
                onClick={() => handleDownload(f.content, f.filename, f.mime)}
                className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition cursor-pointer"
                title="Download do Arquivo"
              >
                <Download size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
