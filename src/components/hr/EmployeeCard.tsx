'use client'
import { useState } from 'react'
import { setEmployeeStatus } from '@/lib/api'
import { EMPLOYEE_STATUS_CONFIG } from '@/types'
import type { EnrichedEmployee, EmployeeStatusType } from '@/types'
import StatusHistory from './StatusHistory'

// The 4 clickable statuses — 'Uvolen' is NOT a button (Phase 04 scope)
const CLICKABLE_STATUSES: EmployeeStatusType[] = ['Na_rabote', 'Otgul', 'Bolnichniy', 'Otpusk']

interface Props {
  employee: EnrichedEmployee
  canEdit: boolean
  currentUserId: string
  onRefresh: () => void
  onNameClick: (userId: string) => void
}

export default function EmployeeCard({ employee, canEdit, currentUserId, onRefresh, onNameClick }: Props) {
  const [localStatus, setLocalStatus] = useState<EmployeeStatusType>(employee.currentStatus)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Reason flow: after clicking a non-Na_rabote status, show reason input
  const [showReason, setShowReason] = useState(false)
  const [pendingReason, setPendingReason] = useState('')

  const cfg = EMPLOYEE_STATUS_CONFIG[localStatus]

  const handleStatusClick = async (newStatus: EmployeeStatusType) => {
    if (newStatus === localStatus || saving) return  // no-op if already active or mid-save
    const prevStatus = localStatus
    setLocalStatus(newStatus)   // optimistic update
    setError(null)
    setSaving(true)
    // Show reason input for non-Na_rabote statuses
    setShowReason(newStatus !== 'Na_rabote')
    setPendingReason('')

    const today = new Date().toISOString().split('T')[0]  // 'YYYY-MM-DD'
    const result = await setEmployeeStatus(
      employee.user.user_id,
      newStatus,
      today,
      today,       // dateTo = dateFrom (single-day per RESEARCH.md Pitfall 6)
      null,        // reason saved immediately as null; optional reason is a follow-up INSERT
      currentUserId
    )

    setSaving(false)
    if (!result) {
      setLocalStatus(prevStatus)  // rollback on failure
      setShowReason(false)
      setError('Не удалось сохранить статус')
    } else {
      onRefresh()
    }
  }

  const handleReasonConfirm = async () => {
    if (!pendingReason.trim()) {
      setShowReason(false)
      return
    }
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]
    await setEmployeeStatus(
      employee.user.user_id,
      localStatus,
      today,
      today,
      pendingReason.trim(),
      currentUserId
    )
    setSaving(false)
    setShowReason(false)
    setPendingReason('')
    onRefresh()
  }

  return (
    <div className="glass rounded-xl p-4 border border-transparent">
      {/* Header: name + position + current status badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <button
            onClick={() => onNameClick(employee.user.user_id)}
            className="text-sm font-medium text-white hover:text-teal-300 transition-colors text-left truncate block w-full"
          >
            {employee.user.full_name}
          </button>
          {employee.user.position && (
            <div className="text-xs text-white/40 mt-0.5 truncate">{employee.user.position}</div>
          )}
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-lg border shrink-0 ${cfg.bg}`}
          style={{ color: cfg.color }}
        >
          {saving ? '...' : cfg.label}
        </span>
      </div>

      {/* Status buttons — only for canEdit users */}
      {canEdit && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {CLICKABLE_STATUSES.map(status => {
            const scfg = EMPLOYEE_STATUS_CONFIG[status]
            const isActive = localStatus === status
            return (
              <button
                key={status}
                onClick={() => handleStatusClick(status)}
                disabled={saving}
                className={`text-xs px-2 py-1 rounded-lg border transition-colors disabled:opacity-50 ${
                  isActive
                    ? `${scfg.bg} font-medium cursor-default`
                    : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 cursor-pointer'
                }`}
                style={isActive ? { color: scfg.color } : undefined}
              >
                {scfg.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Reason input — appears after clicking a non-Na_rabote status */}
      {canEdit && showReason && (
        <div className="flex gap-1.5 mt-1 mb-2">
          <input
            type="text"
            value={pendingReason}
            onChange={e => setPendingReason(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleReasonConfirm() }}
            placeholder="Причина (необязательно)"
            className="flex-1 text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white/80 placeholder-white/30 focus:outline-none focus:border-white/30"
          />
          <button
            onClick={handleReasonConfirm}
            disabled={saving}
            className="text-xs px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/60 border border-white/10 transition-colors disabled:opacity-50"
          >
            ✓
          </button>
          <button
            onClick={() => setShowReason(false)}
            className="text-xs px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 border border-white/10 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="text-xs text-red-400 mt-1 mb-2">{error}</div>
      )}

      {/* Status history accordion */}
      <StatusHistory userId={employee.user.user_id} />
    </div>
  )
}
