import 'server-only';

import fs from 'fs';
import path from 'path';
import type { PublicConfigProfile } from '@/lib/config';
import { atomicWriteText } from '@/lib/server/atomic-files';

export interface GlobalConfig {
  vaultPath: string;
  port?: number;
  instagramToken?: string;
  instagramAccountId?: string;
  defaultLanguage?: string;
}

const CONFIG_FILE_PATH = path.join(process.cwd(), 'global_config.json');

export const getGlobalConfig = (): GlobalConfig => {
  let config: GlobalConfig = {
    vaultPath: path.join(process.cwd(), 'Obsidian vault neural brain'),
    port: parseInt(process.env.PORT || '3000', 10),
    defaultLanguage: 'pt-BR',
  };

  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      config = { ...config, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('Error reading global config:', err);
  }

  // Se o caminho configurado não existir, tenta caminhos locais comuns
  if (!config.vaultPath || !fs.existsSync(/*turbopackIgnore: true*/ config.vaultPath)) {
    const localVault = path.join(process.cwd(), 'Obsidian vault neural brain');
    const parentVault = path.join(process.cwd(), '../Obsidian vault neural brain');
    if (fs.existsSync(/*turbopackIgnore: true*/ localVault)) {
      config.vaultPath = localVault;
    } else if (fs.existsSync(/*turbopackIgnore: true*/ parentVault)) {
      config.vaultPath = parentVault;
    }
  }
  
  return config;
};

export const saveGlobalConfig = async (config: Partial<GlobalConfig>): Promise<void> => {
  try {
    const currentConfig = getGlobalConfig();
    const newConfig = { ...currentConfig, ...config };
    await atomicWriteText(CONFIG_FILE_PATH, JSON.stringify(newConfig, null, 2));
  } catch (err) {
    console.error('Error saving global config:', err);
    throw err;
  }
};

export const getPublicConfigProfile = (): PublicConfigProfile => {
  const config = getGlobalConfig();
  return {
    vaultPath: config.vaultPath,
    port: config.port || 3000,
    instagramAccountId: config.instagramAccountId ?? '',
    defaultLanguage: config.defaultLanguage ?? 'pt-BR',
    instagramConfigured: Boolean(config.instagramToken && config.instagramAccountId),
    telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    huggingFaceConfigured: Boolean(process.env.HUGGING_FACE_TOKEN),
    authenticationConfigured: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY),
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    objectStorageConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    metaOAuthConfigured: Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET),
    serverConfigWritable: true,
  };
};

export const getVaultPath = (): string => {
  return getGlobalConfig().vaultPath;
};
