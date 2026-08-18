'use client';

import { useState, useEffect } from "react";
import { AppProvider, useAppContext } from "@/lib/quotepro/context";
import { DashboardView } from "./DashboardView";
import { EditorView } from "./EditorView";
import { ClientsView } from "./ClientsView";
import { ReportsView } from "./ReportsView";
import { SettingsView } from "./SettingsView";
import { PublicApprovalView } from "./PublicApprovalView";
import {
  LayoutDashboard,
  FileEdit,
  Users,
  BarChart2,
  Settings as SettingsIcon,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { t } from "@/lib/quotepro/i18n";

function ToastContainer() {
  const { toasts, removeToast } = useAppContext();
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto px-4 py-3 rounded-xl shadow-xl text-white text-xs font-semibold flex items-center justify-between min-w-[260px] animate-in slide-in-from-bottom-2 duration-200 ${
            toast.type === "success"
              ? "bg-emerald-600"
              : toast.type === "error"
                ? "bg-rose-600"
                : "bg-blue-600"
          }`}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            className="ml-3 opacity-80 hover:opacity-100 p-1"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

type TabType = "dashboard" | "editor" | "clients" | "reports" | "settings" | "approval";

function QuoteProInner() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | undefined>();
  const { settings, notifications } = useAppContext();
  const unreadNotifs = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      const searchParams = new URLSearchParams(window.location.search);
      const orcParam = searchParams.get("orc");

      if (orcParam) {
        setSelectedQuoteId(orcParam);
        setActiveTab("approval");
        return;
      }

      if (hash.startsWith("#orc/")) {
        setSelectedQuoteId(hash.replace("#orc/", ""));
        setActiveTab("approval");
      } else if (hash.startsWith("#editor/")) {
        setSelectedQuoteId(hash.replace("#editor/", ""));
        setActiveTab("editor");
      } else if (hash === "#editor") {
        setSelectedQuoteId(undefined);
        setActiveTab("editor");
      } else if (hash === "#clients") {
        setActiveTab("clients");
      } else if (hash === "#reports") {
        setActiveTab("reports");
      } else if (hash === "#settings") {
        setActiveTab("settings");
      } else if (hash === "" || hash === "#") {
        setActiveTab("dashboard");
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const navigateTo = (tab: "dashboard" | "editor" | "clients" | "reports" | "settings", quoteId?: string) => {
    setSelectedQuoteId(quoteId);
    setActiveTab(tab);
    if (tab === "editor" && quoteId) {
      window.location.hash = `#editor/${quoteId}`;
    } else if (tab === "editor") {
      window.location.hash = "#editor";
    } else if (tab === "dashboard") {
      window.location.hash = "#";
    } else {
      window.location.hash = `#${tab}`;
    }
  };

  const openApproval = (quoteId: string) => {
    setSelectedQuoteId(quoteId);
    setActiveTab("approval");
    window.location.hash = `#orc/${quoteId}`;
  };

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Subnav / Header Tabs */}
      {activeTab !== "approval" && (
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-2.5 flex items-center justify-between gap-4 flex-wrap z-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <span className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">
                QuotePRO
              </span>
              <span className="text-[10px] text-blue-500 font-bold ml-1.5 uppercase tracking-wider bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                Orçamentos
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-1 overflow-x-auto py-1">
            <button
              type="button"
              onClick={() => navigateTo("dashboard")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <LayoutDashboard size={14} />
              <span>{t("dashboard", settings.language)}</span>
              {unreadNotifs > 0 && (
                <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                  {unreadNotifs}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigateTo("editor")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "editor"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <FileEdit size={14} />
              <span>{selectedQuoteId ? "Editar Orçamento" : t("newQuote", settings.language)}</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo("clients")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "clients"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Users size={14} />
              <span>Clientes</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo("reports")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "reports"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <BarChart2 size={14} />
              <span>{t("reports", settings.language)}</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo("settings")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "settings"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <SettingsIcon size={14} />
              <span>{t("settings", settings.language)}</span>
            </button>
          </nav>
        </div>
      )}

      {/* Main View Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "dashboard" && <DashboardView onNavigate={navigateTo} />}
        {activeTab === "editor" && (
          <EditorView
            key={selectedQuoteId || "new-quote"}
            quoteId={selectedQuoteId}
            onBack={() => navigateTo("dashboard")}
            onOpenApproval={openApproval}
          />
        )}
        {activeTab === "clients" && <ClientsView />}
        {activeTab === "reports" && <ReportsView />}
        {activeTab === "settings" && <SettingsView />}
        {activeTab === "approval" && (
          <PublicApprovalView
            quoteId={selectedQuoteId || ""}
            onBack={() => navigateTo("dashboard")}
          />
        )}
      </div>

      <ToastContainer />
    </div>
  );
}

export function QuoteProApp() {
  return (
    <AppProvider>
      <QuoteProInner />
    </AppProvider>
  );
}
