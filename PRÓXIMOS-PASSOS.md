# Próximos Passos para Testar a Ferramenta

## � ✅ O que já está pronto
- **Estrutura do vault Obsidian** criada em `E:\App Automação Meta\Obsidian vault neural brain` com:
  - Checklist de pré-requisitos (`99-Manutenção\CHECKLIST-PRE-REQUISITOS.md`)
  - Template de cliente e pasta de teste (`02-Clientes\TESTE-MEU-NEGOCIO\`)
  - Pastas de organização (projeto, técnico, testes, recursos, manutenção)
- **Projeto Next.js** inicializado em `E:\App Automação Meta\webapp` com:
  - Rota de API `/api/generate` que busca contexto no vault e usa Hugging Face para gerar sugestões de post
  - Página inicial (`app/page.tsx`) com formulário para inserir tema e tom de voz
  - Arquivo `.env.example` (copie para `.env.local` e preencha)
  - Dependências instaladas: `next`, `react`, `axios`, `tailwindcss`, etc.

## �� 🔑 O que você precisa fazer agora
1. **Obter um token gratuito do Hugging Face**:
   - Acesse https://huggingface.co/settings/tokens
   - Clique em "New token" → nomeie ex: `instagram-poster-test` → escopo: `read`
   - Copie o token (começa com `hf_`)

2. **Configurar as variáveis de ambiente**:
   - Copie `.env.example` para `.env.local` (se ainda não fez)
   - Substitua:
     ```env
     NEXT_PUBLIC_HF_TOKEN=seu_token_hf_aqui
     TELEGRAM_BOT_TOKEN=seu_token_telegram_aqui
     ```
     Por:
     ```env
     NEXT_PUBLIC_HF_TOKEN=hf_seu_token_real_aqui
     # TELEGRAM_BOT_TOKEN pode ficar vazio por enquanto (não é necessário para teste da IA)
     ```

3. **Testar a geração de conteúdo**:
   - Certifique-se de que o servidor de desenvolvimento está rodando (ele já está em background a partir do comando anterior)
   - Acesse http://localhost:3000
   - Preencha:
     - **Tema do post**: `teste de automação`
     - **Tom de voz**: `didático e motivacional`
   - Clique em "Gerar Sugestão"
   - Aguarde alguns segundos (a primeira chamada pode levar 10-20s enquanto o modelo carrega na HF)
   - Você deve ver uma sugestão gerada com legenda, hashtags, menções e descrição top

4. **(Opcional) Configurar notificação via Telegram**:
   - Converse com @BotFather no Telegram e envie `/newbot`
   - Siga os passos para criar um bot e obtenha o token
   - Adicione no `.env.local`: `TELEGRAM_BOT_TOKEN=seu_token_real`
   - Vamos implementar a função de notificação nos próximos passos

## �� 📝 Próximos desenvolvimentos sugeridos
Quando você confirmar que a geração de IA está funcionando, podemos avançar para:
1. **Implementar notificação por Telegram** quando a sugestão estiver pronta
2. **Adicionar upload de imagem** (ou sugestão de prompt para geradores de imagem gratuitos como Craiyon)
3. **Criar modo de agendamento** (salvar em fila local para processamento posterior)
4. **Implementar modo "preview seguro"** para o Instagram Graph API (quando sua conta dev Meta estiver aprovada)
5. **Adicionar autenticação de usuário** (para multi-tenancy real)

## �� 📌 Lembretes importantes
- Nunca commit seu `.env.local` (ele já está ignorado pelo `.gitignore` padrão do Next.js)
- O modo de busca no vault é simples (contagem de palavras) - para melhorar, podemos implementar embeddings mais sofisticados depois
- A primeira geração pode ser lenta; depois fica mais rápida devido ao cache da HF
- Teste com diferentes temas e tons para ver como o contexto do vault influencia o resultado

## �� 🚀 Pronto para começar?
Acesse http://localhost:3000 agora e tente gerar sua primeira sugestão!

Se encontrar algum erro, verifique:
- Se o token HF está correto no `.env.local`
- Se o servidor está rodando (proc_b82b589c882f ou similar)
- Se o vault está em `E:\App Automação Meta\Obsidian vault neural brain` (caminho relativo na rota é `../Obsidian vault neural brain`)