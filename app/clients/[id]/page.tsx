export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getClientDataSummary } from '@/lib/data'
import NavBar from '@/components/NavBar'
import ChartTabs from '@/components/charts/ChartTabs'

interface PageProps {
  params: Promise<{ id: string }>
}

function packageColor(pkg: string | null) {
  switch (pkg) {
    case 'kickstart':
      return 'bg-sky-900 text-sky-300 border-sky-700'
    case 'foundation':
      return 'bg-violet-900 text-violet-300 border-violet-700'
    case 'transformation':
      return 'bg-amber-900 text-amber-300 border-amber-700'
    default:
      return 'bg-zinc-800 text-zinc-400 border-zinc-700'
  }
}

function logTypeBadge(type: string) {
  switch (type) {
    case 'workout':
      return 'bg-emerald-900/60 text-emerald-400'
    case 'nutrition':
      return 'bg-orange-900/60 text-orange-400'
    case 'body':
      return 'bg-violet-900/60 text-violet-400'
    case 'checkin':
      return 'bg-sky-900/60 text-sky-400'
    default:
      return 'bg-zinc-800 text-zinc-400'
  }
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { id: clientId } = await params

  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: coachData } = await supabase
    .from('users')
    .select('role, name')
    .eq('id', user.id)
    .single()

  if (!coachData || coachData.role !== 'coach') redirect('/login')

  // Fetch client user info + profile in parallel with data summary
  const [clientUserRes, clientProfileRes, fourWeekData, activePlansRes, activeGoalsRes] =
    await Promise.all([
      supabase.from('users').select('id, name, email').eq('id', clientId).single(),
      supabase
        .from('client_profiles')
        .select('package_type, goals, start_date, active')
        .eq('user_id', clientId)
        .single(),
      getClientDataSummary(supabase, clientId, 4),
      supabase
        .from('plans')
        .select('id, type, content, created_at')
        .eq('client_id', clientId)
        .eq('active', true),
      supabase
        .from('nutrition_goals')
        .select('*')
        .eq('client_id', clientId)
        .eq('active', true)
        .single(),
    ])

  const clientUser = clientUserRes.data
  const clientProfile = clientProfileRes.data
  const activePlans = activePlansRes.data ?? []
  const activeGoal = activeGoalsRes.data

  if (!clientUser) redirect('/clients')

  const { workouts, nutrition, body, checkins } = fourWeekData

  // Build combined recent logs list (last 30 days, sorted desc)
  type LogEntry = { date: string; type: string; summary: string }
  const recentLogs: LogEntry[] = [
    ...workouts.map((w) => ({
      date: w.date,
      type: 'workout',
      summary: w.duration_min
        ? `${w.duration_min} min session`
        : w.notes
        ? w.notes.slice(0, 60)
        : 'Workout logged',
    })),
    ...nutrition.map((n) => ({
      date: n.date,
      type: 'nutrition',
      summary: n.calories
        ? `${n.calories} kcal · ${n.protein_g ?? '?'}g protein`
        : n.notes?.slice(0, 60) ?? 'Nutrition logged',
    })),
    ...body.map((b) => ({
      date: b.date,
      type: 'body',
      summary: b.weight_lbs
        ? `${b.weight_lbs} lbs${b.body_fat_pct ? ` · ${b.body_fat_pct}% BF` : ''}`
        : 'Body log',
    })),
    ...checkins.map((c) => ({
      date: c.date,
      type: 'checkin',
      summary: `Energy ${c.energy ?? '?'}/5 · Mood ${c.mood ?? '?'}/5 · Sleep ${c.sleep_hrs ?? '?'} hrs`,
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 20)

  // Quick stats
  const last30Days = new Date()
  last30Days.setDate(last30Days.getDate() - 30)
  const l30Str = last30Days.toISOString().split('T')[0]

  const daysLogged = new Set([
    ...workouts.filter((w) => w.date >= l30Str).map((w) => w.date),
    ...nutrition.filter((n) => n.date >= l30Str).map((n) => n.date),
    ...body.filter((b) => b.date >= l30Str).map((b) => b.date),
    ...checkins.filter((c) => c.date >= l30Str).map((c) => c.date),
  ]).size

  const avgWeeklyWorkouts = workouts.length > 0 ? (workouts.length / 4).toFixed(1) : '0'

  const avgCalories =
    nutrition.length > 0
      ? Math.round(nutrition.reduce((s, n) => s + (n.calories ?? 0), 0) / nutrition.length)
      : 0

  // Current streak: consecutive days with any log going back from today
  const allLogDates = new Set([
    ...workouts.map((w) => w.date),
    ...nutrition.map((n) => n.date),
    ...body.map((b) => b.date),
    ...checkins.map((c) => c.date),
  ])
  let streak = 0
  const checkDay = new Date()
  checkDay.setHours(0, 0, 0, 0)
  for (let i = 0; i < 28; i++) {
    const ds = checkDay.toISOString().split('T')[0]
    if (allLogDates.has(ds)) {
      streak++
      checkDay.setDate(checkDay.getDate() - 1)
    } else {
      break
    }
  }

  // Charts data
  const weightChartData = body.map((b) => ({ date: b.date, weight_lbs: b.weight_lbs ?? null }))
  const workoutChartData = workouts.map((w) => ({
    date: w.date,
    duration_min: w.duration_min ?? null,
  }))
  const nutritionChartData = nutrition.map((n) => ({
    date: n.date,
    calories: n.calories ?? null,
    protein_g: n.protein_g ?? null,
    carbs_g: n.carbs_g ?? null,
    fat_g: n.fat_g ?? null,
  }))
  const energyChartData = checkins.map((c) => ({
    date: c.date,
    energy: c.energy ?? null,
    mood: c.mood ?? null,
    sleep_hrs: c.sleep_hrs ?? null,
  }))

  const packageType = clientProfile?.package_type ?? null

  return (
    <div className="min-h-screen bg-zinc-950">
      <NavBar role="coach" name={coachData.name ?? ''} />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Back */}
        <Link
          href="/clients"
          className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
        >
          ← All clients
        </Link>

        {/* Client header */}
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-zinc-100">{clientUser.name ?? 'Unnamed'}</h1>
              {packageType && (
                <span
                  className={`text-xs font-medium px-2.5 py-0.5 rounded-full border capitalize ${packageColor(packageType)}`}
                >
                  {packageType}
                </span>
              )}
            </div>
            <p className="text-zinc-500 text-sm mt-0.5">{clientUser.email}</p>
            {clientProfile?.goals && (
              <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
                <span className="text-zinc-600 mr-1">Goals:</span>
                {clientProfile.goals}
              </p>
            )}
            {clientProfile?.start_date && (
              <p className="text-zinc-600 text-xs mt-2">
                Started {new Date(clientProfile.start_date + 'T00:00:00').toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 shrink-0">
            <Link
              href={`/clients/${clientId}/analyze`}
              className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 transition-colors text-center"
            >
              Generate Analysis
            </Link>
            <Link
              href={`/clients/${clientId}/plan`}
              className="px-4 py-2 rounded-lg bg-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-600 transition-colors text-center"
            >
              Edit Plan
            </Link>
            <Link
              href={`/clients/${clientId}/goals`}
              className="px-4 py-2 rounded-lg bg-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-600 transition-colors text-center"
            >
              View Goals
            </Link>
          </div>
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Days logged (30d)', value: daysLogged.toString() },
            { label: 'Avg workouts/wk', value: avgWeeklyWorkouts },
            { label: 'Avg calories', value: avgCalories > 0 ? `${avgCalories} kcal` : '—' },
            { label: 'Current streak', value: `${streak}d` },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 text-center"
            >
              <p className="text-2xl font-bold text-zinc-100">{value}</p>
              <p className="text-zinc-500 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Chart tabs */}
        <ChartTabs
          weightData={weightChartData}
          workoutData={workoutChartData}
          nutritionData={nutritionChartData}
          energyData={energyChartData}
        />

        {/* Active goals summary */}
        {activeGoal && (
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">
              Active Goals
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Calories', value: activeGoal.calories ? `${activeGoal.calories} kcal` : '—' },
                { label: 'Protein', value: activeGoal.protein_g ? `${activeGoal.protein_g}g` : '—' },
                { label: 'Carbs', value: activeGoal.carbs_g ? `${activeGoal.carbs_g}g` : '—' },
                { label: 'Fat', value: activeGoal.fat_g ? `${activeGoal.fat_g}g` : '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-zinc-600 text-xs">{label}</p>
                  <p className="text-zinc-100 font-semibold text-lg">{value}</p>
                </div>
              ))}
            </div>
            <p className="text-zinc-600 text-xs mt-3">
              Set by {activeGoal.set_by} ·{' '}
              {new Date(activeGoal.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
        )}

        {/* Active plans summary */}
        {activePlans.length > 0 && (
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">
              Active Plans
            </h2>
            <div className="space-y-3">
              {activePlans.map((plan) => (
                <div key={plan.id}>
                  <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide mb-1 capitalize">
                    {plan.type} Plan
                  </p>
                  <p className="text-zinc-300 text-sm leading-relaxed line-clamp-3 whitespace-pre-wrap">
                    {plan.content || 'No content yet.'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent logs table */}
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
              Recent Logs
            </h2>
          </div>
          {recentLogs.length === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-10">
              No logs in the past 4 weeks.
            </p>
          ) : (
            <div className="divide-y divide-zinc-800">
              {recentLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-4 px-5 py-3">
                  <span className="text-zinc-500 text-xs w-16 shrink-0 pt-0.5">
                    {formatDate(log.date)}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 capitalize ${logTypeBadge(log.type)}`}
                  >
                    {log.type}
                  </span>
                  <p className="text-zinc-400 text-sm leading-relaxed">{log.summary}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
