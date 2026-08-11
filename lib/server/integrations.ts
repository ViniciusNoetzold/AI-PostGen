import { GoogleGenAI } from "@google/genai";
import { FatalError, RetryableError } from "workflow";
import { geminiJobPayloadSchema, metaJobPayloadSchema, telegramJobPayloadSchema } from "@/lib/schemas/api";
import { decryptSecret } from "@/lib/server/encryption";
import { getDb } from "@/lib/server/db";

async function ensureProviderResponse(response: Response, provider: string): Promise<void> {
  if (response.ok) return;
  const detail = (await response.text()).slice(0, 500);
  if (response.status === 429 || response.status >= 500) {
    throw new RetryableError(`${provider} transient error ${response.status}: ${detail}`, { retryAfter: "30s" });
  }
  throw new FatalError(`${provider} rejected the request (${response.status}): ${detail}`);
}

export async function executeGemini(input: unknown): Promise<Record<string, unknown>> {
  const payload = geminiJobPayloadSchema.parse(input);
  if (!process.env.GEMINI_API_KEY) throw new FatalError("GEMINI_API_KEY is not configured");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: 300_000 } });
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_TEXT_MODEL || "gemini-2.0-flash",
    contents: [{ text: payload.prompt }],
    config: { maxOutputTokens: payload.maxOutputTokens },
  });
  return { text: response.text || "" };
}

export async function executeTelegram(input: unknown): Promise<Record<string, unknown>> {
  const payload = telegramJobPayloadSchema.parse(input);
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new FatalError("Telegram credentials are not configured");
  const method = payload.videoUrl ? "sendVideo" : payload.imageUrl ? "sendPhoto" : "sendMessage";
  const body = payload.videoUrl
    ? { chat_id: chatId, video: payload.videoUrl, caption: payload.message }
    : payload.imageUrl
      ? { chat_id: chatId, photo: payload.imageUrl, caption: payload.message }
      : { chat_id: chatId, text: payload.message };
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await ensureProviderResponse(response, "Telegram");
  const result = await response.json() as { result?: { message_id?: number } };
  return { messageId: result.result?.message_id || null };
}

async function createMetaContainer(accountId: string, token: string, params: Record<string, string>): Promise<string> {
  const graphVersion = process.env.META_GRAPH_VERSION || "v23.0";
  const body = new URLSearchParams({ ...params, access_token: token });
  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${accountId}/media`, { method: "POST", body });
  await ensureProviderResponse(response, "Meta");
  const result = await response.json() as { id?: string };
  if (!result.id) throw new RetryableError("Meta did not return a container ID", { retryAfter: "15s" });
  return result.id;
}

export async function executeMeta(input: unknown): Promise<Record<string, unknown>> {
  const payload = metaJobPayloadSchema.parse(input);
  const connection = await getDb().metaConnection.findUnique({ where: { id: payload.connectionId } });
  if (!connection?.active || !connection.instagramBusinessId) throw new FatalError("Active Meta connection not found");
  const token = decryptSecret(connection.encryptedAccessToken);
  let creationId: string;
  if (payload.videoUrl) {
    creationId = await createMetaContainer(connection.instagramBusinessId, token, {
      media_type: "REELS", video_url: payload.videoUrl, caption: payload.caption,
    });
  } else if (payload.imageUrls.length === 1) {
    creationId = await createMetaContainer(connection.instagramBusinessId, token, {
      image_url: payload.imageUrls[0], caption: payload.caption,
    });
  } else {
    const children: string[] = [];
    for (const imageUrl of payload.imageUrls) {
      children.push(await createMetaContainer(connection.instagramBusinessId, token, {
        image_url: imageUrl, is_carousel_item: "true",
      }));
    }
    creationId = await createMetaContainer(connection.instagramBusinessId, token, {
      media_type: "CAROUSEL", children: children.join(","), caption: payload.caption,
    });
  }
  const graphVersion = process.env.META_GRAPH_VERSION || "v23.0";
  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${connection.instagramBusinessId}/media_publish`, {
    method: "POST",
    body: new URLSearchParams({ creation_id: creationId, access_token: token }),
  });
  await ensureProviderResponse(response, "Meta");
  const result = await response.json() as { id?: string };
  return { creationId, postId: result.id || null };
}
