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
    const { clientId, aiDraft, coachEdit } = body

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
    }

    if (!aiDraft && !coachEdit) {
      return NextResponse.json({ error: 'No content to send' }, { status: 400 })
    }

    // Insert feedback row
    const { data: inserted, error: insertError } = await supabase
      .from('feedback')
      .insert({
        client_id: clientId,
        coach_id: user.id,
        ai_draft: aiDraft ?? null,
        coach_edit: coachEdit ?? null,
        sent_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[send feedback]', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: inserted?.id })
  } catch (err: any) {
    console.error('[send]', err)
    return NextResponse.json(
      { error: err.message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
