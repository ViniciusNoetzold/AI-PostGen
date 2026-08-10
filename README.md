# AI PostGen - Automação Meta & Obsidian

Este é um sistema completo para geração de posts (com imagens e textos longos otimizados para Instagram) gerenciados através de uma base de conhecimento no **Obsidian** e integração direta com as APIs do Facebook/Instagram e modelos de IA (HuggingFace, Gemini, etc.).

## 🚀 Como Usar em Outro Computador

Como todo o sistema, incluindo o cofre (vault) do Obsidian e as variáveis de ambiente, estão neste repositório, os passos para iniciar em um novo computador são muito simples:

### Pré-requisitos
- Ter o [Node.js](https://nodejs.org/) instalado.
- Ter o [PNPM](https://pnpm.io/) instalado (`npm install -g pnpm`).
- Ter o [Obsidian](https://obsidian.md/) instalado (opcional, para visualizar os arquivos nativamente, mas não obrigatório para a aplicação rodar).

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/ViniciusNoetzold/AI-PostGen.git
   cd AI-PostGen/webapp
   ```

2. **Instale as dependências:**
   ```bash
   pnpm install
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   pnpm run dev
   ```

4. **Configuração Inicial na Aplicação:**
   - Acesse o sistema através do navegador em `http://localhost:3000`.
   - Clique no **ícone de engrenagem no canto superior direito**.
   - No modal de Configuração Global, aponte o **Caminho do Vault** para a pasta `Obsidian vault neural brain` que está dentro do repositório (ex: `C:\Seu\Caminho\AI-PostGen\webapp\Obsidian vault neural brain`).
   - Insira o Token de Acesso da Meta e o ID da Conta (caso não estejam preenchidos) e clique em **Salvar Configurações**.

## 🧠 Estrutura do Vault (Obsidian)

A pasta `Obsidian vault neural brain` contém toda a estrutura de clientes e a base de conhecimento. 
Sempre que o sistema gerar novos posts ou você criar novos resumos de clientes, eles serão salvos/lidos dessa pasta.

```
Obsidian vault neural brain/
├── 02-Clientes/
│   ├── Nome do Cliente/
│   │   ├── 04-Posts_Gerados/ (Posts salvos em Markdown)
│   │   ├── 05-Imagens_Geradas/ (Imagens geradas pela IA)
```

## ⚙️ Tecnologias Utilizadas

- **Next.js (App Router)** - Framework React Fullstack.
- **Hugging Face / Gemini API** - Modelos para criação do texto e imagem.
- **Meta Graph API** - Para publicação direta de posts únicos e carrosséis no Instagram.
- **React Force Graph 2D** - Visualização Neural (semelhante ao gráfico do Obsidian) do estado atual do seu Vault.
- **Recharts** - Painéis de análises estatísticas.
- **Tailwind CSS** - Estilização moderna.

## 🔒 Variáveis de Ambiente e Segurança
O arquivo `.env` está incluído no repositório (conforme solicitado). **Certifique-se de que o repositório no GitHub esteja configurado como PRIVADO**, já que essas chaves podem permitir acesso indevido se vazarem.

## Contribuição
Para adicionar novos clientes, basta criar uma nova pasta dentro de `02-Clientes` no vault do Obsidian. O sistema fará a varredura e adaptação de voz automaticamente de acordo com as notas lá descritas.
