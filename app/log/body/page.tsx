'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LogBodyPage() {
  const router = useRouter()

  const today = new Date().toISOString().split('T')[0]

  const [date, setDate] = useState(today)
  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [waist, setWaist] = useState('')
  const [hip, setHip] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    const supabase = createClient()
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error: dbError } = await supabase.from('body_logs').insert({
      user_id: user.id,
      date,
      weight_lbs: weight ? Number(weight) : null,
      body_fat_pct: bodyFat ? Number(bodyFat) : null,
      waist_in: waist ? Number(waist) : null,
      hip_in: hip ? Number(hip) : null,
      notes: notes.trim() || null,
    })

    if (dbError) {
      setError(dbError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  function resetForm() {
    setDate(today)
    setWeight('')
    setBodyFat('')
    setWaist('')
    setHip('')
    setNotes('')
    setSuccess(false)
    setError(null)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-3">⚖️</div>
          <h2 className="text-zinc-100 text-xl font-semibold mb-1">Body log saved!</h2>
          <p className="text-zinc-400 text-sm mb-6">Progress is built one data point at a time.</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={resetForm}
              className="h-12 w-full rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors"
            >
              Log another measurement
            </button>
            <Link
              href="/client-dashboard"
              className="h-12 w-full rounded-xl border border-zinc-700 hover:border-zinc-600 text-zinc-300 font-medium text-sm flex items-center justify-center transition-colors"
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
          <h1 className="text-2xl font-semibold text-zinc-100">Log Body</h1>
          <p className="text-zinc-500 text-sm mt-1">Track weight, body fat, and measurements.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              max={today}
              className="h-12 px-4 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
            />
          </div>

          {/* Weight */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">Weight (lbs) <span className="text-zinc-600 font-normal">required</span></label>
            <input
              type="number"
              min="50"
              max="600"
              step="0.1"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder="e.g. 145.5"
              required
              className="h-12 px-4 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
            />
          </div>

          {/* Body fat */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">Body Fat % <span className="text-zinc-600 font-normal">optional</span></label>
            <input
              type="number"
              min="5"
              max="60"
              step="0.1"
              value={bodyFat}
              onChange={e => setBodyFat(e.target.value)}
              placeholder="e.g. 22.5"
              className="h-12 px-4 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
            />
          </div>

          {/* Measurements */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-zinc-300">Measurements <span className="text-zinc-600 font-normal">optional</span></label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-zinc-500">Waist (in)</span>
                <input
                  type="number"
                  min="18"
                  max="70"
                  step="0.25"
                  value={waist}
                  onChange={e => setWaist(e.target.value)}
                  placeholder="e.g. 28.5"
                  className="h-12 px-4 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-zinc-500">Hip (in)</span>
                <input
                  type="number"
                  min="24"
                  max="80"
                  step="0.25"
                  value={hip}
                  onChange={e => setHip(e.target.value)}
                  placeholder="e.g. 38.0"
                  className="h-12 px-4 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Time of day measured, cycle phase, any context…"
              rows={3}
              className="px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm resize-none"
            />
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
            {loading ? 'Saving…' : 'Save Body Log'}
          </button>
        </form>
      </div>
    </div>
  )
}
