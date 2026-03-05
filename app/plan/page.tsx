export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import NavBar from '@/components/NavBar'

function PlanSection({ title, content }: { title: string; content: string | null }) {
  if (!content) return null

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <h2 className="text-base font-semibold text-zinc-200 mb-3">{title}</h2>
      <div className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
        {content}
      </div>
    </div>
  )
}

export default async function PlanPage() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileRes, planRes] = await Promise.all([
    supabase.from('users').select('name, role').eq('id', user.id).single(),
    supabase
      .from('plans')
      .select('workout_plan, nutrition_plan, notes, created_at, updated_at')
      .eq('client_id', user.id)
      .eq('active', true)
      .single(),
  ])

  const profile = profileRes.data
  if (!profile || profile.role !== 'client') redirect('/dashboard')

  const plan = planRes.data

  const hasWorkout = Boolean(plan?.workout_plan)
  const hasNutrition = Boolean(plan?.nutrition_plan)
  const hasAnyPlan = hasWorkout || hasNutrition

  function formatDate(iso: string | null) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <NavBar role="client" name={profile.name ?? user.email ?? ''} />

      <main className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Your Plan</h1>
          {plan?.updated_at && (
            <p className="text-zinc-500 text-sm mt-1">
              Last updated {formatDate(plan.updated_at)}
            </p>
          )}
        </div>

        {!hasAnyPlan ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
            <p className="text-4xl mb-4">📋</p>
            <h2 className="text-zinc-300 font-medium mb-1">No plan yet</h2>
            <p className="text-zinc-600 text-sm max-w-xs mx-auto">
              Your coach will set your workout and nutrition plan. Check back soon.
            </p>
          </div>
        ) : (
          <>
            <PlanSection title="Workout Plan" content={plan?.workout_plan ?? null} />
            <PlanSection title="Nutrition Plan" content={plan?.nutrition_plan ?? null} />

            {plan?.notes && (
              <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl px-5 py-4">
                <h3 className="text-sm font-medium text-zinc-400 mb-2">Coach Notes</h3>
                <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-line">
                  {plan.notes}
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
