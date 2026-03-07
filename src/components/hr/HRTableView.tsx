'use client'
import { useState, useRef, useEffect } from 'react'
import { setEmployeeStatus } from '@/lib/api'
import { EMPLOYEE_STATUS_CONFIG, SERVICE_META } from '@/types'
import type { EnrichedEmployee, EmployeeStatusType, Service } from '@/types'

// Daily/operational statuses (same grouping as EmployeeCard)
const DAILY_STATUSES: EmployeeStatusType[] = ['Na_rabote', 'Otgul', 'Bolnichniy', 'Otpusk']

// Extended statuses — Uvolen NOT included (lifecycle event, not a daily status change)
const EXTENDED_STATUSES: EmployeeStatusType[] = [
  'Komandirovka', 'Uchebniy_otpusk', 'Dekret', 'Mobilizovan', 'SVO', 'Troydoustroyen_s_SVO'
]

interface Props {
  employees: EnrichedEmployee[]
  canEdit: boolean
  currentUserId: string
  onNameClick: (userId: string) => void
  onRefresh: () => void
  services: Service[]
}

// ---- HRTableRow — per-employee row with its own popup state ----

interface RowProps {
  employee: EnrichedEmployee
  canEdit: boolean
  currentUserId: string
  onNameClick: (userId: string) => void
  onRefresh: () => void
  services: Service[]
}

function HRTableRow({ employee, canEdit, currentUserId, onNameClick, onRefresh, services }: RowProps) {
  const [localStatus, setLocalStatus] = useState<EmployeeStatusType>(employee.currentStatus)
  const [popupOpen, setPopupOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<EmployeeStatusType | null>(null)
  const [reasonText, setReasonText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const popupRef = useRef<HTMLDivElement>(null)

  // Outside-click handler — close popup without saving
  useEffect(() => {
    if (!popupOpen) return
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopupOpen(false)
        setPendingStatus(null)
        setReasonText('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [popupOpen])

  const cfg = EMPLOYEE_STATUS_CONFIG[localStatus]

  // Resolve service display: emoji + short name
  const service = services.find(s => s.service_id === employee.user.service_id)
  const serviceMeta = employee.user.service_id ? SERVICE_META[employee.user.service_id] : null
  const serviceDisplay = serviceMeta && service
    ? `${serviceMeta.emoji} ${service.service_name}`
    : serviceMeta && employee.user.service_id
    ? `${serviceMeta.emoji} ${employee.user.service_id}`
    : employee.user.service_id ?? '—'

  // Status selection: first click saves status immediately, then optionally collects reason
  const handleStatusSelect = async (newStatus: EmployeeStatusType) => {
    if (newStatus === localStatus) {
      // Already active — close without action
      setPopupOpen(false)
      setPendingStatus(null)
      setReasonText('')
      return
    }

    const prevStatus = localStatus
    setLocalStatus(newStatus)   // optimistic update
    setError(null)
    setSaving(true)

    const today = new Date().toISOString().split('T')[0]  // 'YYYY-MM-DD'
    const result = await setEmployeeStatus(
      employee.user.user_id,
      newStatus,
      today,
      today,    // dateTo = dateFrom (single-day entry)
      null,     // reason saved as null; optional reason is a follow-up INSERT
      currentUserId
    )
    setSaving(false)

    if (!result) {
      setLocalStatus(prevStatus)  // rollback on failure
      setPopupOpen(false)
      setPendingStatus(null)
      setError('Не удалось сохранить статус')
      return
    }

    onRefresh()

    if (newStatus === 'Na_rabote') {
      // No reason needed — close popup
      setPopupOpen(false)
      setPendingStatus(null)
      setReasonText('')
    } else {
      // Show reason input inside popup
      setPendingStatus(newStatus)
      setReasonText('')
    }
  }

  const handleReasonConfirm = async () => {
    if (pendingStatus && reasonText.trim()) {
      setSaving(true)
      const today = new Date().toISOString().split('T')[0]
      await setEmployeeStatus(
        employee.user.user_id,
        pendingStatus,
        today,
        today,
        reasonText.trim(),
        currentUserId
      )
      setSaving(false)
      onRefresh()
    }
    // Close popup regardless of whether reason was provided
    setPopupOpen(false)
    setPendingStatus(null)
    setReasonText('')
  }

  const handleReasonCancel = () => {
    setPopupOpen(false)
    setPendingStatus(null)
    setReasonText('')
  }

  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
      {/* Name column */}
      <td className="px-4 py-2.5">
        <button
          onClick={() => onNameClick(employee.user.user_id)}
          className="text-sm text-white/80 hover:text-teal-300 transition-colors text-left truncate block max-w-[200px]"
        >
          {employee.user.full_name}
        </button>
      </td>

      {/* Service column */}
      <td className="px-4 py-2.5">
        <span className="text-sm text-white/50 truncate block max-w-[180px]">
          {serviceDisplay}
        </span>
      </td>

      {/* Status column — badge + popup */}
      <td className="px-4 py-2.5">
        <div className="relative inline-block" ref={popupRef}>
          {/* Status badge — clickable only when canEdit */}
          {canEdit ? (
            <button
              onClick={() => { if (!saving) setPopupOpen(true) }}
              className="cursor-pointer hover:opacity-80 transition-opacity"
              disabled={saving}
            >
              <span
                className={`text-xs px-2 py-1 rounded-lg border ${cfg.bg}`}
                style={{ color: cfg.color }}
              >
                {saving ? '...' : cfg.label}
              </span>
            </button>
          ) : (
            <span
              className={`text-xs px-2 py-1 rounded-lg border ${cfg.bg}`}
              style={{ color: cfg.color }}
            >
              {cfg.label}
            </span>
          )}

          {/* Error message below badge */}
          {error && (
            <div className="text-xs text-red-400 mt-1 whitespace-nowrap">{error}</div>
          )}

          {/* StatusPopup — drops below the badge */}
          {popupOpen && (
            <div className="absolute z-50 top-full left-0 mt-1 w-52 bg-slate-900 border border-white/10 rounded-xl shadow-2xl">
              {pendingStatus === null ? (
                // Status list view
                <div className="p-2 space-y-0.5">
                  {/* Group 1: Daily statuses */}
                  <div className="text-xs text-white/30 px-2 py-1">Ежедневные</div>
                  {DAILY_STATUSES.map(status => {
                    const scfg = EMPLOYEE_STATUS_CONFIG[status]
                    const isActive = localStatus === status
                    return (
                      <button
                        key={status}
                        onClick={() => handleStatusSelect(status)}
                        disabled={saving}
                        className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs hover:bg-white/10 transition-colors disabled:opacity-50"
                      >
                        {/* Checkmark — visible when active, invisible otherwise (preserves spacing) */}
                        <span className={`text-teal-400 w-3 shrink-0 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                          ✓
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded border text-xs ${scfg.bg}`}
                          style={{ color: scfg.color }}
                        >
                          {scfg.label}
                        </span>
                      </button>
                    )
                  })}

                  {/* Divider */}
                  <div className="border-t border-white/10 my-1" />

                  {/* Group 2: Extended statuses */}
                  <div className="text-xs text-white/30 px-2 py-1">Расширенные</div>
                  {EXTENDED_STATUSES.map(status => {
                    const scfg = EMPLOYEE_STATUS_CONFIG[status]
                    const isActive = localStatus === status
                    return (
                      <button
                        key={status}
                        onClick={() => handleStatusSelect(status)}
                        disabled={saving}
                        className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs hover:bg-white/10 transition-colors disabled:opacity-50"
                      >
                        <span className={`text-teal-400 w-3 shrink-0 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                          ✓
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded border text-xs ${scfg.bg}`}
                          style={{ color: scfg.color }}
                        >
                          {scfg.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                // Reason input view (replaces status list after selecting non-Na_rabote)
                <div className="p-3 space-y-2">
                  <div className="text-xs text-white/40">Укажите причину (необязательно)</div>
                  <input
                    type="text"
                    value={reasonText}
                    onChange={e => setReasonText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleReasonConfirm() }}
                    placeholder="Причина (необязательно)"
                    className="w-full text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white/80 placeholder-white/30 focus:outline-none focus:border-white/30"
                    autoFocus
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleReasonConfirm}
                      disabled={saving}
                      className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/60 border border-white/10 transition-colors disabled:opacity-50"
                    >
                      ✓
                    </button>
                    <button
                      onClick={handleReasonCancel}
                      className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 border border-white/10 transition-colors"
                    >
                      ✕
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

// ---- HRTableView — outer table shell ----

export default function HRTableView({ employees, canEdit, currentUserId, onNameClick, onRefresh, services }: Props) {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Сотрудник</th>
            <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Служба</th>
            <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Статус</th>
          </tr>
        </thead>
        <tbody>
          {employees.length === 0 ? (
            <tr>
              <td colSpan={3}>
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
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
