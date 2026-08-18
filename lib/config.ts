export interface PublicConfigProfile {
  vaultPath: string
  port: number
  instagramAccountId: string
  defaultLanguage: string
  instagramConfigured: boolean
  telegramConfigured: boolean
  geminiConfigured: boolean
  huggingFaceConfigured: boolean
  authenticationConfigured: boolean
  databaseConfigured: boolean
  objectStorageConfigured: boolean
  metaOAuthConfigured: boolean
  serverConfigWritable: boolean
}
