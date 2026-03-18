'use client'
import { useMemo } from 'react'
import type { UserWithAssignment, ShiftPhase, Schedule } from '@/types'
import { resolveShiftStatus } from '@/lib/shifts'

interface Props {
  users: UserWithAssignment[]
  phases: ShiftPhase[]
  period: { start: string; end: string }
  schedules: Schedule[]
}

function getDates(start: string, end: string): Date[] {
  const dates: Date[] = []
  const cur = new Date(start + 'T12:00:00')
  const endDate = new Date(end + 'T12:00:00')
  while (cur <= endDate) {
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

function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const s = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? Math.round((s[mid - 1] + s[mid]) / 2) : s[mid]
}

const DOW_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

export default function CoverageTable({ users, phases, period, schedules }: Props) {
  const dates    = useMemo(() => getDates(period.start, period.end), [period])
  const todayStr = new Date().toISOString().split('T')[0]

  // Unique schedule codes actually used by these users
  const usedCodes = useMemo(() => {
    const codes = new Set(users.map(u => u.assignment?.schedule_code).filter(Boolean) as string[])
    return schedules.map(s => s.code).filter(c => codes.has(c)) // preserve natural order
  }, [users, schedules])

  const rows = useMemo(() =>
    dates.map(date => {
      const dateStr = date.toISOString().split('T')[0]
      const byCode: Record<string, number> = {}
      let total = 0

      users.forEach(u => {
        if (!u.assignment) return
        const phase = getPhaseForDate(phases, u.user_id, dateStr)
        const status = resolveShiftStatus({
          schedule_code: u.assignment.schedule_code ?? '',
          shift_num: u.assignment.shift_num,
          rotation_group: u.assignment.rotation_group,
          shift_reference_date: u.assignment.shift_reference_date,
          active_phase: phase
            ? { phase: phase.phase, anchor_date: phase.anchor_date, schedule_code: phase.schedule_code }
            : null,
        }, date)

        if (status.working) {
          total++
          const code = u.assignment.schedule_code ?? 'other'
          byCode[code] = (byCode[code] ?? 0) + 1
        }
      })

      return { date, dateStr, total, byCode }
    }),
    [users, phases, dates]
  )

  const norm     = useMemo(() => median(rows.map(r => r.total)), [rows])
  const maxTotal = useMemo(() => Math.max(...rows.map(r => r.total), 1), [rows])
  const todayRow = rows.find(r => r.dateStr === todayStr)

  const thCls = 'px-3 py-2 text-left text-xs text-white/40 font-medium whitespace-nowrap'

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass rounded-xl p-3 border border-white/10">
          <div className="text-2xl font-bold text-white/70">{users.length}</div>
          <div className="text-xs text-white/40 mt-1">Сотрудников</div>
        </div>
        <div className="glass rounded-xl p-3 border border-blue-500/20">
          <div className="text-2xl font-bold text-blue-400">{norm}</div>
          <div className="text-xs text-white/40 mt-1">Норма в день (медиана)</div>
        </div>
        {todayRow && (
          <div className={`glass rounded-xl p-3 border ${
            todayRow.total < norm * 0.8 ? 'border-red-500/30' :
            todayRow.total < norm * 0.95 ? 'border-amber-500/30' : 'border-green-500/20'
          }`}>
            <div className={`text-2xl font-bold ${
              todayRow.total < norm * 0.8 ? 'text-red-400' :
              todayRow.total < norm * 0.95 ? 'text-amber-400' : 'text-green-400'
            }`}>
              {todayRow.total}
            </div>
            <div className="text-xs text-white/40 mt-1">На смене сегодня</div>
          </div>
        )}
        <div className="glass rounded-xl p-3 border border-white/10">
          <div className="text-2xl font-bold text-white/40">{dates.length}</div>
          <div className="text-xs text-white/40 mt-1">Дней в периоде</div>
        </div>
      </div>

      {/* Coverage table */}
      <div className="glass rounded-2xl overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/10">
              <th className={thCls}>Дата</th>
              <th className={`${thCls} text-center`}>Полоса</th>
              <th className={`${thCls} text-center font-bold`}>Всего</th>
              {usedCodes.map(c => (
                <th key={c} className={`${thCls} text-center`}>{c}</th>
              ))}
              <th className={`${thCls} text-center`}>Норма</th>
              <th className={`${thCls} text-center`}>Дельта</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ date, dateStr, total, byCode }) => {
              const isToday   = dateStr === todayStr
              const dow       = date.getDay()
              const isWeekend = dow === 0 || dow === 6
              const pct       = norm > 0 ? total / norm : 1
              const delta     = total - norm
              const barWidth  = Math.round((total / maxTotal) * 100)

              const rowBg =
                pct < 0.8  ? 'bg-red-500/5 hover:bg-red-500/8' :
                pct < 0.95 ? 'bg-amber-500/5 hover:bg-amber-500/8' :
                'hover:bg-white/3'

              return (
                <tr
                  key={dateStr}
                  className={`border-b border-white/5 transition-colors ${rowBg} ${isToday ? 'ring-1 ring-inset ring-blue-500/25' : ''}`}
                >
                  <td className={`px-3 py-2 font-medium whitespace-nowrap ${
                    isToday ? 'text-blue-300' : isWeekend ? 'text-white/30' : 'text-white/70'
                  }`}>
                    {date.getDate()} {date.toLocaleDateString('ru-RU', { month: 'short' })}
                    <span className="text-white/25 ml-1.5 text-[10px]">{DOW_SHORT[dow]}</span>
                    {isToday && <span className="ml-1.5 text-[10px] text-blue-400">сегодня</span>}
                  </td>

                  {/* Mini bar */}
                  <td className="px-3 py-2 min-w-[80px]">
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct < 0.8 ? 'bg-red-500/60' : pct < 0.95 ? 'bg-amber-500/60' : 'bg-blue-500/50'
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </td>

                  <td className="px-3 py-2 text-center">
                    <span className={`font-bold text-sm ${
                      pct < 0.8 ? 'text-red-400' : pct < 0.95 ? 'text-amber-400' : 'text-white/80'
                    }`}>
                      {total}
                    </span>
                  </td>

                  {usedCodes.map(c => (
                    <td key={c} className="px-3 py-2 text-center text-white/45">
                      {byCode[c] || <span className="text-white/15">—</span>}
                    </td>
                  ))}

                  <td className="px-3 py-2 text-center text-white/30">{norm}</td>

                  <td className="px-3 py-2 text-center">
                    <span className={`font-medium ${
                      delta > 0 ? 'text-green-400/60' : delta < 0 ? 'text-red-400' : 'text-white/30'
                    }`}>
                      {delta > 0 ? `+${delta}` : delta === 0 ? '=' : delta}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
