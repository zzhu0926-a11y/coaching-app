'use client'

export const dynamic = 'force-dynamic'

import { useState, useCallback, useEffect } from 'react'
import { calculate, CalculatorInputs, CalculatorResults, ActivityLevel } from '@/lib/calculator'
import NavBar from '@/components/NavBar'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; description: string }[] = [
  { value: 1.2, label: 'Sedentary', description: 'Little or no exercise' },
  { value: 1.375, label: 'Light', description: '1–3 days/week' },
  { value: 1.55, label: 'Moderate', description: '3–5 days/week' },
  { value: 1.725, label: 'Active', description: '6–7 days/week' },
  { value: 1.9, label: 'Very Active', description: '2× daily / intense' },
]

const PHASE_META: Record<string, { emoji: string; label: string; borderColor: string; textColor: string; bgColor: string }> = {
  menstrual: {
    emoji: '🩸',
    label: 'Menstrual',
    borderColor: 'border-rose-800/40',
    textColor: 'text-rose-400',
    bgColor: 'bg-rose-950/30',
  },
  follicular: {
    emoji: '🌱',
    label: 'Follicular',
    borderColor: 'border-sky-800/40',
    textColor: 'text-sky-400',
    bgColor: 'bg-sky-950/30',
  },
  ovulatory: {
    emoji: '⚡',
    label: 'Ovulatory',
    borderColor: 'border-purple-800/40',
    textColor: 'text-purple-400',
    bgColor: 'bg-purple-950/30',
  },
  luteal: {
    emoji: '🌙',
    label: 'Luteal',
    borderColor: 'border-amber-800/40',
    textColor: 'text-amber-400',
    bgColor: 'bg-amber-950/30',
  },
}

function MacroCard({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="text-center py-2">
      <p className="text-zinc-500 text-xs mb-0.5">{label}</p>
      <p className="text-zinc-100 text-xl font-bold">{value}</p>
      <p className="text-zinc-600 text-xs">{unit}</p>
    </div>
  )
}

function PhaseCard({ phaseKey, phase }: { phaseKey: string; phase: CalculatorResults['phases']['menstrual'] }) {
  const meta = PHASE_META[phaseKey]
  return (
    <div className={`rounded-xl border p-4 ${meta.bgColor} ${meta.borderColor}`}>
      <p className={`font-semibold text-sm mb-3 ${meta.textColor}`}>
        {meta.emoji} {meta.label}
      </p>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div>
          <p className="text-zinc-500 text-xs">Calories</p>
          <p className="text-zinc-100 font-bold">{phase.calories}</p>
        </div>
        <div>
          <p className="text-zinc-500 text-xs">Deficit</p>
          <p className="text-zinc-400 font-medium text-sm">{phase.deficit} kcal</p>
        </div>
        <div>
          <p className="text-zinc-500 text-xs">Protein</p>
          <p className="text-zinc-100 font-semibold">{phase.proteinG}g</p>
        </div>
        <div>
          <p className="text-zinc-500 text-xs">Carbs</p>
          <p className="text-zinc-100 font-semibold">{phase.carbsG}g</p>
        </div>
        <div className="col-span-2">
          <p className="text-zinc-500 text-xs">Fat</p>
          <p className="text-zinc-100 font-semibold">{phase.fatG}g</p>
        </div>
      </div>
    </div>
  )
}

export default function CalculatorPage() {
  const router = useRouter()

  // We need user role for NavBar — fetch lazily
  const [userInfo, setUserInfo] = useState<{ name: string; role: 'coach' | 'client' } | null>(null)

  // Inputs
  const [gender, setGender] = useState<'female' | 'male'>('female')
  const [unit, setUnit] = useState<'imperial' | 'metric'>('imperial')
  const [age, setAge] = useState('28')
  const [heightFt, setHeightFt] = useState('5')
  const [heightIn, setHeightIn] = useState('5')
  const [heightCm, setHeightCm] = useState('165')
  const [weightLbs, setWeightLbs] = useState('145')
  const [weightKg, setWeightKg] = useState('66')
  const [currentBf, setCurrentBf] = useState('25')
  const [goalBf, setGoalBf] = useState('20')
  const [weeks, setWeeks] = useState('12')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(1.375)
  const [proteinSlider, setProteinSlider] = useState(1.8)

  // Results
  const [results, setResults] = useState<CalculatorResults | null>(null)
  const [calcError, setCalcError] = useState<string | null>(null)

  // Save state
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Load user info on mount
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('users').select('name, role').eq('id', user.id).single().then(({ data }) => {
        if (data) setUserInfo({ name: data.name ?? user.email ?? '', role: data.role })
      })
    })
  }, [])

  const getInputs = useCallback((): CalculatorInputs | null => {
    let wKg: number
    let hCm: number

    if (unit === 'imperial') {
      wKg = Number(weightLbs) * 0.453592
      hCm = (Number(heightFt) * 12 + Number(heightIn)) * 2.54
    } else {
      wKg = Number(weightKg)
      hCm = Number(heightCm)
    }

    if (!wKg || !hCm || !age || !currentBf || !goalBf || !weeks) return null

    return {
      gender,
      age: Number(age),
      weightKg: wKg,
      heightCm: hCm,
      currentBfPct: Number(currentBf),
      goalBfPct: Number(goalBf),
      weeks: Number(weeks),
      activityLevel,
      proteinPerKgLbm: proteinSlider,
    }
  }, [gender, unit, age, heightFt, heightIn, heightCm, weightLbs, weightKg, currentBf, goalBf, weeks, activityLevel, proteinSlider])

  function handleCalculate() {
    setCalcError(null)
    setSaveSuccess(false)
    const inputs = getInputs()
    if (!inputs) {
      setCalcError('Please fill in all required fields.')
      return
    }
    try {
      const res = calculate(inputs)
      setResults(res)
    } catch (err: any) {
      setCalcError(err.message ?? 'Calculation error.')
    }
  }

  async function handleSaveGoals() {
    if (!results) return
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    // Get the current user's ID to pass as clientId
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const phaseAdjustments: Record<string, { calories: number; protein_g: number; carbs_g: number; fat_g: number }> = {}
    for (const [phase, targets] of Object.entries(results.phases)) {
      phaseAdjustments[phase] = {
        calories: targets.calories,
        protein_g: targets.proteinG,
        carbs_g: targets.carbsG,
        fat_g: targets.fatG,
      }
    }

    const res = await fetch('/api/goals/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: user.id,
        calories: results.base.calories,
        protein_g: results.base.proteinG,
        carbs_g: results.base.carbsG,
        fat_g: results.base.fatG,
        phase_adjustments: phaseAdjustments,
      }),
    })

    if (res.ok) {
      setSaveSuccess(true)
    } else {
      const data = await res.json().catch(() => ({}))
      setSaveError(data.error ?? 'Failed to save goals.')
    }

    setSaving(false)
  }

  const inputClass = 'h-12 px-4 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm w-full'
  const toggleBase = 'flex-1 h-10 rounded-lg text-sm font-medium transition-colors'
  const toggleActive = 'bg-violet-600 text-white'
  const toggleInactive = 'text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700'

  return (
    <div className="min-h-screen bg-zinc-950 pb-16">
      {userInfo && <NavBar role={userInfo.role} name={userInfo.name} />}

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-100">Calorie Calculator</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Cycle-aware deficit calculator with phase-adjusted macro targets.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {/* Gender + Unit toggles */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Gender</label>
              <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
                {(['female', 'male'] as const).map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`${toggleBase} ${gender === g ? toggleActive : toggleInactive}`}
                  >
                    {g === 'female' ? 'Female' : 'Male'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Units</label>
              <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
                {(['imperial', 'metric'] as const).map(u => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    className={`${toggleBase} ${unit === u ? toggleActive : toggleInactive}`}
                  >
                    {u === 'imperial' ? 'Imperial' : 'Metric'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Age */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">Age</label>
            <input type="number" min="16" max="80" value={age} onChange={e => setAge(e.target.value)} placeholder="28" className={inputClass} />
          </div>

          {/* Height */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">Height</label>
            {unit === 'imperial' ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-600">Feet</span>
                  <input type="number" min="4" max="7" value={heightFt} onChange={e => setHeightFt(e.target.value)} placeholder="5" className={inputClass} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-600">Inches</span>
                  <input type="number" min="0" max="11" value={heightIn} onChange={e => setHeightIn(e.target.value)} placeholder="5" className={inputClass} />
                </div>
              </div>
            ) : (
              <input type="number" min="140" max="220" value={heightCm} onChange={e => setHeightCm(e.target.value)} placeholder="165" className={inputClass} />
            )}
          </div>

          {/* Weight */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">Weight</label>
            {unit === 'imperial' ? (
              <div className="relative">
                <input type="number" min="80" max="400" step="0.5" value={weightLbs} onChange={e => setWeightLbs(e.target.value)} placeholder="145" className={inputClass} />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">lbs</span>
              </div>
            ) : (
              <div className="relative">
                <input type="number" min="35" max="180" step="0.1" value={weightKg} onChange={e => setWeightKg(e.target.value)} placeholder="66" className={inputClass} />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">kg</span>
              </div>
            )}
          </div>

          {/* Body fat */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-300">Current Body Fat %</label>
              <div className="relative">
                <input type="number" min="5" max="55" step="0.5" value={currentBf} onChange={e => setCurrentBf(e.target.value)} placeholder="25" className={inputClass} />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">%</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-300">Goal Body Fat %</label>
              <div className="relative">
                <input type="number" min="12" max="45" step="0.5" value={goalBf} onChange={e => setGoalBf(e.target.value)} placeholder="20" className={inputClass} />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">%</span>
              </div>
            </div>
          </div>

          {/* Timeframe */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">Timeframe (weeks)</label>
            <div className="relative">
              <input type="number" min="4" max="52" value={weeks} onChange={e => setWeeks(e.target.value)} placeholder="12" className={inputClass} />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">weeks</span>
            </div>
          </div>

          {/* Activity level */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-300">Activity Level</label>
            <div className="flex flex-col gap-2">
              {ACTIVITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setActivityLevel(opt.value)}
                  className={`flex items-center justify-between h-12 px-4 rounded-xl border text-sm transition-colors ${
                    activityLevel === opt.value
                      ? 'bg-violet-900/40 border-violet-700/60 text-violet-200'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-xs opacity-70">{opt.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Protein slider */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-300">
              Protein Target{' '}
              <span className="text-violet-400 font-normal">{proteinSlider.toFixed(1)} g/kg LBM</span>
            </label>
            <input
              type="range"
              min="1.6"
              max="2.0"
              step="0.05"
              value={proteinSlider}
              onChange={e => setProteinSlider(Number(e.target.value))}
              className="w-full accent-violet-500 h-2"
            />
            <div className="flex justify-between text-xs text-zinc-600">
              <span>1.6 (minimum)</span>
              <span>1.8 (recommended)</span>
              <span>2.0 (high)</span>
            </div>
          </div>

          {/* Calculate button */}
          {calcError && (
            <div className="rounded-xl bg-red-950/60 border border-red-800/50 px-4 py-3 text-sm text-red-400">
              {calcError}
            </div>
          )}

          <button
            type="button"
            onClick={handleCalculate}
            className="h-12 w-full rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors"
          >
            Calculate
          </button>

          {/* Results */}
          {results && (
            <div className="flex flex-col gap-6 mt-2">
              {/* Warnings */}
              {results.warnings.length > 0 && (
                <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl px-4 py-3 flex flex-col gap-1.5">
                  {results.warnings.map((w, i) => (
                    <p key={i} className="text-amber-300 text-sm flex items-start gap-2">
                      <span className="shrink-0 mt-0.5">⚠️</span>
                      {w}
                    </p>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <h2 className="text-sm font-medium text-zinc-400 mb-4">Metabolic Summary</h2>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'BMR', value: results.bmr, unit: 'kcal' },
                    { label: 'TDEE', value: results.tdee, unit: 'kcal' },
                    { label: 'Daily Deficit', value: results.dailyDeficit, unit: 'kcal' },
                    { label: 'LBM', value: results.lbmKg.toFixed(1), unit: 'kg' },
                    { label: 'Fat to Lose', value: results.fatToLoseKg.toFixed(1), unit: 'kg' },
                    { label: 'Weekly Loss', value: `${results.weeklyLossKg.toFixed(2)}`, unit: 'kg/wk' },
                  ].map(({ label, value, unit: u }) => (
                    <div key={label} className="text-center">
                      <p className="text-zinc-500 text-xs">{label}</p>
                      <p className="text-zinc-100 font-semibold">{value}</p>
                      <p className="text-zinc-600 text-xs">{u}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Base macros */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <h2 className="text-sm font-medium text-zinc-400 mb-4">Base Daily Targets</h2>
                <div className="grid grid-cols-4 gap-3 divide-x divide-zinc-800">
                  <MacroCard label="Calories" value={results.base.calories} unit="kcal" />
                  <MacroCard label="Protein" value={results.base.proteinG} unit="g" />
                  <MacroCard label="Carbs" value={results.base.carbsG} unit="g" />
                  <MacroCard label="Fat" value={results.base.fatG} unit="g" />
                </div>
              </div>

              {/* Phase targets */}
              <div>
                <h2 className="text-sm font-medium text-zinc-400 mb-3">Phase-Adjusted Targets</h2>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(results.phases).map(([key, phase]) => (
                    <PhaseCard key={key} phaseKey={key} phase={phase} />
                  ))}
                </div>
              </div>

              {/* Save as goals */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3">
                <div>
                  <h3 className="text-zinc-200 font-medium text-sm">Save as My Goals</h3>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    Sets your base macros and phase-adjusted targets in the app.
                  </p>
                </div>

                {saveSuccess && (
                  <div className="rounded-xl bg-green-950/50 border border-green-800/40 px-4 py-2 text-sm text-green-400">
                    Goals saved! Your dashboard will now show these targets.
                  </div>
                )}

                {saveError && (
                  <div className="rounded-xl bg-red-950/60 border border-red-800/50 px-4 py-2 text-sm text-red-400">
                    {saveError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSaveGoals}
                  disabled={saving || saveSuccess}
                  className="h-12 w-full rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
                >
                  {saving ? 'Saving…' : saveSuccess ? 'Saved!' : 'Save as My Goals'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
