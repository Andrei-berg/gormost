'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import type { AuthSession, UserWithAssignment, Service, Schedule, ShiftPhase } from '@/types'
import { fetchUsersWithAssignments, fetchServices, fetchSchedules, fetchAllShiftPhases } from '@/lib/api'
import RosterTable from './RosterTable'
import TabeTable from './TabeTable'
import CoverageTable from './CoverageTable'
import StroevayaView from './StroevayaView'
import PrintPanel from './PrintPanel'
import DriversScheduleTab from './DriversScheduleTab'
import ScheduleCheckTab from './ScheduleCheckTab'

export type ViewMode = 'roster' | 'tabel' | 'coverage' | 'stroevaya' | 'drivers' | 'check'
type PeriodPreset = 'week' | 'prev_week' | 'month' | 'prev_month' | 'custom'

function fmt(d: Date) { return d.toISOString().split('T')[0] }

function getPresetDates(preset: PeriodPreset): { start: string; end: string } {
  const today = new Date()
  if (preset === 'week') {
    const mon = new Date(today)
    mon.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1))
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    return { start: fmt(mon), end: fmt(sun) }
  }
  if (preset === 'prev_week') {
    const mon = new Date(today)
    mon.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1) - 7)
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    return { start: fmt(mon), end: fmt(sun) }
  }
  if (preset === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    return { start: fmt(start), end: fmt(end) }
  }
  if (preset === 'prev_month') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const end = new Date(today.getFullYear(), today.getMonth(), 0)
    return { start: fmt(start), end: fmt(end) }
  }
  return { start: fmt(today), end: fmt(today) }
}

export interface HRToolsData {
  users: UserWithAssignment[]
  services: Service[]
  schedules: Schedule[]
  phases: ShiftPhase[]
}

interface Props { session: AuthSession }

const VIEW_OPTIONS: { key: ViewMode; label: string }[] = [
  { key: 'roster',    label: '📋 Список'    },
  { key: 'tabel',     label: '📅 Табель'    },
  { key: 'coverage',  label: '📊 Покрытие'  },
  { key: 'stroevaya', label: '🪖 Строевая'  },
  { key: 'drivers',   label: '🚗 Водители'  },
  { key: 'check',     label: '🔎 Проверка'  },
]

const PRESET_OPTIONS: { key: PeriodPreset; label: string }[] = [
  { key: 'week',       label: 'Эта неделя'     },
  { key: 'prev_week',  label: 'Прошлая неделя' },
  { key: 'month',      label: 'Этот месяц'     },
  { key: 'prev_month', label: 'Прошлый месяц'  },
  { key: 'custom',     label: 'Период...'       },
]

export default function HRToolsShell({ session }: Props) {
  const [data, setData] = useState<HRToolsData>({ users: [], services: [], schedules: [], phases: [] })
  const [loading, setLoading] = useState(true)

  const [view, setView]               = useState<ViewMode>('roster')
  const [preset, setPreset]           = useState<PeriodPreset>('month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd]     = useState('')
  const [filterService, setFilterService] = useState(
    session.role_level === 'HEAD' ? (session.service_id ?? '') : ''
  )
  const [filterSchedule, setFilterSchedule] = useState('')
  const [filterShift, setFilterShift] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [users, services, schedules, phases] = await Promise.all([
      fetchUsersWithAssignments(),
      fetchServices(),
      fetchSchedules(),
      fetchAllShiftPhases(),
    ])
    setData({ users, services, schedules, phases })
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const period = useMemo(() =>
    preset === 'custom' && customStart && customEnd
      ? { start: customStart, end: customEnd }
      : getPresetDates(preset),
    [preset, customStart, customEnd]
  )

  const filtered = useMemo(() =>
    data.users.filter(u => {
      if (filterService  && u.service_id !== filterService) return false
      if (filterSchedule && u.assignment?.schedule_code !== filterSchedule) return false
      if (filterShift    && String(u.assignment?.shift_num) !== filterShift) return false
      return true
    }),
    [data.users, filterService, filterSchedule, filterShift]
  )

  const isHead     = session.role_level === 'HEAD'
  const showService = !isHead || session.role_level === 'ADMIN' || session.role_level === 'BOSS'
  const scheduleCodes = [...new Set(data.schedules.map(s => s.code))]

  const selCls = 'form-select'

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="glass rounded-2xl p-4 space-y-3">
        {/* View switcher + refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            {VIEW_OPTIONS.map(v => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  view === v.key ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white/60'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <PrintPanel
              users={filtered}
              phases={data.phases}
              period={period}
              services={data.services}
              schedules={data.schedules}
              session={session}
            />
            <button onClick={load} className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-white/40 hover:bg-white/10">↻</button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period presets */}
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            {PRESET_OPTIONS.map(p => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  preset === p.key ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/60'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <>
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className={selCls} />
              <span className="text-white/30 text-xs">—</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className={selCls} />
            </>
          )}

          {!isHead && (
            <select value={filterService} onChange={e => setFilterService(e.target.value)} className={selCls}>
              <option value="">Все службы</option>
              {data.services.map(s => <option key={s.service_id} value={s.service_id}>{s.service_name}</option>)}
            </select>
          )}

          <select value={filterSchedule} onChange={e => setFilterSchedule(e.target.value)} className={selCls}>
            <option value="">Все графики</option>
            {scheduleCodes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={filterShift} onChange={e => setFilterShift(e.target.value)} className={selCls}>
            <option value="">Все смены</option>
            {[1,2,3,4].map(n => <option key={n} value={n}>Смена {n}</option>)}
          </select>

          <span className="text-xs text-white/25 ml-auto">
            {filtered.length} сотр. · {period.start} — {period.end}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-white/30 py-16 text-sm">Загрузка...</div>
      ) : (
        <>
          {view === 'roster'    && <RosterTable        users={filtered} services={data.services} showService={showService} />}
          {view === 'tabel'     && <TabeTable          users={filtered} phases={data.phases} period={period} />}
          {view === 'coverage'  && <CoverageTable      users={filtered} phases={data.phases} period={period} schedules={data.schedules} />}
          {view === 'stroevaya' && <StroevayaView      users={data.users} phases={data.phases} services={data.services} />}
          {view === 'drivers'   && <DriversScheduleTab users={data.users} phases={data.phases} services={data.services} schedules={data.schedules} session={session} onPhasesChanged={load} />}
          {view === 'check'     && <ScheduleCheckTab  users={data.users} phases={data.phases} services={data.services} schedules={data.schedules} />}
        </>
      )}
    </div>
  )
}
