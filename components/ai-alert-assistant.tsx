'use client'

import { useState } from 'react'
import { BrainCircuit, Loader2, Sparkles } from 'lucide-react'
import type { Alert } from '@/lib/siem-data'

export function AiAlertAssistant({ alert }: { alert: Alert }) {
  const [analysis, setAnalysis] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function analyze() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/analyze-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Analysis failed.')
      setAnalysis(data.analysis)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Analysis failed.')
    } finally {
      setLoading(false)
    }
  }

  return <div className="mt-6 rounded-xl border border-[#bedfd9] bg-[#f1faf8] p-5">
    <div className="flex items-center gap-2 text-sm font-semibold text-[#31786e]"><BrainCircuit className="h-4 w-4" />Gemini analyst assistant</div>
    <p className="mt-1 text-[11px] text-[#6c8986]">Evidence-aware support for {alert.id}</p>
    <div className="mt-4">
      {!analysis && !error && <p className="text-xs leading-5 text-[#62757e]">Ask Gemini to summarize this alert, prioritize response steps, and recommend whether it needs escalation. Deterministic detections remain the source of truth.</p>}
      {analysis && <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-5 text-[#4f666e]">{analysis}</pre>}
      {error && <p className="rounded-lg bg-[#fff4ee] p-3 text-xs leading-5 text-[#a8543c]">{error}{error === 'GEMINI_API_KEY is not configured.' && <> Add <code className="font-mono">GEMINI_API_KEY</code> in the project environment variables, then try again.</>}</p>}
      <button onClick={analyze} disabled={loading} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#2d8c84] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-[#24766f] disabled:cursor-wait disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{loading ? 'Analyzing alert...' : analysis ? 'Run analysis again' : 'Analyze with Gemini'}</button>
    </div>
  </div>
}
