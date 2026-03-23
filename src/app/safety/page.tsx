'use client'
import { useState, useEffect, useCallback } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import CoverageOverview from '@/components/safety/CoverageOverview'
import CertMatrix from '@/components/safety/CertMatrix'
import CatalogTab from '@/components/safety/CatalogTab'
import RequirementsTab from '@/components/safety/RequirementsTab'
import {
  fetchCertTypes, fetchAllCertsWithEmployees, fetchCertRequirements,
  fetchUsers, fetchServices,
} from '@/lib/api'
import type { AuthSession, CertType, EmployeeCert, CertRequirement, User, Service } from '@/types'

type Tab = 'overview' | 'matrix' | 'catalog' | 'requirements'

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'overview',      label: 'Обзор',       emoji: '📊' },
  { id: 'matrix',        label: 'Допуски',      emoji: '📋' },
  { id: 'catalog',       label: 'Каталог',      emoji: '📝' },
  { id: 'requirements',  label: 'Требования',   emoji: '⚙️' },
]

export default function SafetyPage() {
  return (
    <AuthGuard roles={['SAFETY_ENGINEER', 'ADMIN']}>
      {(session) => <Content session={session} />}
    </AuthGuard>
  )
}

function Content({ session }: { session: AuthSession }) {
  const [tab, setTab] = useState<Tab>('overview')
  const [certTypes, setCertTypes] = useState<CertType[]>([])
  const [allCerts, setAllCerts] = useState<EmployeeCert[]>([])
  const [requirements, setRequirements] = useState<CertRequirement[]>([])
  const [employees, setEmployees] = useState<User[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    const [cts, certs, reqs, emps, svcs] = await Promise.all([
      fetchCertTypes(),
      fetchAllCertsWithEmployees(),
      fetchCertRequirements(),
      fetchUsers(true),
      fetchServices(),
    ])
    setCertTypes(cts)
    setAllCerts(certs)
    setRequirements(reqs)
    setEmployees(emps)
    setServices(svcs)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  return (
    <div className="min-h-screen p-4 md:p-6">
      <Header session={session} title="ТБиОТ" emoji="🛡️" mode="REVIEW" />

      {/* Tabs */}
      <div className="flex gap-1 p-1 glass-strong rounded-2xl mb-6 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-rose-600/40 text-white border border-rose-500/40'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>{t.emoji}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {tab === 'overview' && (
            <CoverageOverview
              allCerts={allCerts}
              requirements={requirements}
              employees={employees}
              services={services}
            />
          )}
          {tab === 'matrix' && (
            <CertMatrix
              certTypes={certTypes}
              allCerts={allCerts}
              employees={employees}
              services={services}
              session={session}
              onRefresh={loadData}
            />
          )}
          {tab === 'catalog' && (
            <CatalogTab
              certTypes={certTypes}
              onRefresh={loadData}
            />
          )}
          {tab === 'requirements' && (
            <RequirementsTab
              certTypes={certTypes}
              requirements={requirements}
              services={services}
              onRefresh={loadData}
            />
          )}
        </>
      )}
    </div>
  )
}
