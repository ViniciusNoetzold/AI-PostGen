'use client';

import { useEffect, useState } from "react";
import { useAppContext } from "@/lib/quotepro/context";
import {
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Plus,
  Activity,
  Bell,
  Calendar,
} from "lucide-react";
import { t } from "@/lib/quotepro/i18n";
import { calculateQuoteTotals, formatCurrency } from "@/lib/quotepro/calculations";
import { Quote } from "@/lib/quotepro/types";

interface DashboardViewProps {
  onNavigate: (view: "dashboard" | "editor" | "clients" | "reports" | "settings", quoteId?: string) => void;
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const { quotes, settings, logs, notifications, markNotificationRead } =
    useAppContext();
  const lang = settings.language;

  const stats = {
    total: quotes.length,
    draft: quotes.filter((q) => q.status === "draft").length,
    sent: quotes.filter((q) => q.status === "sent").length,
    approved: quotes.filter((q) => q.status === "approved").length,
    rejected: quotes.filter((q) => q.status === "rejected").length,
  };

  const getStatusBadge = (status: Quote["status"]) => {
    switch (status) {
      case "draft":
        return (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-full text-xs font-semibold">
            {t("draft", lang)}
          </span>
        );
      case "sent":
        return (
          <span className="px-2.5 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full text-xs font-semibold">
            {t("sent", lang)}
          </span>
        );
      case "approved":
        return (
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-full text-xs font-semibold">
            {t("approved", lang)}
          </span>
        );
      case "rejected":
        return (
          <span className="px-2.5 py-1 bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 rounded-full text-xs font-semibold">
            {t("rejected", lang)}
          </span>
        );
    }
  };

  const recentQuotes = [...quotes]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);
  const recentLogs = [...logs]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getCountdown = (dateString: string) => {
    const diff = new Date(dateString).getTime() - currentTime;
    if (diff <= 0) return "Expirado";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h restantes`;
    return `${hours}h restantes`;
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
            Painel de Orçamentos (QuotePRO)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gerencie orçamentos profissionais, acompanhe status e clientes em tempo real.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate("editor")}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition cursor-pointer"
        >
          <Plus size={18} /> {t("newQuote", lang)}
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 mb-2">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
              <FileText size={18} />
            </div>
            <h3 className="font-semibold text-xs uppercase tracking-wider">{t("draft", lang)}</h3>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {stats.draft}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 text-blue-500 mb-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30">
              <Clock size={18} />
            </div>
            <h3 className="font-semibold text-xs uppercase tracking-wider">{t("sent", lang)}</h3>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {stats.sent}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 text-emerald-500 mb-2">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
              <CheckCircle size={18} />
            </div>
            <h3 className="font-semibold text-xs uppercase tracking-wider">{t("approved", lang)}</h3>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {stats.approved}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 text-rose-500 mb-2">
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-900/30">
              <XCircle size={18} />
            </div>
            <h3 className="font-semibold text-xs uppercase tracking-wider">{t("rejected", lang)}</h3>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {stats.rejected}
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main List: Recent Quotes */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText size={18} className="text-blue-500" />
                {t("recentQuotes", lang)}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="py-3.5 px-4 font-semibold">Orçamento</th>
                    <th className="py-3.5 px-4 font-semibold">Data</th>
                    <th className="py-3.5 px-4 font-semibold">Total</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
                  {recentQuotes.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-12 text-center text-slate-400 italic"
                      >
                        Nenhum orçamento criado ainda. Clique em &quot;Novo Orçamento&quot; para começar.
                      </td>
                    </tr>
                  )}
                  {recentQuotes.map((quote) => (
                    <tr
                      key={quote.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => onNavigate("editor", quote.id)}
                          className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {quote.number}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        {quote.date}
                      </td>
                      <td className="py-3.5 px-4 text-slate-900 dark:text-white font-bold">
                        {formatCurrency(
                          calculateQuoteTotals(quote).finalTotal,
                          quote.currency,
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(quote.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Follow-ups / Reminders */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-2">
              <Calendar size={18} className="text-cyan-500" />
              <h2 className="font-bold text-slate-900 dark:text-white">
                Follow-ups e Lembretes Pendentes
              </h2>
            </div>
            <div className="p-4 divide-y divide-slate-100 dark:divide-slate-800">
              {quotes.filter((q) => q.reminderDate && q.status === "sent")
                .length === 0 && (
                <p className="text-sm text-slate-400 py-3 text-center italic">
                  Sem lembretes agendados para orçamentos enviados.
                </p>
              )}
              {quotes
                .filter((q) => q.reminderDate && q.status === "sent")
                .sort(
                  (a, b) =>
                    new Date(a.reminderDate!).getTime() -
                    new Date(b.reminderDate!).getTime(),
                )
                .map((q) => (
                  <div
                    key={q.id}
                    className="py-3 flex justify-between items-center"
                  >
                    <div>
                      <button
                        type="button"
                        onClick={() => onNavigate("editor", q.id)}
                        className="font-bold text-blue-600 dark:text-blue-400 hover:underline text-sm"
                      >
                        {q.number}
                      </button>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Agendado para: {new Date(q.reminderDate!).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 rounded-full">
                      {getCountdown(q.reminderDate!)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Sidebar: Notifications & Logs */}
        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/30">
              <Bell size={18} className="text-amber-500" />
              <h2 className="font-bold text-slate-900 dark:text-white">
                {t("notifications", lang)}
              </h2>
            </div>
            <div className="p-4 space-y-3">
              {notifications.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-2 italic">
                  {t("noActivity", lang)}
                </p>
              )}
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 rounded-xl border text-sm transition ${
                    n.read
                      ? "bg-slate-50/50 border-slate-100 dark:bg-slate-800/30 dark:border-slate-800 opacity-60"
                      : "bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/30"
                  }`}
                >
                  <p className="font-bold text-slate-900 dark:text-white text-xs">
                    {n.title}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 text-xs mt-1">
                    {n.message}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    {n.linkHash && (
                      <button
                        type="button"
                        onClick={() => {
                          const quoteId = n.linkHash?.replace("#editor/", "");
                          onNavigate("editor", quoteId);
                        }}
                        className="text-blue-600 dark:text-blue-400 font-semibold hover:underline text-xs"
                      >
                        Ver orçamento &rarr;
                      </button>
                    )}
                    {!n.read ? (
                      <button
                        type="button"
                        onClick={() => markNotificationRead(n.id)}
                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        Marcar lida
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/30">
              <Activity size={18} className="text-emerald-500" />
              <h2 className="font-bold text-slate-900 dark:text-white">
                {t("recentActivity", lang)}
              </h2>
            </div>
            <div className="p-4">
              {recentLogs.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-2 italic">
                  {t("noActivity", lang)}
                </p>
              )}
              <div className="space-y-4">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="relative pl-4 border-l-2 border-slate-200 dark:border-slate-700"
                  >
                    <span className="absolute -left-1.5 top-1.5 w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {log.description}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(log.date).toLocaleString("pt-BR")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
