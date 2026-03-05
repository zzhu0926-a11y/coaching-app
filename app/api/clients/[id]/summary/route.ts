import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getClientDataSummary } from '@/lib/data'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || userData.role !== 'coach') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: clientId } = await params

    const [clientUserRes, clientProfileRes, data] = await Promise.all([
      supabase.from('users').select('name').eq('id', clientId).single(),
      supabase
        .from('client_profiles')
        .select('package_type')
        .eq('user_id', clientId)
        .single(),
      getClientDataSummary(supabase, clientId, 4),
    ])

    return NextResponse.json({
      clientInfo: {
        name: clientUserRes.data?.name ?? 'Client',
        packageType: clientProfileRes.data?.package_type ?? null,
      },
      logCounts: {
        workouts: data.workouts.length,
        nutritionDays: data.nutrition.length,
        bodyLogs: data.body.length,
        checkIns: data.checkins.length,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 })
  }
}
