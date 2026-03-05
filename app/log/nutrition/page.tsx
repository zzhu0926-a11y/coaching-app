'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Meal {
  name: string
  description: string
}

const emptyMeal = (): Meal => ({ name: '', description: '' })

interface Goals {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

function ProgressBar({ value, goal, label, color }: { value: number; goal: number; label: string; color: string }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-zinc-500">{label}</span>
        <span className="text-zinc-400">{value} / {goal}</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color} ${pct >= 100 ? 'opacity-100' : 'opacity-70'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function LogNutritionPage() {
  const router = useRouter()

  const today = new Date().toISOString().split('T')[0]

  const [date, setDate] = useState(today)
  const [meals, setMeals] = useState<Meal[]>([emptyMeal()])
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [goals, setGoals] = useState<Goals | null>(null)

  useEffect(() => {
    async function fetchGoals() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('nutrition_goals')
        .select('calories, protein_g, carbs_g, fat_g')
        .eq('client_id', user.id)
        .eq('active', true)
        .single()
      if (data) setGoals(data)
    }
    fetchGoals()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function addMeal() {
    setMeals(prev => [...prev, emptyMeal()])
  }

  function removeMeal(idx: number) {
    setMeals(prev => prev.filter((_, i) => i !== idx))
  }

  function updateMeal(idx: number, field: keyof Meal, value: string) {
    setMeals(prev => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)))
  }

  async function handleSubmit(e: React.FormEvent) {
    const supabase = createClient()
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const mealsPayload = meals.filter(m => m.name.trim() || m.description.trim())

    const { error: dbError } = await supabase.from('nutrition_logs').insert({
      user_id: user.id,
      date,
      meals: mealsPayload.length ? mealsPayload : null,
      calories: calories ? Number(calories) : null,
      protein_g: protein ? Number(protein) : null,
      carbs_g: carbs ? Number(carbs) : null,
      fat_g: fat ? Number(fat) : null,
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
    setMeals([emptyMeal()])
    setCalories('')
    setProtein('')
    setCarbs('')
    setFat('')
    setNotes('')
    setSuccess(false)
    setError(null)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-3">🥗</div>
          <h2 className="text-zinc-100 text-xl font-semibold mb-1">Nutrition logged!</h2>
          <p className="text-zinc-400 text-sm mb-6">Fueling well is half the work.</p>
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

  const calNum = Number(calories) || 0
  const proNum = Number(protein) || 0
  const carbNum = Number(carbs) || 0
  const fatNum = Number(fat) || 0

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
          <h1 className="text-2xl font-semibold text-zinc-100">Log Nutrition</h1>
          <p className="text-zinc-500 text-sm mt-1">Record your meals and macros for the day.</p>
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

          {/* Meals */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-300">Meals</label>
              <button
                type="button"
                onClick={addMeal}
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium"
              >
                + Add meal
              </button>
            </div>

            {meals.map((meal, idx) => (
              <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={meal.name}
                    onChange={e => updateMeal(idx, 'name', e.target.value)}
                    placeholder="Meal name (e.g. Breakfast)"
                    className="flex-1 h-10 px-3 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                  />
                  {meals.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMeal(idx)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-950/30 transition-colors text-lg"
                    >
                      ×
                    </button>
                  )}
                </div>
                <textarea
                  value={meal.description}
                  onChange={e => updateMeal(idx, 'description', e.target.value)}
                  placeholder="What did you eat?"
                  rows={2}
                  className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm resize-none"
                />
              </div>
            ))}
          </div>

          {/* Macros */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-zinc-300">Macros</label>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-zinc-500">Calories (kcal)</span>
              <input
                type="number"
                min="0"
                max="10000"
                value={calories}
                onChange={e => setCalories(e.target.value)}
                placeholder="e.g. 1800"
                className="h-12 px-4 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Protein (g)', value: protein, setter: setProtein, placeholder: '150' },
                { label: 'Carbs (g)', value: carbs, setter: setCarbs, placeholder: '180' },
                { label: 'Fat (g)', value: fat, setter: setFat, placeholder: '60' },
              ].map(({ label, value, setter, placeholder }) => (
                <div key={label} className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-500">{label}</span>
                  <input
                    type="number"
                    min="0"
                    value={value}
                    onChange={e => setter(e.target.value)}
                    placeholder={placeholder}
                    className="h-12 px-3 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm text-center"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Progress vs goals */}
          {goals && (calNum > 0 || proNum > 0 || carbNum > 0 || fatNum > 0) && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
              <p className="text-xs font-medium text-zinc-400">Progress vs. Goals</p>
              <ProgressBar value={calNum} goal={goals.calories} label="Calories" color="bg-violet-500" />
              <ProgressBar value={proNum} goal={goals.protein_g} label="Protein" color="bg-sky-500" />
              <ProgressBar value={carbNum} goal={goals.carbs_g} label="Carbs" color="bg-amber-500" />
              <ProgressBar value={fatNum} goal={goals.fat_g} label="Fat" color="bg-rose-500" />
            </div>
          )}

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Cravings, challenges, anything worth noting?"
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
            {loading ? 'Saving…' : 'Save Nutrition Log'}
          </button>
        </form>
      </div>
    </div>
  )
}
