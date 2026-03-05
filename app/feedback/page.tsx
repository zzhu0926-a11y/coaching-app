export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import NavBar from '@/components/NavBar'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function FeedbackPage() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileRes, feedbackRes] = await Promise.all([
    supabase.from('users').select('name, role').eq('id', user.id).single(),
    supabase
      .from('feedback')
      .select('id, sent_at, ai_draft, coach_edit, read_by_client')
      .eq('client_id', user.id)
      .order('sent_at', { ascending: false }),
  ])

  const profile = profileRes.data
  if (!profile || profile.role !== 'client') redirect('/dashboard')

  const feedbackList = feedbackRes.data ?? []

  // Mark all unread as read (fire-and-forget — best effort)
  const unreadIds = feedbackList.filter(f => !f.read_by_client).map(f => f.id)
  if (unreadIds.length > 0) {
    // Update via a server-side Supabase call — fine here as it's async
    await supabase
      .from('feedback')
      .update({ read_by_client: true })
      .in('id', unreadIds)
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <NavBar role="client" name={profile.name ?? user.email ?? ''} />

      <main className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Feedback from Coach</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {feedbackList.length} message{feedbackList.length !== 1 ? 's' : ''} total
          </p>
        </div>

        {feedbackList.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
            <p className="text-4xl mb-4">💬</p>
            <h2 className="text-zinc-300 font-medium mb-1">No feedback yet</h2>
            <p className="text-zinc-600 text-sm max-w-xs mx-auto">
              Your coach will send personalized feedback based on your logs. Keep logging!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {feedbackList.map((fb) => {
              const message = fb.coach_edit ?? fb.ai_draft ?? ''
              const isNew = !fb.read_by_client

              return (
                <div
                  key={fb.id}
                  className={`bg-zinc-900 border rounded-2xl p-5 transition-colors ${
                    isNew
                      ? 'border-violet-700/50 bg-violet-950/20'
                      : 'border-zinc-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-violet-900/60 border border-violet-800/40 flex items-center justify-center shrink-0">
                        <span className="text-violet-300 text-xs font-bold">ZZ</span>
                      </div>
                      <div>
                        <p className="text-zinc-200 text-sm font-medium">Zijing</p>
                        <p className="text-zinc-600 text-xs">Your coach</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isNew && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-violet-600/30 text-violet-400 border border-violet-600/30 font-medium">
                          New
                        </span>
                      )}
                      <span className="text-zinc-600 text-xs">{formatDate(fb.sent_at)}</span>
                    </div>
                  </div>

                  <div className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line pl-10">
                    {message || (
                      <span className="text-zinc-600 italic">No content</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
