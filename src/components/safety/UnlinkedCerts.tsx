'use client'
import { useState, useMemo } from 'react'
import type { EmployeeCert, User, AuthSession } from '@/types'
import { certStatusFromDates, CERT_STATUS_CONFIG } from '@/types'
import { linkCertToEmployee, deleteEmployeeCert } from '@/lib/api-client'

interface Props {
  unlinked: EmployeeCert[]
  employees: User[]
  session: AuthSession
  onRefresh: () => void
}

export default function UnlinkedCerts({ unlinked, employees, onRefresh }: Props) {
  const [search, setSearch] = useState('')
  const [linking, setLinking] = useState<string | null>(null) // cert id being linked
  const [selectedEmployee, setSelectedEmployee] = useState<Record<string, string>>({}) // certId → userId
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filtered = useMemo(() =>
    unlinked.filter(c =>
      !search || (c.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.cert_type?.name ?? '').toLowerCase().includes(search.toLowerCase())
    ), [unlinked, search])

  const activeEmployees = useMemo(() =>
    employees.filter(e => e.is_active).sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [employees])

  async function handleLink(certId: string) {
    const empId = selectedEmployee[certId]
    if (!empId) return
    setLinking(certId)
    await linkCertToEmployee(certId, empId)
    setLinking(null)
    onRefresh()
  }

  async function handleDelete(certId: string) {
    setDeleting(certId)
    await deleteEmployeeCert(certId)
    setDeleting(null)
    setConfirmDelete(null)
    onRefresh()
  }

  if (unlinked.length === 0) {
    return (
      <div className="glass-strong rounded-2xl p-12 text-center">
        <p className="text-3xl mb-3">✅</p>
        <p className="text-green-400 font-medium">Все записи привязаны к сотрудникам</p>
        <p className="text-white/30 text-sm mt-1">Несвязанных записей нет</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="glass-strong rounded-2xl p-4 border border-amber-500/20 bg-amber-500/5">
        <div className="flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-sm font-medium text-amber-300">
              {unlinked.length} записей без привязки к сотруднику
            </p>
            <p className="text-xs text-white/40 mt-0.5">
              Эти записи были импортированы из Excel, но не удалось автоматически сопоставить ФИО с базой данных.
              Выберите сотрудника вручную и нажмите «Связать».
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="glass-strong rounded-2xl p-3">
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по ФИО или типу допуска…" className="form-input w-full"
        />
      </div>

      {/* Records table */}
      <div className="glass-strong rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-white/50 font-medium min-w-[200px]">ФИО из Excel</th>
                <th className="text-left py-3 px-4 text-white/50 font-medium">Тип допуска</th>
                <th className="text-left py-3 px-3 text-white/50 font-medium">Выдан</th>
                <th className="text-left py-3 px-3 text-white/50 font-medium">До</th>
                <th className="text-left py-3 px-3 text-white/50 font-medium">№ уд.</th>
                <th className="text-left py-3 px-4 text-white/50 font-medium min-w-[220px]">Связать с сотрудником</th>
                <th className="py-3 px-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(cert => {
                const st = certStatusFromDates(cert.expires_at, cert.is_indefinite)
                const cfg = CERT_STATUS_CONFIG[st]
                const daysLeft = cert.expires_at && !cert.is_indefinite
                  ? Math.ceil((new Date(cert.expires_at).getTime() - Date.now()) / 86400000)
                  : null

                return (
                  <tr key={cert.id} className="border-b border-white/5 hover:bg-white/3">
                    {/* Name */}
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-400 text-xs" title="Несвязанная запись">⚠</span>
                        <span className="font-medium text-white/90">{cert.full_name}</span>
                      </div>
                      {cert.notes && (
                        <div className="text-[11px] text-white/30 mt-0.5 truncate max-w-[180px]">{cert.notes}</div>
                      )}
                    </td>

                    {/* Cert type */}
                    <td className="py-2.5 px-4">
                      <div className="text-white/80">{cert.cert_type?.name}</div>
                      {cert.renewal_type && (
                        <div className="text-[11px] text-white/30">{cert.renewal_type}</div>
                      )}
                    </td>

                    {/* Issued */}
                    <td className="py-2.5 px-3 text-white/50 whitespace-nowrap">
                      {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString('ru') : '—'}
                    </td>

                    {/* Expires */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {cert.is_indefinite ? (
                        <span className="text-emerald-400 text-xs font-medium">∞ бессрочно</span>
                      ) : cert.expires_at ? (
                        <span className={`text-xs font-medium ${cfg.text}`}>
                          {daysLeft !== null && daysLeft < 0
                            ? `истёк ${Math.abs(daysLeft)}д назад`
                            : daysLeft !== null
                            ? `${daysLeft}д`
                            : new Date(cert.expires_at).toLocaleDateString('ru')}
                        </span>
                      ) : (
                        <span className="text-white/20">—</span>
                      )}
                    </td>

                    {/* Doc number */}
                    <td className="py-2.5 px-3 text-white/40 text-xs">
                      {cert.doc_number || '—'}
                    </td>

                    {/* Link employee */}
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedEmployee[cert.id] || ''}
                          onChange={e => setSelectedEmployee(prev => ({ ...prev, [cert.id]: e.target.value }))}
                          className="form-select text-xs flex-1"
                        >
                          <option value="">— выберите сотрудника</option>
                          {activeEmployees.map(emp => (
                            <option key={emp.user_id} value={emp.user_id}>
                              {emp.full_name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleLink(cert.id)}
                          disabled={!selectedEmployee[cert.id] || linking === cert.id}
                          className="px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 disabled:opacity-30 text-white text-xs font-medium transition-colors whitespace-nowrap"
                        >
                          {linking === cert.id ? '…' : 'Связать'}
                        </button>
                      </div>
                    </td>

                    {/* Delete */}
                    <td className="py-2 px-3">
                      {confirmDelete === cert.id ? (
                        <button
                          onClick={() => handleDelete(cert.id)}
                          disabled={deleting === cert.id}
                          className="px-2 py-1 rounded text-red-400 bg-red-500/20 text-xs font-medium"
                        >
                          {deleting === cert.id ? '…' : 'Удалить?'}
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(cert.id)}
                          className="text-white/20 hover:text-red-400 text-lg leading-none transition-colors"
                          title="Удалить запись"
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-white/25 px-1">
        {filtered.length} из {unlinked.length} записей · После привязки запись исчезнет из этого списка и появится в матрице допусков
      </p>
    </div>
  )
}
