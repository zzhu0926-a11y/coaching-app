import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

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

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const { id: clientId } = await params

    // Clients can only read their own goals
    if (userData.role !== 'coach' && user.id !== clientId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: activeGoal, error } = await supabase
      .from('nutrition_goals')
      .select('*')
      .eq('client_id', clientId)
      .eq('active', true)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found — that's fine
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ activeGoal: activeGoal ?? null })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 })
  }
}
