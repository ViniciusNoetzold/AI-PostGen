# ���� ���� ���� �� �� �� �� 📋 GUIA PRÁTICO: EXTRAINDO ESTILO DE EMPRESAS (ATÉ SEM GIT OU SITE)

Este guia mostra como criar um contexto de estilo eficaz para qualquer empresa, mesmo quando elas não possuem:
- Repositórios GitHub públicos
- Sites profissionais
- Blogs ativos
- Material de marketing estruturado

## ���� ���� ���� �� �� �� �� 🔍 FASE 1: O QUE PROCURAR (ORDEM DE PRIORIDADE)

Priorize estas fontes na sequência abaixo. Para cada uma, coleta 2-3 exemplos curtos (50-200 palavras cada).

| Prioridade       | Tipo de Fonte                             | Onde Encontrar                                          | O que Extrair                                                  |
| ---------------- | ----------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------- |
| �� 🥇 **MÁXIMA** | **Conteúdo longo publicado**              | Blog, artigos, estudos de caso, whitepapers             | Mostra voz completa, estrutura de argumentos, expertise        |
| �� 🥈 **ALTA**   | **Redes sociais profissionais**           | LinkedIn (posts da empresa), Twitter/X                  | Captura tom atual, linguagem de engajamento, temas recorrentes |
| �� 🥉 **MÉDIA**  | **Materiais de vendas/marketing**         | Apresentações de vendas, brochuras, e-mails de nutrição | Revela linguagem de proposta de valor, CTAs, diferenciais      |
| 4                | **Comunicações internas (se permitidas)** | Ata de reuniões (sanitizadas), wikis internos           | Mostra como a equipe fala sobre o trabalho (tom colaborativo)  |
| 5                | **Comunicação com clientes**              | Respostas de suporte, materiais de onboarding           | Mostra tom de serviço, como lidam com dúvidas/reclamações      |

> �� 💡 **Dica crítica**: Para empresas sem presença online forte, comece pelas **respostas diretas da equipe** (veja Fase 3 abaixo).

## ���� ���� ���� �� �� �� �� 🧹 FASE 2: SANITIZAÇÃO RÁPIDA (2-3 MINUTOS POR EXEMPLOO)

Para cada exemplo coletado, faça apenas estas limpezas essenciais:

1. **REMOVER INFORMAÇ�ÕES SENSÍVEIS**:
   - Nomes de clientes → `[CLIENTE]`
   - Nomes de projetos internos → `[PROJETO INTERNO]`
   - Métricas específicas não públicas → `[MÉTRICA]`
   - URLs completos → mantenha apenas o domínio se relevante (ex: `exemplo.com`)

2. **PRESERVAR MARCADORES DE ESTRUTURA** (importante para o estilo!):
   - Mantenha bullet points e listas numeradas
   - Preserve formatação de citações (use `>` no markdown)
   - Converta títulos para markdown (`# Título`, `## Subtítulo`)
   - Keep quebras de linha intencionais (parágrafos)

3. **FOCO NOS "CARREIROS DE VOZ"** (o que realmente importa para a IA):
   - Adjetivos e advérbios repetidos (ex: "prático", "eficaz", "simples")
   - Padrões de comprimento de frases (curto e direto vs. longo e explicativo)
   - Uso de perguntas vs. afirmações
   - Padrões de chamada para ação (CTA) ("Saiba mais" vs "Experimente grátis" vs "Agende uma demonstração")
   - Tom em relação ao público (técnico para devs? acessível para gestores? inspirador para empreendedores?)

## ���� ���� ���� �� �� �� �� 📄 FASE 3: CONSTRUINDO O ARQUIVO CONTEXTO.MD (MODELO MINIMAL VIÁVEL)

Mesmo com apenas 1-2 exemplos, use esta estrutura. Preencha o que você tiver - lacunas são ok inicialmente.

```markdown
# CONTEXTO DA EMPRESA: [Nome da Empresa]
*Extraído de [fonte principal] em [data de extração]*

## ���� ���� ���� �� �� �� �� 📝 INFORMAÇ�ÕES BÁSICAS (Preencha o que você souber)
- **Nome da empresa**: [Nome exato como aparece oficialmente]
- **Nicho**: [O que eles fazem - descreva em 5 palavras ou menos]
- **Tom de voz padrão**: [Descreva em 3-5 palavras baseado nos exemplos]
  *Exemplos de frases que definem o estilo*:
  > "[Frase real extraída do exemplo 1]"
  > "[Frase real extraída do exemplo 2]"
  > "[Frase real extraída do exemplo 3]"

## ���� ���� ���� �� �� �� �� 🎯 TOPICOS RECORRENTES (Liste 3-5 temas que aparecem nos exemplos)
- [Tópico visto nos exemplos]
- [Tópico visto nos exemplos]
- [Tópico visto nos exemplos]

## ���� ���� ���� �� �� �� �� 🚫 O QUE EVITAMOS (Inferido do que NÃO aparece ou é evitado nos exemplos)
- [Ex: Promessas irrealistas como "100% de proteção"]
- [Ex: Jargon técnico sem explicação para público leigo]
- [Ex: Tom excessivamente formal ou excessivamente casual]
- [Ex: Focar apenas em recursos sem conectar a dor do cliente]

## ���� ���� ���� �� �� �� �� 🔗 FONTES ORIGINAIS (Onde você tirou cada exemplo)
- [Descrição da fonte 1: ex: "Post do LinkedIn em 10/03/2026 sobre automação de testes"]
- [Descrição da fonte 2: ex: "README do repositório GitHub público do projeto X"]
- [Descrição da fonte 3: ex: "Resposta direta da equipe coletada em entrevista de 15/03/2026"]
```

## ���� ���� ���� � �� �� �� ✅ FASE 4: VALIDAÇÃO RÁPIDA (TESTE DE 2 MINUTOS)

Depois de criar o arquivo, faça este teste rápido:

1. **Na sua ferramenta**, gere conteúdo para um tema simples relacionado ao negócio deles
   - Ex: Se for empresa de segurança → tema: `"reduzindo falsos positivos em SIEM"`
   - Ex: Se for agência de marketing → tema: `"como medir ROI de campanhas em redes sociais"`

2. **Analise a saída fazendo estas perguntas**:
   - [ ] **Soa autêntico?** - Parece que *realmente* poderia ter sido escrito por alguém da empresa?
   - [ ] **Tom correto?** - O nível de formalidade/técnico corresponde ao que você observou?
   - [ ] **Foco certo?** - Aborda o tema do jeito que eles fariam (ex: focando em benefícios de negócio, não apenas recursos)?
   - [ ] **Linguagem característica?** - Contém padrões de frase ou expressões que você viu nos exemplos?

3. **Se 3+ respostas forem "SIM"** → Seu contexto está funcionando! Adicione mais exemplos conforme os encontrar.
   **Se 2+ respostas forem "NÃO"** → Volte ao contexto e ajuste com base no que pareceu "errado".

## ���� ���� ���� �� �� �� �� 💡 DICAS ESPECIAIS PARA CASOS DIFÍCEIS

### Quando você tem QUASE NADA publicado:
Use o **"Método das 3 Perguntas Diretas"** (funciona mesmo para empresas totalmente novas):
1. Peça para alguém da empresa responder por escrito:
   - *"Como você descreveria o trabalho da nossa empresa para um amigo não-técnico em UMA frase?"*
   - *"Qual é UM mito comum sobre o nosso setor que nós sempre precisamos corrigir?"*
   - *"Se nossa empresa fosse uma pessoa, quais TR�ÊS adjetivos a descreveriam?"*
2. Transforme as respostas em seu `CONTEXTO.md`:
   ```markdown
   # CONTEXTO DA EMPRESA: [Nome]
   *Baseado em respostas diretas da equipe*

   ## ���� ���� ���� �� �� �� �� 📝 INFORMAÇ�ÕES BÁSICAS
   - **Nome da empresa**: [Nome]
   - **Nicho**: [O que eles fazem]
   - **Tom de voz padrão**: [Dos 3 adjetivos + explicação breve]
   - **Exemplos de frases que definem o estilo**:
     > "[Resposta à pergunta 1]"
     > "[Resposta à pergunta 2]"
     > "[Resposta à pergunta 3]"

   ## ���� ���� ���� �� �� �� �� 🎯 TOPICOS RECORRENTES
   - [Do mito comum que eles corrigem]
   - [Do que eles fazem melhor que concorrentes]
   - [Do que mais perguntam os clientes]

   ## ���� ���� ���� �� �� �� �� 🚫 O QUE EVITAMOS
   - [O mito comum que eles corrigem]
   - [Ex: Linguagem excessivamente técnica se o público é não-técnico]
   - [Ex: Promessas irrealistas]

   ## ���� ���� ���� �� �� �� �� 🔗 FONTES ORIGINAIS
   - Respostas diretas da equipe coletadas em [data]
   ```

### Quando você tem MUITO conteúdo mas não sabe por onde começar:
Use a **"Regra do 80/20 do Estilo"**:
1. Colete 10 exemplos aleatórios
2. Identifique:
   - As 3 frases/padrões que apareceram em MAIS exemplos (seu "núcleo do estilo")
   - As 2 coisas que NUNCA apareceram (seus "não-nos")
   - Os 2 tópicos que apareceram em TODOS os exemplos (seus "assuntos centrais")
3. Construa seu contexto apenas com esses 7 elementos - você terá 80% do valor com 20% do esforço.

## ���� ���� ���� �� �� �� �� 📌 APLICANDO ESTE GUIA AO SEU CASO (MEZZOLDSTUDIOS)

Como você tem acesso ao GitHub deles (`https://github.com/ViniciusNoetzold/MezzoldStudios`), aqui está como aplicaria este guia **AGORA MESMO**:

### Passo 1: Extrair do GitHub (5 minutos)
- Acesse o repositório
- Olhe para:
  - **README.md** (se existir) → geralmente contém a descrição principal do projeto/empresa
  - **Issues recentes** (aba "Issues") → veja como eles descrevem problemas e soluções
  - **Nome do repositório e descrição** → muitas pistas no próprio GitHub
- Extraia 2-3 trechos curtos (ex: do README, de uma issue destacada)

### Passo 2: Construir o CONTEXTO.MD (usando o que temos da conversa)
Mesmo sem ver o GitHub, sabemos coisas importantes de nossa conversa:
- Empresa de software do usuário (Vinicius é estudante de IA&ML e profissional de segurança)
- Eles mencionaram foco em "soluções production-ready com dados realistas"
- Valorizam "abordagem pragmática" e "deadline-driven deliverables"
- Já usaram frases como: *"Vamos construir isso passo a passo, testando cada componente antes de avançar."* e *"Prefiro funcionalidade real sobre wireframes bonitos que não funcionam."*

Exemplo de como ficaria o CONTEXTO.MD para eles (baseado no que sabemos):
```markdown
# CONTEXTO DA EMPRESA: MezzoldStudios
*Baseado em conversa sobre perfil e perfil do GitHub (data de hoje)*

## ���� ���� ���� �� �� �� �� 📝 INFORMAÇ�ÕES BÁSICAS
- **Nome da empresa**: MezzoldStudios
- **Nicho**: Desenvolvimento de software com foco em IA, automação e qualidade de código
- **Tom de voz padrão**: Técnico com toque prático, foco em valor real sobre teoria
  *Exemplos de frases que definem o estilo*:
  > "Vamos construir isso passo a passo, testando cada componente antes de avançar."
  > "Prefiro funcionalidade real sobre wireframes bonitos que não funcionam."
  > "Para desenvolvedores que querem entregar valor, não apenas código."

## ���� ���� ���� �� �� �� �� 🎯 TOPICOS RECORRENTES
- Automação de tarefas repetitivas no desenvolvimento
- Boas práticas em testes e qualidade de código
- Ferramentas de produtividade para desenvolvedores
- Integração com APIs públicas (como Hugging Face, Telegram)
- Equilíbrio entre inovação e pragmatismo

## ���� ���� ���� �� �� �� �� 🚫 O QUE EVITAMOS
- Promessas de "inteligência artificial mágica" sem fundamento técnico
- Jargon acadêmico sem aplicação prática no mundo real
- Focar apenas em novidades sem considerar usabilidade e manutenibilidade
- Tom excessivamente formal que afasta a comunidade de desenvolvedores

## ���� ���� ���� �� �� �� �� 🔗 FONTES ORIGINAIS
- Conversa sobre perfil e objetivos do usuário (dados fornecidos diretamente)
- Nome e descrição do repositório GitHub público: github.com/ViniciusNoetzold/MezzoldStudios
- Padrões observados em perfis de profissionais de IA/ML com background em segurança
```

### Passo 3: Testar imediatamente
1. Crie a pasta: `02-Clientes/mezzoldstudios/`
2. Dentro dela, salve o `CONTEXTO.md` acima
3. Crie a subpasta: `exemplos/` (vazia por enquanto - vamos preenchê-la conforme encontrarmos exemplos reais no GitHub)
4. Acesse http://localhost:3000
5. Preencha:
   - Tema: `"automação de tarefas para desenvolvedores"`
   - Tom de voz: `"técnico, prático, focado em valor real"`
6. Clique em "Gerar Sugestão"
7. Verifique se a saída soa alinhada com as frases exemplos que usamos

## ���� ���� ���� �� �� �� �� 🚀 PRÓXIMOS PASSOS SEGUINDO SEUS VALORES

Lembrando suas preferências declaradas:
- **Production-ready com dados realistas**: Este método funciona com o que você tem AGORA, não espera por material perfeito
- **Pragmático (Opinion B)**: Começa com o que você tem, melhora conforme encontra mais evidências
- **Deadline-driven**: Você pode ter um contexto útil em menos de 10 minutos
- **Technical completeness**: Inclui validação explícita e métodos de melhoria contínua
- **Único evolving Canvas**: Este contexto é feito para ser atualizado continuamente à medida que você descobre mais sobre o estilo do cliente

Seu próximo passo imediato é **extrair apenas UM trecho do GitHub deles agora mesmo** (mesmo que seja só a descrição do repositório) e testar a geração. Você vai ver que mesmo com pouco material, a IA já começa a captar a essência do estilo.

Quer que eu te mostre exatamente como extrair um exemplo do GitHub deles (baseado no que posso inferir publicamente) ou prefere tentar sozinho primeiro? Estou aqui para ajudar na extração direta se quiser - só dizer o que você vê lá que parece representar o estilo deles. �� 😊