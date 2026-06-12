'use client'
import { useState, useMemo } from 'react'
import type { CertType, EmployeeCert, User, Service, AuthSession, CertStatus } from '@/types'
import { certStatusFromDates, CERT_STATUS_CONFIG, CERT_CATEGORY_CONFIG } from '@/types'
import CertForm from './CertForm'

interface Props {
  certTypes: CertType[]
  allCerts: EmployeeCert[]
  employees: User[]
  services: Service[]
  session: AuthSession
  onRefresh: () => void
}

// Returns the "worst" status among an employee's certs
function worstStatus(certs: EmployeeCert[]): CertStatus {
  if (certs.some(c => certStatusFromDates(c.expires_at, c.is_indefinite) === 'EXPIRED')) return 'EXPIRED'
  if (certs.some(c => certStatusFromDates(c.expires_at, c.is_indefinite) === 'EXPIRING_SOON')) return 'EXPIRING_SOON'
  if (certs.length > 0) return 'VALID'
  return 'NOT_ASSIGNED'
}

export default function EmployeesTab({ certTypes, allCerts, employees, services, session, onRefresh }: Props) {
  const [serviceFilter, setServiceFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | CertStatus>('ALL')
  const [search, setSearch] = useState('')
  const [selectedEmp, setSelectedEmp] = useState<User | null>(null)
  const [formState, setFormState] = useState<{ employee: User; certType: CertType } | null>(null)

  // Group certs by employee
  const certsByEmp = useMemo(() => {
    const map = new Map<string, EmployeeCert[]>()
    for (const c of allCerts) {
      if (!c.employee_id) continue
      if (!map.has(c.employee_id)) map.set(c.employee_id, [])
      map.get(c.employee_id)!.push(c)
    }
    return map
  }, [allCerts])

  // Cert lookup for quick access
  const certIndex = useMemo(() => {
    const map = new Map<string, EmployeeCert>()
    for (const c of allCerts) {
      if (c.employee_id) map.set(`${c.employee_id}:${c.cert_type_id}`, c)
    }
    return map
  }, [allCerts])

  const visibleEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (!emp.is_active) return false
      if (serviceFilter !== 'ALL' && emp.service_id !== serviceFilter) return false
      if (search && !emp.full_name.toLowerCase().includes(search.toLowerCase())) return false
      if (statusFilter !== 'ALL') {
        const certs = certsByEmp.get(emp.user_id) ?? []
        return worstStatus(certs) === statusFilter
      }
      return true
    }).sort((a, b) => {
      // Sort: worst status first
      const rank = { EXPIRED: 0, EXPIRING_SOON: 1, NOT_ASSIGNED: 2, VALID: 3 }
      const ra = rank[worstStatus(certsByEmp.get(a.user_id) ?? [])]
      const rb = rank[worstStatus(certsByEmp.get(b.user_id) ?? [])]
      if (ra !== rb) return ra - rb
      return a.full_name.localeCompare(b.full_name)
    })
  }, [employees, serviceFilter, search, statusFilter, certsByEmp])

  // For selected employee: ordered list of cert types
  const selectedCerts = useMemo(() => {
    if (!selectedEmp) return []
    return certTypes.filter(ct => ct.is_active).map(ct => {
      const cert = certIndex.get(`${selectedEmp.user_id}:${ct.id}`) ?? null
      const st: CertStatus = cert ? certStatusFromDates(cert.expires_at, cert.is_indefinite) : 'NOT_ASSIGNED'
      return { certType: ct, cert, status: st }
    }).sort((a, b) => {
      const rank = { EXPIRED: 0, EXPIRING_SOON: 1, NOT_ASSIGNED: 2, VALID: 3 }
      return rank[a.status] - rank[b.status]
    })
  }, [selectedEmp, certTypes, certIndex])

  const existingCert = formState
    ? certIndex.get(`${formState.employee.user_id}:${formState.certType.id}`) ?? null
    : null

  // Counts for status filter
  const statusCounts = useMemo(() => {
    const counts = { EXPIRED: 0, EXPIRING_SOON: 0, VALID: 0, NOT_ASSIGNED: 0 }
    for (const emp of employees.filter(e => e.is_active)) {
      const certs = certsByEmp.get(emp.user_id) ?? []
      counts[worstStatus(certs)]++
    }
    return counts
  }, [employees, certsByEmp])

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="glass-strong rounded-2xl p-3 flex flex-wrap gap-3 items-center">
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Поиск сотрудника…" className="form-input w-44"
        />
        <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)} className="form-select">
          <option value="ALL">Все службы</option>
          {services.map(s => (
            <option key={s.service_id} value={s.service_id}>{s.service_name}</option>
          ))}
        </select>
        <div className="flex gap-1">
          {(['ALL', 'EXPIRED', 'EXPIRING_SOON', 'VALID'] as const).map(st => {
            const labels: Record<string, string> = {
              ALL: 'Все',
              EXPIRED: `🔴 ${statusCounts.EXPIRED}`,
              EXPIRING_SOON: `🟡 ${statusCounts.EXPIRING_SOON}`,
              VALID: `🟢 ${statusCounts.VALID}`,
            }
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-rose-600/40 text-white border border-rose-500/40'
                    : 'text-white/50 hover:text-white border border-transparent hover:bg-white/5'
                }`}
              >
                {labels[st]}
              </button>
            )
          })}
        </div>
        <span className="text-xs text-white/30 ml-auto">{visibleEmployees.length} чел.</span>
      </div>

      {/* Employee list */}
      <div className="glass-strong rounded-2xl overflow-hidden">
        {visibleEmployees.length === 0 ? (
          <div className="p-12 text-center text-white/30">Нет сотрудников по фильтру</div>
        ) : (
          <div className="divide-y divide-white/5">
            {visibleEmployees.map(emp => {
              const certs = certsByEmp.get(emp.user_id) ?? []
              const worst = worstStatus(certs)
              const expired = certs.filter(c => certStatusFromDates(c.expires_at, c.is_indefinite) === 'EXPIRED').length
              const expiring = certs.filter(c => certStatusFromDates(c.expires_at, c.is_indefinite) === 'EXPIRING_SOON').length
              const isSelected = selectedEmp?.user_id === emp.user_id

              return (
                <div key={emp.user_id}>
                  <button
                    onClick={() => setSelectedEmp(isSelected ? null : emp)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors text-left ${
                      isSelected ? 'bg-white/5' : ''
                    }`}
                  >
                    {/* Status dot */}
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      worst === 'EXPIRED' ? 'bg-red-500' :
                      worst === 'EXPIRING_SOON' ? 'bg-orange-400' :
                      worst === 'VALID' ? 'bg-green-500' : 'bg-white/20'
                    }`} />

                    {/* Name + position */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white/90 text-sm">{emp.full_name}</div>
                      <div className="text-xs text-white/40">{emp.position}</div>
                    </div>

                    {/* Alerts */}
                    <div className="flex items-center gap-2">
                      {expired > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">
                          {expired} просроч.
                        </span>
                      )}
                      {expiring > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-medium">
                          {expiring} истекает
                        </span>
                      )}
                      {expired === 0 && expiring === 0 && certs.length > 0 && (
                        <span className="text-xs text-white/25">{certs.length} допусков</span>
                      )}
                    </div>

                    {/* Chevron */}
                    <span className={`text-white/20 text-sm transition-transform ${isSelected ? 'rotate-90' : ''}`}>▶</span>
                  </button>

                  {/* Expanded cert list */}
                  {isSelected && (
                    <div className="px-4 pb-4 bg-white/3">
                      <div className="border border-white/10 rounded-xl overflow-hidden mt-1">
                        {selectedCerts.map(({ certType, cert, status }) => {
                          const cfg = CERT_STATUS_CONFIG[status]
                          const days = cert?.is_indefinite ? null : cert?.expires_at
                            ? Math.ceil((new Date(cert.expires_at).getTime() - Date.now()) / 86400000)
                            : null
                          const catCfg = CERT_CATEGORY_CONFIG[certType.cert_category]

                          return (
                            <button
                              key={certType.id}
                              onClick={() => setFormState({ employee: emp, certType })}
                              className="w-full flex items-center gap-3 px-3 py-2.5 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors text-left"
                            >
                              <span className="text-base w-6 text-center flex-shrink-0">{catCfg.emoji}</span>
                              <span className="flex-1 text-sm text-white/80 min-w-0 truncate">{certType.name}</span>
                              {cert ? (
                                <span className={`text-xs px-2 py-0.5 rounded-lg font-medium flex-shrink-0 ${cfg.bg} ${cfg.text}`}>
                                  {cert.is_indefinite ? '∞ бессрочно' :
                                    days !== null ? (days < 0 ? `просроч. ${Math.abs(days)}д` : `${days}д`) : cfg.label}
                                </span>
                              ) : (
                                <span className="text-xs text-white/20 flex-shrink-0">+ внести</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* CertForm modal */}
      {formState && (
        <CertForm
          employee={formState.employee}
          certType={formState.certType}
          existing={existingCert}
          createdBy={session.user_id}
          onClose={() => setFormState(null)}
          onSaved={() => { setFormState(null); onRefresh() }}
          onDeleted={() => { setFormState(null); onRefresh() }}
        />
      )}
    </div>
  )
}
