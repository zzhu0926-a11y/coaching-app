'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ id: string }>
}

interface LogCounts {
  workouts: number
  nutritionDays: number
  bodyLogs: number
  checkIns: number
}

interface ClientInfo {
  name: string
  packageType: string | null
}

type AnalyzeState = 'idle' | 'loading' | 'result' | 'sent'

export default function AnalyzePage({ params }: PageProps) {
  const { id: clientId } = use(params)

  const [state, setState] = useState<AnalyzeState>('idle')
  const [aiDraft, setAiDraft] = useState('')
  const [editedDraft, setEditedDraft] = useState('')
  const [error, setError] = useState('')
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null)
  const [logCounts, setLogCounts] = useState<LogCounts | null>(null)

  // Load client summary on mount
  useEffect(() => {
    async function loadSummary() {
      try {
        const res = await fetch(`/api/clients/${clientId}/summary`)
        if (res.ok) {
          const data = await res.json()
          setClientInfo(data.clientInfo)
          setLogCounts(data.logCounts)
        }
      } catch {
        // Non-fatal — we'll show skeleton
      }
    }
    loadSummary()
  }, [clientId])

  async function handleGenerate() {
    setState('loading')
    setError('')
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Server error ${res.status}`)
      }
      const data = await res.json()
      setAiDraft(data.draft)
      setEditedDraft(data.draft)
      setState('result')
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
      setState('idle')
    }
  }

  async function handleApproveAndSend() {
    try {
      const res = await fetch('/api/ai/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, aiDraft, coachEdit: editedDraft }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Server error ${res.status}`)
      }
      setState('sent')
    } catch (err: any) {
      setError(err.message ?? 'Failed to send')
    }
  }

  function handleDiscard() {
    setAiDraft('')
    setEditedDraft('')
    setState('idle')
    setError('')
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Minimal header for client pages */}
      <div className="sticky top-0 z-50 bg-zinc-900/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link
            href={`/clients/${clientId}`}
            className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
          >
            ← Back
          </Link>
          <span className="text-zinc-100 font-semibold">AI Analysis</span>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Client summary card */}
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">
            Last 4 Weeks Summary
          </h2>

          {clientInfo && (
            <div className="mb-4">
              <p className="text-zinc-100 font-semibold text-lg">{clientInfo.name}</p>
              {clientInfo.packageType && (
                <p className="text-zinc-500 text-sm capitalize">{clientInfo.packageType} package</p>
              )}
            </div>
          )}

          {logCounts ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Workouts', value: logCounts.workouts, color: 'text-emerald-400' },
                {
                  label: 'Nutrition days',
                  value: logCounts.nutritionDays,
                  color: 'text-orange-400',
                },
                { label: 'Body logs', value: logCounts.bodyLogs, color: 'text-violet-400' },
                { label: 'Check-ins', value: logCounts.checkIns, color: 'text-sky-400' },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="rounded-lg bg-zinc-800 border border-zinc-700 p-3 text-center"
                >
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-zinc-500 text-xs mt-1">{label}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-lg bg-zinc-800 border border-zinc-700 p-3 h-16 animate-pulse"
                />
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-950 border border-red-800 p-4">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Idle: generate button */}
        {state === 'idle' && (
          <div className="text-center py-8">
            <p className="text-zinc-500 text-sm mb-6">
              Claude will analyze the client's 4-week data and generate a personalized progress
              summary with recommendations.
            </p>
            <button
              onClick={handleGenerate}
              className="px-8 py-3 rounded-xl bg-violet-600 text-white font-semibold text-base hover:bg-violet-500 transition-colors"
            >
              Generate AI Analysis
            </button>
          </div>
        )}

        {/* Loading */}
        {state === 'loading' && (
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-10 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <svg
                className="animate-spin h-5 w-5 text-violet-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span className="text-zinc-300 font-medium">Claude is analyzing...</span>
            </div>
            <p className="text-zinc-600 text-sm">This usually takes 5–10 seconds</p>
          </div>
        )}

        {/* Result */}
        {state === 'result' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
              <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
                  AI Draft — Edit before sending
                </h2>
                <span className="text-xs text-zinc-600">Editable</span>
              </div>
              <div className="p-4">
                <textarea
                  value={editedDraft}
                  onChange={(e) => setEditedDraft(e.target.value)}
                  rows={16}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-200 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleApproveAndSend}
                className="flex-1 px-6 py-3 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-500 transition-colors"
              >
                Approve & Send to Client
              </button>
              <button
                onClick={handleDiscard}
                className="flex-1 px-6 py-3 rounded-xl bg-zinc-700 text-zinc-300 font-medium hover:bg-zinc-600 transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* Sent */}
        {state === 'sent' && (
          <div className="rounded-xl bg-emerald-950 border border-emerald-800 p-8 text-center">
            <p className="text-emerald-400 text-xl font-semibold mb-2">
              Sent to {clientInfo?.name ?? 'client'}!
            </p>
            <p className="text-emerald-600 text-sm mb-6">
              The analysis has been saved to the client's feedback history.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/clients/${clientId}`}
                className="px-6 py-2.5 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
              >
                Back to client
              </Link>
              <button
                onClick={handleDiscard}
                className="px-6 py-2.5 rounded-lg bg-zinc-700 text-zinc-300 text-sm font-medium hover:bg-zinc-600 transition-colors"
              >
                Generate another
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
