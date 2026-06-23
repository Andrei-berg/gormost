'use client'
import { useMemo } from 'react'
import type { UserWithAssignment, ShiftPhase } from '@/types'
import { resolveShiftStatus } from '@/lib/shifts'
import { phaseMeta } from '@/lib/workSchedule'

interface Props {
  users: UserWithAssignment[]
  phases: ShiftPhase[]
  period: { start: string; end: string }
}

function getDates(start: string, end: string): Date[] {
  const dates: Date[] = []
  const cur = new Date(start + 'T12:00:00')
  const endDate = new Date(end + 'T12:00:00')
  while (cur <= endDate && dates.length < 31) {
    dates.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

function getPhaseForDate(phases: ShiftPhase[], userId: string, dateStr: string) {
  return phases.find(p =>
    p.employee_id === userId &&
    p.valid_from <= dateStr &&
    (p.valid_to === null || p.valid_to >= dateStr)
  ) ?? null
}

const DOW_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

export default function TabeTable({ users, phases, period }: Props) {
  const dates   = useMemo(() => getDates(period.start, period.end), [period])
  const todayStr = new Date().toISOString().split('T')[0]

  const grid = useMemo(() =>
    users.map(u => {
      const cells = dates.map(date => {
        if (!u.assignment) return null
        const dateStr = date.toISOString().split('T')[0]
        const phase = getPhaseForDate(phases, u.user_id, dateStr)
        return resolveShiftStatus({
          schedule_code: u.assignment.schedule_code ?? '',
          shift_num: u.assignment.shift_num,
          rotation_group: u.assignment.rotation_group,
          shift_reference_date: u.assignment.shift_reference_date,
          active_phase: phase
            ? { phase: phase.phase, anchor_date: phase.anchor_date, schedule_code: phase.schedule_code }
            : null,
        }, date)
      })
      const workDays = cells.filter(c => c?.working).length
      return { user: u, cells, workDays }
    }),
    [users, phases, dates]
  )

  const dailyCounts = useMemo(() =>
    dates.map((_, di) => grid.filter(r => r.cells[di]?.working).length),
    [grid, dates]
  )

  if (dates.length === 0) {
    return <div className="text-white/30 text-sm text-center py-8">Выберите период</div>
  }

  return (
    <div className="glass rounded-2xl overflow-auto">
      <table className="text-xs border-collapse">
        <thead>
          <tr className="border-b border-white/10">
            <th className="px-3 py-2 text-left text-white/40 sticky left-0 bg-gray-900 z-10 min-w-[180px]">ФИО</th>
            <th className="px-2 py-2 text-center text-white/40 min-w-[42px] sticky left-[180px] bg-gray-900 z-10">Дней</th>
            {dates.map(d => {
              const ds  = d.toISOString().split('T')[0]
              const dow = d.getDay()
              const isToday   = ds === todayStr
              const isWeekend = dow === 0 || dow === 6
              return (
                <th
                  key={ds}
                  className={`px-0 py-2 text-center min-w-[34px] font-normal ${
                    isToday ? 'bg-blue-500/20 text-blue-300' : isWeekend ? 'text-white/20' : 'text-white/40'
                  }`}
                >
                  <div className="font-semibold">{d.getDate()}</div>
                  <div className="text-[9px] mt-0.5">{DOW_SHORT[dow]}</div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {grid.map(({ user: u, cells, workDays }) => (
            <tr key={u.user_id} className="border-b border-white/5 hover:bg-white/3">
              <td className="px-3 py-1.5 sticky left-0 bg-gray-900 z-10">
                <div className="text-white/75 font-medium">{u.full_name}</div>
                {u.assignment?.schedule_code && (
                  <div className="text-[10px] text-white/30">{u.assignment.schedule_code}</div>
                )}
              </td>
              <td className="px-2 py-1.5 text-center text-white/60 font-bold sticky left-[180px] bg-gray-900 z-10 border-r border-white/10">
                {workDays}
              </td>
              {cells.map((status, i) => {
                const d   = dates[i]
                const ds  = d.toISOString().split('T')[0]
                const dow = d.getDay()
                const isToday   = ds === todayStr
                const isWeekend = dow === 0 || dow === 6

                if (!u.assignment) {
                  return (
                    <td key={ds} className="text-center">
                      <span className="text-yellow-500/30 text-[10px]">?</span>
                    </td>
                  )
                }

                if (status?.working && status.phase) {
                  const m = phaseMeta(status.phase)
                  return (
                    <td key={ds} className={`text-center py-1 ${isToday ? 'bg-blue-500/10' : ''}`}>
                      <span className="inline-flex items-center justify-center w-6 h-5 rounded text-[10px] font-bold"
                        style={{ color: m.color, background: m.color + '33' }}>
                        {m.code}
                      </span>
                    </td>
                  )
                }

                return (
                  <td
                    key={ds}
                    className={`text-center ${isWeekend ? 'bg-white/2' : ''} ${isToday ? 'bg-blue-500/5' : ''}`}
                  >
                    <span className="text-white/12 text-[10px]">—</span>
                  </td>
                )
              })}
            </tr>
          ))}

          {/* Summary row */}
          <tr className="border-t border-white/15 bg-white/3">
            <td className="px-3 py-1.5 text-xs text-white/50 font-bold sticky left-0 bg-gray-900/80 z-10">На смене</td>
            <td className="sticky left-[180px] bg-gray-900/80 z-10 border-r border-white/10"></td>
            {dailyCounts.map((count, i) => {
              const ds = dates[i].toISOString().split('T')[0]
              return (
                <td key={ds} className="text-center py-1.5">
                  {count > 0
                    ? <span className="text-xs font-bold text-white/55">{count}</span>
                    : <span className="text-white/15 text-xs">0</span>}
                </td>
              )
            })}
          </tr>

          {users.length === 0 && (
            <tr>
              <td colSpan={dates.length + 2} className="px-3 py-12 text-center text-white/20">
                Нет сотрудников
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
