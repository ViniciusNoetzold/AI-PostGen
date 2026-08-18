'use client';

import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
  useCallback,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useLocalStorage } from "./useLocalStorage";
import {
  AppSettings,
  Quote,
  Client,
  Template,
  CompanyProfile,
  ActivityLog,
  NotificationMsg,
} from "./types";

interface AppState {
  settings: AppSettings;
  setSettings: Dispatch<SetStateAction<AppSettings>>;
  quotes: Quote[];
  setQuotes: Dispatch<SetStateAction<Quote[]>>;
  clients: Client[];
  setClients: Dispatch<SetStateAction<Client[]>>;
  templates: Template[];
  setTemplates: Dispatch<SetStateAction<Template[]>>;
  profiles: CompanyProfile[];
  setProfiles: Dispatch<SetStateAction<CompanyProfile[]>>;
  logs: ActivityLog[];
  notifications: NotificationMsg[];
  logActivity: (
    action: ActivityLog["action"],
    entityId: string,
    description: string,
  ) => void;
  addNotification: (title: string, message: string, linkHash?: string) => void;
  markNotificationRead: (id: string) => void;
  toasts: { id: string; message: string; type: "success" | "error" | "info" }[];
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useLocalStorage<AppSettings>("app_settings", {
    theme: "light",
    language: "pt",
    currency: "BRL",
    nextQuoteNumber: 1,
  });

  const [quotes, setQuotes] = useLocalStorage<Quote[]>("app_quotes", []);
  const [clients, setClients] = useLocalStorage<Client[]>("app_clients", []);
  const [templates, setTemplates] = useLocalStorage<Template[]>(
    "app_templates",
    [],
  );
  const [profiles, setProfiles] = useLocalStorage<CompanyProfile[]>(
    "app_profiles",
    [],
  );
  const [logs, setLogs] = useLocalStorage<ActivityLog[]>("app_logs", []);
  const [notifications, setNotifications] = useLocalStorage<NotificationMsg[]>(
    "app_notifications",
    [],
  );

  const [toasts, setToasts] = useState<
    { id: string; message: string; type: "success" | "error" | "info" }[]
  >([]);
  const recurringProcessedRef = useRef(false);

  useEffect(() => {
    if (!settings.currency)
      setSettings((current) => ({ ...current, currency: "BRL" }));
  }, [setSettings, settings.currency]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "success") => {
      const id = Date.now().toString();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast],
  );

  const markNotificationRead = useCallback(
    (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    },
    [setNotifications],
  );

  const addNotification = useCallback(
    (title: string, message: string, linkHash?: string) => {
      const newNotif: NotificationMsg = {
        id: "notif_" + Date.now(),
        date: new Date().toISOString(),
        title,
        message,
        read: false,
        linkHash,
      };
      setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
      showToast(`${title}: ${message}`, "info");
    },
    [setNotifications, showToast],
  );

  const logActivity = useCallback(
    (action: ActivityLog["action"], entityId: string, description: string) => {
      const newLog: ActivityLog = {
        id: "log_" + Date.now(),
        date: new Date().toISOString(),
        action,
        entityId,
        description,
      };
      setLogs((prev) => [newLog, ...prev].slice(0, 100)); // Keep last 100
    },
    [setLogs],
  );

  // Processa recorrências uma vez por inicialização
  useEffect(() => {
    if (recurringProcessedRef.current) return;
    if (!quotes || quotes.length === 0) return;
    recurringProcessedRef.current = true;

    const today = new Date().toISOString().split("T")[0];
    let nextNumber = settings.nextQuoteNumber || 1;
    const generated: Quote[] = [];

    const updatedQuotes = quotes.map((quote) => {
      const recurring = quote.recurringConfig;
      if (
        !recurring?.active ||
        !recurring.nextRunDate ||
        recurring.nextRunDate > today
      )
        return quote;

      const generatedQuote: Quote = {
        ...quote,
        id: crypto.randomUUID(),
        number: `ORC-${String(nextNumber++).padStart(3, "0")}`,
        date: today,
        validUntil: "",
        status: "draft",
        signature: undefined,
        recurringConfig: undefined,
      };
      generated.push(generatedQuote);

      const nextDate = new Date(`${recurring.nextRunDate}T12:00:00`);
      if (recurring.frequency === "weekly")
        nextDate.setDate(nextDate.getDate() + 7);
      else nextDate.setMonth(nextDate.getMonth() + 1);

      return {
        ...quote,
        recurringConfig: {
          ...recurring,
          nextRunDate: nextDate.toISOString().split("T")[0],
        },
      };
    });

    if (generated.length === 0) return;
    setQuotes([...updatedQuotes, ...generated]);
    setSettings((current) => ({ ...current, nextQuoteNumber: nextNumber }));
    generated.forEach((item) => {
      logActivity(
        "generate_recurring",
        item.id,
        `Orçamento recorrente gerado: ${item.number}`,
      );
      addNotification(
        "Recorrência executada",
        `Novo orçamento ${item.number} gerado.`,
        `#editor/${item.id}`,
      );
    });
  }, [
    addNotification,
    logActivity,
    quotes,
    setQuotes,
    setSettings,
    settings.nextQuoteNumber,
  ]);

  return (
    <AppContext.Provider
      value={{
        settings,
        setSettings,
        quotes,
        setQuotes,
        clients,
        setClients,
        templates,
        setTemplates,
        profiles,
        setProfiles,
        logs,
        logActivity,
        notifications,
        addNotification,
        markNotificationRead,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
