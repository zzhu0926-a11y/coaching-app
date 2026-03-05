import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Coaching App',
  description: 'Client progress tracking and coaching by Zijing',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-zinc-950 text-zinc-100">
        {children}
      </body>
    </html>
  )
}
