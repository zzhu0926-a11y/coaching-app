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

    // Role check — must be coach
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || userData.role !== 'coach') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { clientId, type, content } = body

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
    }

    if (!type || !['workout', 'nutrition'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be "workout" or "nutrition"' },
        { status: 400 }
      )
    }

    // Mark existing active plan of same type as inactive
    const { error: deactivateError } = await supabase
      .from('plans')
      .update({ active: false })
      .eq('client_id', clientId)
      .eq('type', type)
      .eq('active', true)

    if (deactivateError) {
      console.error('[plans/save deactivate]', deactivateError)
      return NextResponse.json({ error: deactivateError.message }, { status: 500 })
    }

    // Insert new plan row
    const { data: inserted, error: insertError } = await supabase
      .from('plans')
      .insert({
        client_id: clientId,
        type,
        content: content ?? '',
        active: true,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[plans/save insert]', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: inserted?.id })
  } catch (err: any) {
    console.error('[plans/save]', err)
    return NextResponse.json(
      { error: err.message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
