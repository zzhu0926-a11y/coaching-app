'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const ENERGY_EMOJIS = ['😴', '💤', '😐', '🙂', '⚡']
const MOOD_EMOJIS = ['😔', '😕', '😐', '🙂', '😄']
const STAR_FILLED = '★'
const STAR_EMPTY = '☆'

function EmojiRating({
  emojis,
  value,
  onChange,
  label,
}: {
  emojis: string[]
  value: number
  onChange: (v: number) => void
  label: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-zinc-300">{label}</span>
      <div className="flex gap-2">
        {emojis.map((emoji, idx) => {
          const val = idx + 1
          const selected = value === val
          return (
            <button
              key={val}
              type="button"
              onClick={() => onChange(val)}
              className={`flex-1 h-12 rounded-xl flex items-center justify-center text-xl transition-all border ${
                selected
                  ? 'bg-violet-600 border-violet-500 scale-105'
                  : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600 hover:bg-zinc-700'
              }`}
            >
              {emoji}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`text-2xl transition-colors ${
            star <= value ? 'text-amber-400' : 'text-zinc-700 hover:text-zinc-500'
          }`}
        >
          {star <= value ? STAR_FILLED : STAR_EMPTY}
        </button>
      ))}
    </div>
  )
}

export default function LogCheckinPage() {
  const router = useRouter()

  const today = new Date().toISOString().split('T')[0]

  const [date, setDate] = useState(today)
  const [energy, setEnergy] = useState(3)
  const [mood, setMood] = useState(3)
  const [sleepHrs, setSleepHrs] = useState('7.5')
  const [sleepQuality, setSleepQuality] = useState(3)
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

    const { error: dbError } = await supabase.from('daily_checkins').insert({
      user_id: user.id,
      date,
      energy,
      mood,
      sleep_hrs: sleepHrs ? Number(sleepHrs) : null,
      sleep_quality: sleepQuality,
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
    setEnergy(3)
    setMood(3)
    setSleepHrs('7.5')
    setSleepQuality(3)
    setNotes('')
    setSuccess(false)
    setError(null)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-3">✅</div>
          <h2 className="text-zinc-100 text-xl font-semibold mb-1">Checked in!</h2>
          <p className="text-zinc-400 text-sm mb-6">Awareness is the first step.</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={resetForm}
              className="h-12 w-full rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors"
            >
              Log another day
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
          <h1 className="text-2xl font-semibold text-zinc-100">Daily Check-In</h1>
          <p className="text-zinc-500 text-sm mt-1">How are you feeling today?</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
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

          {/* Energy */}
          <EmojiRating
            emojis={ENERGY_EMOJIS}
            value={energy}
            onChange={setEnergy}
            label="Energy Level"
          />

          {/* Mood */}
          <EmojiRating
            emojis={MOOD_EMOJIS}
            value={mood}
            onChange={setMood}
            label="Mood"
          />

          {/* Sleep hours */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-300">
              Sleep Hours <span className="text-zinc-400 font-normal">{sleepHrs}h</span>
            </label>
            <input
              type="range"
              min="3"
              max="12"
              step="0.5"
              value={sleepHrs}
              onChange={e => setSleepHrs(e.target.value)}
              className="w-full accent-violet-500 h-2"
            />
            <div className="flex justify-between text-xs text-zinc-600">
              <span>3h</span>
              <span>7.5h</span>
              <span>12h</span>
            </div>
          </div>

          {/* Sleep quality */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-300">Sleep Quality</label>
            <StarRating value={sleepQuality} onChange={setSleepQuality} />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Stress levels, recovery notes, anything on your mind?"
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
            {loading ? 'Saving…' : 'Save Check-In'}
          </button>
        </form>
      </div>
    </div>
  )
}
