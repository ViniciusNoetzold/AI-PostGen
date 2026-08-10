import { NextResponse } from 'next/server'
import axios from 'axios'
import { promises as fs } from 'fs'
import path from 'path'

// Configuration
const VAULT_PATH = path.join(process.cwd(), '..', 'Obsidian vault neural brain')
const HF_API_URL = 'https://router.huggingface.co/v1/chat/completions'
const HF_MODEL = 'Qwen/Qwen2.5-7B-Instruct'
const HF_TOKEN = process.env.NEXT_PUBLIC_HF_TOKEN
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

// Helper to send telegram message
async function sendTelegramNotification(message: string, imageUrl?: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('Telegram credentials not configured. Skipping notification.')
    return
  }
  
  try {
    if (imageUrl) {
      const photoUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`
      await fetch(photoUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          photo: imageUrl
        })
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
        text: message,
        parse_mode: 'HTML'
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

// Helper function to call Hugging Face API
async function generateText(prompt: string, maxTokens: number = 500): Promise<string> {
  try {
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HF_TOKEN}`
      },
      body: JSON.stringify({
        model: HF_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens
      })
    })
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    const data = await response.json()
    
    // The HF v1 API returns choices array
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content.trim()
    }
    
    throw new Error('Unexpected response format from Hugging Face API')
  } catch (err) {
    console.error('Error calling Hugging Face API:', err)
    throw new Error('Falha ao gerar texto com IA')
  }
}

// Helper function to generate an image using Pollinations AI
async function generateImage(prompt: string, seed: number): Promise<{buffer: Buffer, url: string}> {
  try {
    // Add quality modifiers and emphasize graphic design
    const enhancedPrompt = `${prompt}, high quality graphic design, clean layout, professional, vector art style, masterpiece, 8k resolution`
    const encodedPrompt = encodeURIComponent(enhancedPrompt)
    
    // 1080x1080 is ideal for Instagram posts
    // Using model=flux for significantly better quality and text rendering, and enhance=true
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1080&nologo=true&seed=${seed}&model=flux&enhance=true`
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Pollinations API responded with status: ${response.status}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    return { buffer: Buffer.from(arrayBuffer), url }
  } catch (err) {
    console.error('Error calling Pollinations API:', err)
    throw new Error('Falha ao gerar imagem')
  }
}

// Main handler
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const theme = body.theme
    const tone = body.tone || 'Técnico, data-driven, provocativo e focado em engajamento'
    const highMode = body.highMode || false
    const isCarousel = body.isCarousel || false
    
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
    
    // 2. Build prompt for IA
    const prompt = `
Você é um especialista em criar conteúdo para Instagram em português.
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
  ? '- MODO CARROSSEL ATIVADO: Forneça EXATAMENTE 3 a 5 prompts de imagem diferentes, cada um em uma nova linha no formato [Prompt de Imagem X: detailed english prompt here], onde X é o número da imagem (1, 2, 3...). FOCAR FORTEMENTE EM ESTILO GRÁFICO/ESTÁTICO: tipografia em inglês, design minimalista, cores sólidas, flat design, ilustrações. Evite fotos de pessoas reais.'
  : '- O prompt da imagem deve ser a última linha e em INGLÊS no formato [Prompt de Imagem: detailed english prompt here]. FOCAR FORTEMENTE EM ESTILO GRÁFICO/ESTÁTICO: tipografia em inglês, design minimalista, layout de texto, cores sólidas, estilo infográfico ou flat design. Evite fotos de pessoas reais.'
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
  : '[Prompt de Imagem: detailed english prompt here]'
}
`
    
    // 3. Generate text with IA
    const maxTokens = highMode ? 1500 : 500
    const generatedText = await generateText(prompt, maxTokens)
    
    // Extract Image Prompts
    let imagePrompts: string[] = []
    
    if (isCarousel) {
      const regex = /\[Prompt de Imagem \d+:?([\s\S]*?)\]/gi
      let match;
      while ((match = regex.exec(generatedText)) !== null) {
        if (match[1]) imagePrompts.push(match[1].trim())
      }
      if (imagePrompts.length === 0) imagePrompts.push(theme) // Fallback
    } else {
      const imagePromptMatch = generatedText.match(/\[Prompt de Imagem:?([\s\S]*?)\]/i)
      if (imagePromptMatch && imagePromptMatch[1]) {
        imagePrompts.push(imagePromptMatch[1].trim())
      } else {
        imagePrompts.push(theme)
      }
    }
    
    // 4. Generate Images
    let imageGenerated = false
    let imageBuffers: Buffer[] = []
    let imageUrls: string[] = []
    
    try {
      // Limit to max 5 images to avoid excessive API calls
      const generatePromises = imagePrompts.slice(0, 5).map(async (prompt) => {
        const seed = Math.floor(Math.random() * 1000000000)
        return generateImage(prompt, seed)
      })
      
      const results = await Promise.allSettled(generatePromises)
      
      for (const res of results) {
        if (res.status === 'fulfilled') {
          imageBuffers.push(res.value.buffer)
          imageUrls.push(res.value.url)
        } else {
          console.error('Failed to generate one of the images:', res.reason)
        }
      }
      if (imageUrls.length > 0) imageGenerated = true
    } catch (err) {
      console.error('Failed to generate images, continuing without them.')
    }
    
    // 5. Send Notification
    await sendTelegramNotification(`🚀 <b>Novo Post Gerado!</b>\n\n<b>Tema:</b> ${theme}\n\n${generatedText}${imageGenerated ? `\n\n<i>🖼️ ${imageUrls.length} Imagens geradas!</i>` : ''}`, imageUrls[0])
    
    // 6. Save generated post and image to vault if a client was matched
    let imagePathMsg = ''
    if (clientFolder) {
      try {
        const postsDir = path.join(VAULT_PATH, '02-Clientes', clientFolder, '04-Posts_Gerados')
        const imagesDir = path.join(VAULT_PATH, '02-Clientes', clientFolder, '05-Imagens_Geradas')
        
        // Ensure directories exist
        await fs.mkdir(postsDir, { recursive: true })
        if (imageGenerated) {
          await fs.mkdir(imagesDir, { recursive: true })
        }
        
        // Create safe filename
        const safeTheme = theme.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 30)
        const dateStr = new Date().toISOString().split('T')[0]
        const fileName = `post_${dateStr}_${safeTheme}`
        
        // Save images
        if (imageGenerated && imageBuffers.length > 0) {
          imagePathMsg = 'Múltiplas imagens geradas.'
          for (let i = 0; i < imageBuffers.length; i++) {
            const imageFileName = imageBuffers.length > 1 ? `${fileName}_${i+1}.jpg` : `${fileName}.jpg`
            const imageFilePath = path.join(imagesDir, imageFileName)
            await fs.writeFile(imageFilePath, imageBuffers[i])
            console.log(`Imagem salva em: ${imageFilePath}`)
            if (i === 0) imagePathMsg = imageFilePath
          }
        }

        // Save markdown
        const textFilePath = path.join(postsDir, `${fileName}.md`)
        let headers = `# Tema: ${theme}\n# Modo: ${highMode ? 'Turbo' : 'Normal'}`
        if (imageUrls.length > 0) {
          headers += `\n# ImageUrls: ${imageUrls.join(',')}`
        }
        const fileContent = `${headers}\n\n${generatedText}`
        await fs.writeFile(textFilePath, fileContent, 'utf-8')
        console.log(`Post salvo em: ${textFilePath}`)
        
      } catch (err) {
        console.error('Erro ao salvar post no vault:', err)
      }
    }

    // 7. Return the result
    return NextResponse.json({ 
      result: generatedText, 
      imageGenerated,
      imagePath: imagePathMsg,
      imageUrls: imageUrls
    })
  } catch (error) {
    console.error('Error in generate API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}