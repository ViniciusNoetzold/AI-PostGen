import { NextResponse } from 'next/server'
import { authorizeRequest } from '@/lib/server/authorization'
import { telegramNotificationSchema } from '@/lib/schemas/api'
import { validateJsonRequest } from '@/lib/server/security'

export async function POST(request: Request) {
  const denied = await authorizeRequest(request, 'editor')
  if (denied) return denied
  try {
    const validated = await validateJsonRequest(request, telegramNotificationSchema)
    if (!validated.ok) return validated.response
    const { message, videoUrl, imageUrl } = validated.data

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      return NextResponse.json({ error: 'Telegram credentials not configured' }, { status: 400 })
    }

    // Send video if available
    if (videoUrl) {
      const videoUrlEndpoint = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendVideo`
      await fetch(videoUrlEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          video: videoUrl,
          caption: message
        })
      })
    } 
    // Or send image if available
    else if (imageUrl) {
      const photoUrlEndpoint = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`
      await fetch(photoUrlEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          photo: imageUrl,
          caption: message
        })
      })
    } 
    // Or just send text
    else {
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message
        })
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending Telegram notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
