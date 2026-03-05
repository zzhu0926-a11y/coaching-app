'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ id: string }>
}

interface GoalData {
  id: string
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  set_by: 'client' | 'coach'
  phase_adjustments: Record<string, any> | null
  created_at: string
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function GoalsPage({ params }: PageProps) {
  const { id: clientId } = use(params)

  const [activeGoal, setActiveGoal] = useState<GoalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [form, setForm] = useState({
    calories: '',
    protein_g: '',
    carbs_g: '',
    fat_g: '',
  })
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    async function loadGoals() {
      try {
        const res = await fetch(`/api/clients/${clientId}/goals`)
        if (res.ok) {
          const data = await res.json()
          const goal: GoalData | null = data.activeGoal ?? null
          setActiveGoal(goal)
          if (goal) {
            setForm({
              calories: goal.calories?.toString() ?? '',
              protein_g: goal.protein_g?.toString() ?? '',
              carbs_g: goal.carbs_g?.toString() ?? '',
              fat_g: goal.fat_g?.toString() ?? '',
            })
          }
        } else {
          setLoadError('Failed to load goals')
        }
      } catch {
        setLoadError('Failed to load goals')
      } finally {
        setLoading(false)
      }
    }
    loadGoals()
  }, [clientId])

  async function handleSave() {
    setSaveState('saving')
    setSaveError('')
    try {
      const res = await fetch('/api/goals/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          calories: form.calories ? parseInt(form.calories) : null,
          protein_g: form.protein_g ? parseFloat(form.protein_g) : null,
          carbs_g: form.carbs_g ? parseFloat(form.carbs_g) : null,
          fat_g: form.fat_g ? parseFloat(form.fat_g) : null,
          set_by: 'coach',
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Error ${res.status}`)
      }
      setSaveState('saved')
      // Refresh active goal display
      setActiveGoal({
        id: 'new',
        calories: form.calories ? parseInt(form.calories) : null,
        protein_g: form.protein_g ? parseFloat(form.protein_g) : null,
        carbs_g: form.carbs_g ? parseFloat(form.carbs_g) : null,
        fat_g: form.fat_g ? parseFloat(form.fat_g) : null,
        set_by: 'coach',
        phase_adjustments: activeGoal?.phase_adjustments ?? null,
        created_at: new Date().toISOString(),
      })
      setTimeout(() => setSaveState('idle'), 3000)
    } catch (err: any) {
      setSaveError(err.message ?? 'Failed to save')
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 4000)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-zinc-900/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link
            href={`/clients/${clientId}`}
            className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
          >
            ← Back
          </Link>
          <span className="text-zinc-100 font-semibold">Goals Override</span>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {loadError && (
          <div className="rounded-lg bg-red-950 border border-red-800 px-4 py-3">
            <p className="text-red-300 text-sm">{loadError}</p>
          </div>
        )}

        {/* Current active goals */}
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">
            Current Active Goals
          </h2>

          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg bg-zinc-800 p-3 h-16 animate-pulse" />
              ))}
            </div>
          ) : activeGoal ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  {
                    label: 'Calories',
                    value: activeGoal.calories ? `${activeGoal.calories} kcal` : '—',
                    color: 'text-orange-400',
                  },
                  {
                    label: 'Protein',
                    value: activeGoal.protein_g ? `${activeGoal.protein_g}g` : '—',
                    color: 'text-sky-400',
                  },
                  {
                    label: 'Carbs',
                    value: activeGoal.carbs_g ? `${activeGoal.carbs_g}g` : '—',
                    color: 'text-amber-400',
                  },
                  {
                    label: 'Fat',
                    value: activeGoal.fat_g ? `${activeGoal.fat_g}g` : '—',
                    color: 'text-rose-400',
                  },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="rounded-lg bg-zinc-800 border border-zinc-700 p-3 text-center"
                  >
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                    <p className="text-zinc-500 text-xs mt-1">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                    activeGoal.set_by === 'coach'
                      ? 'bg-violet-900/60 text-violet-300 border-violet-700'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}
                >
                  Set by {activeGoal.set_by}
                </span>
                {activeGoal.created_at && (
                  <span className="text-zinc-600 text-xs">
                    {formatDate(activeGoal.created_at)}
                  </span>
                )}
              </div>

              {/* Phase adjustments */}
              {activeGoal.phase_adjustments &&
                Object.keys(activeGoal.phase_adjustments).length > 0 && (
                  <div className="mt-4 rounded-lg bg-zinc-800 border border-zinc-700 p-4">
                    <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wide mb-2">
                      Phase Adjustments
                    </p>
                    <div className="space-y-1">
                      {Object.entries(activeGoal.phase_adjustments).map(([phase, adj]) => (
                        <p key={phase} className="text-zinc-500 text-sm capitalize">
                          <span className="text-zinc-400">{phase}:</span>{' '}
                          {typeof adj === 'object' ? JSON.stringify(adj) : String(adj)}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
            </>
          ) : (
            <p className="text-zinc-600 text-sm">No active goals set for this client.</p>
          )}
        </div>

        {/* Override form */}
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-1">
            Set Coach Override
          </h2>
          <p className="text-zinc-600 text-xs mb-5">
            This will replace the current active goals. Client will see updated targets immediately.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'calories' as const, label: 'Calories', unit: 'kcal', placeholder: '1800' },
              {
                key: 'protein_g' as const,
                label: 'Protein',
                unit: 'g',
                placeholder: '140',
              },
              { key: 'carbs_g' as const, label: 'Carbs', unit: 'g', placeholder: '180' },
              { key: 'fat_g' as const, label: 'Fat', unit: 'g', placeholder: '60' },
            ].map(({ key, label, unit, placeholder }) => (
              <div key={key}>
                <label className="block text-zinc-400 text-sm mb-1.5">
                  {label}{' '}
                  <span className="text-zinc-600 text-xs">({unit})</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={form[key]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent placeholder-zinc-600"
                />
              </div>
            ))}
          </div>

          {saveError && (
            <p className="text-red-400 text-sm mt-3">{saveError}</p>
          )}

          <button
            onClick={handleSave}
            disabled={saveState === 'saving'}
            className={`mt-5 w-full sm:w-auto px-8 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              saveState === 'saving'
                ? 'bg-violet-800 text-violet-300 cursor-not-allowed'
                : saveState === 'saved'
                ? 'bg-emerald-700 text-white'
                : saveState === 'error'
                ? 'bg-red-700 text-white'
                : 'bg-violet-600 text-white hover:bg-violet-500'
            }`}
          >
            {saveState === 'saving'
              ? 'Saving...'
              : saveState === 'saved'
              ? 'Goals saved!'
              : saveState === 'error'
              ? 'Save failed'
              : 'Save Override'}
          </button>
        </div>
      </main>
    </div>
  )
}
