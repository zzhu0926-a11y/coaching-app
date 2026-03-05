'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface NavBarProps {
  role: 'coach' | 'client'
  name: string
}

const CLIENT_LINKS = [
  { href: '/client-dashboard', label: 'Dashboard' },
  { href: '/log/checkin', label: 'Log' },
  { href: '/plan', label: 'Plan' },
  { href: '/feedback', label: 'Feedback' },
  { href: '/calculator', label: 'Calculator' },
]

const COACH_LINKS = [
  { href: '/coach-dashboard', label: 'Dashboard' },
  { href: '/clients', label: 'Clients' },
]

export default function NavBar({ role, name }: NavBarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const links = role === 'coach' ? COACH_LINKS : CLIENT_LINKS

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="sticky top-0 z-50 bg-zinc-900/95 backdrop-blur border-b border-zinc-800">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* App name */}
        <Link
          href={role === 'coach' ? '/coach-dashboard' : '/client-dashboard'}
          className="text-violet-400 font-bold text-lg tracking-tight shrink-0 hover:text-violet-300 transition-colors"
        >
          ZZ Coaching
        </Link>

        {/* Nav links — hidden on very small screens, show from sm */}
        <div className="hidden sm:flex items-center gap-1 flex-1 justify-center">
          {links.map(({ href, label }) => {
            const isActive =
              href === '/log/checkin'
                ? pathname.startsWith('/log')
                : pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-violet-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </div>

        {/* Right: name + sign out */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden md:block text-zinc-500 text-sm truncate max-w-[120px]">
            {name}
          </span>
          <button
            onClick={handleSignOut}
            className="px-3 py-1.5 rounded-md text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <div className="sm:hidden flex border-t border-zinc-800 bg-zinc-900">
        {links.map(({ href, label }) => {
          const isActive =
            href === '/log/checkin'
              ? pathname.startsWith('/log')
              : pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 py-2 text-center text-xs font-medium transition-colors ${
                isActive ? 'text-violet-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
