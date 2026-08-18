'use client';

import { useState, useMemo } from "react";
import { VideoData } from "@/lib/youtube/types";
import { formatTime } from "@/lib/youtube/extractor";
import { Search, Copy, Check, Play, Clock, Sparkles } from "lucide-react";

interface TranscriptTimelineProps {
  video: VideoData;
  onSeek: (time: number) => void;
  onOpenAiSummary?: () => void;
}

export function TranscriptTimeline({
  video,
  onSeek,
  onOpenAiSummary,
}: TranscriptTimelineProps) {
  const [search, setSearch] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const filteredTranscript = useMemo(() => {
    if (!search.trim()) return video.transcript_data;
    const lowerSearch = search.toLowerCase();
    return video.transcript_data.filter((seg) =>
      seg.text.toLowerCase().includes(lowerSearch)
    );
  }, [search, video.transcript_data]);

  const handleCopySegment = (text: string, idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleCopyAll = () => {
    const full = video.transcript_data
      .map((s) => `[${formatTime(s.start)}] ${s.text}`)
      .join("\n");
    navigator.clipboard.writeText(full);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      {/* Top Search & Actions */}
      <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap bg-slate-50/50 dark:bg-slate-950/40">
        <div className="relative flex-1 min-w-[200px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={14} />
          </div>
          <input
            type="text"
            placeholder="Pesquisar fala na transcrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {onOpenAiSummary && (
            <button
              type="button"
              onClick={onOpenAiSummary}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow transition cursor-pointer"
            >
              <Sparkles size={13} />
              <span className="hidden sm:inline">Gerar Post IA</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyAll}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
          >
            {copiedAll ? <Check size={13} /> : <Copy size={13} />}
            <span>{copiedAll ? "Copiado!" : "Copiar Tudo"}</span>
          </button>
        </div>
      </div>

      {/* Segments Timeline List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-[520px] divide-y divide-slate-100 dark:divide-slate-800/60">
        {filteredTranscript.length === 0 ? (
          <div className="text-center text-slate-400 py-12 text-xs">
            Nenhuma fala correspondente à pesquisa.
          </div>
        ) : (
          filteredTranscript.map((seg, idx) => {
            let textNode: React.ReactNode = seg.text;
            if (search.trim()) {
              const regex = new RegExp(`(${search.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "gi");
              const parts = seg.text.split(regex);
              textNode = (
                <span>
                  {parts.map((part, i) =>
                    part.toLowerCase() === search.toLowerCase() ? (
                      <mark
                        key={i}
                        className="bg-yellow-200 dark:bg-yellow-900/60 text-slate-900 dark:text-yellow-100 px-0.5 rounded"
                      >
                        {part}
                      </mark>
                    ) : (
                      part
                    )
                  )}
                </span>
              );
            }

            return (
              <div
                key={idx}
                onClick={() => onSeek(seg.start)}
                className="group pt-2.5 first:pt-0 flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer"
              >
                {/* Timestamp Button */}
                <button
                  type="button"
                  onClick={() => onSeek(seg.start)}
                  className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800/50 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition"
                  title="Pular vídeo para este momento"
                >
                  <Play size={9} />
                  <span>{formatTime(seg.start)}</span>
                </button>

                {/* Text Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                    {textNode}
                  </p>
                </div>

                {/* Copy single segment */}
                <button
                  type="button"
                  onClick={(e) => handleCopySegment(seg.text, idx, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition shrink-0"
                  title="Copiar este trecho"
                >
                  {copiedIdx === idx ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
