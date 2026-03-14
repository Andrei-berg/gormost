'use client'
import { useState, useRef, useEffect } from 'react'
import { setEmployeeStatus } from '@/lib/api'
import { EMPLOYEE_STATUS_CONFIG, SERVICE_META } from '@/types'
import type { EnrichedEmployee, EmployeeStatusType, Service, UserWithAssignment } from '@/types'

const DAILY_STATUSES: EmployeeStatusType[] = ['Na_rabote', 'Otgul', 'Bolnichniy', 'Otpusk']
const EXTENDED_STATUSES: EmployeeStatusType[] = [
  'Komandirovka', 'Uchebniy_otpusk', 'Dekret', 'Mobilizovan', 'SVO', 'Troydoustroyen_s_SVO'
]

const SHIFT_COLORS: Record<number, string> = {
  1: 'text-blue-400', 2: 'text-green-400', 3: 'text-amber-400', 4: 'text-purple-400',
}

function getTenure(dateHired: string | null): string | null {
  if (!dateHired) return null
  const hired = new Date(dateHired)
  const now = new Date()
  const total = (now.getFullYear() - hired.getFullYear()) * 12 + (now.getMonth() - hired.getMonth())
  if (total < 1) return '<1 мес'
  if (total < 12) return `${total} мес`
  const y = Math.floor(total / 12)
  const m = total % 12
  return m > 0 ? `${y}г ${m}м` : `${y} г.`
}

interface Props {
  employees: EnrichedEmployee[]
  canEdit: boolean
  currentUserId: string
  onNameClick: (userId: string) => void
  onRefresh: () => void
  services: Service[]
  assignmentMap?: Map<string, UserWithAssignment['assignment']>
}

interface RowProps {
  employee: EnrichedEmployee
  canEdit: boolean
  currentUserId: string
  onNameClick: (userId: string) => void
  onRefresh: () => void
  services: Service[]
  assignment: UserWithAssignment['assignment'] | null
}

function HRTableRow({ employee, canEdit, currentUserId, onNameClick, onRefresh, services, assignment }: RowProps) {
  const [localStatus, setLocalStatus] = useState<EmployeeStatusType>(employee.currentStatus)
  const [popupOpen, setPopupOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<EmployeeStatusType | null>(null)
  const [reasonText, setReasonText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!popupOpen) return
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopupOpen(false); setPendingStatus(null); setReasonText('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [popupOpen])

  const { user } = employee
  const cfg = EMPLOYEE_STATUS_CONFIG[localStatus]
  const service = services.find(s => s.service_id === user.service_id)
  const serviceMeta = user.service_id ? SERVICE_META[user.service_id] : null
  const serviceDisplay = serviceMeta && service
    ? `${serviceMeta.emoji} ${service.service_name}`
    : user.service_id ?? '—'

  const scheduleLabel = assignment
    ? [
        assignment.shift_num ? `Смена ${assignment.shift_num}` : null,
        assignment.schedule_code,
      ].filter(Boolean).join(' · ')
    : null

  const tenure = getTenure(user.date_hired)

  const handleStatusSelect = async (newStatus: EmployeeStatusType) => {
    if (newStatus === localStatus) { setPopupOpen(false); setPendingStatus(null); setReasonText(''); return }
    const prevStatus = localStatus
    setLocalStatus(newStatus); setError(null); setSaving(true)
    const today = new Date().toISOString().split('T')[0]
    const result = await setEmployeeStatus(user.user_id, newStatus, today, today, null, currentUserId)
    setSaving(false)
    if (!result) {
      setLocalStatus(prevStatus); setPopupOpen(false); setPendingStatus(null)
      setError('Не удалось сохранить статус'); return
    }
    onRefresh()
    if (newStatus === 'Na_rabote') { setPopupOpen(false); setPendingStatus(null); setReasonText('') }
    else { setPendingStatus(newStatus); setReasonText('') }
  }

  const handleReasonConfirm = async () => {
    if (pendingStatus && reasonText.trim()) {
      setSaving(true)
      const today = new Date().toISOString().split('T')[0]
      await setEmployeeStatus(user.user_id, pendingStatus, today, today, reasonText.trim(), currentUserId)
      setSaving(false); onRefresh()
    }
    setPopupOpen(false); setPendingStatus(null); setReasonText('')
  }

  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
      {/* Name */}
      <td className="px-4 py-2.5">
        <button
          onClick={() => onNameClick(user.user_id)}
          className="text-sm text-white/80 hover:text-teal-300 transition-colors text-left truncate block max-w-[180px] font-medium"
        >
          {user.full_name}
        </button>
        {user.position && (
          <div className="text-[10px] text-white/30 truncate max-w-[180px]">{user.position}</div>
        )}
      </td>

      {/* Service */}
      <td className="px-4 py-2.5">
        <span className="text-xs text-white/50 truncate block max-w-[160px]">{serviceDisplay}</span>
      </td>

      {/* Schedule / Shift */}
      <td className="px-4 py-2.5">
        {scheduleLabel ? (
          <div className="text-xs">
            {assignment?.shift_num && (
              <span className={`font-medium ${SHIFT_COLORS[assignment.shift_num] ?? 'text-white/60'}`}>
                Смена {assignment.shift_num}
              </span>
            )}
            {assignment?.shift_num && assignment?.schedule_code && (
              <span className="text-white/30"> · </span>
            )}
            {assignment?.schedule_code && (
              <span className="text-white/50">{assignment.schedule_code}</span>
            )}
          </div>
        ) : (
          <span className="text-white/20 text-xs">—</span>
        )}
      </td>

      {/* Tenure */}
      <td className="px-4 py-2.5">
        <span className="text-xs text-white/40">{tenure ?? '—'}</span>
      </td>

      {/* Phone */}
      <td className="px-4 py-2.5">
        {user.phone
          ? <span className="text-xs text-white/50">{user.phone}</span>
          : <span className="text-white/20 text-xs">—</span>}
      </td>

      {/* Status */}
      <td className="px-4 py-2.5">
        <div className="relative inline-block" ref={popupRef}>
          {canEdit ? (
            <button
              onClick={() => { if (!saving) setPopupOpen(true) }}
              className="cursor-pointer hover:opacity-80 transition-opacity"
              disabled={saving}
            >
              <span className={`text-xs px-2 py-1 rounded-lg border ${cfg.bg}`} style={{ color: cfg.color }}>
                {saving ? '...' : cfg.label}
              </span>
            </button>
          ) : (
            <span className={`text-xs px-2 py-1 rounded-lg border ${cfg.bg}`} style={{ color: cfg.color }}>
              {cfg.label}
            </span>
          )}
          {error && <div className="text-xs text-red-400 mt-1 whitespace-nowrap">{error}</div>}

          {popupOpen && (
            <div className="absolute z-50 top-full left-0 mt-1 w-52 bg-slate-900 border border-white/10 rounded-xl shadow-2xl">
              {pendingStatus === null ? (
                <div className="p-2 space-y-0.5">
                  <div className="text-xs text-white/30 px-2 py-1">Ежедневные</div>
                  {DAILY_STATUSES.map(status => {
                    const scfg = EMPLOYEE_STATUS_CONFIG[status]
                    const isActive = localStatus === status
                    return (
                      <button key={status} onClick={() => handleStatusSelect(status)} disabled={saving}
                        className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs hover:bg-white/10 transition-colors disabled:opacity-50"
                      >
                        <span className={`text-teal-400 w-3 shrink-0 ${isActive ? 'opacity-100' : 'opacity-0'}`}>✓</span>
                        <span className={`px-1.5 py-0.5 rounded border text-xs ${scfg.bg}`} style={{ color: scfg.color }}>{scfg.label}</span>
                      </button>
                    )
                  })}
                  <div className="border-t border-white/10 my-1" />
                  <div className="text-xs text-white/30 px-2 py-1">Расширенные</div>
                  {EXTENDED_STATUSES.map(status => {
                    const scfg = EMPLOYEE_STATUS_CONFIG[status]
                    const isActive = localStatus === status
                    return (
                      <button key={status} onClick={() => handleStatusSelect(status)} disabled={saving}
                        className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs hover:bg-white/10 transition-colors disabled:opacity-50"
                      >
                        <span className={`text-teal-400 w-3 shrink-0 ${isActive ? 'opacity-100' : 'opacity-0'}`}>✓</span>
                        <span className={`px-1.5 py-0.5 rounded border text-xs ${scfg.bg}`} style={{ color: scfg.color }}>{scfg.label}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  <div className="text-xs text-white/40">Укажите причину (необязательно)</div>
                  <input
                    type="text" value={reasonText} onChange={e => setReasonText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleReasonConfirm() }}
                    placeholder="Причина (необязательно)"
                    className="w-full text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white/80 placeholder-white/30 focus:outline-none focus:border-white/30"
                    autoFocus
                  />
                  <div className="flex gap-1.5">
                    <button onClick={handleReasonConfirm} disabled={saving}
                      className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/60 border border-white/10 disabled:opacity-50">✓</button>
                    <button onClick={() => { setPopupOpen(false); setPendingStatus(null); setReasonText('') }}
                      className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 border border-white/10">✕</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

export default function HRTableView({ employees, canEdit, currentUserId, onNameClick, onRefresh, services, assignmentMap }: Props) {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Сотрудник</th>
            <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Служба</th>
            <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Смена / График</th>
            <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Стаж</th>
            <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Телефон</th>
            <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Статус</th>
          </tr>
        </thead>
        <tbody>
          {employees.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <div className="text-center text-white/30 py-8">Нет сотрудников</div>
              </td>
            </tr>
          ) : (
            employees.map(emp => (
              <HRTableRow
                key={emp.user.user_id}
                employee={emp}
                canEdit={canEdit}
                currentUserId={currentUserId}
                onNameClick={onNameClick}
                onRefresh={onRefresh}
                services={services}
                assignment={assignmentMap?.get(emp.user.user_id) ?? null}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
