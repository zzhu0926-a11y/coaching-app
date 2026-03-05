'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ id: string }>
}

type PlanType = 'workout' | 'nutrition'

interface PlanData {
  content: string
  updatedAt: string | null
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function PlanPage({ params }: PageProps) {
  const { id: clientId } = use(params)

  const [activeTab, setActiveTab] = useState<PlanType>('workout')
  const [plans, setPlans] = useState<Record<PlanType, PlanData>>({
    workout: { content: '', updatedAt: null },
    nutrition: { content: '', updatedAt: null },
  })
  const [saveState, setSaveState] = useState<Record<PlanType, SaveState>>({
    workout: 'idle',
    nutrition: 'idle',
  })
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch(`/api/clients/${clientId}/plans`)
        if (res.ok) {
          const data = await res.json()
          setPlans({
            workout: {
              content: data.workout?.content ?? '',
              updatedAt: data.workout?.created_at ?? null,
            },
            nutrition: {
              content: data.nutrition?.content ?? '',
              updatedAt: data.nutrition?.created_at ?? null,
            },
          })
        } else {
          setLoadError('Failed to load plans')
        }
      } catch {
        setLoadError('Failed to load plans')
      }
    }
    loadPlans()
  }, [clientId])

  async function handleSave(type: PlanType) {
    setSaveState((prev) => ({ ...prev, [type]: 'saving' }))
    try {
      const res = await fetch('/api/plans/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, type, content: plans[type].content }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Error ${res.status}`)
      }
      setSaveState((prev) => ({ ...prev, [type]: 'saved' }))
      setPlans((prev) => ({
        ...prev,
        [type]: { ...prev[type], updatedAt: new Date().toISOString() },
      }))
      setTimeout(() => {
        setSaveState((prev) => ({ ...prev, [type]: 'idle' }))
      }, 3000)
    } catch (err: any) {
      setSaveState((prev) => ({ ...prev, [type]: 'error' }))
      setTimeout(() => {
        setSaveState((prev) => ({ ...prev, [type]: 'idle' }))
      }, 4000)
    }
  }

  function formatUpdated(iso: string | null) {
    if (!iso) return 'Never saved'
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
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
          <span className="text-zinc-100 font-semibold">Edit Plan</span>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Notice */}
        <div className="rounded-lg bg-amber-950/50 border border-amber-800/60 px-4 py-3">
          <p className="text-amber-300 text-sm">
            Changes are visible to client immediately after saving.
          </p>
        </div>

        {loadError && (
          <div className="rounded-lg bg-red-950 border border-red-800 px-4 py-3">
            <p className="text-red-300 text-sm">{loadError}</p>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          {(['workout', 'nutrition'] as PlanType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-violet-600 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab} Plan
            </button>
          ))}
        </div>

        {/* Plan editor */}
        {(['workout', 'nutrition'] as PlanType[]).map((type) =>
          activeTab === type ? (
            <div key={type} className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-zinc-100 font-semibold capitalize">{type} Plan</h2>
                  <p className="text-zinc-600 text-xs mt-0.5">
                    Last updated: {formatUpdated(plans[type].updatedAt)}
                  </p>
                </div>
              </div>

              <div className="p-4">
                <textarea
                  value={plans[type].content}
                  onChange={(e) =>
                    setPlans((prev) => ({
                      ...prev,
                      [type]: { ...prev[type], content: e.target.value },
                    }))
                  }
                  rows={20}
                  placeholder={
                    type === 'workout'
                      ? 'Write the workout plan here...\n\nExample:\nDay 1 — Upper Body\n- Bench press 4x8\n- Rows 4x10\n...'
                      : 'Write the nutrition plan here...\n\nExample:\nCalorie target: 1800 kcal\nProtein: 140g\nCarbs: 180g\nFat: 60g\n\nMeal timing:\n...'
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-200 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent placeholder-zinc-600 font-mono"
                />
              </div>

              <div className="px-4 pb-4 flex items-center gap-3">
                <button
                  onClick={() => handleSave(type)}
                  disabled={saveState[type] === 'saving'}
                  className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    saveState[type] === 'saving'
                      ? 'bg-violet-800 text-violet-300 cursor-not-allowed'
                      : saveState[type] === 'saved'
                      ? 'bg-emerald-700 text-white'
                      : saveState[type] === 'error'
                      ? 'bg-red-700 text-white'
                      : 'bg-violet-600 text-white hover:bg-violet-500'
                  }`}
                >
                  {saveState[type] === 'saving'
                    ? 'Saving...'
                    : saveState[type] === 'saved'
                    ? 'Saved & pushed!'
                    : saveState[type] === 'error'
                    ? 'Save failed'
                    : 'Save & Push to Client'}
                </button>
              </div>
            </div>
          ) : null
        )}
      </main>
    </div>
  )
}
