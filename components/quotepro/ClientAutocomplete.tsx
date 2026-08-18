'use client';

import { useEffect, useMemo, useState } from "react";
import { Client } from "@/lib/quotepro/types";
import { useAppContext } from "@/lib/quotepro/context";
import { t } from "@/lib/quotepro/i18n";

interface ClientAutocompleteProps {
  clientId: string;
  onSelect: (client: Client) => void;
}

const emptyClient = (): Client => ({
  id: "",
  name: "",
  email: "",
  phone: "",
  address: "",
});

export function ClientAutocomplete({
  clientId,
  onSelect,
}: ClientAutocompleteProps) {
  const { clients, setClients, settings, showToast } = useAppContext();
  const [draft, setDraft] = useState<Client>(emptyClient);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const selected = clients.find((client) => client.id === clientId);
    setDraft(selected ? { ...selected } : emptyClient());
  }, [clientId, clients]);

  const filteredClients = useMemo(() => {
    const term = draft.name.trim().toLocaleLowerCase("pt-BR");
    if (!term) return clients.slice(0, 8);
    return clients
      .filter(
        (client) =>
          client.id !== draft.id &&
          client.name.toLocaleLowerCase("pt-BR").includes(term),
      )
      .slice(0, 8);
  }, [clients, draft.id, draft.name]);

  const updateDraft = (field: keyof Client, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const selectClient = (client: Client) => {
    setDraft({ ...client });
    setShowSuggestions(false);
    onSelect(client);
  };

  const saveClient = () => {
    if (!draft.name.trim()) {
      showToast("Informe o nome do cliente.", "error");
      return;
    }

    const saved: Client = {
      ...draft,
      id: draft.id || crypto.randomUUID(),
      name: draft.name.trim(),
    };
    setClients((current) => {
      const exists = current.some((client) => client.id === saved.id);
      return exists
        ? current.map((client) => (client.id === saved.id ? saved : client))
        : [saved, ...current];
    });
    setDraft(saved);
    onSelect(saved);
    showToast(draft.id ? "Cliente atualizado." : "Cliente salvo no CRM.");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
      <div className="relative md:col-span-2 flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t("name", settings.language)}
          </label>
          <input
            type="text"
            value={draft.name}
            onChange={(event) => {
              updateDraft("name", event.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() =>
              window.setTimeout(() => setShowSuggestions(false), 200)
            }
            className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none transition"
            placeholder="Pesquisar ou cadastrar cliente"
          />
          {showSuggestions && filteredClients.length > 0 ? (
            <ul className="absolute z-20 left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto mt-1 divide-y divide-slate-100 dark:divide-slate-800">
              {filteredClients.map((client) => (
                <li key={client.id}>
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectClient(client);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50 dark:hover:bg-slate-800 text-sm text-slate-800 dark:text-slate-200"
                  >
                    <span className="font-medium">{client.name}</span>
                    {client.phone && (
                      <span className="text-xs text-slate-500 ml-2">
                        {client.phone}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <button
          type="button"
          onClick={saveClient}
          className="bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition"
        >
          {draft.id ? "Atualizar" : "Salvar no CRM"}
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {t("email", settings.language)}
        </label>
        <input
          type="email"
          value={draft.email}
          onChange={(event) => updateDraft("email", event.target.value)}
          className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none transition"
          placeholder="email@cliente.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {t("phone", settings.language)}
        </label>
        <input
          type="tel"
          value={draft.phone}
          onChange={(event) => updateDraft("phone", event.target.value)}
          className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none transition"
          placeholder="(00) 00000-0000"
        />
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {t("address", settings.language)}
        </label>
        <input
          type="text"
          value={draft.address}
          onChange={(event) => updateDraft("address", event.target.value)}
          className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none transition"
          placeholder="Rua, número, bairro, cidade - UF"
        />
      </div>
    </div>
  );
}
