'use client'
import { useMemo } from 'react'
import { getShiftForDate, isWorkerOnDuty } from '@/lib/shifts'
import type { UserWithAssignment, Service, EmployeeAssignmentWithScheduleCode } from '@/types'

interface Props {
  users: UserWithAssignment[]
  services: Service[]
  /** Date to show roster for. Default = today */
  date?: Date
  /** Compact mode — smaller, for sidebars */
  compact?: boolean
}

const SHIFT_COLORS = [
  '', // index 0 unused
  'text-blue-400 border-blue-500/30 bg-blue-500/10',
  'text-green-400 border-green-500/30 bg-green-500/10',
  'text-amber-400 border-amber-500/30 bg-amber-500/10',
  'text-purple-400 border-purple-500/30 bg-purple-500/10',
]

export default function ShiftRoster({ users, services, date, compact = false }: Props) {
  const target = date ?? new Date()
  const shiftInfo = getShiftForDate(target)
  const shiftNum = shiftInfo.shiftNumber

  // Workers on duty today
  const onDuty = useMemo(() =>
    users.filter(u => {
      if (!u.assignment) return false
      return isWorkerOnDuty({
        shift_num: u.assignment.shift_num,
        schedule_code: u.assignment.schedule_code ?? '',
        shift_reference_date: u.assignment.shift_reference_date,
        rotation_group: u.assignment.rotation_group,
      }, target)
    }),
    [users, target] // eslint-disable-line react-hooks/exhaustive-deps
  )

  // Group by service
  const byService = useMemo(() => {
    const map = new Map<string, UserWithAssignment[]>()
    map.set('__none__', [])
    services.forEach(s => map.set(s.service_id, []))
    onDuty.forEach(u => {
      const key = u.service_id ?? '__none__'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(u)
    })
    return map
  }, [onDuty, services])

  const dateStr = target.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', weekday: 'short' })
  const shiftColor = SHIFT_COLORS[shiftNum] || SHIFT_COLORS[1]

  if (compact) {
    return (
      <div className={`glass rounded-xl p-3 border ${shiftColor}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-bold">{dateStr}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${shiftColor}`}>Смена {shiftNum}</span>
          <span className="text-xs text-white/40 ml-auto">{onDuty.length} чел.</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {onDuty.slice(0, 12).map(u => (
            <span key={u.user_id} className="text-[10px] bg-white/5 text-white/60 px-1.5 py-0.5 rounded">
              {u.full_name.split(' ')[0]}
            </span>
          ))}
          {onDuty.length > 12 && (
            <span className="text-[10px] text-white/30">+{onDuty.length - 12}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header */}
      <div className={`flex items-center gap-3 p-4 border-b border-white/10`}>
        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg font-bold ${shiftColor}`}>
          {shiftNum}
        </div>
        <div>
          <div className="text-white font-bold">Смена №{shiftNum} · {dateStr}</div>
          <div className="text-xs text-white/40">{shiftInfo.chiefName} · {onDuty.length} работников на смене</div>
        </div>
      </div>

      {/* By service */}
      <div className="divide-y divide-white/5 pb-2">
        {services.map(svc => {
          const workers = byService.get(svc.service_id) ?? []
          if (workers.length === 0) return null
          return (
            <div key={svc.service_id} className="p-4">
              <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-white/8">
                <span className="w-1 h-3.5 rounded-full bg-white/20 shrink-0" />
                <span className="text-xs font-bold text-white/70 uppercase tracking-wider">{svc.service_name}</span>
                <span className="text-[10px] bg-white/8 text-white/40 px-1.5 py-0.5 rounded-full ml-auto">{workers.length}</span>
              </div>
              <div className="space-y-0.5">
                {workers.map(u => (
                  <WorkerRow key={u.user_id} user={u} />
                ))}
              </div>
            </div>
          )
        })}

        {/* Without service */}
        {(byService.get('__none__') ?? []).length > 0 && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-white/8">
              <span className="w-1 h-3.5 rounded-full bg-white/10 shrink-0" />
              <span className="text-xs font-bold text-white/30 uppercase tracking-wider">Без службы</span>
            </div>
            <div className="space-y-0.5">
              {(byService.get('__none__') ?? []).map(u => (
                <WorkerRow key={u.user_id} user={u} />
              ))}
            </div>
          </div>
        )}

        {onDuty.length === 0 && (
          <div className="text-center text-white/20 text-sm py-8">Нет данных о составе смены</div>
        )}
      </div>
    </div>
  )
}

function WorkerRow({ user }: { user: UserWithAssignment }) {
  const scheduleCode = user.assignment?.schedule_code ?? '?'
  const shiftNum = user.assignment?.shift_num
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/5 group">
      <div className="flex-1 min-w-0">
        <span className="text-sm text-white/80">{user.full_name}</span>
        {user.position && <span className="text-xs text-white/30 ml-2">{user.position}</span>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {shiftNum && (
          <span className="text-[10px] text-white/30">см.{shiftNum}</span>
        )}
        <span className="text-[10px] bg-white/5 text-white/40 px-1.5 py-0.5 rounded">{scheduleCode}</span>
      </div>
    </div>
  )
}
