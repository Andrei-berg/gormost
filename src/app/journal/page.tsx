'use client'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import JournalApp from '@/components/journal/JournalApp'

export default function JournalPage() {
  return (
    <AuthGuard roles={['BOSS', 'ADMIN']}>
      {(session) => (
        <>
          <Header session={session} title="Журнал планов" emoji="📒" mode="PLANNING" />
          <JournalApp session={session} />
        </>
      )}
    </AuthGuard>
  )
}
