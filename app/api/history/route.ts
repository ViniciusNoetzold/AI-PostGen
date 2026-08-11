import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { getVaultPath } from '../../utils/config'
import { isNodeError } from '@/lib/errors'
import type { HistoryPost, StoredHistoryPost } from '@/lib/posts'
import { authorizeRequest } from '@/lib/server/authorization'

export async function GET(request: Request) {
  const denied = await authorizeRequest(request, 'viewer')
  if (denied) return denied
  try {
    const VAULT_PATH = getVaultPath()
    const clientsDir = path.join(VAULT_PATH, '02-Clientes')
    const clientFolders = await fs.readdir(clientsDir)
    
    const allPosts: StoredHistoryPost[] = []
    
    for (const clientFolder of clientFolders) {
      const clientPath = path.join(clientsDir, clientFolder)
      const stats = await fs.stat(clientPath)
      
      if (stats.isDirectory()) {
        const postsDir = path.join(clientPath, '04-Posts_Gerados')
        
        try {
          const postsDirStats = await fs.stat(postsDir)
          if (postsDirStats.isDirectory()) {
            const files = await fs.readdir(postsDir)
            
            for (const file of files) {
              if (file.endsWith('.md')) {
                const filePath = path.join(postsDir, file)
                const fileStats = await fs.stat(filePath)
                const content = await fs.readFile(filePath, 'utf-8')
                
                // Parse theme, mode and imageUrl
                const lines = content.split('\n')
                let theme = 'Sem tema'
                let mode = 'Normal'
                let isCarousel = false
                let imageUrls: string[] = []
                let bodyStartIndex = 0
                
                for (let i = 0; i < Math.min(15, lines.length); i++) {
                  if (lines[i].startsWith('# Tema:')) {
                    theme = lines[i].replace('# Tema:', '').trim()
                    bodyStartIndex = Math.max(bodyStartIndex, i + 1)
                  } else if (lines[i].startsWith('# Modo:')) {
                    mode = lines[i].replace('# Modo:', '').trim()
                    bodyStartIndex = Math.max(bodyStartIndex, i + 1)
                  } else if (lines[i].startsWith('# Tipo:')) {
                    if (lines[i].includes('Carrossel')) isCarousel = true
                    bodyStartIndex = Math.max(bodyStartIndex, i + 1)
                  } else if (lines[i].startsWith('# ImageUrls:')) {
                    const urlsRaw = lines[i].replace('# ImageUrls:', '').trim()
                    imageUrls = urlsRaw.split(',').map(u => u.trim()).filter(u => u)
                    bodyStartIndex = Math.max(bodyStartIndex, i + 1)
                  } else if (lines[i].startsWith('# ImageUrl:')) {
                    const url = lines[i].replace('# ImageUrl:', '').trim()
                    if (url) imageUrls.push(url)
                    bodyStartIndex = Math.max(bodyStartIndex, i + 1)
                  }
                }
                
                // Content is everything after the headers
                const body = lines.slice(bodyStartIndex).join('\n').trim()
                
                allPosts.push({
                  id: file,
                  client: clientFolder,
                  theme: theme,
                  mode: mode,
                  isCarousel: isCarousel || imageUrls.length > 1,
                  imageUrls: imageUrls,
                  imageUrl: imageUrls.length > 0 ? imageUrls[0] : '', // Keep backward compatibility for single image
                  content: body,
                  date: fileStats.mtime.toISOString(), // use modification time
                  timestamp: fileStats.mtime.getTime()
                })
              }
            }
          }
        } catch (err: unknown) {
          // Ignore if 04-Posts_Gerados doesn't exist
          if (!isNodeError(err) || err.code !== 'ENOENT') {
            console.error(`Error reading posts for client ${clientFolder}:`, err)
          }
        }
      }
    }
    
    // Sort by newest first
    allPosts.sort((a, b) => b.timestamp - a.timestamp)
    
    // Limit to 20 most recent
    const recentPosts: HistoryPost[] = allPosts.slice(0, 20).map((post) => ({
      id: post.id,
      client: post.client,
      theme: post.theme,
      mode: post.mode,
      isCarousel: post.isCarousel,
      imageUrls: post.imageUrls,
      imageUrl: post.imageUrl,
      content: post.content,
      date: post.date,
    }))
    
    return NextResponse.json({ history: recentPosts })
  } catch (error) {
    console.error('Error fetching history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
