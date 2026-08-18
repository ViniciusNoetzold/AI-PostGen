'use client';

import { useState, type ChangeEvent } from "react";
import { Quote, Language, CompanyProfile, Client } from "@/lib/quotepro/types";
import { calculateQuoteTotals, formatCurrency } from "@/lib/quotepro/calculations";
import { useAppContext } from "@/lib/quotepro/context";

function formatDatePt(d: Date | string): string {
  try {
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    return isNaN(dateObj.getTime()) ? String(d || '') : dateObj.toLocaleDateString('pt-BR');
  } catch {
    return String(d || '');
  }
}

function formatDateIso(d: Date | string): string {
  try {
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    return isNaN(dateObj.getTime()) ? '' : dateObj.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

interface QuotePreviewProps {
  quote: Quote;
  lang?: Language;
  onLogoUpdate?: (logo: Quote["templateLogo"] | undefined) => void;
}

export function QuotePreview({ quote, onLogoUpdate }: QuotePreviewProps) {
  const { profiles, clients } = useAppContext();
  const [isLogoLocked, setIsLogoLocked] = useState(false);

  const { itemsSubtotal, discountAmount, finalTotal } = calculateQuoteTotals(quote);

  let validUntil = quote.validUntil;
  if (!validUntil && quote.date) {
    try {
      const d = new Date(quote.date);
      d.setDate(d.getDate() + 15);
      validUntil = formatDateIso(d);
    } catch {
      validUntil = "";
    }
  }

  const issuer = profiles.find((p: CompanyProfile) => p.id === quote.issuerId) || null;
  const client = clients.find((item: Client) => item.id === quote.clientId);

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onLogoUpdate) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setIsLogoLocked(false);
          onLogoUpdate({
            dataUrl: ev.target.result as string,
            width: 150,
            height: 80,
            x: 0,
            y: 0,
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full text-slate-900 font-sans bg-white p-6 md:p-8 rounded-xl shadow-md border border-slate-200">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start mb-10 gap-6 border-b border-slate-200 pb-8 relative min-h-[110px]">
        {quote.templateLogo ? (
          <div
            className="group relative"
            style={{
              width: quote.templateLogo.width || 150,
              height: quote.templateLogo.height || 80,
            }}
          >
            <img
              src={quote.templateLogo.dataUrl}
              alt="Logo Template"
              className="w-full h-full object-contain"
            />
            {onLogoUpdate && (
              <div
                data-html2canvas-ignore="true"
                className="absolute -top-3 -right-3 flex gap-1 print:hidden"
              >
                <button
                  type="button"
                  onClick={() => onLogoUpdate(undefined)}
                  className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow hover:bg-red-600"
                  title="Remover Logo"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        ) : null}

        <div
          className="flex-1 w-full text-center md:text-left flex items-start gap-4"
          style={{ zIndex: 1 }}
        >
          {!quote.templateLogo &&
            (issuer?.logoUrl ? (
              <img
                src={issuer.logoUrl}
                alt="Logo"
                className="w-32 object-contain"
              />
            ) : (
              <div className="w-32 h-16 bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 rounded text-xs font-medium">
                Logo Empresa
              </div>
            ))}

          {onLogoUpdate && !quote.templateLogo && (
            <label
              data-html2canvas-ignore="true"
              className="cursor-pointer bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium self-start mt-2 border border-blue-200 hover:bg-blue-100 transition shadow-sm flex items-center gap-1 print:hidden"
            >
              <span>+ Inserir Logo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>
          )}

          {issuer && (
            <div className="text-left mt-2">
              <h2 className="font-bold text-lg text-slate-900">{issuer.name}</h2>
              {issuer.cnpj && (
                <p className="text-sm text-slate-600">CNPJ: {issuer.cnpj}</p>
              )}
              {issuer.address && (
                <p className="text-sm text-slate-600">{issuer.address}</p>
              )}
            </div>
          )}
        </div>

        <div className="text-right w-full md:w-auto" style={{ zIndex: 1 }}>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-1 uppercase tracking-wide">
            Orçamento
          </h1>
          <p className="text-slate-800 font-semibold">Nº: {quote.number}</p>
          <p className="text-slate-600 text-sm">
            Data: {quote.date ? formatDatePt(quote.date) : ""}
          </p>
          {validUntil && (
            <p className="text-slate-500 text-sm mt-0.5">
              Validade: {formatDatePt(validUntil)}
            </p>
          )}
        </div>
      </header>

      {/* Client Info */}
      <section className="mb-8">
        <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">
          Dados do Cliente
        </h3>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-800">
          <p className="font-bold text-lg text-slate-900">
            {client?.name || "Nenhum cliente selecionado"}
          </p>
          {client?.email ? (
            <p className="text-sm mt-1 text-slate-600">{client.email}</p>
          ) : null}
          {client?.phone ? (
            <p className="text-sm text-slate-600">{client.phone}</p>
          ) : null}
          {client?.address ? (
            <p className="text-sm text-slate-600">{client.address}</p>
          ) : null}
        </div>
      </section>

      {/* Items Table */}
      <section className="mb-10 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[500px]">
          <thead>
            <tr className="border-b-2 border-slate-900 text-slate-900 text-sm">
              <th className="py-3 px-2 font-bold w-16">Item</th>
              <th className="py-3 px-2 font-bold">Descrição</th>
              <th className="py-3 px-2 font-bold text-right">Qtd</th>
              <th className="py-3 px-2 font-bold text-right">Unitário</th>
              <th className="py-3 px-2 font-bold text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {(!quote.items || quote.items.length === 0) && (
              <tr>
                <td
                  colSpan={5}
                  className="py-6 text-center text-slate-400 italic"
                >
                  Nenhum item adicionado.
                </td>
              </tr>
            )}
            {(quote.items || []).map((item, index) => (
              <tr
                key={item.id || index}
                className={index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
              >
                <td className="py-3 px-2 text-center">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt="item"
                      className="w-10 h-10 object-cover rounded shadow-sm border border-slate-200"
                    />
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>
                <td className="py-3 px-2 font-medium text-slate-800">
                  {item.description || "-"}
                </td>
                <td className="py-3 px-2 text-right text-slate-700">{item.quantity}</td>
                <td className="py-3 px-2 text-right text-slate-700">
                  {formatCurrency(item.unitPrice, quote.currency)}
                </td>
                <td className="py-3 px-2 text-right font-bold text-slate-900">
                  {formatCurrency(
                    item.quantity * item.unitPrice,
                    quote.currency,
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Totals & Signature */}
      <section className="flex flex-col md:flex-row justify-between items-end mb-8 gap-8">
        <div className="w-full md:w-1/2 flex flex-col items-center mt-6 md:mt-0 order-2 md:order-1">
          {quote.signature ? (
            <div className="flex flex-col items-center">
              {quote.signature.type === "draw" && quote.signature.dataUrl ? (
                <img
                  src={quote.signature.dataUrl}
                  alt="Assinatura"
                  className="h-20 object-contain border-b border-slate-400 mb-2 px-4"
                />
              ) : (
                <div className="h-20 flex items-center justify-center border-b border-slate-400 mb-2 px-4 w-64 text-center">
                  <span className="font-serif italic text-3xl text-slate-900">
                    {quote.signature.typedName}
                  </span>
                </div>
              )}
              <span className="text-sm text-slate-700 font-semibold">
                Assinatura do Cliente
              </span>
              {quote.signature.timestamp && (
                <span className="text-xs text-slate-400 mt-1">
                  Assinado em:{" "}
                  {new Date(quote.signature.timestamp).toLocaleString()}
                </span>
              )}
              {quote.signature.acceptedTerms && (
                <span className="text-xs text-emerald-600 font-medium mt-1">
                  ✓ Termos aceitos eletronicamente
                </span>
              )}
            </div>
          ) : (
            <div className="w-64 border-t border-slate-400 pt-2 text-center mt-16">
              <span className="text-sm text-slate-500 font-medium">
                Assinatura
              </span>
            </div>
          )}
        </div>

        <div className="w-full md:w-1/2 lg:w-1/3 order-1 md:order-2">
          <table className="w-full text-right text-slate-800 text-sm">
            <tbody>
              <tr>
                <td className="py-1.5 pr-4 text-slate-600">Subtotal:</td>
                <td className="py-1.5 font-medium">
                  {formatCurrency(itemsSubtotal, quote.currency)}
                </td>
              </tr>
              {discountAmount > 0 && (
                <tr className="text-red-600">
                  <td className="py-1.5 pr-4">Desconto:</td>
                  <td className="py-1.5 font-medium">
                    -{formatCurrency(discountAmount, quote.currency)}
                  </td>
                </tr>
              )}
              {quote.addition > 0 && (
                <tr>
                  <td className="py-1.5 pr-4 text-slate-600">Acréscimo:</td>
                  <td className="py-1.5 font-medium">
                    +{formatCurrency(quote.addition, quote.currency)}
                  </td>
                </tr>
              )}
              {(quote.taxes || []).map((tax) => (
                <tr key={tax.id} className="text-slate-600">
                  <td className="py-1.5 pr-4">
                    {tax.name} ({tax.rate}%):
                  </td>
                  <td className="py-1.5">
                    +
                    {formatCurrency(
                      (itemsSubtotal - discountAmount + (quote.addition || 0)) *
                        (tax.rate / 100),
                      quote.currency,
                    )}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-900 text-lg font-black text-slate-900">
                <td className="py-3 pr-4">Total:</td>
                <td className="py-3">
                  {formatCurrency(finalTotal, quote.currency)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Custom Fields & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 break-inside-avoid">
        {quote.customFields &&
          quote.customFields.filter((f) => f.showOnPdf).length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">
                Informações Adicionais
              </h3>
              <table className="w-full text-sm text-slate-700">
                <tbody>
                  {quote.customFields
                    .filter((f) => f.showOnPdf)
                    .map((f) => (
                      <tr key={f.id} className="border-b border-slate-100">
                        <td className="py-1 font-semibold pr-4 text-slate-900">{f.label}:</td>
                        <td className="py-1">{f.value}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </section>
          )}

        {quote.notes && (
          <section>
            <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">
              Observações
            </h3>
            <div className="text-slate-700 whitespace-pre-wrap text-sm border-l-4 border-blue-500 bg-slate-50 p-3 rounded-r-lg">
              {quote.notes}
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-8 pt-6 border-t border-slate-200 text-center text-slate-400 text-xs">
        Documento emitido profissionalmente via QuotePRO Orçamentos.
      </footer>
    </div>
  );
}
