'use client'
import { useState } from 'react'
import { setEmployeeStatus } from '@/lib/api'
import { EMPLOYEE_STATUS_CONFIG } from '@/types'
import type { EnrichedEmployee, EmployeeStatusType, UserWithAssignment } from '@/types'
import StatusHistory from './StatusHistory'

const DAILY_STATUSES: EmployeeStatusType[] = ['Na_rabote', 'Otgul', 'Bolnichniy', 'Otpusk']
const EXTENDED_STATUSES: EmployeeStatusType[] = [
  'Komandirovka', 'Uchebniy_otpusk', 'Dekret', 'Mobilizovan', 'SVO', 'Troydoustroyen_s_SVO', 'Voennie_sbory'
]

const SHIFT_COLORS: Record<number, string> = {
  1: 'text-blue-400',
  2: 'text-green-400',
  3: 'text-amber-400',
  4: 'text-purple-400',
}

function getTenure(dateHired: string | null): string | null {
  if (!dateHired) return null
  const hired = new Date(dateHired)
  const now = new Date()
  const years = now.getFullYear() - hired.getFullYear()
  const months = now.getMonth() - hired.getMonth()
  const total = years * 12 + months
  if (total < 1) return 'менее месяца'
  if (total < 12) return `${total} мес.`
  const y = Math.floor(total / 12)
  const m = total % 12
  return m > 0 ? `${y} г. ${m} мес.` : `${y} г.`
}

function isProbation(probationEnd: string | null): boolean {
  if (!probationEnd) return false
  return new Date(probationEnd) > new Date()
}

interface Props {
  employee: EnrichedEmployee
  canEdit: boolean
  currentUserId: string
  onRefresh: () => void
  onNameClick: (userId: string) => void
  assignment?: UserWithAssignment['assignment'] | null
}

export default function EmployeeCard({ employee, canEdit, currentUserId, onRefresh, onNameClick, assignment }: Props) {
  const [localStatus, setLocalStatus] = useState<EmployeeStatusType>(employee.currentStatus)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showReason, setShowReason] = useState(false)
  const [pendingReason, setPendingReason] = useState('')

  const { user } = employee
  const cfg = EMPLOYEE_STATUS_CONFIG[localStatus]
  const tenure = getTenure(user.date_hired)
  const onProbation = isProbation(user.probation_end)

  const handleStatusClick = async (newStatus: EmployeeStatusType) => {
    if (newStatus === localStatus || saving) return
    const prevStatus = localStatus
    setLocalStatus(newStatus)
    setError(null)
    setSaving(true)
    setShowReason(newStatus !== 'Na_rabote')
    setPendingReason('')
    const today = new Date().toISOString().split('T')[0]
    const result = await setEmployeeStatus(user.user_id, newStatus, today, today, null, currentUserId)
    setSaving(false)
    if (!result) {
      setLocalStatus(prevStatus)
      setShowReason(false)
      setError('Ошибка сохранения')
    } else {
      onRefresh()
    }
  }

  const handleReasonConfirm = async () => {
    if (!pendingReason.trim()) { setShowReason(false); return }
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]
    await setEmployeeStatus(user.user_id, localStatus, today, today, pendingReason.trim(), currentUserId)
    setSaving(false)
    setShowReason(false)
    setPendingReason('')
    onRefresh()
  }

  return (
    <div className="glass rounded-xl p-4 border border-transparent hover:border-white/10 transition-colors">
      {/* Header: name + status */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <button
            onClick={() => onNameClick(user.user_id)}
            className="text-sm font-semibold text-white hover:text-teal-300 transition-colors text-left block w-full truncate"
          >
            {user.full_name}
          </button>
          {user.position && (
            <div className="text-xs text-white/40 mt-0.5 truncate">{user.position}</div>
          )}
        </div>
        <span className={`text-xs px-2 py-1 rounded-lg border shrink-0 ${cfg.bg}`} style={{ color: cfg.color }}>
          {saving ? '...' : cfg.label}
        </span>
      </div>

      {/* Info row: schedule + tenure + phone */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2.5 text-xs text-white/40">
        {assignment?.schedule_code && (
          <span>
            {assignment.shift_num
              ? <span className={`font-medium ${SHIFT_COLORS[assignment.shift_num] ?? 'text-white/60'}`}>
                  Смена {assignment.shift_num}
                </span>
              : null}
            {assignment.shift_num ? ' · ' : ''}
            {assignment.schedule_code}
          </span>
        )}
        {tenure && <span>📅 {tenure}</span>}
        {user.phone && <span>📞 {user.phone}</span>}
      </div>

      {/* Special marks */}
      {(onProbation || user.svo_type || user.is_disabled || user.has_many_children) && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {onProbation && (
            <span className="text-[10px] bg-orange-500/20 text-orange-300 border border-orange-500/20 px-1.5 py-0.5 rounded-full">
              ⏱ Испытательный срок
            </span>
          )}
          {user.svo_type && (
            <span className="text-[10px] bg-red-700/20 text-red-300 border border-red-700/20 px-1.5 py-0.5 rounded-full">
              🎖 СВО
            </span>
          )}
          {user.is_disabled && (
            <span className="text-[10px] bg-slate-500/20 text-slate-300 border border-slate-500/20 px-1.5 py-0.5 rounded-full">
              ♿ Инв.{user.disability_group ? ` гр.${user.disability_group}` : ''}
            </span>
          )}
          {user.has_many_children && (
            <span className="text-[10px] bg-pink-500/20 text-pink-300 border border-pink-500/20 px-1.5 py-0.5 rounded-full">
              👨‍👩‍👧 Многодетный
            </span>
          )}
        </div>
      )}

      {/* Status buttons */}
      {canEdit && (
        <div className="space-y-1.5 mb-2">
          <div className="flex flex-wrap gap-1.5">
            {DAILY_STATUSES.map(status => {
              const scfg = EMPLOYEE_STATUS_CONFIG[status]
              const isActive = localStatus === status
              return (
                <button
                  key={status}
                  onClick={() => handleStatusClick(status)}
                  disabled={saving}
                  className={`text-xs px-2 py-1 rounded-lg border transition-colors disabled:opacity-50 ${
                    isActive ? `${scfg.bg} font-medium cursor-default` : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 cursor-pointer'
                  }`}
                  style={isActive ? { color: scfg.color } : undefined}
                >
                  {scfg.label}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EXTENDED_STATUSES.map(status => {
              const scfg = EMPLOYEE_STATUS_CONFIG[status]
              const isActive = localStatus === status
              return (
                <button
                  key={status}
                  onClick={() => handleStatusClick(status)}
                  disabled={saving}
                  className={`text-xs px-2 py-1 rounded-lg border transition-colors disabled:opacity-50 ${
                    isActive ? `${scfg.bg} font-medium cursor-default` : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 cursor-pointer'
                  }`}
                  style={isActive ? { color: scfg.color } : undefined}
                >
                  {scfg.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

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
          <button onClick={handleReasonConfirm} disabled={saving} className="text-xs px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/60 border border-white/10 disabled:opacity-50">✓</button>
          <button onClick={() => setShowReason(false)} className="text-xs px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 border border-white/10">✕</button>
        </div>
      )}

      {error && <div className="text-xs text-red-400 mt-1 mb-2">{error}</div>}

      <StatusHistory userId={user.user_id} />
    </div>
  )
}
