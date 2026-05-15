'use client'
import { useState } from 'react'
import { setEmployeeStatus } from '@/lib/api'
import { EMPLOYEE_STATUS_CONFIG } from '@/types'
import type { EnrichedEmployee, EmployeeStatusType, UserWithAssignment } from '@/types'
import StatusHistory from './StatusHistory'
import { isWorkerOnDuty } from '@/lib/shifts'

const ALL_STATUSES: EmployeeStatusType[] = [
  'Na_rabote', 'Otgul', 'Bolnichniy', 'Otpusk',
  'Komandirovka', 'Uchebniy_otpusk', 'Dekret', 'Mobilizovan',
  'SVO', 'Troydoustroyen_s_SVO', 'Voennie_sbory',
]

const PILL_LABEL: Partial<Record<EmployeeStatusType, string>> = {
  Komandirovka: 'Командир.',
  Uchebniy_otpusk: 'Учебн. отп.',
  Mobilizovan: 'Мобилизов.',
  Troydoustroyen_s_SVO: 'Возвр. с СВО',
  Voennie_sbory: 'Воен. сборы',
}

const AVATAR_COLORS = [
  { bg: 'rgba(56,139,253,0.20)', border: 'rgba(56,139,253,0.30)', text: '#388BFD' },
  { bg: 'rgba(240,165,0,0.20)', border: 'rgba(240,165,0,0.30)', text: '#F0A500' },
  { bg: 'rgba(139,92,246,0.20)', border: 'rgba(139,92,246,0.30)', text: '#8B5CF6' },
  { bg: 'rgba(63,185,80,0.20)', border: 'rgba(63,185,80,0.30)', text: '#3FB950' },
]

function getAvatarColor(str: string) {
  let hash = 0
  for (const c of str) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return parts[0]?.[0]?.toUpperCase() ?? '?'
}

function getTenure(dateHired: string | null): string | null {
  if (!dateHired) return null
  const hired = new Date(dateHired)
  const now = new Date()
  const total = (now.getFullYear() - hired.getFullYear()) * 12 + (now.getMonth() - hired.getMonth())
  if (total < 1) return 'менее мес.'
  if (total < 12) return `${total} мес.`
  const y = Math.floor(total / 12)
  const m = total % 12
  return m > 0 ? `${y} г. ${m} мес.` : `${y} г.`
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

  const { user } = employee
  const cfg = EMPLOYEE_STATUS_CONFIG[localStatus]
  const tenure = getTenure(user.date_hired)
  const avatarColor = getAvatarColor(user.user_id)
  const initials = getInitials(user.full_name)

  const todayDate = new Date()
  todayDate.setHours(12, 0, 0, 0)
  const onDuty = assignment?.schedule_code
    ? isWorkerOnDuty({ ...assignment, schedule_code: assignment.schedule_code }, todayDate)
    : false

  const handleStatusClick = async (newStatus: EmployeeStatusType) => {
    if (newStatus === localStatus || saving) return
    const prevStatus = localStatus
    setLocalStatus(newStatus)
    setError(null)
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]
    const result = await setEmployeeStatus(user.user_id, newStatus, today, today, null, currentUserId)
    setSaving(false)
    if (!result) {
      setLocalStatus(prevStatus)
      setError('Ошибка сохранения')
    } else {
      onRefresh()
    }
  }

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-2.5 transition-all border"
      style={{
        background: 'rgba(255,255,255,0.04)',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
      }}
    >
      {/* Row 1: avatar + identity + status badge */}
      <div className="flex items-start gap-2.5">
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border"
          style={{ background: avatarColor.bg, borderColor: avatarColor.border, color: avatarColor.text }}
        >
          {initials}
        </div>

        {/* Identity */}
        <div className="flex-1 min-w-0">
          <button
            onClick={() => onNameClick(user.user_id)}
            className="text-[13px] font-bold text-white hover:text-amber-300 transition-colors text-left block w-full leading-snug truncate"
          >
            {user.full_name}
          </button>
          {user.position && (
            <div className="text-[11px] text-white/40 mt-0.5 truncate">{user.position}</div>
          )}
          {/* Shift meta */}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {assignment?.schedule_code && (
              <span className="font-mono text-[10px] text-white/40 flex items-center gap-1">
                {assignment.shift_num && (
                  <span className="text-white/60 font-semibold">Смена {assignment.shift_num}</span>
                )}
                {assignment.shift_num && <span>·</span>}
                <span>{assignment.schedule_code}</span>
              </span>
            )}
            {tenure && (
              <span className="font-mono text-[10px] text-white/35 flex items-center gap-1">
                <span>·</span>
                <span>⏱ {tenure}</span>
              </span>
            )}
            {onDuty && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-px rounded-full text-[9px] font-bold uppercase tracking-wider"
                style={{
                  background: 'rgba(240,165,0,0.12)',
                  border: '1px solid rgba(240,165,0,0.30)',
                  color: '#F0A500',
                }}
              >
                ● На дежурстве
              </span>
            )}
          </div>
        </div>

        {/* Current status badge */}
        <div
          className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border self-start"
          style={{
            color: cfg.color,
            background: cfg.color + '26',
            borderColor: cfg.color + '66',
          }}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: cfg.color }}
          />
          {saving ? '...' : cfg.label}
        </div>
      </div>

      {/* Special marks */}
      {(user.svo_type || user.is_disabled || user.has_many_children) && (
        <div className="flex flex-wrap gap-1">
          {user.svo_type && (
            <span className="text-[9px] bg-red-700/20 text-red-300 border border-red-700/20 px-1.5 py-0.5 rounded-full">
              🎖 СВО
            </span>
          )}
          {user.is_disabled && (
            <span className="text-[9px] bg-slate-500/20 text-slate-300 border border-slate-500/20 px-1.5 py-0.5 rounded-full">
              ♿ Инв.{user.disability_group ? ` гр.${user.disability_group}` : ''}
            </span>
          )}
          {user.has_many_children && (
            <span className="text-[9px] bg-pink-500/20 text-pink-300 border border-pink-500/20 px-1.5 py-0.5 rounded-full">
              👨‍👩‍👧 Многодетный
            </span>
          )}
        </div>
      )}

      {/* Status pill grid */}
      {canEdit && (
        <div
          className="grid gap-1 pt-2"
          style={{
            gridTemplateColumns: 'repeat(4, 1fr)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {ALL_STATUSES.map(status => {
            const scfg = EMPLOYEE_STATUS_CONFIG[status]
            const isActive = localStatus === status
            const label = PILL_LABEL[status] ?? scfg.label
            return (
              <button
                key={status}
                onClick={() => handleStatusClick(status)}
                disabled={saving}
                className="text-[10px] py-1 px-1 rounded-lg border text-center leading-tight transition-all disabled:opacity-50"
                style={
                  isActive
                    ? {
                        background: scfg.color + '2E',
                        borderColor: scfg.color + '72',
                        color: scfg.color,
                        fontWeight: 700,
                      }
                    : {
                        background: 'rgba(255,255,255,0.03)',
                        borderColor: 'rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.40)',
                      }
                }
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {error && <div className="text-[10px] text-red-400">{error}</div>}

      <StatusHistory userId={user.user_id} />
    </div>
  )
}
