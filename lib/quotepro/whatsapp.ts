/** Gera uma URL do WhatsApp normalizando telefones brasileiros. */
export const generateWhatsAppLink = (phone: string, text: string) => {
  let cleanPhone = (phone || "").replace(/\D/g, "");
  if (cleanPhone.length === 10 || cleanPhone.length === 11)
    cleanPhone = `55${cleanPhone}`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
};
