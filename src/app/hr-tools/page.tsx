'use client'
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
      <HRToolsShell session={session} />
    </div>
  )
}
