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
    
    // Delete post .md file
    const postPath = path.join(VAULT_PATH, '02-Clientes', client, '04-Posts_Gerados', id)
    
    try {
      await fs.unlink(postPath)
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err
    }
    
    // Try to delete corresponding image if exists
    // The image usually has the same name but .jpg extension
    if (id.endsWith('.md')) {
      const imageId = id.replace('.md', '.jpg')
      const imagePath = path.join(VAULT_PATH, '02-Clientes', client, '05-Imagens_Geradas', imageId)
      try {
        await fs.unlink(imagePath)
      } catch (err: any) {
        if (err.code !== 'ENOENT') console.error('Image not found for deletion, skipping.')
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting post:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
