import { NextResponse } from 'next/server'
import { authorizeRequest } from '@/lib/server/authorization'
import { promises as fs } from 'fs'
import path from 'path'
import { getVaultPath } from '../../utils/config'
import { postReferenceSchema } from '@/lib/schemas/api'
import { safeResolvePath, validateJsonRequest } from '@/lib/server/security'
import { atomicWriteText } from '@/lib/server/atomic-files'

export async function POST(request: Request) {
  const denied = await authorizeRequest(request, 'editor')
  if (denied) return denied
  try {
    const validated = await validateJsonRequest(request, postReferenceSchema)
    if (!validated.ok) return validated.response
    const { client, id } = validated.data

    const VAULT_PATH = await getVaultPath()
    const postPath = safeResolvePath(VAULT_PATH, path.join('02-Clientes', client, '04-Posts_Gerados', id))
    
    let content;
    try {
      content = await fs.readFile(postPath, 'utf-8')
    } catch {
      return NextResponse.json({ error: 'Post file not found' }, { status: 404 })
    }
    
    // Extract Image Prompts
    const imagePrompts: string[] = []
    
    const isCarousel = content.includes('# Tipo: Carrossel')
    
    if (isCarousel) {
      const regex = /\[Prompt de Imagem \d+:?([\s\S]*?)\]/gi
      let match;
      while ((match = regex.exec(content)) !== null) {
        if (match[1]) imagePrompts.push(match[1].trim())
      }
    } else {
      const imagePromptMatch = content.match(/\[Prompt de Imagem:?([\s\S]*?)\]/i)
      if (imagePromptMatch && imagePromptMatch[1]) {
        imagePrompts.push(imagePromptMatch[1].trim())
      }
    }
    
    if (imagePrompts.length === 0) {
       // Fallback
       const themeMatch = content.match(/# Tema: (.*)/)
       imagePrompts.push(themeMatch ? themeMatch[1] : 'Abstract design')
    }
    
    const imageUrls: string[] = []
    
    for (let i = 0; i < imagePrompts.length; i++) {
      const prompt = imagePrompts[i]
      const enhancedPrompt = `${prompt}, instagram post style, flat design, clean corporate look, minimalist, highly professional typography layout, high quality graphic design`
      const encodedPrompt = encodeURIComponent(enhancedPrompt)
      const seed = Math.floor(Math.random() * 1000000)
      const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1080&seed=${seed}&nologo=true`
      
      // Ping the URL to trigger generation
      try {
        await fetch(url, { method: 'HEAD' })
      } catch (e) {
        console.warn('Failed to ping pollinations image URL', e)
      }
      
      imageUrls.push(url)
    }
    
    // Update the markdown file
    const lines = content.split('\n')
    const filteredLines = lines.filter(line => !line.startsWith('# ImageUrl:') && !line.startsWith('# ImageUrls:'))
    
    const themeIndex = filteredLines.findIndex(line => line.startsWith('# Tema:'))
    
    if (themeIndex !== -1) {
      if (imageUrls.length > 1) {
        filteredLines.splice(themeIndex + 1, 0, `# ImageUrls: ${imageUrls.join(', ')}`)
      } else {
        filteredLines.splice(themeIndex + 1, 0, `# ImageUrl: ${imageUrls[0]}`)
      }
    } else {
      // If no theme header found, just prepend
      if (imageUrls.length > 1) {
        filteredLines.unshift(`# ImageUrls: ${imageUrls.join(', ')}`)
      } else {
        filteredLines.unshift(`# ImageUrl: ${imageUrls[0]}`)
      }
    }
    
    const newContent = filteredLines.join('\n')
    await atomicWriteText(postPath, newContent)
    
    return NextResponse.json({ success: true, imageUrls })
    
  } catch (error) {
    console.error('Error in generate-image API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
