import 'server-only';

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { atomicWriteText } from '@/lib/server/atomic-files';
import { ApiError } from '@/lib/server/security';
import type { z } from 'zod';
import type { serverConfigUpdateSchema } from '@/lib/schemas/api';

type ServerConfigUpdate = z.infer<typeof serverConfigUpdateSchema>;

const ENVIRONMENT_KEYS: Record<keyof ServerConfigUpdate, string> = {
  geminiApiKey: 'GEMINI_API_KEY',
  geminiTextModel: 'GEMINI_TEXT_MODEL',
  telegramBotToken: 'TELEGRAM_BOT_TOKEN',
  telegramChatId: 'TELEGRAM_CHAT_ID',
  huggingFaceToken: 'HUGGING_FACE_TOKEN',
  databaseUrl: 'DATABASE_URL',
  blobReadWriteToken: 'BLOB_READ_WRITE_TOKEN',
  clerkPublishableKey: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  clerkSecretKey: 'CLERK_SECRET_KEY',
  metaAppId: 'META_APP_ID',
  metaAppSecret: 'META_APP_SECRET',
  metaRedirectUri: 'META_REDIRECT_URI',
  appEncryptionKey: 'APP_ENCRYPTION_KEY',
};

function serializeEnvironmentValue(value: string): string {
  return JSON.stringify(value);
}

export async function updateLocalEnvironment(update: ServerConfigUpdate): Promise<string[]> {
  if (process.env.NODE_ENV === 'production') {
    throw new ApiError(
      409,
      'Em produção, configure os segredos no provedor de hospedagem.',
      'DEPLOYMENT_ENV_REQUIRED',
    );
  }

  const entries = Object.entries(update)
    .filter((entry): entry is [keyof ServerConfigUpdate, string] => Boolean(entry[1]))
    .map(([field, value]) => [ENVIRONMENT_KEYS[field], value] as const);
  if (entries.length === 0) {
    throw new ApiError(422, 'Nenhum valor de configuração foi informado.', 'EMPTY_CONFIG_UPDATE');
  }

  const targetPath = path.join(process.cwd(), '.env.local');
  const current = await fs.readFile(targetPath, 'utf8').catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return '';
    throw error;
  });
  const lines = current ? current.replace(/\r\n/g, '\n').split('\n') : [];

  for (const [key, value] of entries) {
    const line = `${key}=${serializeEnvironmentValue(value)}`;
    const matcher = new RegExp(`^\\s*${key}\\s*=`);
    const index = lines.findIndex((existing) => matcher.test(existing));
    if (index >= 0) lines[index] = line;
    else lines.push(line);
    process.env[key] = value;
  }

  const output = `${lines.filter((line, index) => line || index < lines.length - 1).join('\n').trimEnd()}\n`;
  await atomicWriteText(targetPath, output);
  return entries.map(([key]) => key);
}
