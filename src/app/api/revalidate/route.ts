import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'

type WebhookBody = {
  secret?: string
}

export async function POST(request: Request) {
  const secret = process.env.PRISMIC_WEBHOOK_SECRET

  if (!secret) {
    return NextResponse.json(
      { revalidated: false, message: 'PRISMIC_WEBHOOK_SECRET is not set' },
      { status: 500 }
    )
  }

  let body: WebhookBody

  try {
    body = (await request.json()) as WebhookBody
  } catch {
    return NextResponse.json(
      { revalidated: false, message: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  if (body.secret !== secret) {
    return NextResponse.json(
      { revalidated: false, message: 'Invalid secret' },
      { status: 401 }
    )
  }

  revalidateTag('prismic', 'max')

  return NextResponse.json({ revalidated: true, now: Date.now() })
}
