import fs from 'fs';
import path from 'path';

export interface GlobalConfig {
  vaultPath: string;
  instagramToken?: string;
  instagramAccountId?: string;
  defaultLanguage?: string;
}

const CONFIG_FILE_PATH = path.join(process.cwd(), 'global_config.json');

export const getGlobalConfig = (): GlobalConfig => {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      return JSON.parse(data) as GlobalConfig;
    }
  } catch (err) {
    console.error('Error reading global config:', err);
  }
  
  // Default values if config doesn't exist
  return {
    vaultPath: path.join(process.cwd(), '../Obsidian vault neural brain'),
    defaultLanguage: 'pt-BR',
  };
};

export const saveGlobalConfig = (config: Partial<GlobalConfig>): void => {
  try {
    const currentConfig = getGlobalConfig();
    const newConfig = { ...currentConfig, ...config };
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving global config:', err);
    throw err;
  }
};

export const getVaultPath = (): string => {
  return getGlobalConfig().vaultPath;
};
