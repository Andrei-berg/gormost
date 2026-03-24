'use client'
import { useMemo } from 'react'
import type { EmployeeCert, CertRequirement, User, Service } from '@/types'
import { certStatusFromDates, CERT_STATUS_CONFIG } from '@/types'

interface Props {
  allCerts: EmployeeCert[]
  unlinkedCount?: number
  requirements: CertRequirement[]
  employees: User[]
  services: Service[]
}

interface ServiceCoverage {
  service: Service
  total: number        // total required cert slots
  filled: number       // slots with valid/expiring cert
  expired: number
  expiringSoon: number
}

function daysUntilExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) return null
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000)
}

export default function CoverageOverview({ allCerts, unlinkedCount = 0, requirements, employees, services }: Props) {
  // Index certs by employee+certType for O(1) lookup
  const certIndex = useMemo(() => {
    const map = new Map<string, EmployeeCert>()
    for (const c of allCerts) map.set(`${c.employee_id}:${c.cert_type_id}`, c)
    return map
  }, [allCerts])

  // Expiring within 30 days or already expired (with employee data)
  const expiring = useMemo(() => {
    return allCerts
      .filter((c) => {
        const st = certStatusFromDates(c.expires_at)
        return st === 'EXPIRING_SOON' || st === 'EXPIRED'
      })
      .sort((a, b) => {
        const da = daysUntilExpiry(a.expires_at) ?? 9999
        const db = daysUntilExpiry(b.expires_at) ?? 9999
        return da - db
      })
  }, [allCerts])

  // Per-service coverage
  const coverage = useMemo<ServiceCoverage[]>(() => {
    return services.map((svc) => {
      const svcEmployees = employees.filter((e) => e.service_id === svc.service_id && e.is_active)
      let total = 0, filled = 0, expired = 0, expiringSoon = 0

      for (const emp of svcEmployees) {
        for (const req of requirements) {
          // Check if requirement applies to this employee
          const matchesRole = !req.role_level || req.role_level === emp.role_level
          const matchesService = !req.service_id || req.service_id === svc.service_id
          const matchesPosition = !req.position_pattern ||
            (emp.position?.toLowerCase().includes(req.position_pattern.replace(/%/g, '').toLowerCase()) ?? false)
          if (!matchesRole || !matchesService || !matchesPosition) continue

          total++
          const cert = certIndex.get(`${emp.user_id}:${req.cert_type_id}`)
          if (!cert) continue
          const st = certStatusFromDates(cert.expires_at)
          if (st === 'EXPIRED') expired++
          else if (st === 'EXPIRING_SOON') { expiringSoon++; filled++ }
          else { filled++ }
        }
      }
      return { service: svc, total, filled, expired, expiringSoon }
    })
  }, [services, employees, requirements, certIndex])

  const totalExpired = allCerts.filter((c) => certStatusFromDates(c.expires_at) === 'EXPIRED').length
  const totalExpiringSoon = allCerts.filter((c) => certStatusFromDates(c.expires_at) === 'EXPIRING_SOON').length
  const totalValid = allCerts.filter((c) => certStatusFromDates(c.expires_at) === 'VALID').length

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <KpiCard label="Всего записей" value={allCerts.length + unlinkedCount} color="text-white" />
        <KpiCard label="Действует" value={totalValid} color="text-green-400" />
        <KpiCard label="Истекает (≤30д)" value={totalExpiringSoon} color="text-orange-400" />
        <KpiCard label="Просрочено" value={totalExpired} color="text-red-400" />
        <KpiCard label="Не привязано" value={unlinkedCount} color={unlinkedCount > 0 ? 'text-amber-400' : 'text-white/30'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coverage by service */}
        <div className="glass-strong rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">
            Покрытие по службам
          </h3>
          {coverage.length === 0 ? (
            <p className="text-white/30 text-sm">Нет данных</p>
          ) : (
            <div className="space-y-3">
              {coverage.map(({ service, total, filled, expired, expiringSoon }) => {
                const pct = total > 0 ? Math.round((filled / total) * 100) : 0
                return (
                  <div key={service.service_id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-white/80">{service.service_name}</span>
                      <div className="flex items-center gap-3 text-xs">
                        {expired > 0 && <span className="text-red-400">{expired} просроч.</span>}
                        {expiringSoon > 0 && <span className="text-orange-400">{expiringSoon} истекает</span>}
                        <span className="text-white/50">{filled}/{total}</span>
                        <span className={`font-bold ${pct >= 80 ? 'text-green-400' : pct >= 50 ? 'text-orange-400' : 'text-red-400'}`}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-orange-500' : 'bg-red-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Expiring / expired list */}
        <div className="glass-strong rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">
            Требуют внимания
          </h3>
          {expiring.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="text-3xl mb-2">✅</span>
              <p className="text-green-400 font-medium">Все допуски в порядке</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {expiring.map((c) => {
                const days = daysUntilExpiry(c.expires_at)
                const st = certStatusFromDates(c.expires_at)
                const cfg = CERT_STATUS_CONFIG[st]
                return (
                  <div key={c.id} className={`flex items-center justify-between p-2.5 rounded-xl ${cfg.bg} border border-white/5`}>
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">
                        {(c.employee as any)?.full_name ?? '—'}
                      </p>
                      <p className="text-xs text-white/50 truncate">{c.cert_type?.name}</p>
                    </div>
                    <div className={`text-xs font-bold whitespace-nowrap ml-3 ${cfg.text}`}>
                      {days === null ? '—' : days < 0 ? `${Math.abs(days)}д назад` : `${days}д`}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="glass-strong rounded-2xl p-4">
      <p className="text-xs text-white/40 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
