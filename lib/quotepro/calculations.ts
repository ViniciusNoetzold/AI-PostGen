import { Quote, Currency } from "./types";

/** Funções puras de domínio para valores e payloads de orçamento. */

export function calculateQuoteTotals(quote: Quote) {
  const itemsSubtotal = (quote.items || []).reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0,
  );

  let discountAmount = 0;
  const discountValue = Math.max(0, Number(quote.discountValue) || 0);
  if (quote.discountType === "percentage") {
    discountAmount = itemsSubtotal * (Math.min(discountValue, 100) / 100);
  } else {
    discountAmount = Math.min(discountValue, itemsSubtotal);
  }

  const baseForTaxes = Math.max(
    0,
    itemsSubtotal - discountAmount + Math.max(0, Number(quote.addition) || 0),
  );

  let taxesAmount = 0;
  (quote.taxes || []).forEach((tax) => {
    taxesAmount += baseForTaxes * ((Number(tax.rate) || 0) / 100);
  });

  const finalTotal = baseForTaxes + taxesAmount;

  return {
    itemsSubtotal,
    discountAmount,
    baseForTaxes,
    taxesAmount,
    finalTotal,
  };
}

export function formatCurrency(value: number, currency: Currency = "BRL") {
  const locales = {
    BRL: "pt-BR",
    USD: "en-US",
    EUR: "de-DE",
  };

  return new Intl.NumberFormat(locales[currency] || "pt-BR", {
    style: "currency",
    currency: currency || "BRL",
  }).format(value || 0);
}

export function generateFiscalPayload(
  quote: Quote,
  client?: { name: string; email: string; phone: string; address: string },
) {
  const totals = calculateQuoteTotals(quote);
  return {
    numero: quote.id,
    data_emissao: quote.date,
    natureza_operacao: "Prestação de Serviços / Venda",
    regime_tributario: "", // Para integração fiscal futura
    cliente: client || { id: quote.clientId },
    itens: (quote.items || []).map((i) => ({
      descricao: i.description,
      quantidade: i.quantity,
      valor_unitario: i.unitPrice,
      impostos: (quote.taxes || []).map((t) => ({ nome: t.name, aliquota: t.rate })),
    })),
    totais: {
      subtotal: totals.itemsSubtotal,
      descontos: totals.discountAmount,
      acrescimos: quote.addition,
      impostos: totals.taxesAmount,
      total_final: totals.finalTotal,
    },
    status: quote.status,
  };
}
