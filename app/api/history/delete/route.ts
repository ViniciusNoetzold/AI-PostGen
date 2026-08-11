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
    
    const VAULT_PATH = getVaultPath()
    
    // Delete post .md file
    const postPath = safeResolvePath(VAULT_PATH, path.join('02-Clientes', client, '04-Posts_Gerados', id))
    
    try {
      await fs.unlink(postPath)
    } catch (err: unknown) {
      if (!isNodeError(err) || err.code !== 'ENOENT') throw err
    }
    
    // Try to delete corresponding image if exists
    // The image usually has the same name but .jpg extension
    if (id.endsWith('.md')) {
      const imageId = id.replace('.md', '.jpg')
      const imagePath = safeResolvePath(VAULT_PATH, path.join('02-Clientes', client, '05-Imagens_Geradas', imageId))
      try {
        await fs.unlink(imagePath)
      } catch (err: unknown) {
        if (!isNodeError(err) || err.code !== 'ENOENT') {
          console.error('Unable to delete image:', err)
        }
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
