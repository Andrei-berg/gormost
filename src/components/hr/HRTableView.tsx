'use client'
import { useState, useRef, useEffect } from 'react'
import { setEmployeeStatus } from '@/lib/api'
import {
  EMPLOYEE_STATUS_CONFIG, SERVICE_META,
  STATUSES_WITH_DATES, OPEN_ENDED_STATUSES,
} from '@/types'
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

function fmtShortDate(iso: string | null): string {
  if (!iso) return '?'
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
}

interface Props {
  employees: EnrichedEmployee[]
  canEdit: boolean
  canAdmin?: boolean
  currentUserId: string
  onNameClick: (userId: string) => void
  onRefresh: () => void
  services: Service[]
  assignmentMap?: Map<string, UserWithAssignment['assignment']>
}

interface RowProps {
  employee: EnrichedEmployee
  canEdit: boolean
  canAdmin?: boolean
  currentUserId: string
  onNameClick: (userId: string) => void
  onRefresh: () => void
  services: Service[]
  assignment: UserWithAssignment['assignment'] | null
}

function HRTableRow({ employee, canEdit, canAdmin, currentUserId, onNameClick, onRefresh, services, assignment }: RowProps) {
  const today = new Date().toISOString().split('T')[0]

  const [localStatus, setLocalStatus] = useState<EmployeeStatusType>(employee.currentStatus)
  const [popupOpen, setPopupOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<EmployeeStatusType | null>(null)

  // Form state for date/reason collection
  const [dateFrom, setDateFrom]                 = useState(today)
  const [dateTo, setDateTo]                     = useState(today)
  const [openEnded, setOpenEnded]               = useState(false)
  const [plannedDeparture, setPlannedDeparture] = useState('')
  const [plannedReturn, setPlannedReturn]       = useState('')
  const [actualDeparture, setActualDeparture]   = useState('')
  const [actualReturn, setActualReturn]         = useState('')
  const [reasonText, setReasonText]             = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!popupOpen) return
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopupOpen(false); setPendingStatus(null)
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

  // Status record for showing dates (only when status matches current)
  const rec = localStatus === employee.currentStatus ? employee.statusRecord : null

  const handleStatusSelect = async (newStatus: EmployeeStatusType) => {
    if (newStatus === localStatus) { setPopupOpen(false); return }

    if (newStatus === 'Na_rabote') {
      // Save immediately — no dates needed
      const prevStatus = localStatus
      setLocalStatus(newStatus); setError(null); setSaving(true)
      const result = await setEmployeeStatus(user.user_id, newStatus, today, today, null, currentUserId)
      setSaving(false)
      if (!result) { setLocalStatus(prevStatus); setError('Ошибка сохранения') }
      else { onRefresh() }
      setPopupOpen(false)
      return
    }

    // For all other statuses — open the date/reason form
    const isOpenEnded = OPEN_ENDED_STATUSES.includes(newStatus)
    setOpenEnded(isOpenEnded)
    setDateFrom(today)
    setDateTo(today)
    setPlannedDeparture('')
    setPlannedReturn('')
    setActualDeparture('')
    setActualReturn('')
    setReasonText('')
    setPendingStatus(newStatus)
  }

  const handleConfirm = async () => {
    if (!pendingStatus) return
    const prevStatus = localStatus
    setLocalStatus(pendingStatus); setError(null); setSaving(true)
    const result = await setEmployeeStatus(
      user.user_id,
      pendingStatus,
      dateFrom,
      openEnded ? null : (dateTo || null),
      reasonText.trim() || null,
      currentUserId,
      {
        planned_departure: plannedDeparture || null,
        planned_return:    plannedReturn    || null,
        actual_departure:  actualDeparture  || null,
        actual_return:     actualReturn     || null,
      }
    )
    setSaving(false)
    if (!result) { setLocalStatus(prevStatus); setError('Ошибка сохранения') }
    else { onRefresh() }
    setPopupOpen(false); setPendingStatus(null)
  }

  const needsDates = pendingStatus ? STATUSES_WITH_DATES.includes(pendingStatus) : false
  const inp = 'w-full text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white/80 placeholder-white/30 focus:outline-none focus:border-white/30'

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

      {/* PIN — visible to admin/HR only */}
      {canAdmin && (
        <td className="px-4 py-2.5">
          {user.pin_code
            ? <span className="text-xs font-mono text-white/50 tracking-widest">{user.pin_code}</span>
            : <span className="text-white/20 text-xs">—</span>}
        </td>
      )}

      {/* Status + dates */}
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

          {/* Show planned/actual dates below the badge */}
          {rec && (rec.planned_departure || rec.actual_departure) && (
            <div className="mt-0.5 space-y-0.5">
              {rec.planned_departure && (
                <div className="text-[9px] text-white/30">
                  план: {fmtShortDate(rec.planned_departure)}{rec.planned_return ? ` — ${fmtShortDate(rec.planned_return)}` : ''}
                </div>
              )}
              {rec.actual_departure && (
                <div className="text-[9px] text-teal-500/60">
                  факт: {fmtShortDate(rec.actual_departure)}{rec.actual_return ? ` — ${fmtShortDate(rec.actual_return)}` : ''}
                </div>
              )}
            </div>
          )}

          {error && <div className="text-xs text-red-400 mt-1 whitespace-nowrap">{error}</div>}

          {/* Status popup */}
          {popupOpen && (
            <div className="absolute z-50 top-full right-0 mt-1 glass-popup rounded-xl"
              style={{ width: pendingStatus ? '300px' : '208px' }}
            >
              {pendingStatus === null ? (
                /* Step 1: choose status */
                <div className="p-2 space-y-0.5">
                  <div className="text-xs text-white/55 px-2 py-1 font-medium">Ежедневные</div>
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
                  <div className="text-xs text-white/55 px-2 py-1 font-medium">Расширенные</div>
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
                /* Step 2: date/reason form */
                <div className="p-3 space-y-3">
                  {/* Status label */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded border ${EMPLOYEE_STATUS_CONFIG[pendingStatus].bg}`}
                      style={{ color: EMPLOYEE_STATUS_CONFIG[pendingStatus].color }}
                    >
                      {EMPLOYEE_STATUS_CONFIG[pendingStatus].label}
                    </span>
                    <button
                      onClick={() => setPendingStatus(null)}
                      className="text-white/30 hover:text-white/60 text-xs ml-auto"
                    >← назад</button>
                  </div>

                  {/* Period */}
                  <div>
                    <div className="text-[10px] text-white/60 mb-1">Период</div>
                    <div className="flex gap-1.5 items-center">
                      <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inp} />
                      {!openEnded && (
                        <>
                          <span className="text-white/30 text-xs shrink-0">—</span>
                          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inp} />
                        </>
                      )}
                    </div>
                    {OPEN_ENDED_STATUSES.includes(pendingStatus) && (
                      <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer">
                        <input type="checkbox" checked={openEnded} onChange={e => setOpenEnded(e.target.checked)} className="accent-blue-500" />
                        <span className="text-[10px] text-white/40">Без даты окончания</span>
                      </label>
                    )}
                  </div>

                  {/* Departure/return dates — only for statuses that have them */}
                  {needsDates && (
                    <>
                      <div>
                        <div className="text-[10px] text-white/40 mb-1">📋 Плановые даты</div>
                        <div className="flex gap-1.5 items-center">
                          <div className="flex-1">
                            <div className="text-[9px] text-white/30 mb-0.5">Убытие</div>
                            <input type="date" value={plannedDeparture} onChange={e => setPlannedDeparture(e.target.value)} className={inp} />
                          </div>
                          <div className="flex-1">
                            <div className="text-[9px] text-white/30 mb-0.5">Прибытие</div>
                            <input type="date" value={plannedReturn} onChange={e => setPlannedReturn(e.target.value)} className={inp} />
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-white/40 mb-1">✅ Фактические даты</div>
                        <div className="flex gap-1.5 items-center">
                          <div className="flex-1">
                            <div className="text-[9px] text-white/30 mb-0.5">Убытие</div>
                            <input type="date" value={actualDeparture} onChange={e => setActualDeparture(e.target.value)} className={inp} />
                          </div>
                          <div className="flex-1">
                            <div className="text-[9px] text-white/30 mb-0.5">Прибытие</div>
                            <input type="date" value={actualReturn} onChange={e => setActualReturn(e.target.value)} className={inp} />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Reason */}
                  <div>
                    <div className="text-[10px] text-white/40 mb-1">Причина (необязательно)</div>
                    <input
                      type="text" value={reasonText} onChange={e => setReasonText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
                      placeholder="Укажите причину"
                      className={inp}
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-1.5">
                    <button onClick={handleConfirm} disabled={saving}
                      className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium disabled:opacity-50">
                      {saving ? '...' : 'Сохранить'}
                    </button>
                    <button onClick={() => { setPopupOpen(false); setPendingStatus(null) }}
                      className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 border border-white/10">
                      Отмена
                    </button>
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

export default function HRTableView({ employees, canEdit, canAdmin, currentUserId, onNameClick, onRefresh, services, assignmentMap }: Props) {
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
            {canAdmin && <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">PIN</th>}
            <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Статус</th>
          </tr>
        </thead>
        <tbody>
          {employees.length === 0 ? (
            <tr>
              <td colSpan={canAdmin ? 7 : 6}>
                <div className="text-center text-white/30 py-8">Нет сотрудников</div>
              </td>
            </tr>
          ) : (
            employees.map(emp => (
              <HRTableRow
                key={emp.user.user_id}
                employee={emp}
                canEdit={canEdit}
                canAdmin={canAdmin}
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
