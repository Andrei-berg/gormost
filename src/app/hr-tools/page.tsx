'use client'
import Link from 'next/link'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import type { AuthSession } from '@/types'
import HRToolsShell from '@/components/hr-tools/HRToolsShell'

export default function HRToolsPage() {
  return (
    <AuthGuard roles={['HEAD', 'ADMIN', 'BOSS', 'HR']}>
      {(session) => <Content session={session} />}
    </AuthGuard>
  )
}

function Content({ session }: { session: AuthSession }) {
  return (
    <div className="min-h-screen p-4 max-w-[1600px] mx-auto">
      <Header session={session} title="Кадровая аналитика" emoji="📊" mode="PLANNING" />
      <Link
        href="/hr"
        className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-5"
      >
        ← Кадровый центр
      </Link>
      <HRToolsShell session={session} />
    </div>
  )
}
