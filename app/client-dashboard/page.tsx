export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { getCurrentPhase, getPhaseLabel } from '@/lib/cycle'
import { getPhaseAdjustedGoals } from '@/lib/calculator'
import Link from 'next/link'
import NavBar from '@/components/NavBar'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getActivityDot(lastDate: string | null): { color: string; label: string } {
  if (!lastDate) return { color: 'bg-red-500', label: 'Never logged' }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const last = new Date(lastDate)
  last.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return { color: 'bg-green-500', label: 'Today' }
  if (diffDays <= 3) return { color: 'bg-yellow-500', label: `${diffDays}d ago` }
  return { color: 'bg-red-500', label: `${diffDays}d ago` }
}

function computeStreak(logDates: string[]): number {
  if (!logDates.length) return 0
  const unique = Array.from(new Set(logDates)).sort().reverse()
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < unique.length; i++) {
    const d = new Date(unique[i])
    d.setHours(0, 0, 0, 0)
    const expected = new Date(today)
    expected.setDate(today.getDate() - i)
    if (d.getTime() === expected.getTime()) {
      streak++
    } else {
      break
    }
  }
  return streak
}

export default async function ClientDashboardPage() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch all data in parallel
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

  const [
    profileRes,
    goalsRes,
    cycleRes,
    workoutRes,
    nutritionRes,
    bodyRes,
    checkinRes,
    plansRes,
    feedbackRes,
  ] = await Promise.all([
    supabase.from('users').select('name, role').eq('id', user.id).single(),
    supabase
      .from('nutrition_goals')
      .select('*')
      .eq('client_id', user.id)
      .eq('active', true)
      .single(),
    supabase
      .from('cycle_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('cycle_start_date', { ascending: false })
      .limit(1),
    supabase
      .from('workout_logs')
      .select('date')
      .eq('user_id', user.id)
      .gte('date', sevenDaysAgoStr)
      .order('date', { ascending: false }),
    supabase
      .from('nutrition_logs')
      .select('date')
      .eq('user_id', user.id)
      .gte('date', sevenDaysAgoStr)
      .order('date', { ascending: false }),
    supabase
      .from('body_logs')
      .select('date')
      .eq('user_id', user.id)
      .gte('date', sevenDaysAgoStr)
      .order('date', { ascending: false }),
    supabase
      .from('daily_checkins')
      .select('date')
      .eq('user_id', user.id)
      .gte('date', sevenDaysAgoStr)
      .order('date', { ascending: false }),
    supabase
      .from('plans')
      .select('workout_plan, nutrition_plan, created_at')
      .eq('client_id', user.id)
      .eq('active', true)
      .single(),
    supabase
      .from('feedback')
      .select('id')
      .eq('client_id', user.id)
      .eq('read_by_client', false),
  ])

  const profile = profileRes.data
  if (!profile || profile.role !== 'client') redirect('/dashboard')

  const goals = goalsRes.data
  const latestCycle = cycleRes.data?.[0] ?? null
  const plan = plansRes.data
  const unreadFeedback = feedbackRes.data?.length ?? 0

  // Current cycle phase
  const phaseInfo = latestCycle
    ? getCurrentPhase(latestCycle.cycle_start_date, latestCycle.cycle_length_days ?? 28)
    : null

  // Phase-adjusted goals
  const displayGoals = goals && phaseInfo
    ? getPhaseAdjustedGoals(
        { calories: goals.calories, protein_g: goals.protein_g, carbs_g: goals.carbs_g, fat_g: goals.fat_g },
        goals.phase_adjustments ?? {},
        phaseInfo.phase
      )
    : goals
      ? { calories: goals.calories, protein_g: goals.protein_g, carbs_g: goals.carbs_g, fat_g: goals.fat_g }
      : null

  // Recent activity
  type LogEntry = { date: string; type: string }
  const allLogs: LogEntry[] = [
    ...(workoutRes.data ?? []).map(d => ({ date: d.date, type: 'Workout' })),
    ...(nutritionRes.data ?? []).map(d => ({ date: d.date, type: 'Nutrition' })),
    ...(bodyRes.data ?? []).map(d => ({ date: d.date, type: 'Body' })),
    ...(checkinRes.data ?? []).map(d => ({ date: d.date, type: 'Check-in' })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)

  // Streak calculation
  const allDates = [
    ...(workoutRes.data ?? []).map(d => d.date),
    ...(nutritionRes.data ?? []).map(d => d.date),
    ...(bodyRes.data ?? []).map(d => d.date),
    ...(checkinRes.data ?? []).map(d => d.date),
  ]
  const streak = computeStreak(allDates)

  // Last log date for activity dot
  const lastLogDate = allLogs[0]?.date ?? null
  const activityDot = getActivityDot(lastLogDate)

  const LOG_BUTTONS = [
    { href: '/log/workout', label: 'Log Workout', icon: '🏋️' },
    { href: '/log/nutrition', label: 'Log Nutrition', icon: '🥗' },
    { href: '/log/body', label: 'Log Body', icon: '⚖️' },
    { href: '/log/checkin', label: 'Check In', icon: '✅' },
  ]

  return (
    <div className="min-h-screen bg-zinc-950">
      <NavBar role="client" name={profile.name ?? user.email ?? ''} />

      <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">
            {getGreeting()}, {profile.name?.split(' ')[0] ?? 'there'} 👋
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${activityDot.color}`} />
            <span className="text-zinc-500 text-sm">
              Last log: {activityDot.label}
            </span>
            {streak > 0 && (
              <span className="ml-2 text-sm text-amber-400 font-medium">
                🔥 {streak}-day streak
              </span>
            )}
          </div>
        </div>

        {/* Cycle phase banner */}
        {phaseInfo && (
          <div className={`rounded-xl border px-4 py-3 ${phaseInfo.bgColor}`}>
            <p className={`font-semibold text-sm ${phaseInfo.color}`}>
              {phaseInfo.emoji} {getPhaseLabel(phaseInfo.phase)}
              <span className="ml-2 font-normal text-zinc-400">
                — Day {phaseInfo.dayOfCycle} &middot; {phaseInfo.daysRemaining}d left
              </span>
            </p>
            <p className="text-zinc-300 text-sm mt-0.5">{phaseInfo.tip}</p>
          </div>
        )}

        {/* Nutrition goals */}
        {displayGoals ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h2 className="text-sm font-medium text-zinc-400 mb-3">
              Today&apos;s Targets
              {phaseInfo && (
                <span className="ml-2 text-xs text-violet-400">
                  ({getPhaseLabel(phaseInfo.phase)})
                </span>
              )}
            </h2>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Calories', value: displayGoals.calories, unit: 'kcal' },
                { label: 'Protein', value: displayGoals.protein_g, unit: 'g' },
                { label: 'Carbs', value: displayGoals.carbs_g, unit: 'g' },
                { label: 'Fat', value: displayGoals.fat_g, unit: 'g' },
              ].map(({ label, value, unit }) => (
                <div key={label} className="text-center">
                  <p className="text-zinc-500 text-xs">{label}</p>
                  <p className="text-zinc-100 font-semibold text-lg leading-tight">{value}</p>
                  <p className="text-zinc-600 text-xs">{unit}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center text-zinc-500 text-sm">
            No nutrition goals set yet. Your coach will configure these.
          </div>
        )}

        {/* Quick log buttons */}
        <div>
          <h2 className="text-sm font-medium text-zinc-400 mb-3">Quick Log</h2>
          <div className="grid grid-cols-2 gap-3">
            {LOG_BUTTONS.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 h-14 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-colors"
              >
                <span className="text-xl">{icon}</span>
                <span className="text-zinc-200 text-sm font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h2 className="text-sm font-medium text-zinc-400 mb-3">Recent Activity</h2>
          {allLogs.length === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-2">No logs in the past 7 days.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {allLogs.map((log, i) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                    <span className="text-zinc-300 text-sm">{log.type}</span>
                  </div>
                  <span className="text-zinc-600 text-xs">{log.date}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active plan preview */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-zinc-400">Your Plan</h2>
            <Link href="/plan" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
              View full plan →
            </Link>
          </div>
          {plan ? (
            <p className="text-zinc-300 text-sm line-clamp-3 whitespace-pre-line">
              {plan.workout_plan?.slice(0, 200) ?? 'Workout plan loading…'}
              {(plan.workout_plan?.length ?? 0) > 200 && '…'}
            </p>
          ) : (
            <p className="text-zinc-600 text-sm">Your coach hasn&apos;t set a plan yet.</p>
          )}
        </div>

        {/* Feedback badge */}
        {unreadFeedback > 0 && (
          <Link
            href="/feedback"
            className="flex items-center justify-between bg-violet-950/50 border border-violet-800/50 rounded-xl px-4 py-3 hover:bg-violet-950/70 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-violet-400">💬</span>
              <span className="text-violet-200 text-sm font-medium">
                You have {unreadFeedback} new feedback message{unreadFeedback > 1 ? 's' : ''}
              </span>
            </div>
            <span className="text-violet-400 text-sm">→</span>
          </Link>
        )}

        {/* Log cycle link */}
        <div className="text-center pb-4">
          <Link
            href="/log/cycle"
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors underline underline-offset-2"
          >
            {latestCycle ? 'Update cycle data' : 'Log period start date'}
          </Link>
        </div>
      </main>
    </div>
  )
}
