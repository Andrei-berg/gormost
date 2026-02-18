'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSession, hasRole } from '@/lib/auth'
import type { AuthSession, RoleLevel } from '@/types'

interface Props {
  children: (session: AuthSession) => React.ReactNode
  roles: RoleLevel[]
}

export default function AuthGuard({ children, roles }: Props) {
  const router = useRouter()
  const [session, setSession] = useState<AuthSession | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const s = getSession()
    if (!s) {
      router.replace('/login')
      return
    }
    if (!hasRole(s, roles)) {
      router.replace('/')
      return
    }
    setSession(s)
    setChecked(true)
  }, [router, roles])

  if (!checked || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/50 text-lg animate-pulse">Загрузка...</div>
      </div>
    )
  }

  return <>{children(session)}</>
}
