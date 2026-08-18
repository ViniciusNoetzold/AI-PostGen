'use client';

import { EmailJSConfig, Quote } from "./types";
import { formatCurrency } from "./calculations";

async function safeImport(moduleName: string) {
  try {
    const importFn = new Function('m', 'return import(m)');
    return await importFn(moduleName);
  } catch {
    return null;
  }
}

/** Adaptador de envio de orçamentos pela API pública do EmailJS. */
export async function sendQuoteViaEmailJS(
  config: EmailJSConfig,
  quote: Quote,
  toEmail: string,
  clientName: string,
  approvalUrl?: string,
  pdfBase64?: string,
): Promise<boolean> {
  const emailjsModule = await safeImport("@emailjs/browser");
  if (!emailjsModule) {
    throw new Error("Módulo @emailjs/browser não disponível.");
  }
  const emailjs = emailjsModule.default || emailjsModule;

  const itemSummary = (quote.items || [])
    .filter((item) => item.description.trim())
    .map(
      (item) =>
        `${item.quantity}x ${item.description} — ${formatCurrency(item.quantity * item.unitPrice, quote.currency)}`,
    )
    .join("\n");

  await emailjs.send(
    config.serviceId,
    config.templateId,
    {
      to_email: toEmail,
      to_name: clientName,
      quote_number: quote.number,
      quote_date: quote.date,
      quote_total: formatCurrency(quote.total, quote.currency),
      quote_items: itemSummary,
      quote_notes: quote.notes,
      approval_url: approvalUrl || "",
      attachment: pdfBase64 || "",
    },
    { publicKey: config.publicKey },
  );

  return true;
}
