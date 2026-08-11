import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { getVaultPath } from '../../utils/config'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { client, id } = body
    
    if (!client || !id) {
      return NextResponse.json({ error: 'Client and ID are required' }, { status: 400 })
    }

    const VAULT_PATH = await getVaultPath()
    const postPath = path.join(VAULT_PATH, '02-Clientes', client, '04-Posts_Gerados', id)
    
    let content;
    try {
      content = await fs.readFile(postPath, 'utf-8')
    } catch (e) {
      return NextResponse.json({ error: 'Post file not found' }, { status: 404 })
    }
    
    // Extract Image Prompts
    let imagePrompts: string[] = []
    
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
    await fs.writeFile(postPath, newContent, 'utf-8')
    
    return NextResponse.json({ success: true, imageUrls })
    
  } catch (error) {
    console.error('Error in generate-image API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
