export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAllClients } from '@/lib/data'
import NavBar from '@/components/NavBar'

function getActivityDot(lastLoggedDate: string | null): {
  color: string
  label: string
} {
  if (!lastLoggedDate) {
    return { color: 'bg-red-500', label: 'Never logged' }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const logged = new Date(lastLoggedDate)
  logged.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((today.getTime() - logged.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return { color: 'bg-green-500', label: 'Today' }
  if (diffDays <= 3) return { color: 'bg-amber-500', label: `${diffDays}d ago` }
  return { color: 'bg-red-500', label: `${diffDays}d ago` }
}

function packageBadge(packageType: string | null): string {
  switch (packageType) {
    case 'kickstart':
      return 'bg-sky-900 text-sky-300 border-sky-700'
    case 'foundation':
      return 'bg-violet-900 text-violet-300 border-violet-700'
    case 'transformation':
      return 'bg-amber-900 text-amber-300 border-amber-700'
    default:
      return 'bg-zinc-800 text-zinc-400 border-zinc-700'
  }
}

export default async function ClientsPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('role, name')
    .eq('id', user.id)
    .single()

  if (!userData || userData.role !== 'coach') redirect('/login')

  const clients = await getAllClients(supabase)

  return (
    <div className="min-h-screen bg-zinc-950">
      <NavBar role="coach" name={userData.name ?? ''} />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-100">Clients</h1>
          <p className="text-zinc-500 mt-1 text-sm">
            {clients.length} active client{clients.length !== 1 ? 's' : ''}
          </p>
        </div>

        {clients.length === 0 ? (
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-12 text-center">
            <p className="text-zinc-500 text-lg">No clients yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {clients.map((client) => {
              const profile = Array.isArray(client.client_profiles)
                ? client.client_profiles[0]
                : (client.client_profiles as any)
              const packageType = profile?.package_type ?? null
              const dot = getActivityDot(client.lastLoggedDate)
              const badgeClass = packageBadge(packageType)

              return (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="group flex flex-col gap-3 rounded-xl bg-zinc-900 border border-zinc-800 p-4 hover:border-violet-700 hover:bg-zinc-900/80 transition-all duration-150"
                >
                  {/* Name */}
                  <div>
                    <p className="font-semibold text-zinc-100 text-base leading-tight group-hover:text-violet-300 transition-colors truncate">
                      {client.name ?? 'Unnamed'}
                    </p>
                    <p className="text-zinc-500 text-xs mt-0.5 truncate">{client.email}</p>
                  </div>

                  {/* Package badge */}
                  {packageType && (
                    <span
                      className={`self-start text-xs font-medium px-2 py-0.5 rounded-full border ${badgeClass} capitalize`}
                    >
                      {packageType}
                    </span>
                  )}

                  {/* Last logged */}
                  <div className="flex items-center gap-2 mt-auto">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${dot.color}`} />
                    <span className="text-zinc-500 text-xs">
                      {client.lastLoggedDate ? `Last log: ${dot.label}` : dot.label}
                    </span>
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
