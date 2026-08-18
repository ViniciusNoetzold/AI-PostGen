'use client';

import { useMemo, useState } from "react";
import {
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useAppContext } from "@/lib/quotepro/context";
import { Client } from "@/lib/quotepro/types";

const newClient = (): Client => ({
  id: "",
  name: "",
  email: "",
  phone: "",
  address: "",
});

export function ClientsView() {
  const { clients, setClients, quotes, showToast, logActivity } = useAppContext();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Client | null>(null);

  const visibleClients = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    if (!term) return clients;
    return clients.filter((client) =>
      [client.name, client.email, client.phone].some((value) =>
        (value || "").toLocaleLowerCase("pt-BR").includes(term),
      ),
    );
  }, [clients, query]);

  const save = () => {
    if (!editing?.name.trim()) {
      showToast("Informe o nome do cliente.", "error");
      return;
    }
    const value = {
      ...editing,
      id: editing.id || crypto.randomUUID(),
      name: editing.name.trim(),
    };
    setClients((current) =>
      current.some((client) => client.id === value.id)
        ? current.map((client) => (client.id === value.id ? value : client))
        : [value, ...current],
    );
    setEditing(null);
    showToast("Cliente salvo com sucesso.");
  };

  const remove = (client: Client) => {
    const linked = quotes.filter(
      (quote) => quote.clientId === client.id,
    ).length;
    const suffix = linked
      ? ` ${linked} orçamento(s) manterão apenas a referência histórica.`
      : "";
    if (!window.confirm(`Excluir ${client.name}?${suffix}`)) return;
    setClients((current) => current.filter((item) => item.id !== client.id));
    logActivity("delete", client.id, `Cliente excluído: ${client.name}`);
    showToast("Cliente excluído.", "info");
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto w-full overflow-y-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400">
            <Users size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Gestão de Clientes (CRM)
            </h1>
            <p className="text-sm text-slate-500">
              {clients.length} cliente(s) cadastrado(s)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditing(newClient())}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition cursor-pointer"
        >
          <Plus size={18} /> Novo cliente
        </button>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Pesquisar cliente por nome, e-mail ou telefone..."
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition shadow-xs"
        />
      </div>

      {visibleClients.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <p className="text-slate-400 text-sm italic">
            Nenhum cliente encontrado.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleClients.map((client) => {
            const count = quotes.filter((q) => q.clientId === client.id).length;
            return (
              <div
                key={client.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-blue-400 transition group"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {client.name}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {count} orç.
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    {client.email && (
                      <p className="flex items-center gap-2 truncate">
                        <Mail size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </p>
                    )}
                    {client.phone && (
                      <p className="flex items-center gap-2">
                        <Phone size={13} className="text-slate-400 shrink-0" />
                        <span>{client.phone}</span>
                      </p>
                    )}
                    {client.address && (
                      <p className="flex items-center gap-2 truncate">
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{client.address}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-1 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditing({ ...client })}
                    className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Editar"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(client)}
                    className="p-1.5 text-slate-500 hover:text-red-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Excluir"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editing ? (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setEditing(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="font-bold text-lg text-slate-900 dark:text-white">
                {editing.id ? "Editar Cliente" : "Novo Cliente"}
              </h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Nome Completo / Razão Social
                </label>
                <input
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  placeholder="Nome do cliente"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  E-mail
                </label>
                <input
                  value={editing.email}
                  onChange={(e) =>
                    setEditing({ ...editing, email: e.target.value })
                  }
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  placeholder="email@dominio.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  value={editing.phone}
                  onChange={(e) =>
                    setEditing({ ...editing, phone: e.target.value })
                  }
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Endereço
                </label>
                <input
                  value={editing.address}
                  onChange={(e) =>
                    setEditing({ ...editing, address: e.target.value })
                  }
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  placeholder="Rua, número, cidade"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={save}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
