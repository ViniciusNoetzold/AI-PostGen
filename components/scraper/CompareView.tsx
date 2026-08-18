'use client';

import { useState } from "react";
import { CompareResponse } from "@/lib/scraper/types";
import {
  Scale,
  ArrowRight,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Layers,
  Plus,
  Minus,
  Image as ImageIcon,
} from "lucide-react";

export function CompareView() {
  const [url1, setUrl1] = useState("");
  const [url2, setUrl2] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    let u1 = url1.trim();
    let u2 = url2.trim();
    if (!u1 || !u2) return;

    if (!u1.startsWith("http://") && !u1.startsWith("https://")) u1 = "https://" + u1;
    if (!u2.startsWith("http://") && !u2.startsWith("https://")) u2 = "https://" + u2;

    try {
      new URL(u1);
      new URL(u2);
    } catch {
      setError("Por favor, certifique-se de que ambas as URLs sejam válidas.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/scraper/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url1: u1, url2: u2 }),
      });

      const data: CompareResponse = await res.json();
      if (!res.ok || data.status === "error") {
        throw new Error(data.error || "Falha ao comparar as páginas.");
      }

      setResult(data);
    } catch (err: any) {
      setError(err?.message || "Erro durante a comparação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-cyan-50 dark:bg-cyan-900/30 rounded-2xl text-cyan-600 dark:text-cyan-400">
          <Scale size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Comparador de Páginas & URLs
          </h1>
          <p className="text-xs text-slate-500">
            Compare o conteúdo, estrutura, imagens e similaridade entre duas páginas ou versões de um site.
          </p>
        </div>
      </div>

      {/* Compare Inputs Form */}
      <form
        onSubmit={handleCompare}
        className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Página 1 (Original / Versão A)
            </label>
            <input
              type="text"
              value={url1}
              onChange={(e) => setUrl1(e.target.value)}
              placeholder="https://exemplo.com/v1"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Página 2 (Nova / Versão B)
            </label>
            <input
              type="text"
              value={url2}
              onChange={(e) => setUrl2(e.target.value)}
              placeholder="https://exemplo.com/v2"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !url1.trim() || !url2.trim()}
          className={`w-full py-3.5 rounded-xl font-bold text-sm text-white shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
            loading || !url1.trim() || !url2.trim()
              ? "bg-slate-400 cursor-not-allowed"
              : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-cyan-500/20"
          }`}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Comparando Páginas...</span>
            </>
          ) : (
            <>
              <span>Executar Comparação</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      {/* Comparison Results */}
      {result && (
        <div className="space-y-6">
          {/* Similarity Card */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase block mb-1">
                Índice de Similaridade de Conteúdo
              </span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {Math.round((result.similarity_score || 0) * 100)}% de correspondência
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Calculado com base na interseção semântica de textos e palavras-chave.
              </p>
            </div>

            <div className="w-full md:w-64">
              <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.round((result.similarity_score || 0) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Structural Differences */}
          {result.structure_diffs && result.structure_diffs.length > 0 && (
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers size={16} className="text-blue-500" />
                Diferenças Estruturais Detectadas ({result.structure_diffs.length})
              </h2>
              <div className="space-y-2">
                {result.structure_diffs.map((diff, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2.5"
                  >
                    <span
                      className={`p-1 rounded-md text-[10px] font-bold ${
                        diff.type === "added"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                          : diff.type === "removed"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                      }`}
                    >
                      {diff.type.toUpperCase()}
                    </span>
                    <span>{diff.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Images Diff */}
          {((result.images_added && result.images_added.length > 0) ||
            (result.images_removed && result.images_removed.length > 0)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Added */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 uppercase">
                  <Plus size={14} /> Imagens Novas / Adicionadas ({result.images_added?.length || 0})
                </h3>
                <div className="space-y-2 max-h-60 overflow-auto">
                  {result.images_added?.map((img, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs truncate"
                    >
                      {img.alt_text || img.filename || img.absolute_url}
                    </div>
                  ))}
                  {(!result.images_added || result.images_added.length === 0) && (
                    <p className="text-xs text-slate-400 italic">Nenhuma imagem nova.</p>
                  )}
                </div>
              </div>

              {/* Removed */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 uppercase">
                  <Minus size={14} /> Imagens Removidas / Ausentes ({result.images_removed?.length || 0})
                </h3>
                <div className="space-y-2 max-h-60 overflow-auto">
                  {result.images_removed?.map((img, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs truncate"
                    >
                      {img.alt_text || img.filename || img.absolute_url}
                    </div>
                  ))}
                  {(!result.images_removed || result.images_removed.length === 0) && (
                    <p className="text-xs text-slate-400 italic">Nenhuma imagem removida.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Text Diffs */}
          {result.text_diffs && result.text_diffs.length > 0 && (
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Amostra de Alterações de Texto
              </h2>
              <div className="space-y-2 max-h-80 overflow-auto">
                {result.text_diffs.map((diff, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl text-xs font-mono leading-relaxed flex items-start gap-2 ${
                      diff.type === "added"
                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40"
                        : "bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40"
                    }`}
                  >
                    <span className="font-bold shrink-0">{diff.type === "added" ? "+" : "-"}</span>
                    <span>{diff.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
