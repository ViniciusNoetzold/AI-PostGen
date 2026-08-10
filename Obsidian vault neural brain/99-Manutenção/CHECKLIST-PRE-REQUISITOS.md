# � ✅ CHECKLIST DE PRÉ-REQUISITOS PARA INÍCIO DO PROJETO
*Versão 1.0 • Última atualização: $(datetime current ISO 8601)*  
*Parte do "cérebro do projeto" para a ferramenta de IA para Instagram*  
*Status: [[em-andamento]] • Link rápido: [[Índice do Projeto]]*

---

## �� 🎯 OBJETIVO
Esta checklist valida que **todos os elementos essenciais** estão configurados antes de iniciar qualquer desenvolvimento.  
Marcar um item como concluído apenas após **verificação prática** (não apenas leitura).  
*Inspirado na sua abordagem de "cérebro do projeto" – tudo vinculado, nada solto.*

---

## �� 📋 ESTRUTURA DO VAULT OBSIDIANO (RAIZ: `E:\App Automação Meta\Obsidian vault neural brain`)
> *Mantenha esta estrutura exatamente como descrita. Use [[Wikilinks]] para navegação.*

| Pasta | Propósito | Conteúdo mínimo exigido | Link |
|-------|-----------|-------------------------|------|
| `00-Índice/` | Navegação central | `INDEX.md` com links para todas as seções principais | [[00-Índice/INDEX.md]] |
| `01-Projeto/` | Documentação do projeto ativo | `PLANO-ESTRATÉGICO.md`, `REQUISITOS-FUNCIONAIS.md`, `TIMELINE.md` | [[01-Projeto/]] |
| `02-Clientes/` | Contexto por cliente (multi-tenant) | `TEMPLATE-CLIENTE.md` + pelo menos 1 pasta de teste (ex: `TESTE-MEU-NEGOCIO/`) | [[02-Clientes/]] |
| `03-Técnico/` | Especificações de implementação | `ARQUITETURA.md`, `APIS.md` (Meta Graph, HF, Telegram), `DEPLOY.md` | [[03-Técnico/]] |
| `04-Testes/` | Evidência de funcionalidades working | `PROMPT-IA-EXEMPLOS.md`, pasta `LOGS/` com capturas de testes iniciais | [[04-Testes/]] |
| `05-Recursos/` | Assets estáticos | Subpastas `ICONES/`, `TEMPLATES/` (pelo menos 1 placeholder em cada) | [[05-Recursos/]] |
| `99-Manutenção/` | Controle interno | **Este arquivo** (`CHECKLIST-PRE-REQUISITOS.md`), `LOG-ALETERACOES.md` | [[99-Manutenção/]] |

> �� 💡 **Dica de manutenção**: Toda vez que modificar esta estrutura, registre em `99-Manutenção\LOG-ALETERACOES.md` com formato:  
> `- [DATA] Alteração: [descrição] • Responsável: [seu nome]`

---

## �� 🔑 CONTAS E TOKENS NEGOCIÁVEIS (FAZER PRIMEIRO)
> *Estes são bloqueadores – sem eles, não é possível testar o núcleo da IA ou notificações hoje.*

| Item | Onde obter | Como validar | Link de referência |
|------|------------|--------------|---------------------|
| **App no Meta for Developers** | [developers.facebook.com](https://developers.facebook.com/) → "Meus Apps" → "Criar Novo App" → Tipo: **Negócio** | 1. App ID e App Secret visíveis no painel<br>2. Produto "Instagram Graph API" adicionado (mesmo que não aprovado ainda) | [[03-Técnico/APIS.md#meta-graph-api]] |
| **Token Hugging Face** | [hf.co/settings/tokens](https://huggingface.co/settings/tokens) → "New token" → Scope: **read** | 1. Token começa com `hf_`<br>2. Teste rápido: `curl -H "Authorization: Bearer SEU_TOKEN" https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2 -d '{"inputs":"Olá"}'` retorna JSON válido | [[03-Técnico/APIS.md#huggingface]] |
| **Bot do Telegram** | Via @BotFather no Telegram → `/newbot` → Salve o token **com segurança** | 1. Bot responde a `/start`<br>2. Token salvo em local seguro **nunca** no código versionado (use `.env.local` depois) | [[03-Técnico/APIS.md#telegram]] |

> �� ⚠��️ **Critério de conclusão**: Todos os três links de referência acima devem apontar para arquivos existentes no seu vault com informações preenchidas.

---

## �� 💻 AMBIENTE DE DESENVOLVIMENTO LOCAL
> *Use exatamente estas versões para evitar "funciona na minha máquina".*

| Ferramenta  | Versão mínima           | Como validar                                                         | Observação                                                                                         |
| ----------- | ----------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Node.js** | `>=18.17.0`             | `node --version` → saída deve ser `v18.x.x` ou superior              | Recomendado: usar [nvm-windows](https://github.com/coreybutler/nvm-windows) para gerenciar versões |
| **pnpm**    | `>=8.0.0`               | `pnpm --version` → saída deve ser `8.x.x` ou superior                | Instalar via: `corepack enable` puis `corepack prepare pnpm@8.15.6 --activate`                     |
| **Git**     | `>=2.30.0`              | `git --version` → saída deve mostrar versão suportada                | Configurar `user.name` e `user.email` globalmente (`git config --global`)                          |
| **VS Code** | Qualquer versão recente | Abrir o projeto no code não deve mostrar erros de extensão essencial | Extensões recomendadas: `ESLint`, `Prettier`, `Tailwind CSS IntelliSense`                          |

> � ✅ **Critério de conclusão**: Rode `node --version && pnpm --version && git --version` no terminal e capture a saída em `04-Testes/LOGS/AMBIENTE-VALIDADO.log`.

---

## �� 🧠 PREPARAÇÃO DO CONTEXTO DO CLIENTE (VAULT NEURAL BRAIN)
> *Isso é o que torna sua IA "personalizada" – sem contexto bom, a IA é genérica.*

1. **Crie o template de cliente** (se ainda não existir):  
   - Arquivo: `02-Clientes/TEMPLATE-CLIENTE.md`  
   - Conteúdo mínimo obrigatório:
     ```markdown
     # TEMPLATE DE CONTEXTO DO CLIENTE
     *Use este modelo para cada novo cliente. Nunca deixe campos vazios.*

     ## �� 📝 INFORMAÇ�ÕES BÁSICAS
     - **Nome do cliente**: [Ex: Lanchonete do Zé]
     - **Nicho**: [Ex: Alimentação rápida]
     - **Tom de voz padrão**: [Ex: Descontraído, com gírias locais, máximo 20 palavras por frase]
     - **Palavras-chave proibidas**: [Ex: "promoção", "desconto" – se não alinhar com marca]
     - **Exemplos de frases que definem o estilo**:
       > "Hoje o prato é feito com amor e pimenta malagueta – vem provar?"
       > "Não somos fast food, somos comida de verdade feita rápido."

     ## �� 🎯 TOPICOS RECORRENTES (PARA RAG)
     - [Ex: Higiene na cozinha]
     - [Ex: História do ingrediente X]
     - [Ex: Depoimento de cliente fiel]
     ```

2. **Crie uma pasta de teste para você mesmo** (primeiro cliente):  
   - Pasta: `02-Clientes/TESTE-MEU-NEGOCIO/`  
   - Dentro dela:  
     - Copie `TEMPLATE-CLIENTE.md` → renomeie para `CONTEXTO.md`  
     - Preencha com **seus próprios dados** (seja honesto sobre tom e tópicos)  
     - Adicione 2-3 arquivos `.md` de exemplo com conteúdo real que você já produziu (ex: rascunhos de posts antigos, anotações de estratégia)  
     - **Vincule estes arquivos** usando `[[Wikilinks]]` dentro do `CONTEXTO.md`

3. **Validação do contexto**:  
   - Abra `02-Clientes/TESTE-MEU-NEGOCIO/CONTEXTO.md`  
   - Verifique que:  
     - Todos os campos do template estão preenchidos com informações reais  
     - Pelo menos dois `[[Wikilinks]]` apontam para arquivos `.md` existentes na mesma pasta  
     - Nenhuma seção está marcada como `[Ex: ...]` (substitua tudo por conteúdo real)

> �� 📌 **Critério de conclusão**:  
> - `02-Clientes/TEMPLATE-CLIENTE.md` existe e está completa  
> - `02-Clientes/TESTE-MEU-NEGOCIO/CONTEXTO.md` está preenchido com seus dados reais  
> - Pelo menos dois arquivos `.md` de exemplo estão vinculados via `[[Wikilinks]]` no contexto

---

## �� 🚀 VALIDAÇÃO INICIAL DO FLUXO (ANTES DE CODIGAR)
> *Teste se os blocos fundamentais "conversam" antes de investir tempo no código.*

| Teste | Como fazer | Onde registrar resultado |
|-------|------------|---------------------------|
| **1. Conexão com Hugging Face** | No terminal: <br>`curl -H "Authorization: Bearer SEU_HF_TOKEN" https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2 -d '{"inputs":"Resuma em 10 palavras: inteligência artificial"}'` | Salve a resposta JSON bruta em `04-Testes/LOGS/HF-TESTE.log` |
| **2. Busca no vault (simulação RAG)** | No terminal (dentro da raiz do vault): <br>`find . -name "*.md" -not -path "./.obsidian/*" -exec grep -l "tom de voz" {} \; ;` <br>(Deve retornar ao menos `02-Clientes/TESTE-MEU-NEGOCIO/CONTEXTO.md`) | Registre a saída exata em `04-Testes/LOGS/RAG-BUSCA-TESTE.log` |
| **3. Webhook do Telegram (opcional mas recomendado)** | Envie `/start` para seu bot via Telegram <br>→ Deve responder com mensagem personalizada que você configurou no @BotFather | Faça print do chat e salve em `04-Testes/LOGS/TELEGRAM-BOT-TESTE.png` |

> � ✅ **Critério de conclusão**:  
> - Todos os três logs acima existem na pasta `04-Testes/LOGS/`  
> - Nenhum contém mensagens de erro explícitas (ex: `401 Unauthorized`, `Connection refused`)  
> - O teste do HF retorna um texto resumido coerente (mesmo que não perfeito)

---

## �� 📌 PRÓXIMOS PASSOS APÓS ESTE CHECKLIST
> *Só avance para o desenvolvimento quando **TODOS** os checkboxes acima estiverem marcados como concluídos.*

1. **Vá para a pasta do código**:  
   ```bash
   cd /e/App Automação Meta
   ```
2. **Inicialize o projeto Next.js** (use seu stack preferido):  
   ```bash
   pnpm create next-app@latest . --ts --tailwind --eslint --app --import-alias "@/*"
   ```
3. **Copie o template de variáveis de ambiente**:  
   ```bash
   cp .env.example .env.local
   ```
4. **Preencha `.env.local` com**:  
   ```env
   NEXT_PUBLIC_HF_TOKEN=seu_token_hf_aqui
   TELEGRAM_BOT_TOKEN=seu_token_telegram_aqui
   # (Adicione Meta App ID/Secret depois quando for testar Graph API real)
   ```
5. **Registre o início do desenvolvimento em**:  
   `01-Projeto\TIMELINE.md` com entrada:  
   ```markdown
   - [DATA] Início do desenvolvimento: ambiente validado, checklist de pré-requisitos concluído. Próximo: setup do Next.js + rota básica de geração de IA.
   ```

> �� 💡 **Lembrete**: Sempre que concluir uma tarefa significativa (mesmo que pequena), atualize:  
> - Este arquivo (`CHECKLIST-PRE-REQUISITOS.md`) se for um pré-requisito  
> - `01-Projeto\TIMELINE.md` para o histórico  
> - `99-Manutencao\LOG-ALETERACOES.md` se mudar estruturas do vault

---

## �� 📎 ANEXOS ÚTEIS
- [[01-Projeto/PLANO-ESTRATÉGICO.md]] – Visão geral de objetivos e métricas de sucesso  
- [[03-Técnico/APIS.md]] – Detalhes de integração com Meta Graph, Hugging Face, Telegram  
- [[04-Testes/PROMPT-IA-EXEMPLOS.md]] – Exemplos de prompts que funcionaram bem em testes iniciais  
- Modelo de commit mensage (adapte ao seu gosto):  
  `feat(cliente:teste): adiciona contexto inicial para [nome]`

---
*Este documento é parte viva do seu cérebro do projeto. Revise-o semanalmente ou sempre que sentir que algo ficou obsoleto.*  
*Última validação feita por: [Seu nome] em [Data atual]*  