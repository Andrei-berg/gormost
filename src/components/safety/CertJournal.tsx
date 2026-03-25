'use client'
import { useState, useMemo, useEffect } from 'react'
import type { EmployeeCert, User, Service, CertStatus } from '@/types'
import { certStatusFromDates, CERT_STATUS_CONFIG, CERT_CATEGORY_CONFIG } from '@/types'

type ExternalFilter = { status: string; service: string; version: number }

interface Props {
  allCerts: EmployeeCert[]
  employees: User[]
  services: Service[]
  externalFilter?: ExternalFilter
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function daysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000)
}

type SortKey = 'status' | 'name' | 'expires'
type FilterStatus = 'ALL' | CertStatus

const STATUS_ORDER: Record<string, number> = { EXPIRED: 0, EXPIRING_SOON: 1, NOT_ASSIGNED: 2, VALID: 3 }

export default function CertJournal({ allCerts, employees, services, externalFilter }: Props) {
  const [search, setSearch]         = useState('')
  const [serviceFilter, setService] = useState('ALL')
  const [statusFilter, setStatus]   = useState<FilterStatus>('ALL')
  const [sortKey, setSortKey]       = useState<SortKey>('status')

  // Apply filter when navigating here from Overview
  useEffect(() => {
    if (!externalFilter) return
    setStatus((externalFilter.status as FilterStatus) ?? 'ALL')
    setService(externalFilter.service ?? 'ALL')
  }, [externalFilter?.version]) // eslint-disable-line react-hooks/exhaustive-deps

  const empMap = useMemo(() => new Map(employees.map(e => [e.user_id, e])), [employees])

  const grouped = useMemo(() => {
    const q = search.toLowerCase()
    const filtered = allCerts.filter(cert => {
      const emp = (cert.employee as User | null) ?? empMap.get(cert.employee_id ?? '')
      if (!emp?.is_active) return false
      if (serviceFilter !== 'ALL' && emp.service_id !== serviceFilter) return false
      if (q && !emp.full_name.toLowerCase().includes(q)) return false
      const st = certStatusFromDates(cert.expires_at, cert.is_indefinite)
      if (statusFilter !== 'ALL' && st !== statusFilter) return false
      return true
    })

    const groups = new Map<string, { employee: User; certs: EmployeeCert[] }>()
    for (const cert of filtered) {
      const emp = (cert.employee as User | null) ?? empMap.get(cert.employee_id ?? '')
      if (!emp) continue
      if (!groups.has(emp.user_id)) groups.set(emp.user_id, { employee: emp, certs: [] })
      groups.get(emp.user_id)!.certs.push(cert)
    }

    const list = [...groups.values()]

    if (sortKey === 'status') {
      list.sort((a, b) => {
        const aW = Math.min(...a.certs.map(c => STATUS_ORDER[certStatusFromDates(c.expires_at, c.is_indefinite)]))
        const bW = Math.min(...b.certs.map(c => STATUS_ORDER[certStatusFromDates(c.expires_at, c.is_indefinite)]))
        return aW - bW || a.employee.full_name.localeCompare(b.employee.full_name, 'ru')
      })
    } else if (sortKey === 'name') {
      list.sort((a, b) => a.employee.full_name.localeCompare(b.employee.full_name, 'ru'))
    } else {
      list.sort((a, b) => {
        const minTs = (g: typeof list[0]) => {
          const ts = g.certs.filter(c => c.expires_at && !c.is_indefinite).map(c => new Date(c.expires_at!).getTime())
          return ts.length ? Math.min(...ts) : Infinity
        }
        return minTs(a) - minTs(b)
      })
    }
    return list
  }, [allCerts, employees, empMap, search, serviceFilter, statusFilter, sortKey])

  const stats = useMemo(() => {
    let expired = 0, expiringSoon = 0, valid = 0
    for (const c of allCerts) {
      const st = certStatusFromDates(c.expires_at, c.is_indefinite)
      if (st === 'EXPIRED') expired++
      else if (st === 'EXPIRING_SOON') expiringSoon++
      else valid++
    }
    return { expired, expiringSoon, valid }
  }, [allCerts])

  return (
    <div className="space-y-4">
      {/* Alert banners */}
      {(stats.expired > 0 || stats.expiringSoon > 0) && (
        <div className="flex gap-3 flex-wrap">
          {stats.expired > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-500/35">
              <span className="text-xl">🚨</span>
              <div>
                <span className="text-red-300 font-bold text-sm">{stats.expired}</span>
                <span className="text-red-400/70 text-sm ml-1.5">просроченных удостоверений</span>
              </div>
            </div>
          )}
          {stats.expiringSoon > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-orange-500/15 border border-orange-500/35">
              <span className="text-xl">⏳</span>
              <div>
                <span className="text-orange-300 font-bold text-sm">{stats.expiringSoon}</span>
                <span className="text-orange-400/70 text-sm ml-1.5">истекают в течение 30 дней</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters + sort */}
      <div className="glass-strong rounded-2xl p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по ФИО…" className="form-input w-48"
          />
          <select value={serviceFilter} onChange={e => setService(e.target.value)} className="form-select">
            <option value="ALL">Все службы</option>
            {services.map(s => <option key={s.service_id} value={s.service_id}>{s.service_name}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatus(e.target.value as FilterStatus)} className="form-select">
            <option value="ALL">Все статусы</option>
            <option value="EXPIRED">🔴 Просроченные ({stats.expired})</option>
            <option value="EXPIRING_SOON">🟡 Истекают ({stats.expiringSoon})</option>
            <option value="VALID">🟢 Действует ({stats.valid})</option>
          </select>

          <div className="flex gap-1 ml-auto border border-white/10 rounded-xl p-0.5">
            {(['status', 'name', 'expires'] as SortKey[]).map(k => (
              <button
                key={k}
                onClick={() => setSortKey(k)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                  sortKey === k
                    ? 'bg-rose-600/40 text-white border border-rose-500/40'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {{ status: 'По статусу', name: 'По ФИО', expires: 'По сроку' }[k]}
              </button>
            ))}
          </div>

          <span className="text-xs text-white/30 ml-1">{grouped.length} сотр.</span>
        </div>
      </div>

      {/* Grouped list */}
      {grouped.length === 0 ? (
        <div className="glass-strong rounded-2xl p-12 text-center text-white/30">
          Нет записей по заданному фильтру
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(({ employee, certs }) => {
            const service = services.find(s => s.service_id === employee.service_id)
            const hasExpired     = certs.some(c => certStatusFromDates(c.expires_at, c.is_indefinite) === 'EXPIRED')
            const hasExpiring    = !hasExpired && certs.some(c => certStatusFromDates(c.expires_at, c.is_indefinite) === 'EXPIRING_SOON')

            const headerBg    = hasExpired  ? 'bg-red-500/10'    : hasExpiring ? 'bg-orange-500/8' : 'bg-white/3'
            const borderColor = hasExpired  ? 'border-red-500/30' : hasExpiring ? 'border-orange-500/25' : 'border-white/6'

            return (
              <div key={employee.user_id} className={`glass-strong rounded-2xl overflow-hidden border ${borderColor}`}>
                {/* Employee header */}
                <div className={`px-5 py-3 flex items-center gap-3 ${headerBg} border-b border-white/6`}>
                  <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white text-sm">{employee.full_name}</span>
                    {employee.position && (
                      <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full border border-white/8">
                        {employee.position}
                      </span>
                    )}
                    {service && (
                      <span className="text-xs text-white/30">{service.service_name}</span>
                    )}
                  </div>
                  <div className="flex gap-2 items-center shrink-0">
                    {hasExpired && (
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 font-medium border border-red-500/30">
                        ⚠ Просрочено
                      </span>
                    )}
                    {hasExpiring && (
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-orange-500/20 text-orange-300 font-medium border border-orange-500/30">
                        ⏱ Истекает
                      </span>
                    )}
                    <span className="text-xs text-white/25">{certs.length} уд.</span>
                  </div>
                </div>

                {/* Certs table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left py-2 px-5 text-[10px] text-white/25 font-medium uppercase tracking-wider min-w-[200px]">
                          Обучение / допуск
                        </th>
                        <th className="text-center py-2 px-3 text-[10px] text-white/25 font-medium uppercase tracking-wider whitespace-nowrap">
                          Статус
                        </th>
                        <th className="text-left py-2 px-3 text-[10px] text-white/25 font-medium uppercase tracking-wider whitespace-nowrap">
                          № удостоверения
                        </th>
                        <th className="text-left py-2 px-3 text-[10px] text-white/25 font-medium uppercase tracking-wider whitespace-nowrap">
                          Дата обучения
                        </th>
                        <th className="text-left py-2 px-3 text-[10px] text-white/25 font-medium uppercase tracking-wider whitespace-nowrap">
                          Действителен до
                        </th>
                        <th className="text-left py-2 px-3 text-[10px] text-white/25 font-medium uppercase tracking-wider whitespace-nowrap">
                          № Протокола
                        </th>
                        <th className="text-left py-2 px-3 text-[10px] text-white/25 font-medium uppercase tracking-wider whitespace-nowrap">
                          Вид
                        </th>
                        <th className="text-left py-2 px-3 text-[10px] text-white/25 font-medium uppercase tracking-wider whitespace-nowrap">
                          ОБ / ПА
                        </th>
                        <th className="text-left py-2 px-3 text-[10px] text-white/25 font-medium uppercase tracking-wider whitespace-nowrap">
                          Удостоверение
                        </th>
                        <th className="text-left py-2 px-3 text-[10px] text-white/25 font-medium uppercase tracking-wider min-w-[130px]">
                          Примечание
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {certs.map(cert => {
                        const st   = certStatusFromDates(cert.expires_at, cert.is_indefinite)
                        const cfg  = CERT_STATUS_CONFIG[st]
                        const days = cert.is_indefinite ? null : daysLeft(cert.expires_at)
                        const catCfg = cert.cert_type ? CERT_CATEGORY_CONFIG[cert.cert_type.cert_category] : null

                        const rowBg =
                          st === 'EXPIRED'       ? 'bg-red-500/5 hover:bg-red-500/8' :
                          st === 'EXPIRING_SOON' ? 'bg-orange-500/5 hover:bg-orange-500/8' :
                          'hover:bg-white/3'

                        return (
                          <tr key={cert.id} className={`border-t border-white/4 transition-colors ${rowBg}`}>
                            {/* Cert type */}
                            <td className="py-2.5 px-5">
                              <div className="flex items-start gap-2">
                                {catCfg && <span className="text-sm mt-0.5 shrink-0">{catCfg.emoji}</span>}
                                <span className="text-white/75 text-xs leading-snug">{cert.cert_type?.name ?? '—'}</span>
                              </div>
                            </td>

                            {/* Status badge */}
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${cfg.bg} ${cfg.text} border border-white/6`}>
                                {cert.is_indefinite
                                  ? '∞ бессрочно'
                                  : days === null ? cfg.label
                                  : days < 0     ? `−${Math.abs(days)}д`
                                  : `${days}д`}
                              </span>
                            </td>

                            {/* Doc number */}
                            <td className="py-2.5 px-3 text-white/55 text-xs font-mono whitespace-nowrap">
                              {cert.doc_number ?? <span className="text-white/20">—</span>}
                            </td>

                            {/* Issued */}
                            <td className="py-2.5 px-3 text-white/55 text-xs whitespace-nowrap">
                              {formatDate(cert.issued_at)}
                            </td>

                            {/* Expires */}
                            <td className={`py-2.5 px-3 text-xs font-medium whitespace-nowrap ${
                              st === 'EXPIRED'       ? 'text-red-400' :
                              st === 'EXPIRING_SOON' ? 'text-orange-400' :
                              'text-white/55'
                            }`}>
                              {cert.is_indefinite ? '∞' : formatDate(cert.expires_at)}
                            </td>

                            {/* Protocol */}
                            <td className="py-2.5 px-3 text-white/55 text-xs font-mono whitespace-nowrap">
                              {cert.protocol_number ?? <span className="text-white/20">—</span>}
                            </td>

                            {/* Renewal type */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {cert.renewal_type ? (
                                <span className={`text-[11px] px-1.5 py-0.5 rounded ${
                                  cert.renewal_type === 'первичное'  ? 'bg-blue-500/20 text-blue-300' :
                                  cert.renewal_type === 'бессрочное' ? 'bg-emerald-500/20 text-emerald-300' :
                                  'bg-white/8 text-white/45'
                                }`}>
                                  {cert.renewal_type}
                                </span>
                              ) : <span className="text-white/20 text-xs">—</span>}
                            </td>

                            {/* OB/PA date */}
                            <td className="py-2.5 px-3 text-white/55 text-xs whitespace-nowrap">
                              {formatDate(cert.ob_pa_date)}
                            </td>

                            {/* Return status */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {cert.return_status ? (
                                <span className={`text-[11px] px-2 py-0.5 rounded-lg font-medium border ${
                                  cert.return_status === 'не сдал'
                                    ? 'bg-red-500/20 text-red-300 border-red-500/25'
                                    : cert.return_status === 'сдал'
                                    ? 'bg-green-500/20 text-green-300 border-green-500/25'
                                    : 'bg-white/8 text-white/45 border-white/8'
                                }`}>
                                  {cert.return_status}
                                </span>
                              ) : (
                                <span className="text-white/20 text-xs">на руках</span>
                              )}
                            </td>

                            {/* Notes */}
                            <td className="py-2.5 px-3 text-white/35 text-xs max-w-[160px] truncate">
                              {cert.notes ?? <span className="text-white/15">—</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-1 items-center">
        <span className="text-[11px] text-white/25">Статус:</span>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/20">🔴 Просрочен</span>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/20">🟡 Истекает ≤30д</span>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/20">🟢 Действует</span>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/15">⬜ Не внесён</span>
      </div>
    </div>
  )
}
