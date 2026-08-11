import 'server-only'

import { promises as fs } from 'fs'
import path from 'path'
import { getVaultPath } from '@/app/utils/config'
import type {
  DashboardActivity,
  DashboardClientVolume,
  DashboardSeriesPoint,
  DashboardStats,
} from '@/lib/dashboard'
import { isNodeError } from '@/lib/errors'
import { readStudioGenerationEvents } from './studio-metrics'
import { isDatabaseConfigured } from './db'
import { getDatabaseDashboardStats } from './repository'

interface PostMetric {
  id: string
  client: string
  theme: string
  date: Date
  imageCount: number
  isCarousel: boolean
}

const POSTS_DIRECTORY = '04-Posts_Gerados'
const ARCHIVE_DIRECTORY = '06-Posts_Arquivados'

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function parsePostHeaders(content: string): Pick<PostMetric, 'theme' | 'imageCount' | 'isCarousel'> {
  const headerLines = content.split('\n').slice(0, 20)
  const themeLine = headerLines.find((line) => line.startsWith('# Tema:'))
  const typeLine = headerLines.find((line) => line.startsWith('# Tipo:'))
  const multiImageLine = headerLines.find((line) => line.startsWith('# ImageUrls:'))
  const singleImageLine = headerLines.find((line) => line.startsWith('# ImageUrl:'))
  const imageCount = multiImageLine
    ? multiImageLine
        .replace('# ImageUrls:', '')
        .split(',')
        .filter((url) => url.trim().length > 0).length
    : singleImageLine?.replace('# ImageUrl:', '').trim()
      ? 1
      : 0

  return {
    theme: themeLine?.replace('# Tema:', '').trim() || 'Sem tema',
    imageCount,
    isCarousel: typeLine?.toLowerCase().includes('carrossel') === true || imageCount > 1,
  }
}

async function readDirectoryNames(directory: string): Promise<string[]> {
  try {
    return await fs.readdir(directory)
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === 'ENOENT') return []
    throw error
  }
}

async function collectClientMetrics(clientDirectory: string, client: string) {
  const postsDirectory = path.join(clientDirectory, POSTS_DIRECTORY)
  const archiveDirectory = path.join(clientDirectory, ARCHIVE_DIRECTORY)
  const [postFiles, archiveFiles] = await Promise.all([
    readDirectoryNames(postsDirectory),
    readDirectoryNames(archiveDirectory),
  ])
  const markdownFiles = postFiles.filter((file) => file.endsWith('.md'))
  const posts = await Promise.all(
    markdownFiles.map(async (file): Promise<PostMetric> => {
      const filePath = path.join(postsDirectory, file)
      const [content, stat] = await Promise.all([
        fs.readFile(filePath, 'utf-8'),
        fs.stat(filePath),
      ])
      return {
        id: file,
        client,
        date: stat.mtime,
        ...parsePostHeaders(content),
      }
    }),
  )

  return {
    posts,
    archivedPosts: archiveFiles.filter((file) => file.endsWith('.md')).length,
  }
}

function createSevenDaySeries(posts: PostMetric[]): DashboardSeriesPoint[] {
  const counts = new Map<string, number>()
  for (const post of posts) {
    const key = dateKey(post.date)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date()
    date.setHours(12, 0, 0, 0)
    date.setDate(date.getDate() - (6 - offset))
    const key = dateKey(date)
    return {
      date: key,
      label: new Intl.DateTimeFormat('pt-BR', {
        weekday: 'short',
        day: '2-digit',
      }).format(date),
      posts: counts.get(key) ?? 0,
    }
  })
}

export async function getDashboardStats(): Promise<DashboardStats> {
  if (isDatabaseConfigured()) return getDatabaseDashboardStats()

  const clientsDirectory = path.join(getVaultPath(), '02-Clientes')
  const entries = await fs.readdir(clientsDirectory, { withFileTypes: true })
  const clients = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
  const [clientMetrics, studioEvents] = await Promise.all([
    Promise.all(
      clients.map((client) =>
        collectClientMetrics(path.join(clientsDirectory, client), client),
      ),
    ),
    readStudioGenerationEvents(),
  ])
  const posts = clientMetrics.flatMap((metrics) => metrics.posts)
  const archivedPosts = clientMetrics.reduce(
    (total, metrics) => total + metrics.archivedPosts,
    0,
  )
  const postsByClient: DashboardClientVolume[] = clients
    .map((name, index) => ({ name, posts: clientMetrics[index].posts.length }))
    .sort((left, right) => right.posts - left.posts)
  const today = dateKey(new Date())
  const postActivity: DashboardActivity[] = posts.map((post) => ({
    id: `${post.client}/${post.id}`,
    client: post.client,
    theme: post.theme,
    date: post.date.toISOString(),
    kind: 'post',
  }))
  const studioActivity: DashboardActivity[] = studioEvents.map((event) => ({
    id: event.interactionId,
    client: 'Product Studio',
    theme: event.kind === 'edit' ? 'Edição de vídeo' : 'Vídeo gerado',
    date: event.createdAt,
    kind: 'studio-video',
  }))

  return {
    totals: {
      postsGenerated: posts.length,
      postsToday: posts.filter((post) => dateKey(post.date) === today).length,
      imageAssets: posts.reduce((total, post) => total + post.imageCount, 0),
      carouselPosts: posts.filter((post) => post.isCarousel).length,
      archivedPosts,
      studioVideos: new Set(studioEvents.map((event) => event.fileId)).size,
      clients: clients.length,
      activeClients: postsByClient.filter((client) => client.posts > 0).length,
    },
    postsByDay: createSevenDaySeries(posts),
    postsByClient,
    recentActivity: [...postActivity, ...studioActivity]
      .sort((left, right) => Date.parse(right.date) - Date.parse(left.date))
      .slice(0, 8),
    generatedAt: new Date().toISOString(),
  }
}
