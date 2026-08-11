import { NextResponse } from 'next/server'
import { authorizeRequest } from '@/lib/server/authorization'
import { apiErrorResponse, ApiError, assertSafeRemoteUrl } from '@/lib/server/security'

const MAX_IMAGE_BYTES = 5_000_000

export async function GET(request: Request) {
  const denied = await authorizeRequest(request, 'viewer')
  if (denied) return denied

  try {
    const rawUrl = new URL(request.url).searchParams.get('url')
    if (!rawUrl || rawUrl.length > 2048) throw new ApiError(400, 'A valid image URL is required', 'INVALID_IMAGE_URL')
    const url = await assertSafeRemoteUrl(rawUrl)
    const response = await fetch(url, {
      redirect: 'error',
      signal: AbortSignal.timeout(8_000),
      headers: { Accept: 'image/avif,image/webp,image/png,image/jpeg' },
    })
    if (!response.ok) throw new ApiError(502, 'The remote image could not be loaded', 'IMAGE_FETCH_FAILED')
    const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() || ''
    if (!['image/avif', 'image/webp', 'image/png', 'image/jpeg'].includes(contentType)) {
      throw new ApiError(415, 'The remote resource is not a supported image', 'UNSUPPORTED_IMAGE')
    }
    const declaredLength = Number(response.headers.get('content-length') || 0)
    if (declaredLength > MAX_IMAGE_BYTES) throw new ApiError(413, 'The remote image is too large', 'IMAGE_TOO_LARGE')
    const bytes = await response.arrayBuffer()
    if (bytes.byteLength > MAX_IMAGE_BYTES) throw new ApiError(413, 'The remote image is too large', 'IMAGE_TOO_LARGE')
    return new NextResponse(bytes, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error: unknown) {
    return apiErrorResponse(error, request.headers.get('x-request-id') || undefined)
  }
}
