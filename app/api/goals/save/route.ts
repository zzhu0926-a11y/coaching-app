import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

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

    // Role check — coach or client setting their own goals
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const body = await request.json()
    const { clientId, calories, protein_g, carbs_g, fat_g, phase_adjustments, set_by } = body

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
    }

    // Clients can only set their own goals; coaches can set any client's goals
    if (userData.role !== 'coach' && user.id !== clientId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Mark existing active goals as inactive
    const { error: deactivateError } = await supabase
      .from('nutrition_goals')
      .update({ active: false })
      .eq('client_id', clientId)
      .eq('active', true)

    if (deactivateError) {
      console.error('[goals/save deactivate]', deactivateError)
      return NextResponse.json({ error: deactivateError.message }, { status: 500 })
    }

    // Insert new goals row
    const { data: inserted, error: insertError } = await supabase
      .from('nutrition_goals')
      .insert({
        client_id: clientId,
        calories: calories ?? null,
        protein_g: protein_g ?? null,
        carbs_g: carbs_g ?? null,
        fat_g: fat_g ?? null,
        phase_adjustments: phase_adjustments ?? {},
        set_by: set_by ?? userData.role,
        active: true,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[goals/save insert]', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: inserted?.id })
  } catch (err: any) {
    console.error('[goals/save]', err)
    return NextResponse.json(
      { error: err.message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
