export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { getAllClients } from '@/lib/data'
import Link from 'next/link'
import NavBar from '@/components/NavBar'

function getActivityStatus(lastDate: string | null): {
  dot: string
  label: string
} {
  if (!lastDate) return { dot: 'bg-red-500', label: 'Never logged' }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const last = new Date(lastDate)
  last.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return { dot: 'bg-green-500', label: 'Today' }
  if (diffDays === 1) return { dot: 'bg-yellow-500', label: 'Yesterday' }
  if (diffDays <= 3) return { dot: 'bg-yellow-500', label: `${diffDays} days ago` }
  return { dot: 'bg-red-500', label: `${diffDays} days ago` }
}

export default async function CoachDashboardPage() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: coachProfile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single()

  if (!coachProfile || coachProfile.role !== 'coach') redirect('/dashboard')

  const clients = await getAllClients(supabase)

  return (
    <div className="min-h-screen bg-zinc-950">
      <NavBar role="coach" name={coachProfile.name ?? user.email ?? ''} />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100">Your Clients</h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              {clients.length} client{clients.length !== 1 ? 's' : ''} total
            </p>
          </div>
        </div>

        {clients.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
            <p className="text-4xl mb-4">👤</p>
            <h2 className="text-zinc-300 font-medium mb-1">No clients yet</h2>
            <p className="text-zinc-600 text-sm">
              Add clients via the Supabase dashboard, then assign them the &apos;client&apos; role.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {clients.map((client: any) => {
              const status = getActivityStatus(client.lastLoggedDate)
              const pkg = client.client_profiles?.[0]?.package_type ?? null

              return (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="group bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar initials */}
                      <div className="w-10 h-10 rounded-full bg-violet-900/60 border border-violet-800/40 flex items-center justify-center shrink-0">
                        <span className="text-violet-300 text-sm font-semibold">
                          {(client.name ?? client.email ?? '?')
                            .split(' ')
                            .map((n: string) => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-zinc-100 font-medium truncate">
                            {client.name ?? client.email}
                          </p>
                          {pkg && (
                            <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                              {pkg}
                            </span>
                          )}
                        </div>
                        <p className="text-zinc-500 text-sm truncate">{client.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-zinc-500 text-xs">Last log</p>
                        <p className="text-zinc-400 text-sm">{status.label}</p>
                      </div>
                      <div className={`w-2.5 h-2.5 rounded-full ${status.dot} shrink-0`} />
                      <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors text-lg ml-1">
                        →
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
