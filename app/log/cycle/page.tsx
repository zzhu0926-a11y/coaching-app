'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getCurrentPhase, getPhaseLabel } from '@/lib/cycle'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LogCyclePage() {
  const router = useRouter()

  const today = new Date().toISOString().split('T')[0]

  const [startDate, setStartDate] = useState(today)
  const [cycleLength, setCycleLength] = useState(28)
  const [loading, setLoading] = useState(false)
  const [savedPhase, setSavedPhase] = useState<ReturnType<typeof getCurrentPhase> | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    const supabase = createClient()
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error: dbError } = await supabase.from('cycle_logs').insert({
      user_id: user.id,
      cycle_start_date: startDate,
      cycle_length_days: cycleLength,
    })

    if (dbError) {
      setError(dbError.message)
      setLoading(false)
      return
    }

    const phaseInfo = getCurrentPhase(startDate, cycleLength)
    setSavedPhase(phaseInfo)
    setLoading(false)
  }

  if (savedPhase) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-3">{savedPhase.emoji}</div>
          <h2 className="text-zinc-100 text-xl font-semibold mb-1">Cycle logged!</h2>

          {/* Current phase banner */}
          <div className={`rounded-xl border px-4 py-3 my-4 text-left ${savedPhase.bgColor}`}>
            <p className={`font-semibold text-sm ${savedPhase.color}`}>
              {savedPhase.emoji} {getPhaseLabel(savedPhase.phase)}
            </p>
            <p className="text-zinc-400 text-xs mt-0.5">Day {savedPhase.dayOfCycle} of cycle</p>
            <p className="text-zinc-300 text-sm mt-2">{savedPhase.tip}</p>
          </div>

          <div className="flex flex-col gap-3 mt-2">
            <Link
              href="/client-dashboard"
              className="h-12 w-full rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm flex items-center justify-center transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 pb-12">
      <div className="max-w-xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/client-dashboard"
            className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors inline-flex items-center gap-1 mb-4"
          >
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-zinc-100">Log Cycle</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Track your period start date to unlock phase-based nutrition targets.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Period start date */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-300">
              When did your period start?
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              max={today}
              required
              className="h-12 px-4 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
            />
          </div>

          {/* Cycle length */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-300">
              Typical cycle length <span className="text-violet-400 font-normal">{cycleLength} days</span>
            </label>
            <input
              type="range"
              min="21"
              max="35"
              step="1"
              value={cycleLength}
              onChange={e => setCycleLength(Number(e.target.value))}
              className="w-full accent-violet-500 h-2"
            />
            <div className="flex justify-between text-xs text-zinc-600">
              <span>21 days</span>
              <span>28 (default)</span>
              <span>35 days</span>
            </div>
          </div>

          {/* Live phase preview */}
          {startDate && (() => {
            const preview = getCurrentPhase(startDate, cycleLength)
            if (!preview) return null
            return (
              <div className={`rounded-xl border px-4 py-3 ${preview.bgColor}`}>
                <p className={`font-semibold text-sm ${preview.color}`}>
                  {preview.emoji} Current phase: {getPhaseLabel(preview.phase)}
                </p>
                <p className="text-zinc-400 text-xs mt-0.5">
                  Day {preview.dayOfCycle} &middot; {preview.daysRemaining} days left in phase
                </p>
                <p className="text-zinc-300 text-sm mt-1">{preview.tip}</p>
              </div>
            )
          })()}

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-500">
            Your cycle data is used to personalize your daily calorie and macro targets. It is never shared.
          </div>

          {error && (
            <div className="rounded-xl bg-red-950/60 border border-red-800/50 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
          >
            {loading ? 'Saving…' : 'Save Cycle Data'}
          </button>
        </form>
      </div>
    </div>
  )
}
