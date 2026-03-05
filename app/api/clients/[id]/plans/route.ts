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

    if (!userData || userData.role !== 'coach') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: clientId } = await params

    const { data: plans, error } = await supabase
      .from('plans')
      .select('id, type, content, created_at')
      .eq('client_id', clientId)
      .eq('active', true)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const workout = plans?.find((p) => p.type === 'workout') ?? null
    const nutrition = plans?.find((p) => p.type === 'nutrition') ?? null

    return NextResponse.json({ workout, nutrition })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 })
  }
}
