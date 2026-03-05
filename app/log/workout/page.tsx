'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Exercise {
  name: string
  sets: string
  reps: string
  weight: string
}

const emptyExercise = (): Exercise => ({ name: '', sets: '', reps: '', weight: '' })

export default function LogWorkoutPage() {
  const router = useRouter()


  const today = new Date().toISOString().split('T')[0]

  const [date, setDate] = useState(today)
  const [exercises, setExercises] = useState<Exercise[]>([emptyExercise()])
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addExercise() {
    setExercises(prev => [...prev, emptyExercise()])
  }

  function removeExercise(idx: number) {
    setExercises(prev => prev.filter((_, i) => i !== idx))
  }

  function updateExercise(idx: number, field: keyof Exercise, value: string) {
    setExercises(prev => prev.map((ex, i) => (i === idx ? { ...ex, [field]: value } : ex)))
  }

  async function handleSubmit(e: React.FormEvent) {
    const supabase = createClient()
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const exercisesPayload = exercises
      .filter(ex => ex.name.trim())
      .map(ex => ({
        name: ex.name.trim(),
        sets: ex.sets ? Number(ex.sets) : null,
        reps: ex.reps ? Number(ex.reps) : null,
        weight_lbs: ex.weight ? Number(ex.weight) : null,
      }))

    const { error: dbError } = await supabase.from('workout_logs').insert({
      user_id: user.id,
      date,
      exercises: exercisesPayload,
      duration_min: duration ? Number(duration) : null,
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
    setExercises([emptyExercise()])
    setDuration('')
    setNotes('')
    setSuccess(false)
    setError(null)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-3">🏋️</div>
          <h2 className="text-zinc-100 text-xl font-semibold mb-1">Workout logged!</h2>
          <p className="text-zinc-400 text-sm mb-6">Great work. Keep it up.</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={resetForm}
              className="h-12 w-full rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors"
            >
              Log another workout
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
          <h1 className="text-2xl font-semibold text-zinc-100">Log Workout</h1>
          <p className="text-zinc-500 text-sm mt-1">Track your session exercises and duration.</p>
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

          {/* Exercises */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-300">Exercises</label>
              <button
                type="button"
                onClick={addExercise}
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium"
              >
                + Add exercise
              </button>
            </div>

            {exercises.map((ex, idx) => (
              <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={ex.name}
                    onChange={e => updateExercise(idx, 'name', e.target.value)}
                    placeholder="Exercise name (e.g. Squat)"
                    className="flex-1 h-10 px-3 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                  />
                  {exercises.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeExercise(idx)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-950/30 transition-colors text-lg"
                    >
                      ×
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { field: 'sets' as const, placeholder: 'Sets', label: 'Sets' },
                    { field: 'reps' as const, placeholder: 'Reps', label: 'Reps' },
                    { field: 'weight' as const, placeholder: 'lbs', label: 'Weight' },
                  ].map(({ field, placeholder, label }) => (
                    <div key={field} className="flex flex-col gap-1">
                      <span className="text-xs text-zinc-600">{label}</span>
                      <input
                        type="number"
                        min="0"
                        value={ex[field]}
                        onChange={e => updateExercise(idx, field, e.target.value)}
                        placeholder={placeholder}
                        className="h-9 px-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm text-center"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Duration */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">Duration (minutes)</label>
            <input
              type="number"
              min="1"
              max="300"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              placeholder="60"
              className="h-12 px-4 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="How did it feel? Any PRs?"
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
            {loading ? 'Saving…' : 'Save Workout'}
          </button>
        </form>
      </div>
    </div>
  )
}
