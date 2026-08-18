'use client';

import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { Quote, QuoteItem, Tax, Language, CustomField } from "@/lib/quotepro/types";
import { t } from "@/lib/quotepro/i18n";
import { Trash2, Plus, Image as ImageIcon } from "lucide-react";
import { calculateQuoteTotals, formatCurrency } from "@/lib/quotepro/calculations";
import { ClientAutocomplete } from "./ClientAutocomplete";
import { useAppContext } from "@/lib/quotepro/context";

interface QuoteEditorProps {
  quote: Quote;
  setQuote: Dispatch<SetStateAction<Quote>>;
  lang: Language;
}

export function QuoteEditor({ quote, setQuote, lang }: QuoteEditorProps) {
  const { profiles } = useAppContext();

  const updateItem = (
    id: string,
    field: keyof QuoteItem,
    value: QuoteItem[keyof QuoteItem],
  ) => {
    setQuote((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const addItem = () =>
    setQuote((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 },
      ],
    }));

  const removeItem = (id: string) =>
    setQuote((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));

  const addTax = () =>
    setQuote((prev) => ({
      ...prev,
      taxes: [...(prev.taxes || []), { id: crypto.randomUUID(), name: "", rate: 0 }],
    }));

  const updateTax = (index: number, field: keyof Tax, value: Tax[keyof Tax]) =>
    setQuote((prev) => {
      const taxes = [...(prev.taxes || [])];
      taxes[index] = { ...taxes[index], [field]: value } as Tax;
      return { ...prev, taxes };
    });

  const addCustomField = () =>
    setQuote((prev) => ({
      ...prev,
      customFields: [
        ...(prev.customFields || []),
        { id: crypto.randomUUID(), label: "", value: "", showOnPdf: true },
      ],
    }));

  const updateCustomField = (
    index: number,
    field: keyof CustomField,
    value: CustomField[keyof CustomField],
  ) =>
    setQuote((prev) => {
      const fields = [...(prev.customFields || [])];
      fields[index] = { ...fields[index], [field]: value } as CustomField;
      return { ...prev, customFields: fields };
    });

  const removeCustomField = (index: number) =>
    setQuote((prev) => ({
      ...prev,
      customFields: prev.customFields?.filter((_, i) => i !== index),
    }));

  const handleItemImageUpload = (
    id: string,
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) =>
        updateItem(id, "imageUrl", event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const { itemsSubtotal, discountAmount, finalTotal } = calculateQuoteTotals(quote);

  return (
    <div className="space-y-6 pb-12">
      {/* Configuration & Profile */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t("issuerProfile", lang)}
          </label>
          <div className="flex gap-2">
            <select
              value={quote.issuerId || ""}
              onChange={(e) =>
                setQuote((prev) => ({ ...prev, issuerId: e.target.value }))
              }
              className="flex-1 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Selecione o Emitente --</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.cnpj ? `(${p.cnpj})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Data do Orçamento
          </label>
          <input
            type="date"
            value={quote.date}
            onChange={(e) =>
              setQuote((prev) => ({ ...prev, date: e.target.value }))
            }
            className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Validade
          </label>
          <input
            type="date"
            value={quote.validUntil}
            onChange={(e) =>
              setQuote((prev) => ({ ...prev, validUntil: e.target.value }))
            }
            className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Moeda
          </label>
          <select
            value={quote.currency}
            onChange={(e) =>
              setQuote((prev) => ({
                ...prev,
                currency: e.target.value as Quote["currency"],
              }))
            }
            className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="BRL">Real (BRL)</option>
            <option value="USD">Dólar (USD)</option>
            <option value="EUR">Euro (EUR)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t("recurring", lang)}
          </label>
          <select
            value={
              quote.recurringConfig?.active
                ? quote.recurringConfig.frequency
                : "none"
            }
            onChange={(e) => {
              const val = e.target.value;
              setQuote((prev) => ({
                ...prev,
                recurringConfig:
                  val === "none"
                    ? { active: false, frequency: "monthly" }
                    : {
                        active: true,
                        frequency: val as "weekly" | "monthly",
                        nextRunDate: quote.date,
                      },
              }));
            }}
            className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="none">{t("notRecurring", lang)}</option>
            <option value="weekly">{t("weekly", lang)}</option>
            <option value="monthly">{t("monthly", lang)}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t("reminder", lang)}
          </label>
          <input
            type="datetime-local"
            value={quote.reminderDate || ""}
            onChange={(e) =>
              setQuote((prev) => ({ ...prev, reminderDate: e.target.value }))
            }
            className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </section>

      {/* CRM Autocomplete (Client) */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-100">
          Dados do Cliente
        </h2>
        <ClientAutocomplete
          clientId={quote.clientId}
          onSelect={(client) =>
            setQuote((prev) => ({ ...prev, clientId: client.id }))
          }
        />
      </section>

      {/* Items */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <h2 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-100">
          {t("items", lang)}
        </h2>
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500">
              <th className="py-2.5 px-3 font-semibold w-16">Foto</th>
              <th className="py-2.5 px-3 font-semibold">{t("description", lang)}</th>
              <th className="py-2.5 px-3 font-semibold w-24">{t("quantity", lang)}</th>
              <th className="py-2.5 px-3 font-semibold w-32">{t("unitPrice", lang)}</th>
              <th className="py-2.5 px-3 font-semibold w-32">{t("subtotal", lang)}</th>
              <th className="py-2.5 px-3 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {quote.items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <td className="py-2 px-3 text-center">
                  <label className="cursor-pointer inline-flex items-center justify-center w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 overflow-hidden relative border border-slate-200 dark:border-slate-700">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt="item"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon size={16} className="text-slate-400" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleItemImageUpload(item.id, e)}
                      className="hidden"
                    />
                  </label>
                </td>
                <td className="py-2 px-3">
                  <input
                    type="text"
                    value={item.description}
                    placeholder="Descrição do produto ou serviço"
                    onChange={(e) =>
                      updateItem(item.id, "description", e.target.value)
                    }
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-3">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.id, "quantity", Number(e.target.value))
                    }
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-right"
                  />
                </td>
                <td className="py-2 px-3">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(item.id, "unitPrice", Number(e.target.value))
                    }
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-right"
                  />
                </td>
                <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white text-right">
                  {formatCurrency(
                    item.quantity * item.unitPrice,
                    quote.currency,
                  )}
                </td>
                <td className="py-2 px-3 text-center">
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          onClick={addItem}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 rounded-lg text-sm font-semibold transition"
        >
          <Plus size={16} /> Adicionar Item
        </button>
      </section>

      {/* Financials & Custom Fields */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {t("discount", lang)}
            </h3>
            <div className="flex gap-3">
              <select
                value={quote.discountType}
                onChange={(e) =>
                  setQuote((prev) => ({
                    ...prev,
                    discountType: e.target.value as Quote["discountType"],
                  }))
                }
                className="border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 w-1/3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="percentage">% Porcentagem</option>
                <option value="fixed">$ Valor Fixo</option>
              </select>
              <input
                type="number"
                min="0"
                step="0.01"
                value={quote.discountValue}
                onChange={(e) =>
                  setQuote((prev) => ({
                    ...prev,
                    discountValue: Number(e.target.value),
                  }))
                }
                className="border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 flex-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Acréscimo / Frete / Taxas
            </h3>
            <input
              type="number"
              min="0"
              step="0.01"
              value={quote.addition}
              onChange={(e) =>
                setQuote((prev) => ({
                  ...prev,
                  addition: Number(e.target.value),
                }))
              }
              className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-700 dark:text-slate-300">
                {t("taxes", lang)}
              </h3>
              <button
                type="button"
                onClick={addTax}
                className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1"
              >
                <Plus size={14} /> Adicionar
              </button>
            </div>
            {(quote.taxes || []).map((tax, index) => (
              <div key={tax.id} className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Nome (ex: ISS)"
                  value={tax.name}
                  onChange={(e) => updateTax(index, "name", e.target.value)}
                  className="border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 flex-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                />
                <input
                  type="number"
                  placeholder="%"
                  value={tax.rate}
                  onChange={(e) =>
                    updateTax(index, "rate", Number(e.target.value))
                  }
                  className="border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 w-24 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm text-right"
                />
                <button
                  type="button"
                  onClick={() =>
                    setQuote((prev) => ({
                      ...prev,
                      taxes: prev.taxes.filter((_, i) => i !== index),
                    }))
                  }
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
              <div className="flex justify-between">
                <span>{t("subtotal", lang)}:</span>
                <span className="font-semibold">
                  {formatCurrency(itemsSubtotal, quote.currency)}
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-red-600 font-medium">
                  <span>{t("discount", lang)}:</span>
                  <span>-{formatCurrency(discountAmount, quote.currency)}</span>
                </div>
              )}
              {quote.addition > 0 && (
                <div className="flex justify-between">
                  <span>Acréscimo:</span>
                  <span>+{formatCurrency(quote.addition, quote.currency)}</span>
                </div>
              )}
              {(quote.taxes || []).map((tax, i) => (
                <div key={i} className="flex justify-between text-xs text-slate-500">
                  <span>
                    {tax.name} ({tax.rate}%):
                  </span>
                  <span>
                    +
                    {formatCurrency(
                      (itemsSubtotal - discountAmount + (quote.addition || 0)) *
                        (tax.rate / 100),
                      quote.currency,
                    )}
                  </span>
                </div>
              ))}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-3 flex justify-between text-xl font-black text-slate-900 dark:text-white">
                <span>Total Final:</span>
                <span className="text-blue-600 dark:text-blue-400">
                  {formatCurrency(finalTotal, quote.currency)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-700 dark:text-slate-300">
                {t("customFields", lang)}
              </h3>
              <button
                type="button"
                onClick={addCustomField}
                className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1"
              >
                <Plus size={14} /> Adicionar
              </button>
            </div>
            {(quote.customFields || []).map((cf, index) => (
              <div key={cf.id} className="flex gap-2 mb-2 items-center">
                <input
                  type="text"
                  placeholder="Rótulo (ex: Pagamento)"
                  value={cf.label}
                  onChange={(e) =>
                    updateCustomField(index, "label", e.target.value)
                  }
                  className="border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 w-1/3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                />
                <input
                  type="text"
                  placeholder="Valor"
                  value={cf.value}
                  onChange={(e) =>
                    updateCustomField(index, "value", e.target.value)
                  }
                  className="border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 flex-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                />
                <label className="flex items-center text-xs text-slate-600 dark:text-slate-400 gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cf.showOnPdf}
                    onChange={(e) =>
                      updateCustomField(index, "showOnPdf", e.target.checked)
                    }
                    className="rounded text-blue-600"
                  />
                  PDF
                </label>
                <button
                  type="button"
                  onClick={() => removeCustomField(index)}
                  className="p-1 text-slate-400 hover:text-red-500 rounded"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Notes */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-bold mb-3 text-slate-800 dark:text-slate-100">
          {t("notes", lang)}
        </h2>
        <textarea
          value={quote.notes}
          onChange={(e) =>
            setQuote((prev) => ({ ...prev, notes: e.target.value }))
          }
          rows={4}
          placeholder="Condições de pagamento, prazos de entrega, garantia e observações gerais..."
          className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        />
      </section>
    </div>
  );
}
