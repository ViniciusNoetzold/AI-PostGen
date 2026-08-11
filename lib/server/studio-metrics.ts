import 'server-only'

import { promises as fs } from 'fs'
import path from 'path'
import { getVaultPath } from '@/app/utils/config'
import { isNodeError } from '@/lib/errors'

export interface StudioMetricEvent {
  interactionId: string
  fileId: string
  kind: 'generation' | 'edit'
  createdAt: string
}

const METRICS_DIRECTORY = '.app-data'
const METRICS_FILE = 'studio-generations.jsonl'

export async function recordStudioGeneration(
  event: Omit<StudioMetricEvent, 'createdAt'>,
): Promise<void> {
  const directory = path.join(getVaultPath(), METRICS_DIRECTORY)
  await fs.mkdir(directory, { recursive: true })
  await fs.appendFile(
    path.join(directory, METRICS_FILE),
    `${JSON.stringify({ ...event, createdAt: new Date().toISOString() })}\n`,
    'utf-8',
  )
}

export async function readStudioGenerationEvents(): Promise<StudioMetricEvent[]> {
  try {
    const content = await fs.readFile(
      path.join(getVaultPath(), METRICS_DIRECTORY, METRICS_FILE),
      'utf-8',
    )

    return content
      .split('\n')
      .filter(Boolean)
      .flatMap((line) => {
        try {
          const value: unknown = JSON.parse(line)
          if (
            typeof value === 'object' &&
            value !== null &&
            typeof (value as Partial<StudioMetricEvent>).interactionId === 'string' &&
            typeof (value as Partial<StudioMetricEvent>).fileId === 'string' &&
            typeof (value as Partial<StudioMetricEvent>).createdAt === 'string'
          ) {
            return [value as StudioMetricEvent]
          }
        } catch {
          // Ignore a malformed partial line without losing the remaining metrics.
        }
        return []
      })
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === 'ENOENT') return []
    throw error
  }
}
