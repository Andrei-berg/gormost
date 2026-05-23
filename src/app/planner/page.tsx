'use client'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import PlannerShell from '@/components/planner/PlannerShell'
import type { AuthSession } from '@/types'

export default function PlannerPage() {
  return (
    <AuthGuard roles={['ADMIN', 'HR', 'HEAD', 'BOSS', 'ZAMPORAB', 'DISPATCHER', 'CHIEF_ENGINEER', 'FOREMAN', 'TRANSPORT', 'COMPLAINTS', 'SAFETY_ENGINEER', 'DRIVER', 'WORKER', 'SPECIALIST']}>
      {(session) => <Content session={session} />}
    </AuthGuard>
  )
}

function Content({ session }: { session: AuthSession }) {
  return (
    <div className="min-h-screen p-4 md:p-6 max-w-[1800px] mx-auto">
      <Header session={session} title="Планировщик смен" emoji="🗓" mode="REVIEW" />
      <PlannerShell session={session} />
    </div>
  )
}
