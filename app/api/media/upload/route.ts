import { NextResponse } from 'next/server'
import { authorizeRequest } from '@/lib/server/authorization'
import { storeObject } from '@/lib/server/storage'
import { ApiError, apiErrorResponse } from '@/lib/server/security'

const MAX_LOGO_BYTES = 2_000_000
const ALLOWED_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
} as const

function hasValidSignature(bytes: Uint8Array, contentType: keyof typeof ALLOWED_TYPES): boolean {
  if (contentType === 'image/png') {
    return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)
  }
  if (contentType === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  }
  return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
}

export async function POST(request: Request) {
  const denied = await authorizeRequest(request, 'editor')
  if (denied) return denied

  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) throw new ApiError(422, 'Selecione um arquivo de logo.', 'FILE_REQUIRED')
    if (file.size === 0 || file.size > MAX_LOGO_BYTES) {
      throw new ApiError(413, 'O logo deve ter no máximo 2 MB.', 'FILE_TOO_LARGE')
    }
    if (!(file.type in ALLOWED_TYPES)) {
      throw new ApiError(415, 'Use uma imagem PNG, JPEG ou WebP.', 'UNSUPPORTED_IMAGE')
    }

    const contentType = file.type as keyof typeof ALLOWED_TYPES
    const bytes = new Uint8Array(await file.arrayBuffer())
    if (!hasValidSignature(bytes, contentType)) {
      throw new ApiError(422, 'O conteúdo do arquivo não corresponde ao formato informado.', 'INVALID_IMAGE_SIGNATURE')
    }

    const stored = await storeObject({
      data: bytes,
      contentType,
      extension: ALLOWED_TYPES[contentType],
      prefix: 'images',
    })
    return NextResponse.json({
      url: stored.url,
      bytes: stored.bytes,
      provider: stored.provider,
    }, { status: 201 })
  } catch (error: unknown) {
    return apiErrorResponse(error, request.headers.get('x-request-id') || undefined)
  }
}
