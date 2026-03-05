import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import {
  getClientDataSummary,
  summarizeWorkouts,
  summarizeNutrition,
  summarizeBody,
  summarizeCheckins,
  summarizeGoalAdherence,
} from '@/lib/data'
import { getCyclePhasesSummary } from '@/lib/cycle'
import { generateAnalysis } from '@/lib/claude'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Role check — must be coach
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || userData.role !== 'coach') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const payload = await request.json()
    const { clientId } = payload

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
    }

    // Fetch client user + profile
    const [clientUserRes, clientProfileRes] = await Promise.all([
      supabase.from('users').select('name').eq('id', clientId).single(),
      supabase
        .from('client_profiles')
        .select('package_type, goals')
        .eq('user_id', clientId)
        .single(),
    ])

    const clientName = clientUserRes.data?.name ?? 'Client'
    const packageType = clientProfileRes.data?.package_type ?? 'unknown'
    const goals = clientProfileRes.data?.goals ?? 'Not specified'

    // Fetch 4 weeks of client data
    const { workouts, nutrition, body: bodyLogs, checkins, cycles, activeGoal } =
      await getClientDataSummary(supabase, clientId, 4)

    // Build summary strings
    const workoutSummary = summarizeWorkouts(workouts)
    const nutritionSummary = summarizeNutrition(nutrition)
    const bodyLogSummary = summarizeBody(bodyLogs)
    const checkinSummary = summarizeCheckins(checkins)
    const goalAdherenceSummary = summarizeGoalAdherence(nutrition, activeGoal)

    // Cycle phase summary
    const latestCycle = cycles[0] ?? null
    const cyclePhaseSummary = latestCycle
      ? getCyclePhasesSummary(latestCycle.cycle_start_date, 4, latestCycle.cycle_length_days ?? 28)
      : 'No cycle data recorded'

    // Fetch active plan content
    const { data: activePlan } = await supabase
      .from('plans')
      .select('type, content')
      .eq('client_id', clientId)
      .eq('active', true)
      .order('created_at', { ascending: false })

    const activePlanText = activePlan
      ? activePlan
          .map((p) => `${p.type.charAt(0).toUpperCase() + p.type.slice(1)} Plan:\n${p.content}`)
          .join('\n\n')
      : 'No active plan set.'

    // Generate AI analysis
    const draft = await generateAnalysis({
      clientName,
      packageType,
      goals,
      activePlan: activePlanText,
      workoutSummary,
      nutritionSummary,
      bodyLogSummary,
      checkinSummary,
      cyclePhaseSummary,
      goalAdherenceSummary,
    })

    return NextResponse.json({ draft })
  } catch (err: any) {
    console.error('[analyze]', err)
    return NextResponse.json(
      { error: err.message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
