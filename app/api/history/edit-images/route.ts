import { NextResponse } from 'next/server'
import { authorizeRequest } from '@/lib/server/authorization'
import { promises as fs } from 'fs'
import path from 'path'
import { getVaultPath } from '../../../utils/config'
import { getErrorMessage } from '@/lib/errors'
import { editPostImagesSchema } from '@/lib/schemas/api'
import { safeResolvePath, validateJsonRequest } from '@/lib/server/security'
import { atomicWriteText } from '@/lib/server/atomic-files'

export async function POST(req: Request) {
  const denied = await authorizeRequest(req, 'editor')
  if (denied) return denied
  try {
    const validated = await validateJsonRequest(req, editPostImagesSchema)
    if (!validated.ok) return validated.response
    const { client, id, imageUrls } = validated.data

    const VAULT_PATH = getVaultPath()
    const filePath = safeResolvePath(VAULT_PATH, path.join('02-Clientes', client, '04-Posts_Gerados', id))
    
    const content = await fs.readFile(filePath, 'utf-8')
    const lines = content.split('\n')
    
    // Find where headers end and content begins
    let bodyStartIndex = 0
    let imageUrlsLineIndex = -1
    
    for (let i = 0; i < Math.min(15, lines.length); i++) {
      if (lines[i].startsWith('# Tema:') || 
          lines[i].startsWith('# Modo:') || 
          lines[i].startsWith('# Tipo:')) {
        bodyStartIndex = Math.max(bodyStartIndex, i + 1)
      } else if (lines[i].startsWith('# ImageUrls:')) {
        imageUrlsLineIndex = i
        bodyStartIndex = Math.max(bodyStartIndex, i + 1)
      } else if (lines[i].startsWith('# ImageUrl:')) {
        // If it's a single ImageUrl, we might want to replace it or just let ImageUrls take precedence
        bodyStartIndex = Math.max(bodyStartIndex, i + 1)
      }
    }
    
    // Create new headers
    const newImageUrlsString = `# ImageUrls: ${imageUrls.join(', ')}`
    
    if (imageUrlsLineIndex !== -1) {
      // Replace existing ImageUrls line
      lines[imageUrlsLineIndex] = newImageUrlsString
    } else {
      // Insert before body if not found
      lines.splice(bodyStartIndex, 0, newImageUrlsString)
    }
    
    const newFileContent = lines.join('\n')
    
    await atomicWriteText(filePath, newFileContent)
    
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error updating images order:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
