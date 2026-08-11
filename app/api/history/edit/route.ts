import { NextResponse } from 'next/server'
import { authorizeRequest } from '@/lib/server/authorization'
import { promises as fs } from 'fs'
import path from 'path'
import { getVaultPath } from '../../../utils/config'
import { getErrorMessage } from '@/lib/errors'
import { editPostSchema } from '@/lib/schemas/api'
import { safeResolvePath, validateJsonRequest } from '@/lib/server/security'
import { atomicWriteText } from '@/lib/server/atomic-files'

export async function POST(req: Request) {
  const denied = await authorizeRequest(req, 'editor')
  if (denied) return denied
  try {
    const validated = await validateJsonRequest(req, editPostSchema)
    if (!validated.ok) return validated.response
    const { client, id, newContent } = validated.data

    const VAULT_PATH = getVaultPath()
    const filePath = safeResolvePath(VAULT_PATH, path.join('02-Clientes', client, '04-Posts_Gerados', id))
    
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
    
    await atomicWriteText(filePath, newFileContent)
    
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error editing post:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
