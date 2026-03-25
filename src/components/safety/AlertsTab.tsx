'use client'
import { useState, useMemo } from 'react'
import type { EmployeeCert, CertType, User, Service, AuthSession } from '@/types'
import { certStatusFromDates, CERT_STATUS_CONFIG, CERT_CATEGORY_CONFIG } from '@/types'
import CertForm from './CertForm'

interface Props {
  allCerts: EmployeeCert[]
  certTypes: CertType[]
  employees: User[]
  services: Service[]
  session: AuthSession
  onRefresh: () => void
}

function daysLeft(expiresAt: string | null): number {
  if (!expiresAt) return 9999
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000)
}

export default function AlertsTab({ allCerts, certTypes, employees, services, session, onRefresh }: Props) {
  const [serviceFilter, setServiceFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [formState, setFormState] = useState<{ employee: User; certType: CertType; cert: EmployeeCert | null } | null>(null)

  // Build employee lookup
  const empById = useMemo(() => {
    const m = new Map<string, User>()
    for (const e of employees) m.set(e.user_id, e)
    return m
  }, [employees])

  // All certs that need attention (expired or expiring soon), with employee joined
  const urgent = useMemo(() => {
    return allCerts
      .filter(c => {
        if (!c.employee_id) return false
        const emp = empById.get(c.employee_id)
        if (!emp || !emp.is_active) return false
        if (serviceFilter !== 'ALL' && emp.service_id !== serviceFilter) return false
        if (categoryFilter !== 'ALL' && c.cert_type?.cert_category !== categoryFilter) return false
        const st = certStatusFromDates(c.expires_at, c.is_indefinite)
        return st === 'EXPIRED' || st === 'EXPIRING_SOON'
      })
      .sort((a, b) => daysLeft(a.expires_at) - daysLeft(b.expires_at))
  }, [allCerts, empById, serviceFilter, categoryFilter])

  const expired = urgent.filter(c => certStatusFromDates(c.expires_at, c.is_indefinite) === 'EXPIRED')
  const expiring = urgent.filter(c => certStatusFromDates(c.expires_at, c.is_indefinite) === 'EXPIRING_SOON')

  function openForm(cert: EmployeeCert) {
    const emp = cert.employee_id ? empById.get(cert.employee_id) : null
    const certType = certTypes.find(t => t.id === cert.cert_type_id)
    if (!emp || !certType) return
    setFormState({ employee: emp, certType, cert })
  }

  if (urgent.length === 0) {
    return (
      <div>
        {/* Filters */}
        <Filters
          services={services} serviceFilter={serviceFilter} setServiceFilter={setServiceFilter}
          categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
        />
        <div className="glass-strong rounded-2xl p-16 text-center mt-4">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-green-400 font-semibold text-lg">Все допуски в порядке</p>
          <p className="text-white/30 text-sm mt-1">Нет просроченных и истекающих записей</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Filters
        services={services} serviceFilter={serviceFilter} setServiceFilter={setServiceFilter}
        categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
      />

      {expired.length > 0 && (
        <Section
          title="Просрочено"
          color="red"
          certs={expired}
          empById={empById}
          onEdit={openForm}
        />
      )}

      {expiring.length > 0 && (
        <Section
          title="Истекает в течение 30 дней"
          color="orange"
          certs={expiring}
          empById={empById}
          onEdit={openForm}
        />
      )}

      {formState && (
        <CertForm
          employee={formState.employee}
          certType={formState.certType}
          existing={formState.cert}
          createdBy={session.user_id}
          onClose={() => setFormState(null)}
          onSaved={() => { setFormState(null); onRefresh() }}
          onDeleted={() => { setFormState(null); onRefresh() }}
        />
      )}
    </div>
  )
}

function Filters({
  services, serviceFilter, setServiceFilter, categoryFilter, setCategoryFilter,
}: {
  services: Service[]
  serviceFilter: string
  setServiceFilter: (v: string) => void
  categoryFilter: string
  setCategoryFilter: (v: string) => void
}) {
  return (
    <div className="glass-strong rounded-2xl p-3 flex flex-wrap gap-3">
      <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)} className="form-select">
        <option value="ALL">Все службы</option>
        {services.map(s => (
          <option key={s.service_id} value={s.service_id}>{s.service_name}</option>
        ))}
      </select>
      <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="form-select">
        <option value="ALL">Все категории</option>
        {(['Обучение', 'Аттестация', 'Допуск', 'Удостоверение'] as const).map(cat => (
          <option key={cat} value={cat}>{CERT_CATEGORY_CONFIG[cat].emoji} {cat}</option>
        ))}
      </select>
    </div>
  )
}

function Section({
  title, color, certs, empById, onEdit,
}: {
  title: string
  color: 'red' | 'orange'
  certs: EmployeeCert[]
  empById: Map<string, User>
  onEdit: (cert: EmployeeCert) => void
}) {
  const borderColor = color === 'red' ? 'border-red-500/20' : 'border-orange-500/20'
  const bgColor = color === 'red' ? 'bg-red-500/5' : 'bg-orange-500/5'
  const titleColor = color === 'red' ? 'text-red-400' : 'text-orange-400'
  const badgeBg = color === 'red' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'

  return (
    <div className={`glass-strong rounded-2xl overflow-hidden border ${borderColor} ${bgColor}`}>
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
        <span className={`text-sm font-semibold ${titleColor}`}>{title}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${badgeBg}`}>{certs.length}</span>
      </div>
      <div className="divide-y divide-white/5">
        {certs.map(cert => {
          const emp = cert.employee_id ? empById.get(cert.employee_id) : null
          const days = daysLeft(cert.expires_at)
          const st = certStatusFromDates(cert.expires_at, cert.is_indefinite)
          const cfg = CERT_STATUS_CONFIG[st]
          const catCfg = cert.cert_type ? CERT_CATEGORY_CONFIG[cert.cert_type.cert_category] : null

          return (
            <div key={cert.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors">
              {/* Cert type category icon */}
              <span className="text-lg w-7 text-center flex-shrink-0">{catCfg?.emoji ?? '📄'}</span>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-white/90 text-sm">{emp?.full_name ?? '—'}</span>
                  <span className="text-xs text-white/40">{emp?.position}</span>
                </div>
                <div className="text-xs text-white/50 mt-0.5">{cert.cert_type?.name}</div>
              </div>

              {/* Service badge */}
              <span className="text-xs text-white/30 hidden sm:block flex-shrink-0">
                {emp?.service_id}
              </span>

              {/* Days badge */}
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg whitespace-nowrap flex-shrink-0 ${cfg.bg} ${cfg.text}`}>
                {days < 0 ? `${Math.abs(days)}д назад` : `через ${days}д`}
              </span>

              {/* Action button */}
              <button
                onClick={() => onEdit(cert)}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-medium transition-colors"
              >
                Продлить
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
