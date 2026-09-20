import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not configured.' }, { status: 503 })
  }

  try {
    const { alert } = await request.json()
    if (!alert || typeof alert !== 'object') {
      return NextResponse.json({ error: 'An alert payload is required.' }, { status: 400 })
    }

    const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY })
    const { text } = await generateText({
      model: google('gemini-3.6-flash'),
      system: 'You are a thorough but concise SOC analyst assistant. Analyze only the supplied alert evidence. Do not claim compromise as fact. Return a complete assessment, three prioritized next steps with brief reasoning, and an escalation recommendation. Use plain text with headings. Keep the entire response under 700 words and always finish the escalation recommendation.',
      prompt: `Analyze this security alert:\n${JSON.stringify(alert, null, 2)}`,
      maxOutputTokens: 3000,
      maxRetries: 0,
    })

    return NextResponse.json({ analysis: text })
  } catch (error) {
    console.error('[v0] Alert analysis failed:', error)
    const message = error instanceof Error ? error.message.toLowerCase() : ''
    if (message.includes('quota')) {
      return NextResponse.json({ error: 'Gemini quota exceeded. Wait for the quota to reset or use a project with billing enabled.' }, { status: 429 })
    }
    if (message.includes('high demand')) {
      return NextResponse.json({ error: 'Gemini is temporarily busy. Please try this alert again shortly.' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Gemini could not analyze this alert.' }, { status: 502 })
  }
}

export const runtime = 'nodejs'
