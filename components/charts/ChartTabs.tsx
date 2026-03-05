'use client'

import { useState } from 'react'

type Tab = 'weight' | 'workouts' | 'macros' | 'energy'

interface ChartTabsProps {
  weightData: { date: string; weight_lbs: number | null }[]
  workoutData: { date: string; duration_min: number | null }[]
  nutritionData: {
    date: string
    calories: number | null
    protein_g: number | null
    carbs_g: number | null
    fat_g: number | null
  }[]
  energyData: { date: string; energy: number | null; mood: number | null; sleep_hrs: number | null }[]
}

function Dot({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div
      className={`h-2 w-2 rounded-full ${color}`}
      style={{ opacity: Math.max(0.2, value / max) }}
    />
  )
}

function BarChart({
  data,
  getValue,
  getLabel,
  color,
  unit,
  max,
  emptyMessage,
}: {
  data: any[]
  getValue: (d: any) => number | null
  getLabel: (d: any) => string
  color: string
  unit: string
  max?: number
  emptyMessage?: string
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-zinc-600 text-sm">{emptyMessage ?? 'No data'}</p>
      </div>
    )
  }

  const values = data.map((d) => getValue(d) ?? 0).filter((v) => v > 0)
  const peak = max ?? (values.length > 0 ? Math.max(...values) : 1)

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-end gap-1 h-40 min-w-0 px-1">
        {data.map((d, i) => {
          const val = getValue(d) ?? 0
          const pct = peak > 0 ? (val / peak) * 100 : 0
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-[16px]">
              <span className="text-zinc-500 text-[10px] leading-none hidden sm:block">
                {val > 0 ? `${Math.round(val)}` : ''}
              </span>
              <div className="w-full flex items-end" style={{ height: '120px' }}>
                <div
                  className={`w-full rounded-t ${color} transition-all`}
                  style={{ height: `${Math.max(pct, val > 0 ? 4 : 0)}%` }}
                />
              </div>
              <span className="text-zinc-600 text-[9px] leading-none">
                {getLabel(d)}
              </span>
            </div>
          )
        })}
      </div>
      <p className="text-zinc-600 text-xs text-right mt-1 pr-1">{unit}</p>
    </div>
  )
}

function ScoreRow({ label, data, getVal, color }: {
  label: string
  data: any[]
  getVal: (d: any) => number | null
  color: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-500 text-xs w-20 shrink-0">{label}</span>
      <div className="flex items-center gap-0.5 flex-1">
        {data.map((d, i) => {
          const val = getVal(d) ?? 0
          return (
            <div
              key={i}
              className={`flex-1 h-5 rounded-sm ${val > 0 ? color : 'bg-zinc-800'}`}
              style={{ opacity: val > 0 ? 0.3 + (val / 5) * 0.7 : 1 }}
              title={val > 0 ? `${val}/5` : 'No data'}
            />
          )
        })}
      </div>
    </div>
  )
}

export default function ChartTabs({
  weightData,
  workoutData,
  nutritionData,
  energyData,
}: ChartTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('weight')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'weight', label: 'Weight' },
    { id: 'workouts', label: 'Workouts' },
    { id: 'macros', label: 'Macros' },
    { id: 'energy', label: 'Energy' },
  ]

  const shortDate = (d: string) => {
    const parts = d.split('-')
    return `${parts[1]}/${parts[2]}`
  }

  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-zinc-800">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === t.id
                ? 'text-violet-400 border-b-2 border-violet-500 bg-zinc-900'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Chart area */}
      <div className="p-4">
        {activeTab === 'weight' && (
          <BarChart
            data={weightData}
            getValue={(d) => d.weight_lbs}
            getLabel={(d) => shortDate(d.date)}
            color="bg-violet-500"
            unit="lbs"
            emptyMessage="No body logs in the past 4 weeks"
          />
        )}

        {activeTab === 'workouts' && (
          <BarChart
            data={workoutData}
            getValue={(d) => d.duration_min}
            getLabel={(d) => shortDate(d.date)}
            color="bg-emerald-500"
            unit="min"
            emptyMessage="No workouts logged in the past 4 weeks"
          />
        )}

        {activeTab === 'macros' && (
          <>
            {nutritionData.length === 0 ? (
              <div className="flex items-center justify-center h-40">
                <p className="text-zinc-600 text-sm">No nutrition logs in the past 4 weeks</p>
              </div>
            ) : (
              <div className="space-y-4">
                <BarChart
                  data={nutritionData}
                  getValue={(d) => d.calories}
                  getLabel={(d) => shortDate(d.date)}
                  color="bg-orange-500"
                  unit="kcal"
                />
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800">
                  {(['protein_g', 'carbs_g', 'fat_g'] as const).map((macro) => {
                    const label = macro === 'protein_g' ? 'Protein' : macro === 'carbs_g' ? 'Carbs' : 'Fat'
                    const color =
                      macro === 'protein_g'
                        ? 'text-sky-400'
                        : macro === 'carbs_g'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    const avg =
                      nutritionData.length > 0
                        ? Math.round(
                            nutritionData.reduce((s, d) => s + (d[macro] ?? 0), 0) /
                              nutritionData.filter((d) => d[macro] != null).length || 0
                          )
                        : 0
                    return (
                      <div key={macro} className="text-center">
                        <p className={`text-lg font-semibold ${color}`}>{avg}g</p>
                        <p className="text-zinc-600 text-xs">{label} avg</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'energy' && (
          <>
            {energyData.length === 0 ? (
              <div className="flex items-center justify-center h-40">
                <p className="text-zinc-600 text-sm">No check-ins in the past 4 weeks</p>
              </div>
            ) : (
              <div className="space-y-3">
                <ScoreRow
                  label="Energy"
                  data={energyData}
                  getVal={(d) => d.energy}
                  color="bg-amber-400"
                />
                <ScoreRow
                  label="Mood"
                  data={energyData}
                  getVal={(d) => d.mood}
                  color="bg-violet-400"
                />
                <div className="pt-2 border-t border-zinc-800">
                  <BarChart
                    data={energyData}
                    getValue={(d) => d.sleep_hrs}
                    getLabel={(d) => shortDate(d.date)}
                    color="bg-sky-500"
                    unit="hrs sleep"
                    max={10}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
