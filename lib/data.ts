import { SupabaseClient } from '@supabase/supabase-js'
import { getPhaseFromDay } from './cycle'

// Get the last N weeks of data for a client
export async function getClientDataSummary(
  supabase: SupabaseClient,
  clientId: string,
  weeksBack = 4
) {
  const since = new Date()
  since.setDate(since.getDate() - weeksBack * 7)
  const sinceStr = since.toISOString().split('T')[0]

  const [workouts, nutrition, body, checkins, cycles, goals] = await Promise.all([
    supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', clientId)
      .gte('date', sinceStr)
      .order('date', { ascending: true }),
    supabase
      .from('nutrition_logs')
      .select('*')
      .eq('user_id', clientId)
      .gte('date', sinceStr)
      .order('date', { ascending: true }),
    supabase
      .from('body_logs')
      .select('*')
      .eq('user_id', clientId)
      .gte('date', sinceStr)
      .order('date', { ascending: true }),
    supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', clientId)
      .gte('date', sinceStr)
      .order('date', { ascending: true }),
    supabase
      .from('cycle_logs')
      .select('*')
      .eq('user_id', clientId)
      .order('cycle_start_date', { ascending: false })
      .limit(3),
    supabase
      .from('nutrition_goals')
      .select('*')
      .eq('client_id', clientId)
      .eq('active', true)
      .single(),
  ])

  return {
    workouts: workouts.data ?? [],
    nutrition: nutrition.data ?? [],
    body: body.data ?? [],
    checkins: checkins.data ?? [],
    cycles: cycles.data ?? [],
    activeGoal: goals.data,
  }
}

export function summarizeWorkouts(workouts: any[]): string {
  if (workouts.length === 0) return 'No workouts logged in the past 4 weeks.'
  return `${workouts.length} sessions logged. Average ${Math.round(workouts.length / 4)} per week. Last workout: ${workouts[workouts.length - 1]?.date}.`
}

export function summarizeNutrition(nutritionLogs: any[]): string {
  if (nutritionLogs.length === 0) return 'No nutrition logs in the past 4 weeks.'
  const avgCal = Math.round(nutritionLogs.reduce((s, n) => s + (n.calories || 0), 0) / nutritionLogs.length)
  const avgProtein = Math.round(nutritionLogs.reduce((s, n) => s + (n.protein_g || 0), 0) / nutritionLogs.length)
  const avgCarbs = Math.round(nutritionLogs.reduce((s, n) => s + (n.carbs_g || 0), 0) / nutritionLogs.length)
  const avgFat = Math.round(nutritionLogs.reduce((s, n) => s + (n.fat_g || 0), 0) / nutritionLogs.length)
  return `${nutritionLogs.length} days logged. Avg: ${avgCal} kcal, ${avgProtein}g protein, ${avgCarbs}g carbs, ${avgFat}g fat.`
}

export function summarizeBody(bodyLogs: any[]): string {
  if (bodyLogs.length === 0) return 'No body composition logs in the past 4 weeks.'
  const first = bodyLogs[0]
  const last = bodyLogs[bodyLogs.length - 1]
  const weightChange = last.weight_lbs && first.weight_lbs
    ? (last.weight_lbs - first.weight_lbs).toFixed(1)
    : null
  return `${bodyLogs.length} measurements. Weight: ${first.weight_lbs ?? '?'} → ${last.weight_lbs ?? '?'} lbs (${weightChange ? (Number(weightChange) > 0 ? '+' : '') + weightChange : 'no change data'}). Latest BF%: ${last.body_fat_pct ?? 'not recorded'}.`
}

export function summarizeCheckins(checkins: any[]): string {
  if (checkins.length === 0) return 'No daily check-ins logged.'
  const avgEnergy = (checkins.reduce((s, c) => s + (c.energy || 0), 0) / checkins.length).toFixed(1)
  const avgMood = (checkins.reduce((s, c) => s + (c.mood || 0), 0) / checkins.length).toFixed(1)
  const avgSleep = (checkins.reduce((s, c) => s + (c.sleep_hrs || 0), 0) / checkins.length).toFixed(1)
  return `${checkins.length} check-ins. Avg energy: ${avgEnergy}/5, mood: ${avgMood}/5, sleep: ${avgSleep} hrs/night.`
}

export function summarizeGoalAdherence(
  nutritionLogs: any[],
  activeGoal: any
): string {
  if (!activeGoal) return 'No nutrition goals set.'
  if (nutritionLogs.length === 0) return `Goals set (${activeGoal.calories} kcal, ${activeGoal.protein_g}g protein) but no logs.`

  const goalCal = activeGoal.calories
  const goalProtein = activeGoal.protein_g
  const daysHitCal = nutritionLogs.filter(
    n => n.calories && Math.abs(n.calories - goalCal) / goalCal <= 0.1
  ).length
  const avgProtein = Math.round(nutritionLogs.reduce((s, n) => s + (n.protein_g || 0), 0) / nutritionLogs.length)

  return `Hit calorie goal (±10%) on ${daysHitCal}/${nutritionLogs.length} days logged. Avg protein: ${avgProtein}g vs ${goalProtein}g goal.`
}

// Get all clients (coach view)
export async function getAllClients(supabase: SupabaseClient) {
  const { data: clients } = await supabase
    .from('users')
    .select(`
      id, name, email,
      client_profiles(package_type, goals, active)
    `)
    .eq('role', 'client')
    .order('name')

  if (!clients) return []

  // Get last log date for each client
  const clientsWithActivity = await Promise.all(
    clients.map(async (client) => {
      const tables = ['workout_logs', 'nutrition_logs', 'body_logs', 'daily_checkins']
      const dates = await Promise.all(
        tables.map(t =>
          supabase
            .from(t)
            .select('date')
            .eq('user_id', client.id)
            .order('date', { ascending: false })
            .limit(1)
        )
      )
      const allDates = dates
        .flatMap(d => d.data ?? [])
        .map(d => d.date)
        .filter(Boolean)
        .sort()
        .reverse()
      return { ...client, lastLoggedDate: allDates[0] ?? null }
    })
  )

  return clientsWithActivity
}
