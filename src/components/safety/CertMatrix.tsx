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

type FilterService = 'ALL' | string
type FilterStatus = 'ALL' | CertStatus

export default function CertMatrix({ certTypes, allCerts, employees, services, session, onRefresh }: Props) {
  const [serviceFilter, setServiceFilter] = useState<FilterService>('ALL')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [formState, setFormState] = useState<{ employee: User; certType: CertType } | null>(null)

  // Build cert lookup
  const certIndex = useMemo(() => {
    const map = new Map<string, EmployeeCert>()
    for (const c of allCerts) map.set(`${c.employee_id}:${c.cert_type_id}`, c)
    return map
  }, [allCerts])

  // Active cert types (optionally filtered by category)
  const visibleTypes = useMemo(() =>
    certTypes.filter((ct) => ct.is_active && (categoryFilter === 'ALL' || ct.cert_category === categoryFilter)),
    [certTypes, categoryFilter]
  )

  // Filtered employees
  const visibleEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (!emp.is_active) return false
      if (serviceFilter !== 'ALL' && emp.service_id !== serviceFilter) return false
      if (search && !emp.full_name.toLowerCase().includes(search.toLowerCase())) return false
      if (statusFilter !== 'ALL') {
        // Show employee only if they have at least one cert matching the status filter
        const hasMatch = visibleTypes.some((ct) => {
          const cert = certIndex.get(`${emp.user_id}:${ct.id}`)
          const st: CertStatus = cert ? certStatusFromDates(cert.expires_at) : 'NOT_ASSIGNED'
          return st === statusFilter
        })
        if (!hasMatch) return false
      }
      return true
    })
  }, [employees, serviceFilter, search, statusFilter, visibleTypes, certIndex])

  // Find existing cert for form
  const existingCert = formState
    ? certIndex.get(`${formState.employee.user_id}:${formState.certType.id}`) ?? null
    : null

  // Count per status for toolbar badges
  const counts = useMemo(() => {
    let expired = 0, expiringSoon = 0
    for (const c of allCerts) {
      const st = certStatusFromDates(c.expires_at)
      if (st === 'EXPIRED') expired++
      else if (st === 'EXPIRING_SOON') expiringSoon++
    }
    return { expired, expiringSoon }
  }, [allCerts])

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="glass-strong rounded-2xl p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск сотрудника…" className="form-input w-48"
          />
          <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="form-select">
            <option value="ALL">Все службы</option>
            {services.map((s) => (
              <option key={s.service_id} value={s.service_id}>{s.service_name}</option>
            ))}
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="form-select">
            <option value="ALL">Все типы</option>
            {(['Обучение','Аттестация','Допуск','Удостоверение'] as const).map((cat) => (
              <option key={cat} value={cat}>{CERT_CATEGORY_CONFIG[cat].emoji} {cat}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as FilterStatus)} className="form-select">
            <option value="ALL">Все статусы</option>
            <option value="EXPIRED">🔴 Просроченные ({counts.expired})</option>
            <option value="EXPIRING_SOON">🟡 Истекают ({counts.expiringSoon})</option>
            <option value="VALID">🟢 Действует</option>
            <option value="NOT_ASSIGNED">⬜ Не внесён</option>
          </select>
          <span className="text-xs text-white/40 ml-auto">
            {visibleEmployees.length} сотр. · {visibleTypes.length} видов
          </span>
        </div>
      </div>

      {/* Matrix table */}
      {visibleEmployees.length === 0 ? (
        <div className="glass-strong rounded-2xl p-12 text-center text-white/30">
          Нет сотрудников по фильтру
        </div>
      ) : (
        <div className="glass-strong rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-white/60 font-medium sticky left-0 bg-white/5 backdrop-blur-sm min-w-[180px]">
                    Сотрудник
                  </th>
                  {visibleTypes.map((ct) => (
                    <th key={ct.id} className="py-3 px-2 text-center min-w-[90px]">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-base">{CERT_CATEGORY_CONFIG[ct.cert_category].emoji}</span>
                        <span className="text-[10px] text-white/50 leading-tight max-w-[80px] text-center">
                          {ct.name.length > 20 ? ct.name.slice(0, 18) + '…' : ct.name}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleEmployees.map((emp) => (
                  <tr key={emp.user_id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="py-2 px-4 sticky left-0 bg-[rgba(15,20,40,0.85)] backdrop-blur-sm">
                      <div className="font-medium text-white/90">{emp.full_name}</div>
                      <div className="text-[11px] text-white/40">{emp.position}</div>
                    </td>
                    {visibleTypes.map((ct) => {
                      const cert = certIndex.get(`${emp.user_id}:${ct.id}`)
                      const st: CertStatus = cert ? certStatusFromDates(cert.expires_at) : 'NOT_ASSIGNED'
                      const cfg = CERT_STATUS_CONFIG[st]
                      const daysLeft = cert?.expires_at
                        ? Math.ceil((new Date(cert.expires_at).getTime() - Date.now()) / 86400000)
                        : null

                      return (
                        <td key={ct.id} className="py-2 px-2 text-center">
                          <button
                            onClick={() => setFormState({ employee: emp, certType: ct })}
                            title={cert ? `${cfg.label}${daysLeft !== null ? ` · ${daysLeft}д` : ''}` : 'Нажмите для внесения'}
                            className={`w-full px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:opacity-80 border ${cfg.bg} ${cfg.text} border-white/5`}
                          >
                            {cert ? (
                              daysLeft !== null
                                ? (daysLeft < 0 ? `−${Math.abs(daysLeft)}д` : `${daysLeft}д`)
                                : '∞'
                            ) : (
                              <span className="opacity-30">+</span>
                            )}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {(Object.entries(CERT_STATUS_CONFIG) as [CertStatus, (typeof CERT_STATUS_CONFIG)[CertStatus]][]).map(([st, cfg]) => (
          <span key={st} className={`text-xs px-3 py-1 rounded-full ${cfg.bg} ${cfg.text} border border-white/10`}>
            {cfg.label}
          </span>
        ))}
        <span className="text-xs text-white/30">· Нажмите ячейку для редактирования</span>
      </div>

      {/* Cert form modal */}
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
