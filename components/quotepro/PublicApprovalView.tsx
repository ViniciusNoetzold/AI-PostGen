'use client';

import { useState } from "react";
import { useAppContext } from "@/lib/quotepro/context";
import { t } from "@/lib/quotepro/i18n";
import { SignatureData } from "@/lib/quotepro/types";
import { SignaturePad } from "./SignaturePad";
import { QuotePreview } from "./QuotePreview";
import { CheckCircle, XCircle, ArrowLeft } from "lucide-react";

interface PublicApprovalProps {
  quoteId: string;
  onBack?: () => void;
}

export function PublicApprovalView({ quoteId, onBack }: PublicApprovalProps) {
  const {
    quotes,
    setQuotes,
    settings,
    logActivity,
    addNotification,
    showToast,
  } = useAppContext();
  const lang = settings.language;
  const quote = quotes.find((q) => q.id === quoteId);

  const [signatureData, setSignatureData] = useState<SignatureData | undefined>(
    undefined,
  );

  if (!quote) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-400 p-8 text-center">
        <p className="text-lg font-semibold">Orçamento não encontrado.</p>
        <p className="text-xs text-slate-500 mt-1">Verifique o link informado ou selecione outro orçamento no painel.</p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
          >
            Voltar ao Painel
          </button>
        )}
      </div>
    );
  }

  const handleAction = (status: "approved" | "rejected") => {
    if (status === "approved" && !signatureData) {
      showToast(
        "Por favor, assine ou digite seu nome antes de aprovar.",
        "error",
      );
      return;
    }

    setQuotes((prev) =>
      prev.map((q) =>
        q.id === quoteId
          ? {
              ...q,
              status,
              signature: status === "approved" ? signatureData : undefined,
            }
          : q,
      ),
    );

    logActivity(
      status === "approved" ? "approve" : "reject",
      quote.id,
      `Orçamento ${quote.number} foi ${status === "approved" ? "aprovado" : "rejeitado"} pelo cliente.`,
    );
    addNotification(
      `Orçamento ${status === "approved" ? "Aprovado" : "Rejeitado"}`,
      `O cliente respondeu ao orçamento ${quote.number}`,
      `#editor/${quote.id}`,
    );
    showToast(
      status === "approved"
        ? "Orçamento aprovado com sucesso!"
        : "Orçamento recusado.",
      status === "approved" ? "success" : "info",
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center py-8 px-4">
      {onBack && (
        <div className="max-w-3xl w-full mb-4 flex justify-start">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft size={16} /> Voltar
          </button>
        </div>
      )}

      <div className="max-w-3xl w-full bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl border-t-4 border-blue-600 mb-6 text-center border-x border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
          Orçamento {quote.number}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
          Olá! Por favor, revise o documento e forneça sua aprovação eletrônica abaixo.
        </p>

        {quote.status === "sent" ? (
          <div className="flex flex-col items-center gap-6">
            <SignaturePad onSave={setSignatureData} />

            <div className="flex flex-wrap gap-4 justify-center w-full mt-4">
              <button
                type="button"
                onClick={() => handleAction("approved")}
                disabled={!signatureData}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold shadow transition ${
                  signatureData
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                }`}
              >
                <CheckCircle size={20} /> Aprovar Orçamento
              </button>
              <button
                type="button"
                onClick={() => handleAction("rejected")}
                className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 px-6 py-3 rounded-xl font-bold transition cursor-pointer"
              >
                <XCircle size={20} /> Recusar
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-extrabold text-base ${
              quote.status === "approved"
                ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300"
                : quote.status === "rejected"
                  ? "bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            }`}
          >
            {quote.status === "approved" && <CheckCircle size={20} />}
            {quote.status === "rejected" && <XCircle size={20} />}
            Status: {t(quote.status, lang).toUpperCase()}
          </div>
        )}
      </div>

      <div className="w-full max-w-4xl">
        <div className="bg-white text-black p-4 md:p-8 rounded-2xl shadow-sm border border-slate-200">
          <QuotePreview quote={quote} lang={lang} />
        </div>
      </div>
    </div>
  );
}
