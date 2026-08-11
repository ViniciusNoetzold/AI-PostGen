# AI PostGen

Plataforma full-stack para criação, organização, aprovação, agendamento e publicação de conteúdo. O projeto combina inteligência artificial, CRM, calendário de conteúdo, integrações com Meta e Telegram e uma base de conhecimento compatível com Obsidian.

## Tecnologias

- Next.js 16.3 e React 19
- TypeScript e Tailwind CSS
- Prisma 7 e PostgreSQL
- Clerk para autenticação e RBAC
- Gemini e Hugging Face
- Meta Graph API e Telegram
- Vercel Blob para imagens e vídeos
- Upstash Redis para limites distribuídos
- Workflow DevKit para filas, aprovação e publicação agendada
- Vitest e Playwright

## Funcionalidades

- Geração de posts em vários idiomas, com modo aprofundado e carrossel.
- Vault de posts com busca, filtros, edição, arquivamento, preview e publicação.
- Product Studio para criação e edição de vídeos de produto.
- Dashboard com volumetria real do Vault ou PostgreSQL.
- CRM de pessoas e empresas com fotos, cargos, categorias e relacionamentos.
- Visualização da rede de clientes com zoom, pan e conexões interativas.
- Calendário de conteúdo com agendamento, aprovação e workflow durável.
- Relatórios, configurações centralizadas e status das integrações.
- APIs protegidas por autenticação, papéis, validação Zod, limites de payload e proteções contra SSRF e path traversal.

## PostgreSQL e Obsidian Vault

O projeto opera atualmente em modo híbrido:

- O **Obsidian Vault** mantém contexto editorial, arquivos Markdown, histórico compatível e informações usadas pelo grafo neural.
- O **PostgreSQL** armazena dados relacionais e duráveis: usuários, clientes, empresas, posts, mídia, aprovações, filas, métricas e auditoria.
- O **Object Storage** recebe arquivos de imagem e vídeo em produção.

O PostgreSQL complementa o Vault nesta fase; ele ainda não o substitui completamente.

## Instalação local

### Pré-requisitos

- Node.js 20 ou superior
- pnpm
- PostgreSQL opcional para os recursos duráveis
- Obsidian opcional para abrir visualmente o Vault

### Passos

```bash
git clone https://github.com/ViniciusNoetzold/AI-PostGen.git
cd AI-PostGen
pnpm install
```

Copie o modelo de ambiente e preencha somente no arquivo local:

```bash
cp .env.example .env.local
```

No PowerShell:

```powershell
Copy-Item .env.example .env.local
```

As integrações também podem ser configuradas em **Configurações → Integrações do servidor** durante o desenvolvimento local. Segredos preenchidos nessa tela não são devolvidos pela API.

Se utilizar PostgreSQL, aplique as migrações:

```bash
pnpm db:generate
pnpm db:deploy
```

Inicie a aplicação:

```bash
pnpm dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Variáveis de ambiente

O arquivo [.env.example](./.env.example) lista as variáveis suportadas para:

- Clerk
- PostgreSQL
- Vercel Blob
- Upstash Redis
- Gemini
- Hugging Face
- Telegram
- Meta OAuth
- criptografia e logs

Nunca versione `.env.local`, tokens, chaves privadas, arquivos de mídia locais ou dados reais do Vault. Em produção, configure os segredos diretamente no provedor de hospedagem.

## Scripts

```bash
pnpm dev          # desenvolvimento
pnpm build        # build de produção
pnpm lint         # ESLint
pnpm typecheck    # TypeScript
pnpm test         # testes unitários e de segurança
pnpm test:e2e     # testes de interface com Playwright
pnpm db:generate  # gera o Prisma Client
pnpm db:migrate   # cria migrações no desenvolvimento
pnpm db:deploy    # aplica migrações existentes
```

## Estrutura principal

```text
app/          Páginas e APIs do App Router
components/   Componentes compartilhados
lib/          Regras de negócio, segurança e integrações
prisma/       Schema e migrações PostgreSQL
workflows/    Filas e workflows duráveis
tests/        Testes unitários e de segurança
e2e/          Testes Playwright
```

## O que ainda falta ser feito

- Provisionar o PostgreSQL de produção, configurar `DATABASE_URL` e executar `pnpm db:deploy`.
- Importar ou reconciliar os posts existentes no Vault com o PostgreSQL e definir se o Vault permanecerá como espelho/exportação opcional no longo prazo.
- Provisionar o Clerk, configurar as chaves, validar cadastro/login e definir os papéis `viewer`, `editor`, `approver` e `admin` para os usuários reais.
- Provisionar Vercel Blob e configurar `BLOB_READ_WRITE_TOKEN` para persistência de imagens e vídeos em produção.
- Provisionar Upstash Redis para rate limiting distribuído em produção.
- Criar e revisar o aplicativo Meta, concluir o OAuth com uma conta real, validar renovação de tokens, publicação e analytics.
- Validar Telegram, Gemini, Hugging Face e os provedores de imagem/vídeo com credenciais e limites de produção.
- Integrar opcionalmente o Google Calendar como espelho da Agenda de Conteúdo e o Google Tasks para tarefas humanas de revisão.
- Configurar observabilidade de produção, alertas, retenção de auditoria e monitoramento dos workflows.
- Executar a suíte E2E completa em um ambiente com PostgreSQL, autenticação, storage e contas externas configuradas.
