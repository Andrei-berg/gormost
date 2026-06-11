'use client'
import { useState, useCallback } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import AlertsTab from '@/components/safety/AlertsTab'
import EmployeesTab from '@/components/safety/EmployeesTab'
import CoverageOverview from '@/components/safety/CoverageOverview'
import CertMatrix from '@/components/safety/CertMatrix'
import CertJournal from '@/components/safety/CertJournal'
import CatalogTab from '@/components/safety/CatalogTab'
import RequirementsTab from '@/components/safety/RequirementsTab'
import UnlinkedCerts from '@/components/safety/UnlinkedCerts'
import {
  fetchCertTypes, fetchAllCertsWithEmployees, fetchCertRequirements,
  fetchUsers, fetchServices, fetchUnlinkedCerts,
} from '@/lib/api-client'
import type { AuthSession, CertType, EmployeeCert, CertRequirement, User, Service } from '@/types'
import { useLoadData } from '@/lib/useLoadData'
import { DataErrorBanner } from '@/components/DataState'

type Tab = 'alerts' | 'employees' | 'overview' | 'journal' | 'settings'
type SettingsSubTab = 'matrix' | 'catalog' | 'requirements' | 'unlinked'
type JournalFilter = { status: string; service: string; version: number }

export default function SafetyPage() {
  return (
    <AuthGuard roles={['SAFETY_ENGINEER', 'ADMIN']}>
      {(session) => <Content session={session} />}
    </AuthGuard>
  )
}

function Content({ session }: { session: AuthSession }) {
  const [tab, setTab]                       = useState<Tab>('alerts')
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>('catalog')
  const [journalFilter, setJournalFilter]   = useState<JournalFilter>({ status: 'ALL', service: 'ALL', version: 0 })

  const [certTypes, setCertTypes]       = useState<CertType[]>([])
  const [allCerts, setAllCerts]         = useState<EmployeeCert[]>([])
  const [unlinked, setUnlinked]         = useState<EmployeeCert[]>([])
  const [requirements, setRequirements] = useState<CertRequirement[]>([])
  const [employees, setEmployees]       = useState<User[]>([])
  const [services, setServices]         = useState<Service[]>([])

  const loadData = useCallback(async () => {
    const [cts, certs, unlinkedCerts, reqs, emps, svcs] = await Promise.all([
      fetchCertTypes(),
      fetchAllCertsWithEmployees(),
      fetchUnlinkedCerts(),
      fetchCertRequirements(),
      fetchUsers(true),
      fetchServices(),
    ])
    setCertTypes(cts)
    setAllCerts(certs)
    setUnlinked(unlinkedCerts)
    setRequirements(reqs)
    setEmployees(emps)
    setServices(svcs)
  }, [])

  const { loading, error, reload } = useLoadData(loadData)

  function navigateToJournal(status?: string, service?: string) {
    setJournalFilter(prev => ({
      status:  status  ?? 'ALL',
      service: service ?? 'ALL',
      version: prev.version + 1,
    }))
    setTab('journal')
  }

  const MAIN_TABS: { id: Tab; label: string; emoji: string; badge?: number }[] = [
    { id: 'alerts',    label: 'Тревоги',    emoji: '🚨' },
    { id: 'employees', label: 'Сотрудники', emoji: '👤' },
    { id: 'overview',  label: 'Обзор',      emoji: '📊' },
    { id: 'journal',   label: 'Журнал',     emoji: '📖' },
    { id: 'settings',  label: 'Настройки',  emoji: '⚙️', badge: unlinked.length },
  ]

  const SETTINGS_TABS: { id: SettingsSubTab; label: string; emoji: string; badge?: number }[] = [
    { id: 'catalog',      label: 'Каталог',     emoji: '📝' },
    { id: 'requirements', label: 'Требования',  emoji: '🎯' },
    { id: 'matrix',       label: 'Матрица',     emoji: '📋' },
    { id: 'unlinked',     label: 'Несвязанные', emoji: '🔗', badge: unlinked.length },
  ]

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-[1800px] mx-auto">
      <Header session={session} title="ТБиОТ" emoji="🛡️" mode="REVIEW" />

      {error && <DataErrorBanner error={error} onRetry={reload} />}

      <div className="flex gap-1 p-1 glass-strong rounded-2xl mb-6 w-fit flex-wrap">
        {MAIN_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-rose-600/40 text-white border border-rose-500/40'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>{t.emoji}</span>
            <span className="hidden sm:inline">{t.label}</span>
            {t.badge !== undefined && t.badge > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-black text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {t.badge > 99 ? '!' : t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {tab === 'alerts' && (
            <AlertsTab
              allCerts={allCerts}
              certTypes={certTypes}
              employees={employees}
              services={services}
              session={session}
              onRefresh={reload}
            />
          )}
          {tab === 'employees' && (
            <EmployeesTab
              certTypes={certTypes}
              allCerts={allCerts}
              employees={employees}
              services={services}
              session={session}
              onRefresh={reload}
            />
          )}
          {tab === 'overview' && (
            <CoverageOverview
              allCerts={allCerts}
              unlinkedCount={unlinked.length}
              requirements={requirements}
              employees={employees}
              services={services}
              onNavigate={navigateToJournal}
            />
          )}
          {tab === 'journal' && (
            <CertJournal
              allCerts={allCerts}
              employees={employees}
              services={services}
              externalFilter={journalFilter}
            />
          )}
          {tab === 'settings' && (
            <div className="space-y-4">
              <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit flex-wrap">
                {SETTINGS_TABS.map(st => (
                  <button
                    key={st.id}
                    onClick={() => setSettingsSubTab(st.id)}
                    className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      settingsSubTab === st.id
                        ? 'bg-slate-600/50 text-white border border-white/20'
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    <span>{st.emoji}</span>
                    <span>{st.label}</span>
                    {st.badge !== undefined && st.badge > 0 && (
                      <span className="ml-0.5 bg-amber-500 text-black text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                        {st.badge > 99 ? '!' : st.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {settingsSubTab === 'catalog' && (
                <CatalogTab certTypes={certTypes} onRefresh={reload} />
              )}
              {settingsSubTab === 'requirements' && (
                <RequirementsTab certTypes={certTypes} requirements={requirements} services={services} onRefresh={reload} />
              )}
              {settingsSubTab === 'matrix' && (
                <CertMatrix certTypes={certTypes} allCerts={allCerts} employees={employees} services={services} session={session} onRefresh={reload} />
              )}
              {settingsSubTab === 'unlinked' && (
                <UnlinkedCerts unlinked={unlinked} employees={employees} session={session} onRefresh={reload} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
