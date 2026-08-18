'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  Copy,
  Download,
  Edit3,
  Eye,
  FileImage,
  FolderOpen,
  Mail,
  Phone,
  Printer,
  Send,
  Trash2,
  X,
  ArrowLeft,
} from "lucide-react";
import { QuoteEditor } from "./QuoteEditor";
import { QuotePreview } from "./QuotePreview";
import { TemplatesSidebar } from "./TemplatesSidebar";
import { useAppContext } from "@/lib/quotepro/context";
import { t } from "@/lib/quotepro/i18n";
import { Quote, QuoteHistoryEntry } from "@/lib/quotepro/types";
import {
  calculateQuoteTotals,
  generateFiscalPayload,
} from "@/lib/quotepro/calculations";
import { generateWhatsAppLink } from "@/lib/quotepro/whatsapp";

function formatDateIso(d: Date | string = new Date()): string {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  return isNaN(dateObj.getTime()) ? '' : dateObj.toISOString().split('T')[0];
}

interface EditorViewProps {
  quoteId?: string;
  onBack?: () => void;
  onOpenApproval?: (quoteId: string) => void;
}

function withTotals(quote: Quote): Quote {
  const totals = calculateQuoteTotals(quote);
  return { ...quote, subtotal: totals.itemsSubtotal, total: totals.finalTotal };
}

export function EditorView({ quoteId, onBack, onOpenApproval }: EditorViewProps) {
  const {
    quotes,
    setQuotes,
    settings,
    setSettings,
    logActivity,
    showToast,
    profiles,
    clients,
    templates,
    setTemplates,
  } = useAppContext();

  const existingQuote = quoteId
    ? quotes.find((item) => item.id === quoteId)
    : undefined;
  const isNewRef = useRef(!existingQuote);
  const creationLoggedRef = useRef(false);
  const [mode, setMode] = useState<"editor" | "preview">("editor");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const [quote, setQuote] = useState<Quote>(() =>
    withTotals(
      existingQuote || {
        id: crypto.randomUUID(),
        number: `ORC-${String(settings.nextQuoteNumber || 1).padStart(3, "0")}`,
        date: formatDateIso(new Date()),
        validUntil: "",
        clientId: "",
        items: [
          {
            id: crypto.randomUUID(),
            description: "",
            quantity: 1,
            unitPrice: 0,
          },
        ],
        discountType: "percentage",
        discountValue: 0,
        addition: 0,
        taxes: [],
        total: 0,
        subtotal: 0,
        notes: "",
        status: "draft",
        currency: settings.currency || "BRL",
        issuerId: (profiles.find((profile) => profile.isDefault) || profiles[0])
          ?.id,
        recurringConfig: { active: false, frequency: "monthly" },
        customFields: [],
      },
    ),
  );

  const updateQuote = useCallback<Dispatch<SetStateAction<Quote>>>((action) => {
    setQuote((current) => {
      const next = typeof action === "function" ? action(current) : action;
      return withTotals(next);
    });
  }, []);

  useEffect(() => {
    setQuotes((current) => {
      const index = current.findIndex((item) => item.id === quote.id);
      if (index < 0) return [quote, ...current];
      if (JSON.stringify(current[index]) === JSON.stringify(quote))
        return current;
      const next = [...current];
      next[index] = quote;
      return next;
    });

    if (isNewRef.current && !creationLoggedRef.current) {
      creationLoggedRef.current = true;
      const parsedNumber = Number(quote.number.match(/\d+/)?.[0] || 0);
      setSettings((current) => ({
        ...current,
        nextQuoteNumber: Math.max(current.nextQuoteNumber || 1, parsedNumber + 1),
      }));
      logActivity("create", quote.id, `Rascunho criado: ${quote.number}`);
    }
  }, [logActivity, quote, setQuotes, setSettings]);

  const client = clients.find((item) => item.id === quote.clientId);
  
  const approvalUrl = typeof window !== "undefined"
    ? `${window.location.origin}/orcamentos?orc=${quote.id}`
    : "";

  const history: QuoteHistoryEntry[] = quotes
    .filter((item) => item.status !== "draft")
    .map((item) => ({
      id: item.id,
      number: item.number,
      date: item.date,
      clientName: clients.find((candidate) => candidate.id === item.clientId)
        ?.name,
      total: calculateQuoteTotals(item).finalTotal,
      currency: item.currency,
    }));

  const validateQuote = () => {
    if (!client) {
      showToast("Selecione ou cadastre um cliente antes de emitir.", "error");
      return false;
    }
    if (
      !quote.items.some((item) => item.description.trim() && item.quantity > 0)
    ) {
      showToast("Adicione ao menos um item válido ao orçamento.", "error");
      return false;
    }
    return true;
  };

  const handleExportPDF = useCallback(async () => {
    const { generatePDF } = await import("@/lib/quotepro/pdf");
    const success = await generatePDF(
      "quote-export-container",
      `${quote.number}_${quote.date}`,
    );
    showToast(
      success ? "PDF gerado com sucesso." : "Não foi possível gerar o PDF.",
      success ? "success" : "error",
    );
    if (success)
      logActivity("export", quote.id, `PDF exportado: ${quote.number}`);
  }, [logActivity, quote.date, quote.id, quote.number, showToast]);

  const handleExportPNG = async () => {
    const { generatePNG } = await import("@/lib/quotepro/pdf");
    await generatePNG(
      "quote-export-container",
      `${quote.number}_${quote.date}`,
    );
    logActivity("export", quote.id, `Imagem exportada: ${quote.number}`);
  };

  const handleEmit = () => {
    if (
      !validateQuote() ||
      !window.confirm("Emitir este orçamento e marcá-lo como enviado?")
    )
      return;
    updateQuote((current) => ({ ...current, status: "sent" }));
    generateFiscalPayload(quote, client);
    showToast("Orçamento emitido com sucesso.");
    logActivity("send", quote.id, `Orçamento emitido: ${quote.number}`);
  };

  const handleApproval = async () => {
    if (onOpenApproval) {
      onOpenApproval(quote.id);
      return;
    }
    if (!approvalUrl) return;
    try {
      await navigator.clipboard.writeText(approvalUrl);
      showToast("Link de aprovação copiado para a área de transferência!", "info");
    } catch {
      window.prompt("Copie o link de aprovação:", approvalUrl);
    }
  };

  const handleSendEmail = async () => {
    if (
      !settings.emailJS?.serviceId ||
      !settings.emailJS.templateId ||
      !settings.emailJS.publicKey
    ) {
      showToast(
        "Configure todos os campos do EmailJS na aba Configurações.",
        "error",
      );
      return;
    }
    if (!client?.email) {
      showToast("O cliente selecionado não possui e-mail.", "error");
      return;
    }
    setIsSendingEmail(true);
    try {
      const [{ generatePDFBase64 }, { sendQuoteViaEmailJS }] =
        await Promise.all([
          import("@/lib/quotepro/pdf"),
          import("@/lib/quotepro/emailjs"),
        ]);
      const attachment = await generatePDFBase64("quote-export-container");
      await sendQuoteViaEmailJS(
        settings.emailJS,
        quote,
        client.email,
        client.name,
        approvalUrl,
        attachment,
      );
      showToast("E-mail enviado com sucesso.");
      logActivity(
        "send",
        quote.id,
        `E-mail enviado para ${client.email}: ${quote.number}`,
      );
      if (quote.status === "draft")
        updateQuote((current) => ({ ...current, status: "sent" }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha desconhecida";
      showToast(`Erro ao enviar e-mail: ${message}`, "error");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleWhatsApp = () => {
    if (!client?.phone) {
      showToast("O cliente selecionado não possui telefone.", "error");
      return;
    }
    const linkText = approvalUrl
      ? `\n\nVisualize e aprove online: ${approvalUrl}`
      : "\n\nO PDF do orçamento será enviado em anexo.";
    const message = `Olá, ${client.name}! Segue o orçamento ${quote.number}, no total de ${quote.total.toLocaleString("pt-BR", { style: "currency", currency: quote.currency })}.${linkText}`;
    window.open(
      generateWhatsAppLink(client.phone, message),
      "_blank",
      "noopener,noreferrer",
    );
    logActivity(
      "send",
      quote.id,
      `WhatsApp aberto para ${client.name}: ${quote.number}`,
    );
    if (quote.status === "draft")
      updateQuote((current) => ({ ...current, status: "sent" }));
  };

  const handlePrint = () => {
    setMode("preview");
    window.setTimeout(() => window.print(), 150);
    logActivity("export", quote.id, `Impresso: ${quote.number}`);
  };

  const handleDelete = () => {
    if (!window.confirm(`Excluir definitivamente o orçamento ${quote.number}?`))
      return;
    setQuotes((current) => current.filter((item) => item.id !== quote.id));
    logActivity("delete", quote.id, `Orçamento excluído: ${quote.number}`);
    showToast("Orçamento excluído.", "info");
    if (onBack) onBack();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Action Header */}
      <header className="print:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 min-h-16 flex flex-wrap items-center justify-between px-6 shadow-sm z-10 flex-shrink-0 gap-4 py-3">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Voltar ao Painel"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            {quote.number}
          </h1>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              quote.status === "draft"
                ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                : quote.status === "sent"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                  : quote.status === "approved"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                    : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
            }`}
          >
            {t(quote.status, settings.language)}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setMode("editor")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
              mode === "editor"
                ? "bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Edit3 size={15} />
            <span>Editar</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
              mode === "preview"
                ? "bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Eye size={15} />
            <span>Visualizar</span>
          </button>
          <button
            type="button"
            onClick={() => setShowTemplates(true)}
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            title="Modelos de Orçamento"
          >
            <FolderOpen size={18} />
          </button>

          <span className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

          <button
            type="button"
            onClick={() => void handleExportPDF()}
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            title="Exportar PDF"
          >
            <Download size={18} />
          </button>
          <button
            type="button"
            onClick={() => void handleExportPNG()}
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            title="Exportar Imagem PNG"
          >
            <FileImage size={18} />
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            title="Imprimir"
          >
            <Printer size={18} />
          </button>
          <button
            type="button"
            onClick={() => void handleSendEmail()}
            disabled={isSendingEmail}
            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition disabled:opacity-50"
            title="Enviar por e-mail (EmailJS)"
          >
            <Mail size={18} />
          </button>
          <button
            type="button"
            onClick={handleWhatsApp}
            className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition"
            title="Enviar no WhatsApp"
          >
            <Phone size={18} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition"
            title="Excluir Orçamento"
          >
            <Trash2 size={18} />
          </button>

          {quote.status === "draft" ? (
            <button
              type="button"
              onClick={handleEmit}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer"
            >
              <Send size={15} />
              <span>Emitir</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleApproval()}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Copy size={15} />
              <span>Link Aprovação</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className={`mx-auto ${mode === "editor" ? "max-w-5xl" : "max-w-4xl"}`}>
          {mode === "editor" ? (
            <QuoteEditor
              quote={quote}
              setQuote={updateQuote}
              lang={settings.language}
            />
          ) : (
            <div id="quote-preview-container">
              <QuotePreview
                quote={quote}
                lang={settings.language}
                onLogoUpdate={(logo) =>
                  updateQuote((current) => ({ ...current, templateLogo: logo }))
                }
              />
            </div>
          )}
        </div>
      </main>

      {/* Invisible render container for HTML2Canvas & PDF export */}
      <div
        className="fixed left-[-10000px] top-0 w-[794px] bg-white p-8 print:hidden"
        aria-hidden="true"
      >
        <div id="quote-export-container">
          <QuotePreview quote={quote} lang={settings.language} />
        </div>
      </div>

      {/* Templates Drawer */}
      {showTemplates ? (
        <div
          className="fixed inset-0 z-50 bg-black/50 print:hidden backdrop-blur-xs flex justify-end"
          onClick={() => setShowTemplates(false)}
        >
          <aside
            className="w-full max-w-sm h-full shadow-2xl relative animate-in slide-in-from-right duration-200"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowTemplates(false)}
              aria-label="Fechar modelos"
              className="absolute right-3 top-3 z-10 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            >
              <X size={18} />
            </button>
            <TemplatesSidebar
              quote={quote}
              setQuote={updateQuote}
              templates={templates}
              setTemplates={setTemplates}
              history={history}
              lang={settings.language}
            />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
