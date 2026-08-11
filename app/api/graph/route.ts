import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { getVaultPath } from '../../utils/config'
import { authorizeRequest } from '@/lib/server/authorization'

interface VaultGraphNode {
  id: string
  name: string
  group: 'root' | 'folder' | 'file'
  val: number
  links?: string[]
}

interface VaultGraphLink {
  source: string
  target: string
  type: 'hierarchy' | 'reference'
}

export async function GET(request: Request) {
  const denied = await authorizeRequest(request, 'viewer')
  if (denied) return denied
  try {
    const VAULT_PATH = await getVaultPath();
    const nodes: VaultGraphNode[] = []
    const links: VaultGraphLink[] = []
    
    // Nodes maps id to its node object
    const nodeMap = new Map<string, VaultGraphNode>()
    
    const rootNode: VaultGraphNode = { id: 'Vault', name: 'Neural Brain Vault', group: 'root', val: 5 }
    nodes.push(rootNode)
    nodeMap.set('Vault', rootNode)

    async function walk(dir: string, parentId: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        if (entry.name === '.obsidian' || entry.name.startsWith('.')) continue
        
        const fullPath = path.join(dir, entry.name)
        const id = fullPath.replace(VAULT_PATH, '').replace(/^[\\\/]/, '')
        const isDir = entry.isDirectory()
        
        const node: VaultGraphNode = {
          id: id,
          name: entry.name.replace(/\.md$/, ''),
          group: isDir ? 'folder' : 'file',
          val: isDir ? 3 : 1
        }
        
        nodes.push(node)
        nodeMap.set(id, node)
        nodeMap.set(node.name, node) // for resolving [[links]]
        
        links.push({
          source: parentId,
          target: id,
          type: 'hierarchy'
        })
        
        if (isDir) {
          await walk(fullPath, id)
        } else if (entry.name.endsWith('.md')) {
          // Read content for tags and links
          try {
            const content = await fs.readFile(fullPath, 'utf-8')
            // Parse [[Links]]
            const linkRegex = /\[\[(.*?)\]\]/g
            let match
            while ((match = linkRegex.exec(content)) !== null) {
              const targetName = match[1].split('|')[0] // handle [[Target|Alias]]
              // We resolve links later after all nodes are created
              node.links = node.links || []
              node.links.push(targetName)
            }
          } catch (e) {
            console.error('Error reading file:', fullPath, e)
          }
        }
      }
    }
    
    await walk(VAULT_PATH, 'Vault')
    
    // Resolve cross-links
    for (const node of nodes) {
      if (node.links) {
        for (const targetName of node.links) {
          const targetNode = nodeMap.get(targetName)
          if (targetNode) {
            links.push({
              source: node.id,
              target: targetNode.id,
              type: 'reference'
            })
          }
        }
        delete node.links // clean up
      }
    }
    
    // Generate some stats for charts
    const postsPerClient: Record<string, number> = {}
    const themes: Record<string, number> = {}
    
    try {
      const clientsDir = path.join(VAULT_PATH, '02-Clientes')
      const clientFolders = await fs.readdir(clientsDir)
      for (const clientFolder of clientFolders) {
        const clientPath = path.join(clientsDir, clientFolder)
        const stats = await fs.stat(clientPath)
        if (stats.isDirectory()) {
          const postsDir = path.join(clientPath, '04-Posts_Gerados')
          try {
            const postsStats = await fs.stat(postsDir)
            if (postsStats.isDirectory()) {
              const files = await fs.readdir(postsDir)
              const mdFiles = files.filter(f => f.endsWith('.md'))
              postsPerClient[clientFolder] = mdFiles.length
              
              for (const file of mdFiles) {
                const filePath = path.join(postsDir, file)
                const content = await fs.readFile(filePath, 'utf-8')
                const lines = content.split('\n')
                for (let i = 0; i < Math.min(10, lines.length); i++) {
                  if (lines[i].startsWith('# Tema:')) {
                    const theme = lines[i].replace('# Tema:', '').trim()
                    themes[theme] = (themes[theme] || 0) + 1
                  }
                }
              }
            }
          } catch {}
        }
      }
    } catch {}

    const stats = {
      postsPerClient: Object.keys(postsPerClient).map(k => ({ name: k, value: postsPerClient[k] })),
      themes: Object.keys(themes).map(k => ({ name: k, value: themes[k] }))
    }

    return NextResponse.json({ graph: { nodes, links }, stats })
  } catch (error) {
    console.error('Error generating graph data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
