export type Currency = "BRL" | "USD" | "EUR";
export type Language = "pt" | "en";
export type QuoteStatus = "draft" | "sent" | "approved" | "rejected";

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string; // Optional image/thumbnail
}

export interface SignatureData {
  type: "draw" | "type";
  dataUrl?: string; // For canvas drawing
  typedName?: string; // For typed signature
  timestamp?: string; // Date/Time of signature
  acceptedTerms: boolean; // Must be true for typed
}

export interface Tax {
  id: string;
  name: string;
  rate: number; // percentage
}

export interface RecurringConfig {
  active: boolean;
  frequency: "weekly" | "monthly";
  nextRunDate?: string;
  originalQuoteId?: string; // To avoid infinite recursion, track parent
}

export interface CustomField {
  id: string;
  label: string;
  value: string;
  showOnPdf: boolean;
}

export interface Quote {
  id: string;
  number: string;
  clientId: string;
  date: string;
  validUntil: string;
  items: QuoteItem[];
  subtotal: number;
  discountType: "percentage" | "fixed";
  discountValue: number;
  addition: number; // Fretes/taxas extras
  taxes: Tax[]; // Array of taxes applied to this quote
  total: number;
  notes: string;
  status: QuoteStatus;
  signature?: SignatureData;
  currency: Currency;
  issuerId?: string; // Profile ID
  templateLogo?: {
    dataUrl: string;
    width: number;
    height: number;
    x: number;
    y: number;
  };
  recurringConfig?: RecurringConfig;
  customFields?: CustomField[];
  reminderDate?: string; // Date for follow-up
}

export interface CompanyProfile {
  id: string;
  name: string;
  cnpj: string;
  address: string;
  logoUrl?: string;
  isDefault: boolean;
}

export interface EmailJSConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}

export interface AppSettings {
  currency: Currency;
  theme: "light" | "dark";
  language: Language;
  nextQuoteNumber: number;
  emailJS?: EmailJSConfig;
}

export interface ActivityLog {
  id: string;
  date: string; // ISO string
  action:
    | "create"
    | "edit"
    | "send"
    | "approve"
    | "reject"
    | "delete"
    | "export"
    | "generate_recurring";
  entityId: string; // Quote ID usually
  description: string;
}

export interface NotificationMsg {
  id: string;
  date: string;
  title: string;
  message: string;
  read: boolean;
  linkHash?: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  quoteData: Partial<Quote>;
}

export interface QuoteHistoryEntry {
  id: string;
  number: string;
  date: string;
  clientName?: string;
  total: number;
  currency: Currency;
}
