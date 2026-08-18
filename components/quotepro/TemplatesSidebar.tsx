'use client';

import {
  useState,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
} from "react";
import { Template, QuoteHistoryEntry, Quote, Language } from "@/lib/quotepro/types";
import { t } from "@/lib/quotepro/i18n";
import {
  Save,
  FolderOpen,
  Download,
  Upload,
  Trash2,
  Clock,
  CheckCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/quotepro/calculations";

interface TemplatesSidebarProps {
  quote: Quote;
  setQuote: Dispatch<SetStateAction<Quote>>;
  templates: Template[];
  setTemplates: Dispatch<SetStateAction<Template[]>>;
  history: QuoteHistoryEntry[];
  lang: Language;
}

export function TemplatesSidebar({
  quote,
  setQuote,
  templates,
  setTemplates,
  history,
  lang,
}: TemplatesSidebarProps) {
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDesc, setNewTemplateDesc] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const saveCurrentAsTemplate = () => {
    if (!newTemplateName) return;
    const { id, number, date, ...quoteData } = quote;
    const newTemplate: Template = {
      id: crypto.randomUUID(),
      name: newTemplateName,
      description: newTemplateDesc,
      quoteData,
    };
    setTemplates((prev) => [...prev, newTemplate]);
    setNewTemplateName("");
    setNewTemplateDesc("");
    setIsSaving(false);
  };

  const loadTemplate = (template: Template) => {
    setQuote((prev) => ({
      ...prev,
      ...template.quoteData,
      id: prev.id,
      number: prev.number,
      date: prev.date,
      items: (template.quoteData.items || prev.items).map((item) => ({
        ...item,
        id: crypto.randomUUID(),
      })),
    }));
  };

  const deleteTemplate = (id: string) => {
    if (confirm(t("confirmDeleteTemplate", lang))) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const exportTemplates = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(templates));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "orcamentos_templates.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const importTemplates = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          if (imported.length > 0 && !imported[0].name)
            throw new Error("Invalid format");
          setTemplates((prev) => [...prev, ...imported]);
        }
      } catch (err) {
        console.error("Error importing templates", err);
        alert("Arquivo JSON de templates inválido.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-4 h-full flex flex-col justify-between shadow-lg">
      <div className="overflow-y-auto space-y-6 flex-1 pr-1">
        {/* Templates Section */}
        <div>
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <FolderOpen size={18} className="text-blue-500" />
              {t("templates", lang)}
            </h3>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={exportTemplates}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                title="Exportar Templates (JSON)"
              >
                <Download size={15} />
              </button>
              <label
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                title="Importar Templates (JSON)"
              >
                <Upload size={15} />
                <input
                  type="file"
                  accept=".json"
                  onChange={importTemplates}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {templates.length === 0 ? (
            <p className="text-xs text-slate-400 italic">
              Nenhum modelo salvo ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between group hover:border-blue-400 transition"
                >
                  <div>
                    <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                      {tpl.name}
                    </h4>
                    {tpl.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {tpl.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/40">
                    <button
                      type="button"
                      onClick={() => deleteTemplate(tpl.id)}
                      className="text-slate-400 hover:text-red-500 p-1"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => loadTemplate(tpl)}
                      className="text-xs bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 px-2.5 py-1 rounded font-medium hover:bg-blue-100 transition"
                    >
                      Carregar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History Section */}
        {history.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Clock size={16} className="text-slate-400" />
              <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                {t("history", lang)}
              </h3>
            </div>
            <div className="space-y-2">
              {history.slice(0, 5).map((entry) => (
                <div
                  key={entry.id}
                  className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-100 dark:border-slate-800 text-xs"
                >
                  <div className="flex justify-between font-medium text-slate-700 dark:text-slate-300">
                    <span>{entry.number}</span>
                    <span>{formatCurrency(entry.total, entry.currency)}</span>
                  </div>
                  <div className="text-slate-400 text-[10px] mt-1 flex justify-between">
                    <span>{entry.clientName || "Sem cliente"}</span>
                    <span>{entry.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save Template Footer */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
        {isSaving ? (
          <div className="space-y-2">
            <input
              type="text"
              placeholder={t("templateName", lang)}
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded p-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
            <input
              type="text"
              placeholder={t("templateDesc", lang)}
              value={newTemplateDesc}
              onChange={(e) => setNewTemplateDesc(e.target.value)}
              className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded p-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveCurrentAsTemplate}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 rounded font-medium flex items-center justify-center gap-1"
              >
                <CheckCircle size={13} /> {t("save", lang)}
              </button>
              <button
                type="button"
                onClick={() => setIsSaving(false)}
                className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs px-3 py-1.5 rounded"
              >
                {t("cancel", lang)}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsSaving(true)}
            className="w-full border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <Save size={14} />
            {t("saveAsTemplate", lang)}
          </button>
        )}
      </div>
    </div>
  );
}
