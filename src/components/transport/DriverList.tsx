'use client'
import { useMemo, useState } from 'react'
import type { UserWithAssignment, VehicleWithAssignments } from '@/types'
import { isWorkerOnDuty } from '@/lib/shifts'

type DriverFilter = 'all' | 'onshift' | 'offshift' | 'vac'

interface Props {
  drivers: UserWithAssignment[]
  vehicles: VehicleWithAssignments[]
  date: string  // 'YYYY-MM-DD'
  initialFilter?: DriverFilter
}

function initials(name: string): string {
  return name.split(/\s+/).map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase()
}

function scheduleLabel(code: string | undefined, shiftNum: number | null): string {
  if (!code) return '—'
  if (shiftNum != null) return `${code} · Смена ${shiftNum}`
  return code
}

// Build 7-day work/rest strip starting from today
function buildStrip(driver: UserWithAssignment, target: Date): Array<'w' | 'r'> {
  const a = driver.assignment
  if (!a?.schedule_code) return Array(7).fill('r')
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(target)
    d.setDate(d.getDate() + i)
    return isWorkerOnDuty({
      shift_num: a.shift_num,
      schedule_code: a.schedule_code ?? '',
      shift_reference_date: a.shift_reference_date,
      rotation_group: a.rotation_group,
      active_phase: a.active_phase ?? null,
      custom_work_days: a.custom_work_days ?? null,
      custom_rest_days: a.custom_rest_days ?? null,
    }, d) ? 'w' : 'r'
  })
}

export default function DriverList({ drivers, vehicles, date, initialFilter = 'all' }: Props) {
  const [filter, setFilter] = useState<DriverFilter>(initialFilter)
  const [search, setSearch] = useState('')

  const target = useMemo(() => new Date(date + 'T12:00:00'), [date])

  const permanentMap = useMemo(() => {
    const map = new Map<string, { name: string; plate: string }>()
    vehicles.forEach(v => {
      if (v.assigned_driver_id) map.set(v.assigned_driver_id, { name: v.name, plate: v.plate })
    })
    return map
  }, [vehicles])

  const withStatus = useMemo(() =>
    drivers.map(d => {
      const a = d.assignment
      const onShift = a?.schedule_code
        ? isWorkerOnDuty({
            shift_num: a.shift_num,
            schedule_code: a.schedule_code,
            shift_reference_date: a.shift_reference_date,
            rotation_group: a.rotation_group,
            active_phase: a.active_phase ?? null,
            custom_work_days: a.custom_work_days ?? null,
            custom_rest_days: a.custom_rest_days ?? null,
          }, target)
        : false
      return { driver: d, onShift }
    }),
  [drivers, target])

  const onShiftCount = withStatus.filter(x => x.onShift).length

  const filtered = useMemo(() => {
    let list = withStatus
    if (filter === 'onshift')  list = list.filter(x => x.onShift)
    if (filter === 'offshift') list = list.filter(x => !x.onShift)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(x => x.driver.full_name.toLowerCase().includes(q))
    }
    return list
  }, [withStatus, filter, search])

  if (drivers.length === 0) {
    return (
      <div className="text-center text-white/20 py-20">
        <div className="text-4xl mb-3">👤</div>
        <div>Водители не назначены</div>
        <div className="text-xs mt-2 text-white/15">
          Отметьте &quot;водитель&quot; в Админ → Смены для нужных сотрудников
        </div>
      </div>
    )
  }

  const filterOpts: { id: DriverFilter; label: string; ct: number }[] = [
    { id: 'all',      label: 'Все',      ct: drivers.length },
    { id: 'onshift',  label: 'На смене', ct: onShiftCount },
    { id: 'offshift', label: 'Выходной', ct: drivers.length - onShiftCount },
    { id: 'vac',      label: 'Отпуск',   ct: 0 },
  ]

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="glass rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {filterOpts.map(o => (
            <button
              key={o.id}
              onClick={() => setFilter(o.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                filter === o.id
                  ? 'bg-amber-500/14 border-amber-500/40 text-amber-400'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70'
              }`}
            >
              {o.label}
              <span className="font-mono opacity-70">{o.ct}</span>
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск: ФИО, табельный, ТС..."
            className="bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-white/25 w-56"
          />
        </div>
      </div>

      {/* Driver grid — 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map(({ driver: d, onShift }) => {
          const veh = permanentMap.get(d.user_id)
          const strip = buildStrip(d, target)
          const ini = initials(d.full_name)
          const schedLabel = scheduleLabel(d.assignment?.schedule_code, d.assignment?.shift_num ?? null)

          return (
            <div key={d.user_id} className="glass rounded-xl p-4 flex flex-col gap-3">
              {/* Head row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-mono font-bold text-sm shrink-0 border ${
                    onShift
                      ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400'
                      : 'bg-white/5 border-white/10 text-white/35'
                  }`}>
                    {ini}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white leading-tight">{d.full_name}</div>
                    <div className="text-[11px] text-white/40 font-mono mt-0.5">{d.position || '—'}</div>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap shrink-0 ${
                  onShift
                    ? 'bg-emerald-500/12 border-emerald-500/35 text-emerald-400'
                    : 'bg-white/5 border-white/10 text-white/40'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {onShift ? 'На смене' : 'Выходной'}
                </span>
              </div>

              {/* Vehicle row */}
              {veh ? (
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <span className="text-sm">🚗</span>
                  <span>{veh.name}</span>
                  <span className="text-white/25">·</span>
                  <span className="font-mono font-semibold text-white/70">{veh.plate}</span>
                </div>
              ) : (
                <div className="text-xs text-white/25 italic">⊘ ТС не закреплено</div>
              )}

              {/* Schedule strip */}
              <div className="flex items-center gap-2 bg-white/4 border border-white/8 rounded-lg px-3 py-2">
                <span className="text-xs">📅</span>
                <span className="text-[10px] text-white/40 uppercase tracking-wide font-bold">График</span>
                <span className="text-xs font-mono font-semibold text-white/80">{schedLabel}</span>
                <div className="ml-auto flex gap-1">
                  {strip.map((c, i) => (
                    <span key={i} className={`inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-mono font-bold ${
                      c === 'w'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-white/4 text-white/25'
                    }`}>
                      {c === 'w' ? 'Р' : '·'}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1 border-t border-white/6">
                <button className="flex-1 py-1.5 px-3 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-white/70 hover:bg-white/10 transition-colors">
                  {veh ? 'Изменить ТС' : 'Назначить ТС'}
                </button>
                <a
                  href={`/planner?driver=${d.user_id}`}
                  className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-blue-500/10 border border-blue-500/35 text-xs font-semibold text-blue-400 hover:bg-blue-500/18 transition-colors"
                >
                  График
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M13 6l6 6-6 6"/>
                  </svg>
                </a>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-white/20 py-16">
          <div className="text-3xl mb-3">🔍</div>
          <div>Ничего не найдено</div>
        </div>
      )}
    </div>
  )
}
