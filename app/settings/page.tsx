'use client'

import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  Database,
  FolderSync,
  HardDrive,
  KeyRound,
  Languages,
  Loader2,
  LockKeyhole,
  Save,
  Send,
  ServerCog,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import type { PublicConfigProfile } from '@/lib/config'

const LANGUAGES = [
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'pt-PT', label: 'Português (Portugal)' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'es-ES', label: 'Español (España)' },
  { code: 'es-MX', label: 'Español (México)' },
  { code: 'fr-FR', label: 'Français' },
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'it-IT', label: 'Italiano' },
  { code: 'ja-JP', label: '日本語' },
  { code: 'zh-CN', label: '中文 (简体)' },
  { code: 'ar-SA', label: 'العربية' },
]

interface ConfigFormState {
  vaultPath: string
  instagramAccountId: string
  instagramToken: string
  defaultLanguage: string
}

interface ServerConfigFormState {
  geminiApiKey: string
  geminiTextModel: string
  telegramBotToken: string
  telegramChatId: string
  huggingFaceToken: string
  databaseUrl: string
  blobReadWriteToken: string
  clerkPublishableKey: string
  clerkSecretKey: string
  metaAppId: string
  metaAppSecret: string
  metaRedirectUri: string
  appEncryptionKey: string
}

const EMPTY_FORM: ConfigFormState = {
  vaultPath: '',
  instagramAccountId: '',
  instagramToken: '',
  defaultLanguage: 'pt-BR',
}

const EMPTY_SERVER_FORM: ServerConfigFormState = {
  geminiApiKey: '',
  geminiTextModel: '',
  telegramBotToken: '',
  telegramChatId: '',
  huggingFaceToken: '',
  databaseUrl: '',
  blobReadWriteToken: '',
  clerkPublishableKey: '',
  clerkSecretKey: '',
  metaAppId: '',
  metaAppSecret: '',
  metaRedirectUri: '',
  appEncryptionKey: '',
}

const INPUT_CLASS = 'mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white'

function StatusBadge({ configured }: { configured: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${configured ? 'text-emerald-400' : 'text-amber-400'}`}>
      {configured ? <CheckCircle2 className="size-3.5" /> : null}
      {configured ? 'Configurado' : 'Pendente'}
    </span>
  )
}

interface IntegrationSectionProps {
  label: string
  description: string
  configured: boolean
  icon: LucideIcon
  children: ReactNode
}

function IntegrationSection({ label, description, configured, icon: Icon, children }: IntegrationSectionProps) {
  return (
    <details className="group overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-950">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-3.5">
        <Icon className="size-4 shrink-0 text-slate-400" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
          <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{description}</span>
        </span>
        <StatusBadge configured={configured} />
        <ChevronDown className="size-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 border-t border-slate-200 px-3 py-4 dark:border-slate-800">
        {children}
      </div>
    </details>
  )
}

function SecretField({ label, value, onChange, placeholder = 'Deixe vazio para preservar o valor atual' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
      {label}
      <input
        type="password"
        autoComplete="new-password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={INPUT_CLASS}
      />
    </label>
  )
}

export default function SettingsPage() {
  const [config, setConfig] = useState<PublicConfigProfile | null>(null)
  const [form, setForm] = useState<ConfigFormState>(EMPTY_FORM)
  const [serverForm, setServerForm] = useState<ServerConfigFormState>(EMPTY_SERVER_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [serverSaving, setServerSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [serverMessage, setServerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadConfig() {
      try {
        const response = await fetch('/api/config', { cache: 'no-store', signal: controller.signal })
        const payload = (await response.json()) as PublicConfigProfile & { error?: string }
        if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar as configurações.')
        setConfig(payload)
        setForm({
          vaultPath: payload.vaultPath,
          instagramAccountId: payload.instagramAccountId,
          instagramToken: '',
          defaultLanguage: payload.defaultLanguage,
        })
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao carregar configurações.' })
      } finally {
        setLoading(false)
      }
    }

    void loadConfig()
    return () => controller.abort()
  }, [])

  const updateField = (field: keyof ConfigFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const updateServerField = (field: keyof ServerConfigFormState, value: string) => {
    setServerForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaultPath: form.vaultPath,
          instagramAccountId: form.instagramAccountId,
          instagramToken: form.instagramToken || undefined,
          defaultLanguage: form.defaultLanguage,
        }),
      })
      const payload = (await response.json()) as { config?: PublicConfigProfile; error?: string }
      if (!response.ok || !payload.config) throw new Error(payload.error || 'Não foi possível salvar as configurações.')

      setConfig(payload.config)
      setForm((current) => ({ ...current, instagramToken: '' }))
      setMessage({ type: 'success', text: 'Preferências e Vault salvos com sucesso.' })
    } catch (error: unknown) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro inesperado ao salvar.' })
    } finally {
      setSaving(false)
    }
  }

  const handleServerSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setServerSaving(true)
    setServerMessage(null)

    const update = Object.fromEntries(
      Object.entries(serverForm).filter(([, value]) => value.trim().length > 0),
    )
    if (Object.keys(update).length === 0) {
      setServerMessage({ type: 'error', text: 'Abra uma integração e informe ao menos um valor.' })
      setServerSaving(false)
      return
    }

    try {
      const response = await fetch('/api/config/server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      })
      const payload = (await response.json()) as {
        config?: PublicConfigProfile
        message?: string
        error?: string
        restartRequired?: boolean
      }
      if (!response.ok || !payload.config) throw new Error(payload.error || 'Não foi possível salvar as integrações.')

      setConfig(payload.config)
      setServerForm(EMPTY_SERVER_FORM)
      setServerMessage({
        type: 'success',
        text: payload.restartRequired
          ? 'Salvo com segurança. Reinicie a aplicação para ativar a autenticação.'
          : 'Integrações atualizadas. Campos secretos foram limpos desta tela.',
      })
    } catch (error: unknown) {
      setServerMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro inesperado ao salvar integrações.' })
    } finally {
      setServerSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 md:p-8">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-pink-400">Workspace</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Configurações</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Configure preferências, integrações e a estratégia híbrida entre PostgreSQL e Obsidian Vault.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <Loader2 className="size-5 animate-spin" /> Carregando configurações…
        </div>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <form onSubmit={handleSubmit} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-black/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/10">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
              <h2 className="font-semibold text-slate-900 dark:text-white">Preferências e Obsidian Vault</h2>
              <p className="mt-1 text-sm text-slate-500">O Vault continua ativo como biblioteca de conteúdo e espelho legível.</p>
            </div>

            <div className="space-y-6 p-5 sm:p-6">
              <section className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                <div className="flex gap-3">
                  <FolderSync className="mt-0.5 size-5 shrink-0 text-cyan-400" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Modo híbrido atual</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                      O Obsidian guarda contexto, arquivos Markdown, histórico e alimenta o grafo. O PostgreSQL organiza clientes, posts, calendário, aprovações, filas, métricas e auditoria. Um complementa o outro nesta fase.
                    </p>
                  </div>
                </div>
              </section>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  <HardDrive className="size-4 text-cyan-500" /> Caminho do Obsidian Vault
                </span>
                <input
                  required
                  value={form.vaultPath}
                  onChange={(event) => updateField('vaultPath', event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  placeholder="E:\\Caminho\\Para\\Obsidian Vault"
                />
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  <Languages className="size-4 text-cyan-500" /> Idioma padrão dos posts
                </span>
                <select
                  value={form.defaultLanguage}
                  onChange={(event) => updateField('defaultLanguage', event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  {LANGUAGES.map((language) => <option key={language.code} value={language.code}>{language.label}</option>)}
                </select>
              </label>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Instagram manual — compatibilidade</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">Preservado para o fluxo atual. Para produção, prefira o Meta OAuth configurado ao lado.</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Instagram Account ID
                    <input
                      value={form.instagramAccountId}
                      onChange={(event) => updateField('instagramAccountId', event.target.value)}
                      className={INPUT_CLASS}
                      placeholder="ID da conta profissional"
                    />
                  </label>
                  <SecretField label="Novo token do Instagram" value={form.instagramToken} onChange={(value) => updateField('instagramToken', value)} />
                </div>
              </div>

              {message ? (
                <p role="status" className={`rounded-xl border px-4 py-3 text-sm ${message.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/30 bg-rose-500/10 text-rose-300'}`}>
                  {message.text}
                </p>
              ) : null}
            </div>

            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/40 sm:px-6">
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-pink-950/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {saving ? 'Salvando…' : 'Salvar preferências'}
              </button>
            </div>
          </form>

          <form onSubmit={handleServerSubmit} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-black/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/10">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ServerCog className="size-5 text-pink-400" />
                <h2 className="font-semibold text-slate-900 dark:text-white">Integrações do servidor</h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">Abra um item para configurar. Segredos nunca são exibidos novamente.</p>
            </div>

            <fieldset disabled={!config?.serverConfigWritable || serverSaving} className="space-y-3 p-4 disabled:opacity-70">
              <IntegrationSection label="Gemini" description="Texto e recursos generativos" configured={Boolean(config?.geminiConfigured)} icon={Sparkles}>
                <SecretField label="GEMINI_API_KEY" value={serverForm.geminiApiKey} onChange={(value) => updateServerField('geminiApiKey', value)} />
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Modelo de texto opcional
                  <input value={serverForm.geminiTextModel} onChange={(event) => updateServerField('geminiTextModel', event.target.value)} placeholder="gemini-2.0-flash" className={INPUT_CLASS} />
                </label>
              </IntegrationSection>

              <IntegrationSection label="Telegram" description="Bot e canal de notificações" configured={Boolean(config?.telegramConfigured)} icon={Send}>
                <SecretField label="TELEGRAM_BOT_TOKEN" value={serverForm.telegramBotToken} onChange={(value) => updateServerField('telegramBotToken', value)} />
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                  TELEGRAM_CHAT_ID
                  <input value={serverForm.telegramChatId} onChange={(event) => updateServerField('telegramChatId', event.target.value)} placeholder="Ex.: -1001234567890" className={INPUT_CLASS} />
                </label>
              </IntegrationSection>

              <IntegrationSection label="Instagram / Meta" description="OAuth, publicação e analytics" configured={Boolean(config?.instagramConfigured || config?.metaOAuthConfigured)} icon={Camera}>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                  META_APP_ID
                  <input value={serverForm.metaAppId} onChange={(event) => updateServerField('metaAppId', event.target.value)} className={INPUT_CLASS} />
                </label>
                <SecretField label="META_APP_SECRET" value={serverForm.metaAppSecret} onChange={(value) => updateServerField('metaAppSecret', value)} />
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                  URL de retorno OAuth
                  <input type="url" value={serverForm.metaRedirectUri} onChange={(event) => updateServerField('metaRedirectUri', event.target.value)} placeholder="http://localhost:3000/api/meta/oauth/callback" className={INPUT_CLASS} />
                </label>
                <SecretField label="APP_ENCRYPTION_KEY" value={serverForm.appEncryptionKey} onChange={(value) => updateServerField('appEncryptionKey', value)} placeholder="Chave usada para criptografar tokens" />
                <a href="/api/meta/oauth/start" className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${config?.metaOAuthConfigured ? 'bg-gradient-to-r from-pink-500 to-violet-600 text-white' : 'pointer-events-none bg-slate-800 text-slate-500'}`}>
                  <Camera className="size-4" /> {config?.metaOAuthConfigured ? 'Conectar conta Meta' : 'Salve META_APP_ID e META_APP_SECRET'}
                </a>
              </IntegrationSection>

              <IntegrationSection label="Hugging Face" description="Modelos auxiliares" configured={Boolean(config?.huggingFaceConfigured)} icon={KeyRound}>
                <SecretField label="HUGGING_FACE_TOKEN" value={serverForm.huggingFaceToken} onChange={(value) => updateServerField('huggingFaceToken', value)} />
              </IntegrationSection>

              <IntegrationSection label="Autenticação" description="Clerk, login e perfis" configured={Boolean(config?.authenticationConfigured)} icon={LockKeyhole}>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
                  <input value={serverForm.clerkPublishableKey} onChange={(event) => updateServerField('clerkPublishableKey', event.target.value)} placeholder="pk_..." className={INPUT_CLASS} />
                </label>
                <SecretField label="CLERK_SECRET_KEY" value={serverForm.clerkSecretKey} onChange={(value) => updateServerField('clerkSecretKey', value)} />
                <p className="text-[11px] leading-5 text-amber-400/90">Requer reiniciar a aplicação para ativar o login.</p>
              </IntegrationSection>

              <IntegrationSection label="PostgreSQL" description="Prisma, clientes, posts e auditoria" configured={Boolean(config?.databaseConfigured)} icon={Database}>
                <SecretField label="DATABASE_URL" value={serverForm.databaseUrl} onChange={(value) => updateServerField('databaseUrl', value)} placeholder="postgresql://usuario:senha@host/banco" />
                <p className="text-[11px] leading-5 text-slate-500">Depois de conectar um banco vazio, execute <code className="rounded bg-slate-800 px-1.5 py-0.5 text-cyan-300">pnpm db:deploy</code>.</p>
              </IntegrationSection>

              <IntegrationSection label="Object storage" description="Imagens e vídeos no Vercel Blob" configured={Boolean(config?.objectStorageConfigured)} icon={HardDrive}>
                <SecretField label="BLOB_READ_WRITE_TOKEN" value={serverForm.blobReadWriteToken} onChange={(value) => updateServerField('blobReadWriteToken', value)} />
              </IntegrationSection>
            </fieldset>

            {!config?.serverConfigWritable ? (
              <p className="mx-4 mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-300">
                Em produção, configure estes valores nas variáveis de ambiente do provedor e faça um novo deploy.
              </p>
            ) : null}

            {serverMessage ? (
              <p role="status" className={`mx-4 mb-4 rounded-xl border px-4 py-3 text-sm ${serverMessage.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/30 bg-rose-500/10 text-rose-300'}`}>
                {serverMessage.text}
              </p>
            ) : null}

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/40">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500"><ShieldCheck className="size-4 text-emerald-400" /> Admin e armazenamento local seguro</span>
              <button type="submit" disabled={serverSaving || !config?.serverConfigWritable} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">
                {serverSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {serverSaving ? 'Salvando…' : 'Salvar integrações'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
