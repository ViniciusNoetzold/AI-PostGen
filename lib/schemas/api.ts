import { z } from "zod";

const nonEmptyText = (max: number) => z.string().trim().min(1).max(max);
const clientName = nonEmptyText(120).refine(
  (value) => !value.includes("..") && !/[\\/\0]/.test(value),
  "Invalid client name",
);
const postFileId = nonEmptyText(160).regex(/^[^\\/\0]+\.md$/i, "Invalid post file identifier").refine(
  (value) => !value.includes(".."),
  "Invalid post file identifier",
);
const httpsUrl = z.url().max(2048).refine((value) => /^https:\/\//i.test(value), "HTTPS URL required");
const storedImageUrl = z.string().max(512).regex(/^\/api\/media\/images\/[A-Za-z0-9%._/-]+$/, "Invalid stored image URL").refine(
  (value) => !value.includes(".."),
  "Invalid stored image URL",
);
const imageReference = z.union([httpsUrl, storedImageUrl]);
const imageMime = z.enum([
  "image/png", "image/jpeg", "image/webp", "image/heic", "image/heif",
  "image/gif", "image/bmp", "image/tiff",
]);
const inlineImage = z.object({
  data: z.string().min(16).max(3_500_000).regex(/^[A-Za-z0-9+/=\r\n]+$/, "Invalid base64 image"),
  mimeType: imageMime,
}).strict();

const language = z.enum([
  "pt-BR", "pt-PT", "en-US", "en-GB", "es-ES", "es-MX",
  "fr-FR", "de-DE", "it-IT", "ja-JP", "zh-CN", "ar-SA",
]);

export const configUpdateSchema = z.object({
  vaultPath: z.string().trim().min(3).max(1024).optional(),
  instagramToken: z.string().trim().max(4096).optional(),
  instagramAccountId: z.string().trim().max(128).optional(),
  defaultLanguage: language.optional(),
}).strict();

const environmentValue = (max: number) => z.string().trim().max(max)
  .refine((value) => !/[\r\n\0]/.test(value), "Invalid environment value")
  .optional();

export const serverConfigUpdateSchema = z.object({
  geminiApiKey: environmentValue(4096),
  geminiTextModel: environmentValue(120),
  telegramBotToken: environmentValue(4096),
  telegramChatId: environmentValue(160),
  huggingFaceToken: environmentValue(4096),
  databaseUrl: environmentValue(4096).refine(
    (value) => !value || /^postgres(?:ql)?:\/\//i.test(value),
    "PostgreSQL connection URL required",
  ),
  blobReadWriteToken: environmentValue(4096),
  clerkPublishableKey: environmentValue(1024),
  clerkSecretKey: environmentValue(4096),
  metaAppId: environmentValue(256),
  metaAppSecret: environmentValue(4096),
  metaRedirectUri: environmentValue(2048).refine(
    (value) => !value || z.url().safeParse(value).success,
    "Valid redirect URL required",
  ),
  appEncryptionKey: environmentValue(4096),
}).strict().refine(
  (value) => Object.values(value).some((entry) => Boolean(entry)),
  "At least one configuration value is required",
);

export const postReferenceSchema = z.object({
  client: clientName,
  id: postFileId,
}).strict();

export const editPostSchema = postReferenceSchema.extend({
  newContent: z.string().trim().min(1).max(100_000),
}).strict();

export const editPostImagesSchema = postReferenceSchema.extend({
  imageUrls: z.array(httpsUrl).max(10),
}).strict();

export const generatePostSchema = z.object({
  theme: nonEmptyText(300),
  language: language.default("pt-BR"),
  tone: z.string().trim().max(120).optional(),
  highMode: z.boolean().default(false),
  isCarousel: z.boolean().default(false),
  wantImage: z.boolean().default(false),
  customImagePrompt: z.string().trim().max(2_000).optional(),
  wantVideo: z.boolean().default(false),
  customVideoPrompt: z.string().trim().max(2_000).optional(),
}).strict();

export const telegramNotificationSchema = z.object({
  message: nonEmptyText(4096),
  videoUrl: httpsUrl.optional(),
  imageUrl: httpsUrl.optional(),
}).strict();

export const instagramConfigSchema = z.object({
  client: clientName,
  accessToken: nonEmptyText(4096),
  accountId: nonEmptyText(128),
}).strict();

export const instagramPublishSchema = z.object({
  client: clientName,
  imageUrls: z.array(httpsUrl).max(10).default([]),
  videoUrl: httpsUrl.optional(),
  caption: nonEmptyText(2200),
}).strict().refine((value) => value.imageUrls.length > 0 || Boolean(value.videoUrl), {
  message: "At least one image or video URL is required",
});

export const studioDescribeSchema = z.object({
  type: z.enum(["product", "atmosphere"]).default("product"),
  images: z.array(inlineImage).min(1).max(4),
}).strict();

export const studioAtmosphereSchema = z.object({ input: nonEmptyText(1000) }).strict();

export const studioPromptSchema = z.object({
  productDesc: z.string().trim().max(4000).optional(),
  atmosphereDesc: z.string().trim().max(4000).optional(),
  productImages: z.array(inlineImage).max(4).default([]),
  atmosphereImages: z.array(inlineImage).max(4).default([]),
}).strict();

export const studioGenerateVideoSchema = studioPromptSchema.extend({
  prompt: nonEmptyText(20_000),
  productImageUrl: httpsUrl.optional(),
}).strict();

export const studioEditVideoSchema = z.object({
  previousInteractionId: nonEmptyText(256).regex(/^[A-Za-z0-9_-]+$/),
  instructions: nonEmptyText(10_000),
}).strict();

export const integrationJobSchema = z.object({
  provider: z.enum(["GEMINI", "META", "TELEGRAM"]),
  operation: nonEmptyText(80).regex(/^[a-z0-9-]+$/),
  postId: z.uuid().optional(),
  payload: z.record(z.string(), z.unknown()),
}).strict();

export const telegramJobPayloadSchema = telegramNotificationSchema;
export const geminiJobPayloadSchema = z.object({
  prompt: nonEmptyText(30_000),
  maxOutputTokens: z.number().int().min(32).max(8192).default(1024),
}).strict();
export const metaJobPayloadSchema = z.object({
  connectionId: z.uuid(),
  imageUrls: z.array(httpsUrl).max(10).default([]),
  videoUrl: httpsUrl.optional(),
  caption: nonEmptyText(2200),
}).strict().refine((value) => value.imageUrls.length > 0 || Boolean(value.videoUrl), {
  message: "At least one image or video URL is required",
});

export const schedulePostSchema = z.object({
  scheduledAt: z.iso.datetime(),
}).strict();

export const approvalSchema = z.object({
  approved: z.boolean(),
  comment: z.string().trim().max(2000).default(""),
}).strict();

export const contactSchema = z.object({
  name: clientName,
  email: z.email().max(320).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
  company: z.string().trim().max(160).optional(),
  companyId: z.uuid().optional().or(z.literal("")),
  photoUrl: imageReference.optional().or(z.literal("")),
  jobTitle: z.string().trim().max(120).optional(),
  category: z.enum(["OWNER", "COFOUNDER", "EMPLOYEE", "CUSTOMER", "LEAD", "PARTNER", "OTHER"]).default("OTHER"),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(80).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  notes: z.string().trim().max(5000).optional(),
  active: z.boolean().default(true),
}).strict();

export const companySchema = z.object({
  name: clientName,
  legalName: z.string().trim().max(180).optional(),
  document: z.string().trim().max(40).optional(),
  industry: z.string().trim().max(100).optional(),
  website: httpsUrl.optional().or(z.literal("")),
  logoUrl: imageReference.optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(80).optional(),
  country: z.string().trim().min(2).max(80).default("Brasil"),
  active: z.boolean().default(true),
}).strict();

export const relationshipSchema = z.object({
  sourceClientId: z.uuid(),
  targetClientId: z.uuid(),
  type: z.enum(["CUSTOMER", "PARTNER", "SUPPLIER", "REFERRAL", "TEAM", "OTHER"]).default("OTHER"),
  label: z.string().trim().max(100).optional(),
  strength: z.number().int().min(1).max(5).default(1),
  notes: z.string().trim().max(1000).optional(),
  active: z.boolean().default(true),
}).strict().refine((value) => value.sourceClientId !== value.targetClientId, {
  message: "A contact cannot be related to itself",
  path: ["targetClientId"],
});
