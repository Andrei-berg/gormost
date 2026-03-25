'use client'
import { useState, useEffect, useCallback } from 'react'
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
} from '@/lib/api'
import type { AuthSession, CertType, EmployeeCert, CertRequirement, User, Service } from '@/types'

type Tab = 'alerts' | 'employees' | 'overview' | 'journal' | 'matrix' | 'unlinked' | 'catalog' | 'requirements'

export default function SafetyPage() {
  return (
    <AuthGuard roles={['SAFETY_ENGINEER', 'ADMIN']}>
      {(session) => <Content session={session} />}
    </AuthGuard>
  )
}

function Content({ session }: { session: AuthSession }) {
  const [tab, setTab] = useState<Tab>('alerts')
  const [settingsMode, setSettingsMode] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'unlinked' | 'catalog' | 'requirements'>('unlinked')

  const [certTypes, setCertTypes]       = useState<CertType[]>([])
  const [allCerts, setAllCerts]         = useState<EmployeeCert[]>([])
  const [unlinked, setUnlinked]         = useState<EmployeeCert[]>([])
  const [requirements, setRequirements] = useState<CertRequirement[]>([])
  const [employees, setEmployees]       = useState<User[]>([])
  const [services, setServices]         = useState<Service[]>([])
  const [loading, setLoading]           = useState(true)

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
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const TABS: { id: Tab; label: string; emoji: string; badge?: number }[] = [
    { id: 'alerts',       label: 'Тревоги',      emoji: '🚨' },
    { id: 'employees',    label: 'Сотрудники',   emoji: '👤' },
    { id: 'overview',     label: 'Обзор',        emoji: '📊' },
    { id: 'journal',      label: 'Журнал',       emoji: '📖' },
    { id: 'matrix',       label: 'Матрица',      emoji: '📋' },
    { id: 'unlinked',     label: 'Несвязанные',  emoji: '🔗', badge: unlinked.length },
    { id: 'catalog',      label: 'Каталог',      emoji: '📝' },
    { id: 'requirements', label: 'Требования',   emoji: '⚙️' },
  ]

  const SETTINGS_TABS: { id: 'unlinked' | 'catalog' | 'requirements'; label: string; badge?: number }[] = [
    { id: 'unlinked',      label: 'Несвязанные', badge: unlinked.length },
    { id: 'catalog',       label: 'Каталог' },
    { id: 'requirements',  label: 'Требования' },
  ]

  if (settingsMode) {
    return (
      <div className="min-h-screen p-4 md:p-6">
        <Header session={session} title="ТБиОТ — Настройки" emoji="⚙️" mode="REVIEW" />

        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setSettingsMode(false)}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
          >
            ← Назад
          </button>
          <div className="flex gap-1 p-1 glass-strong rounded-2xl">
            {SETTINGS_TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setSettingsTab(t.id)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  settingsTab === t.id
                    ? 'bg-rose-600/40 text-white border border-rose-500/40'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                {t.label}
                {t.badge !== undefined && t.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-black text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {t.badge > 99 ? '!' : t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {settingsTab === 'unlinked' && (
              <UnlinkedCerts unlinked={unlinked} employees={employees} session={session} onRefresh={loadData} />
            )}
            {settingsTab === 'catalog' && (
              <CatalogTab certTypes={certTypes} onRefresh={loadData} />
            )}
            {settingsTab === 'requirements' && (
              <RequirementsTab certTypes={certTypes} requirements={requirements} services={services} onRefresh={loadData} />
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <Header session={session} title="ТБиОТ" emoji="🛡️" mode="REVIEW" />

      {/* Unlinked banner */}
      {unlinked.length > 0 && (
        <button
          onClick={() => { setSettingsMode(true); setSettingsTab('unlinked') }}
          className="w-full mb-4 flex items-center gap-3 px-4 py-3 glass-strong rounded-2xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-left"
        >
          <span className="text-lg">⚠️</span>
          <span className="text-sm text-amber-300 font-medium">
            {unlinked.length} записей не привязано к сотрудникам
          </span>
          <span className="text-xs text-white/40">— нажмите, чтобы разобрать →</span>
        </button>
      )}

      {/* Tabs + Settings button */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex gap-1 p-1 glass-strong rounded-2xl flex-wrap">
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
        <button
          onClick={() => setSettingsMode(true)}
          className="ml-auto p-2.5 glass-strong rounded-xl text-white/30 hover:text-white/70 transition-colors"
          title="Настройки: несвязанные записи, каталог, требования"
        >
          ⚙️
        </button>
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
              onRefresh={loadData}
            />
          )}
          {tab === 'employees' && (
            <EmployeesTab
              certTypes={certTypes}
              allCerts={allCerts}
              employees={employees}
              services={services}
              session={session}
              onRefresh={loadData}
            />
          )}
          {tab === 'overview' && (
            <CoverageOverview
              allCerts={allCerts}
              unlinkedCount={unlinked.length}
              requirements={requirements}
              employees={employees}
              services={services}
            />
          )}
          {tab === 'journal' && (
            <CertJournal
              allCerts={allCerts}
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
          {tab === 'unlinked' && (
            <UnlinkedCerts
              unlinked={unlinked}
              employees={employees}
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
