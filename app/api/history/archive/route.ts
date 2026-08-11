import { NextResponse } from 'next/server'
import { authorizeRequest } from '@/lib/server/authorization'
import { promises as fs } from 'fs'
import path from 'path'
import { getVaultPath } from '../../../utils/config'
import { isNodeError } from '@/lib/errors'
import { postReferenceSchema } from '@/lib/schemas/api'
import { safeResolvePath, validateJsonRequest } from '@/lib/server/security'

export async function POST(request: Request) {
  const denied = await authorizeRequest(request, 'editor')
  if (denied) return denied
  try {
    const validated = await validateJsonRequest(request, postReferenceSchema)
    if (!validated.ok) return validated.response
    const { client, id } = validated.data
    
    const vaultPath = getVaultPath()
    const postsDir = safeResolvePath(vaultPath, path.join('02-Clientes', client, '04-Posts_Gerados'))
    const archiveDir = safeResolvePath(vaultPath, path.join('02-Clientes', client, '06-Posts_Arquivados'))
    
    // Ensure archive directory exists
    await fs.mkdir(archiveDir, { recursive: true })
    
    // Move post .md file
    const oldPostPath = path.join(postsDir, id)
    const newPostPath = path.join(archiveDir, id)
    
    try {
      await fs.rename(oldPostPath, newPostPath)
    } catch (err: unknown) {
      if (!isNodeError(err) || err.code !== 'ENOENT') throw err
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    
    // Try to move corresponding image if exists
    if (id.endsWith('.md')) {
      const imageId = id.replace('.md', '.jpg')
      const oldImagePath = safeResolvePath(vaultPath, path.join('02-Clientes', client, '05-Imagens_Geradas', imageId))
      const archiveImagesDir = safeResolvePath(vaultPath, path.join('02-Clientes', client, '07-Imagens_Arquivadas'))
      
      try {
        await fs.mkdir(archiveImagesDir, { recursive: true })
        const newImagePath = path.join(archiveImagesDir, imageId)
        await fs.rename(oldImagePath, newImagePath)
      } catch (err: unknown) {
        if (!isNodeError(err) || err.code !== 'ENOENT') {
          console.error('Unable to archive image:', err)
        }
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
