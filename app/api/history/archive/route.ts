import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const VAULT_PATH = path.join(process.cwd(), '..', 'Obsidian vault neural brain')

export async function POST(request: Request) {
  try {
    const { client, id } = await request.json()
    
    if (!client || !id) {
      return NextResponse.json({ error: 'Client and ID are required' }, { status: 400 })
    }
    
    const postsDir = path.join(VAULT_PATH, '02-Clientes', client, '04-Posts_Gerados')
    const archiveDir = path.join(VAULT_PATH, '02-Clientes', client, '06-Posts_Arquivados')
    
    // Ensure archive directory exists
    await fs.mkdir(archiveDir, { recursive: true })
    
    // Move post .md file
    const oldPostPath = path.join(postsDir, id)
    const newPostPath = path.join(archiveDir, id)
    
    try {
      await fs.rename(oldPostPath, newPostPath)
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    
    // Try to move corresponding image if exists
    if (id.endsWith('.md')) {
      const imageId = id.replace('.md', '.jpg')
      const oldImagePath = path.join(VAULT_PATH, '02-Clientes', client, '05-Imagens_Geradas', imageId)
      const archiveImagesDir = path.join(VAULT_PATH, '02-Clientes', client, '07-Imagens_Arquivadas')
      
      try {
        await fs.mkdir(archiveImagesDir, { recursive: true })
        const newImagePath = path.join(archiveImagesDir, imageId)
        await fs.rename(oldImagePath, newImagePath)
      } catch (err: any) {
        if (err.code !== 'ENOENT') console.error('Image not found for archiving, skipping.')
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error archiving post:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
