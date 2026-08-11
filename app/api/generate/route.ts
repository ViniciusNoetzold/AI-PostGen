import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { promises as fs } from 'fs'
import path from 'path'
import { getVaultPath } from '../../utils/config'
import { authorizeRequest } from '@/lib/server/authorization'
import { generatePostSchema } from '@/lib/schemas/api'
import { validateJsonRequest } from '@/lib/server/security'
import { atomicWriteText } from '@/lib/server/atomic-files'
import { createPostRecord } from '@/lib/server/repository'
import { normalizeRole } from '@/lib/auth'
import { requestIdFrom } from '@/lib/server/logger'

// Server-only provider configuration. Never use NEXT_PUBLIC_ for credentials.
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

// Helper to send telegram message
async function sendTelegramNotification(message: string, imageBuffer?: Buffer) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('Telegram credentials not configured. Skipping notification.')
    return
  }
  
  try {
    if (imageBuffer) {
      const photoUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`
      const formData = new FormData()
      formData.append('chat_id', TELEGRAM_CHAT_ID)
      formData.append('photo', new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' }), 'image.jpg')
      
      await fetch(photoUrl, {
        method: 'POST',
        body: formData
      })
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message
      })
    })
  } catch (err) {
    console.error('Error sending Telegram message:', err)
  }
}

// Helper function to recursively find all .md files in a directory
async function findMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = []
  
  async function walk(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      
      if (entry.isDirectory()) {
        await walk(fullPath)
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath)
      }
    }
  }
  
  try {
    await walk(dir)
  } catch (err) {
    console.error(`Error walking directory ${dir}:`, err)
  }
  
  return files
}

// Helper function to search the vault for relevant context
async function searchVault(query: string): Promise<{context: string, clientFolder: string | null}> {
  try {
    const VAULT_PATH = await getVaultPath();
    const clientsDir = path.join(VAULT_PATH, '02-Clientes')
    
    // Get all client folders
    const clientFolders = await fs.readdir(clientsDir)
    
    // We'll look in each client folder for .md files (recursively)
    let bestMatch = ''
    let bestMatchClientFolder: string | null = null
    let highestScore = 0
    
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2)
    
    for (const clientFolder of clientFolders) {
      const clientPath = path.join(clientsDir, clientFolder)
      const stats = await fs.stat(clientPath)
      
      if (stats.isDirectory()) {
        // Recursively find all .md files in this client's folder
        const mdFiles = await findMarkdownFiles(clientPath)
        
        for (const filePath of mdFiles) {
          try {
            const content = await fs.readFile(filePath, 'utf-8')
            const lowerContent = content.toLowerCase()
            
            // Simple scoring: count occurrences of query words
            let score = 0
            for (const word of queryWords) {
              score += (lowerContent.match(new RegExp(word, 'g')) || []).length
            }
            
            if (score > highestScore) {
              highestScore = score
              bestMatch = content
              bestMatchClientFolder = clientFolder
            }
          } catch (err) {
            console.error(`Error reading file ${filePath}:`, err)
          }
        }
      }
    }
    
    // If we found something, return a snippet (first 2000 chars) to give more context
    if (bestMatch) {
      return { context: bestMatch.substring(0, 2000), clientFolder: bestMatchClientFolder }
    }
    
    return { context: "Nenhum contexto relevante encontrado no vault.", clientFolder: null }
  } catch (err) {
    console.error('Error searching vault:', err)
    return { context: "Erro ao buscar contexto no vault.", clientFolder: null }
  }
}

// Function to generate mock content directly without an LLM when API is down
interface LocaleCopy {
  title: string
  intro: string
  need: string
  ahead: string
  points: string
  p1: string
  p2: string
  p3: string
  cta: string
  tags: string
}

interface GeminiTextResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
  }>
}

function generateMockContent(prompt: string, isCarousel: boolean, lang: string = 'pt-BR'): string {
  console.log('Generating mock content (fallback)...')
  
  // Extract theme from prompt
  const themeMatch = prompt.match(/Tema do post:\s*"([^"]+)"/i)
  const theme = themeMatch ? themeMatch[1] : 'Tema Desconhecido'
  
  // Language mappings
  const locales: Record<string, LocaleCopy> = {
    'pt-BR': {
      title: 'está transformando o mercado. Você está preparado?',
      intro: 'Vivemos em uma era em que',
      need: 'deixou de ser diferencial e passou a ser necessidade.',
      ahead: 'As empresas que entendem isso primeiro saem na frente — e as que ignoram ficam para trás.',
      points: '3 pontos que você precisa saber sobre',
      p1: 'A velocidade de adoção define quem lidera o setor',
      p2: 'Dados e estratégia andam juntos — não existe um sem o outro',
      p3: 'O foco no cliente nunca foi tão importante quanto agora',
      cta: 'Qual desses pontos faz mais sentido para o seu momento atual? 👇 Deixe nos comentários!',
      tags: '#Inovacao #Estrategia #Negocios #Tendencias'
    },
    'en-US': {
      title: 'is transforming the market. Are you ready?',
      intro: 'We live in an era where',
      need: 'is no longer a differentiator, but a necessity.',
      ahead: 'Companies that understand this first take the lead — and those that ignore it fall behind.',
      points: '3 things you need to know about',
      p1: 'Adoption speed defines who leads the sector',
      p2: 'Data and strategy go hand in hand — there is no one without the other',
      p3: 'Customer focus has never been as important as it is now',
      cta: 'Which of these points makes the most sense for you right now? 👇 Leave a comment!',
      tags: '#Innovation #Strategy #Business #Trends'
    }
  }
  
  const l = locales[lang] || locales['pt-BR']

  let mockText = `🚀 ${theme} ${l.title}

${l.intro} ${theme.toLowerCase()} ${l.need}

${l.ahead}

🎯 ${l.points} ${theme}:

1️⃣ ${l.p1}
2️⃣ ${l.p2}
3️⃣ ${l.p3}

${l.cta}

${l.tags} #${theme.replace(/\s+/g, '')}
[Menções: @exemplo1 @exemplo2]`

  if (isCarousel) {
    mockText += `\n\n[Prompt de Imagem 1: Minimalist vector illustration showing a rocket taking off, flat design, solid blue background, clean corporate style, modern aesthetics]
[Prompt de Imagem 2: Clean infographic layout showing a chart with an upward trend, high quality graphic design, solid orange background, vector style]
[Prompt de Imagem 3: Conceptual illustration of people working together around a digital interface, flat design, minimalist, clean lines, professional corporate look]`
  } else {
    mockText += `\n\n[Prompt de Imagem: Minimalist graphic design related to ${theme.replace(/[^a-zA-Z0-9 ]/g, '')}, flat vector illustration, clean corporate aesthetic, solid pastel background, high quality, highly professional layout]`
  }
  
  return mockText
}

// Generate text with Google Gemini
async function generateTextWithGemini(prompt: string, maxTokens: number): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing')
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`
  
  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: maxTokens,
    }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini text API error ${res.status}: ${err.substring(0, 200)}`)
  }

  const data = (await res.json()) as GeminiTextResponse
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (text) return text
  
  throw new Error('Unexpected empty response from Gemini text API')
}

// Generate text with HF fallback
async function generateText(prompt: string, maxTokens: number = 500, isCarousel = false, language = 'pt-BR'): Promise<string> {
  try {
    return await generateTextWithGemini(prompt, maxTokens)
  } catch (err) {
    console.warn('Gemini text generation failed — using mock content:', err)
    return generateMockContent(prompt, isCarousel, language)
  }
}

// Helper function to generate an image using Pollinations.ai (Free, High Quality, No API Key needed)
export async function generateImage(prompt: string, seed: number): Promise<{buffer: Buffer, url?: string}> {
  try {
    // Add quality modifiers and emphasize graphic design suitable for Instagram
    const enhancedPrompt = `${prompt}, instagram post style, flat design, clean corporate look, minimalist, highly professional typography layout, high quality graphic design`
    
    // Encode the prompt for the URL
    const encodedPrompt = encodeURIComponent(enhancedPrompt)
    
    // Pollinations API endpoint (flux model by default, nologo to remove watermark)
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1080&seed=${seed}&nologo=true`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Pollinations API responded with status: ${response.status}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    return { buffer, url }
  } catch (err) {
    console.warn('Image generation unavailable. Skipping image generation.', err)
    throw err
  }
}

// Main handler
export async function POST(request: Request) {
  const denied = await authorizeRequest(request, 'editor')
  if (denied) return denied
  try {
    const validated = await validateJsonRequest(request, generatePostSchema)
    if (!validated.ok) return validated.response
    const body = validated.data
    const theme = body.theme?.trim()
    const language = body.language || 'pt-BR'
    const tone = body.tone || 'Técnico, data-driven, provocativo e focado em engajamento'
    const highMode = body.highMode || false
    const isCarousel = body.isCarousel || false
    const wantImage = body.wantImage || false
    const customImagePrompt = body.customImagePrompt || ''
    const wantVideo = body.wantVideo || false
    const customVideoPrompt = body.customVideoPrompt || ''
    
    if (!theme) {
      return NextResponse.json(
        { error: 'Theme is required' },
        { status: 400 }
      )
    }
    
    // 1. Search vault for context
    const searchResult = await searchVault(theme)
    const context = searchResult.context
    const clientFolder = searchResult.clientFolder
    
    const langInstructions = language === 'en-US' 
      ? 'O post inteiro deve ser escrito em INGLÊS (English).'
      : language === 'es-ES' ? 'O post inteiro deve ser escrito em ESPANHOL (Español).'
      : language === 'fr-FR' ? 'O post inteiro deve ser escrito em FRANCÊS (Français).'
      : language === 'de-DE' ? 'O post inteiro deve ser escrito em ALEMÃO (Deutsch).'
      : language === 'it-IT' ? 'O post inteiro deve ser escrito em ITALIANO (Italiano).'
      : 'O post inteiro deve ser escrito em PORTUGUÊS.'

    // 2. Build prompt for IA
    const prompt = `
Você é um especialista em criar conteúdo para Instagram.
Seu objetivo é gerar uma sugestão de post completa, incluindo:
- Legenda (até 2.200 caracteres)
- 5-10 hashtags relevantes (mix de nicho e alcance)
- Sugestões de menções (@perfis relevantes, se aplicável)
- Uma descrição top (uma frase impactante para iniciar o post)

CONTEXTO DO VAULT (use este informações para entender o estilo e tópicos do cliente):
---
${context}
---

INSTRUÇÕES:
- Idioma: ${langInstructions}
- Tema do post: "${theme}"
- Tom de voz: "${tone}"
- Responda APENAS com o conteúdo gerado, sem explicações adicionais.
- Mantenha o tom especificado.
- Se não souber algo, faça uma sugestão razoável baseada no contexto.
${highMode 
  ? '- MODO HIGH ATIVADO: Escreva uma legenda MUITO LONGA, detalhada e altamente aprofundada (pelo menos 5-6 parágrafos grandes). Explore o tema com profundidade técnica e riqueza de detalhes, usando todo o limite de tokens disponível.' 
  : '- Legenda deve ter entre 200 e 2.200 caracteres.'
}
${isCarousel 
  ? '- MODO CARROSSEL ATIVADO: Forneça EXATAMENTE 3 a 5 prompts de imagem diferentes, cada um em uma nova linha no formato [Prompt de Imagem X: detailed english prompt here], onde X é o número da imagem (1, 2, 3...). FOCAR FORTEMENTE EM ESTILO GRÁFICO/ESTÉTICO: tipografia em inglês, design minimalista, cores sólidas, flat design, ilustrações. Evite fotos de pessoas reais.'
  : (wantImage ? `- A última ou penúltima linha deve ser em INGLÊS no formato [Prompt de Imagem: detailed english prompt here]. FOCAR FORTEMENTE EM ESTILO GRÁFICO/ESTÉTICO. ${customImagePrompt ? `INCLUA NECESSARIAMENTE A SEGUINTE IDEIA DO USUÁRIO NO PROMPT DE IMAGEM: "${customImagePrompt}"` : ''}` : '- O prompt da imagem deve ser a última ou penúltima linha e em INGLÊS no formato [Prompt de Imagem: detailed english prompt here].')
}
${wantVideo 
  ? `- Inclua também um prompt de vídeo na penúltima ou última linha no formato [Prompt de Video: detailed english prompt here]. ${customVideoPrompt ? `INCLUA NECESSARIAMENTE A SEGUINTE IDEIA DO USUÁRIO NO PROMPT DE VÍDEO: "${customVideoPrompt}"` : ''}`
  : ''
}
- Forneça as hashtags em uma linha separada, começando com #.
- Forneça as menções em uma linha separada, começando com @.
- A descrição top deve ser a primeira linha.

FORMATO DE RESPOSTA:
[Descrição top]
[Legenda]
[Hashtags: #hashtag1 #hashtag2 ...]
[Menções: @menção1 @menção2 ...]
${isCarousel 
  ? '[Prompt de Imagem 1: detailed english prompt here]\n[Prompt de Imagem 2: detailed english prompt here]\n[Prompt de Imagem 3: detailed english prompt here]'
  : (wantImage ? '[Prompt de Imagem: detailed english prompt here]' : '')
}
${wantVideo ? '[Prompt de Video: detailed english prompt here]' : ''}
`
    
    // 3. Generate text with IA
    const maxTokens = highMode ? 1500 : 500
    const generatedText = await generateText(prompt, maxTokens, isCarousel, language)
    
    // Image generation remains manual; prompts stay embedded in the Markdown.
    // 4. Send Notification
    await sendTelegramNotification(`🤖 Novo Post Gerado!\n\nTema: ${theme}\n\n${generatedText}`)
    
    // 5. Save generated post to vault if a client was matched
    if (clientFolder) {
      try {
        const VAULT_PATH = await getVaultPath();
        const postsDir = path.join(VAULT_PATH, '02-Clientes', clientFolder, '04-Posts_Gerados')
        
        // Ensure directories exist
        await fs.mkdir(postsDir, { recursive: true })
        
        // Create safe filename
        const safeTheme = theme.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 30)
        const dateStr = new Date().toISOString().split('T')[0]
        const fileName = `post_${dateStr}_${safeTheme}_${randomUUID()}`
        
        // Save markdown
        const textFilePath = path.join(postsDir, `${fileName}.md`)
        let headers = `# Tema: ${theme}\n# Modo: ${highMode ? 'Turbo' : 'Normal'}`
        if (isCarousel) {
          headers += `\n# Tipo: Carrossel`
        }
        if (wantImage) {
          headers += `\n# Gerar Imagem: Sim`
        }
        if (wantVideo) {
          headers += `\n# Gerar Video: Sim`
        }
        const fileContent = `${headers}\n\n${generatedText}`
        await atomicWriteText(textFilePath, fileContent)
        console.log(`Post salvo em: ${textFilePath}`)

        const databasePostId = await createPostRecord({
          actorExternalId: request.headers.get('x-app-user-id') || 'local-development-admin',
          actorRole: normalizeRole(request.headers.get('x-app-role') || 'admin'),
          clientName: clientFolder,
          theme,
          content: generatedText,
          language,
          tone,
          isCarousel,
          sourceFile: textFilePath,
          requestId: requestIdFrom(request),
        })
        
        // 7. Return the result (with client and postId)
        return NextResponse.json({ 
          result: generatedText, 
          imageGenerated: false,
          imagePath: '',
          imageUrls: [],
          postId: `${fileName}.md`,
          databasePostId,
          client: clientFolder
        })
      } catch (err) {
        console.error('Erro ao salvar post no vault:', err)
      }
    }

    const databasePostId = await createPostRecord({
      actorExternalId: request.headers.get('x-app-user-id') || 'local-development-admin',
      actorRole: normalizeRole(request.headers.get('x-app-role') || 'admin'),
      clientName: clientFolder,
      theme,
      content: generatedText,
      language,
      tone,
      isCarousel,
      requestId: requestIdFrom(request),
    })

    // 7. Return the result (fallback if no client matched or failed to save)
    return NextResponse.json({ 
      result: generatedText, 
      imageGenerated: false,
      imagePath: '',
      imageUrls: [],
      databasePostId,
    })
  } catch (error) {
    console.error('Error in generate API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
