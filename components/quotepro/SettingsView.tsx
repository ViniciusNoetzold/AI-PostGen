'use client';

import { useState, type ChangeEvent } from "react";
import { useAppContext } from "@/lib/quotepro/context";
import { t } from "@/lib/quotepro/i18n";
import {
  Download,
  Settings as SettingsIcon,
  Save,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { CompanyProfile } from "@/lib/quotepro/types";

export function SettingsView() {
  const {
    settings,
    setSettings,
    profiles,
    setProfiles,
    quotes,
    setQuotes,
    clients,
    setClients,
    templates,
    setTemplates,
    showToast,
  } = useAppContext();
  const lang = settings.language;

  const [emailConfig, setEmailConfig] = useState(
    settings.emailJS || { serviceId: "", templateId: "", publicKey: "" },
  );

  const saveEmailConfig = () => {
    setSettings((s) => ({ ...s, emailJS: emailConfig }));
    showToast(t("success", lang));
  };

  const addProfile = () => {
    const newProfile: CompanyProfile = {
      id: "prof_" + Date.now(),
      name: "Nova Empresa",
      cnpj: "",
      address: "",
      isDefault: profiles.length === 0,
    };
    setProfiles([...profiles, newProfile]);
  };

  const updateProfile = (
    id: string,
    field: keyof CompanyProfile,
    value: string | boolean,
  ) => {
    setProfiles((prev) =>
      prev.map((p) => {
        if (field === "isDefault" && value === true)
          return { ...p, isDefault: p.id === id };
        return p.id === id ? { ...p, [field]: value } : p;
      }),
    );
  };

  const deleteProfile = (id: string) => {
    setProfiles((prev) => {
      const remaining = prev.filter((p) => p.id !== id);
      if (remaining.length > 0 && !remaining.some((p) => p.isDefault))
        remaining[0] = { ...remaining[0], isDefault: true };
      return remaining;
    });
  };

  const exportBackup = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      profiles,
      clients,
      quotes,
      templates,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `quotepro-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Backup exportado com sucesso.");
  };

  const importBackup = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result));
        if (
          !payload ||
          !Array.isArray(payload.quotes) ||
          !Array.isArray(payload.clients) ||
          !payload.settings
        )
          throw new Error("Formato inválido");
        if (
          !window.confirm(
            "Restaurar este backup substituirá os dados atuais. Continuar?",
          )
        )
          return;
        setSettings(payload.settings);
        setProfiles(Array.isArray(payload.profiles) ? payload.profiles : []);
        setClients(payload.clients);
        setQuotes(payload.quotes);
        setTemplates(Array.isArray(payload.templates) ? payload.templates : []);
        setEmailConfig(
          payload.settings.emailJS || {
            serviceId: "",
            templateId: "",
            publicKey: "",
          },
        );
        showToast("Backup restaurado com sucesso.");
      } catch {
        showToast("Arquivo de backup inválido.", "error");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto w-full overflow-y-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400">
          <SettingsIcon size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {t("settings", lang)} (QuotePRO)
          </h1>
          <p className="text-sm text-slate-500">
            Configure preferências, emitentes da empresa, integrações e backup de orçamentos.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            Configurações Gerais
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Idioma
              </label>
              <select
                value={settings.language}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    language: event.target.value as "pt" | "en",
                  }))
                }
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm"
              >
                <option value="pt">Português (Brasil)</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Moeda Padrão
              </label>
              <select
                value={settings.currency}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    currency: event.target.value as "BRL" | "USD" | "EUR",
                  }))
                }
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm"
              >
                <option value="BRL">Real (BRL)</option>
                <option value="USD">Dólar (USD)</option>
                <option value="EUR">Euro (EUR)</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            A moeda padrão será aplicada automaticamente aos novos orçamentos.
          </p>
        </section>

        {/* EmailJS Config */}
        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
            {t("emailJSConfig", lang)}
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Configure sua conta gratuita do EmailJS para envio direto de propostas e PDFs anexados.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t("serviceId", lang)}
              </label>
              <input
                type="text"
                value={emailConfig.serviceId}
                onChange={(e) =>
                  setEmailConfig({ ...emailConfig, serviceId: e.target.value })
                }
                placeholder="service_xxx"
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t("templateId", lang)}
              </label>
              <input
                type="text"
                value={emailConfig.templateId}
                onChange={(e) =>
                  setEmailConfig({ ...emailConfig, templateId: e.target.value })
                }
                placeholder="template_xxx"
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t("publicKey", lang)}
              </label>
              <input
                type="password"
                value={emailConfig.publicKey}
                onChange={(e) =>
                  setEmailConfig({ ...emailConfig, publicKey: e.target.value })
                }
                placeholder="Public API Key"
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={saveEmailConfig}
            className="mt-4 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow"
          >
            <Save size={15} /> {t("save", lang)}
          </button>
        </section>

        {/* Profiles Config */}
        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t("profiles", lang)}
            </h2>
            <button
              type="button"
              onClick={addProfile}
              className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-blue-100 transition"
            >
              <Plus size={15} /> {t("addProfile", lang)}
            </button>
          </div>

          <div className="space-y-4">
            {profiles.length === 0 && (
              <p className="text-slate-400 text-xs italic">
                Nenhum perfil de emitente cadastrado. Adicione seus dados de empresa.
              </p>
            )}
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="p-5 border rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 relative"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-300">
                    <input
                      type="radio"
                      name="defaultProfile"
                      checked={profile.isDefault}
                      onChange={() =>
                        updateProfile(profile.id, "isDefault", true)
                      }
                      className="text-blue-600"
                    />
                    {t("defaultProfile", lang)}
                  </label>
                  <button
                    type="button"
                    onClick={() => deleteProfile(profile.id)}
                    className="text-slate-400 hover:text-red-500 p-1"
                    title="Excluir Perfil"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {t("companyName", lang)}
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) =>
                        updateProfile(profile.id, "name", e.target.value)
                      }
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {t("cnpj", lang)}
                    </label>
                    <input
                      type="text"
                      value={profile.cnpj}
                      onChange={(e) =>
                        updateProfile(profile.id, "cnpj", e.target.value)
                      }
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {t("address", lang)}
                    </label>
                    <input
                      type="text"
                      value={profile.address}
                      onChange={(e) =>
                        updateProfile(profile.id, "address", e.target.value)
                      }
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      URL da Logo (opcional)
                    </label>
                    <input
                      type="text"
                      value={profile.logoUrl || ""}
                      onChange={(e) =>
                        updateProfile(profile.id, "logoUrl", e.target.value)
                      }
                      placeholder="https://..."
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Backup & Reset */}
        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
            Backup e Segurança dos Dados
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Exporte ou importe clientes, propostas, modelos e configurações em arquivo JSON local seguro.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={exportBackup}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Download size={15} /> Exportar Backup JSON
            </button>
            <label className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 dark:text-white text-slate-800 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition">
              <Upload size={15} /> Restaurar Backup
              <input
                type="file"
                accept="application/json,.json"
                onChange={importBackup}
                className="hidden"
              />
            </label>
          </div>
        </section>

        {/* Reset Counter */}
        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            Sequência Numérica
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Reiniciar a numeração fará com que o próximo orçamento emitido receba o número 001.
          </p>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "Reiniciar a numeração para 001? Os orçamentos existentes não serão alterados.",
                )
              ) {
                setSettings((prev) => ({ ...prev, nextQuoteNumber: 1 }));
                showToast(
                  "Numeração de orçamentos reiniciada para 1 com sucesso!",
                  "success",
                );
              }
            }}
            className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 border border-rose-200 dark:border-rose-800/60 px-4 py-2 rounded-xl text-xs font-bold transition"
          >
            <Trash2 size={15} /> Reiniciar sequência para ORC-001
          </button>
        </section>
      </div>
    </div>
  );
}
