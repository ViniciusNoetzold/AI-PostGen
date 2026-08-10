import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { getVaultPath } from '../../../utils/config'

export async function POST(req: Request) {
  try {
    const { client, id, newContent } = await req.json()
    
    if (!client || !id || newContent === undefined) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const VAULT_PATH = getVaultPath()
    const filePath = path.join(VAULT_PATH, '02-Clientes', client, '04-Posts_Gerados', id)
    
    const content = await fs.readFile(filePath, 'utf-8')
    const lines = content.split('\n')
    
    let bodyStartIndex = 0
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      if (lines[i].startsWith('# Tema:') || 
          lines[i].startsWith('# Modo:') || 
          lines[i].startsWith('# ImageUrls:') || 
          lines[i].startsWith('# ImageUrl:')) {
        bodyStartIndex = Math.max(bodyStartIndex, i + 1)
      }
    }
    
    const headers = lines.slice(0, bodyStartIndex).join('\n')
    const newFileContent = `${headers}\n\n${newContent.trim()}`.trim() + '\n'
    
    await fs.writeFile(filePath, newFileContent, 'utf-8')
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error editing post:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
