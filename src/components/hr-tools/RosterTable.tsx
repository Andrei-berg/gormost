'use client'
import { useState, useMemo } from 'react'
import type { UserWithAssignment, Service } from '@/types'
import { resolveShiftStatus } from '@/lib/shifts'
import { phaseMeta } from '@/lib/workSchedule'

const COLUMNS = [
  { key: 'tab_number',   label: 'Таб. №',        always: false },
  { key: 'name',         label: 'ФИО',           always: true  },
  { key: 'position',     label: 'Должность',     always: false },
  { key: 'service',      label: 'Служба',        always: false },
  { key: 'schedule',     label: 'График',        always: false },
  { key: 'shift',        label: 'Смена',         always: false },
  { key: 'ref_info',     label: 'Параметры',     always: false },
  { key: 'status_today', label: 'Сегодня',       always: false },
  { key: 'is_driver',    label: 'Водитель',      always: false },
] as const

type ColKey = typeof COLUMNS[number]['key']
type SortDir = 'asc' | 'desc'
type GroupBy = 'none' | 'schedule' | 'shift' | 'position'

const SHIFT_COLORS = ['', 'text-blue-400', 'text-green-400', 'text-amber-400', 'text-purple-400']
const DEFAULT_COLS: ColKey[] = ['tab_number', 'name', 'position', 'schedule', 'shift', 'status_today']

interface Props {
  users: UserWithAssignment[]
  services: Service[]
  showService: boolean
}

export default function RosterTable({ users, services, showService }: Props) {
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(DEFAULT_COLS))
  const [sortCol, setSortCol]         = useState<ColKey>('name')
  const [sortDir, setSortDir]         = useState<SortDir>('asc')
  const [groupBy, setGroupBy]         = useState<GroupBy>('none')
  const [showColPicker, setShowColPicker] = useState(false)

  const today  = useMemo(() => new Date(), [])
  const svcMap = useMemo(() => Object.fromEntries(services.map(s => [s.service_id, s.service_name])), [services])

  const toggleCol = (key: ColKey) => {
    setVisibleCols(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleSort = (col: ColKey) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const getCellStr = useMemo(() => (u: UserWithAssignment, col: ColKey): string => {
    const a = u.assignment
    switch (col) {
      case 'tab_number': return u.tab_number ?? ''
      case 'name':     return u.full_name
      case 'position': return u.position ?? ''
      case 'service':  return svcMap[u.service_id ?? ''] ?? ''
      case 'schedule': return a?.schedule_code ?? ''
      case 'shift':    return String(a?.shift_num ?? '')
      case 'ref_info':
        if (a?.shift_reference_date) return a.shift_reference_date
        if (a?.rotation_group) return a.rotation_group
        return ''
      case 'status_today': {
        if (!a) return 'z'
        const s = resolveShiftStatus({
          schedule_code: a.schedule_code ?? '',
          shift_num: a.shift_num,
          rotation_group: a.rotation_group,
          shift_reference_date: a.shift_reference_date,
          active_phase: a.active_phase,
        }, today)
        return s.working ? 'a' : 'b'
      }
      case 'is_driver': return a?.is_driver ? 'да' : ''
      default: return ''
    }
  }, [svcMap, today])  

  const sorted = useMemo(() =>
    [...users].sort((a, b) => {
      const av = getCellStr(a, sortCol)
      const bv = getCellStr(b, sortCol)
      return sortDir === 'asc' ? av.localeCompare(bv, 'ru') : bv.localeCompare(av, 'ru')
    }),
    [users, sortCol, sortDir, getCellStr]
  )

  const grouped = useMemo(() => {
    if (groupBy === 'none') return new Map<string, UserWithAssignment[]>([['', sorted]])
    const map = new Map<string, UserWithAssignment[]>()
    sorted.forEach(u => {
      let key = ''
      if (groupBy === 'schedule') key = u.assignment?.schedule_code ?? 'Без графика'
      if (groupBy === 'shift')    key = u.assignment?.shift_num ? `Смена ${u.assignment.shift_num}` : 'Без смены'
      if (groupBy === 'position') key = u.position ?? 'Без должности'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(u)
    })
    return map
  }, [sorted, groupBy])

  const visibleDefs = COLUMNS.filter(c => {
    if (c.key === 'service' && !showService) return false
    return c.always || visibleCols.has(c.key)
  })

  const th  = 'px-3 py-2 text-left text-xs text-white/40 font-medium cursor-pointer hover:text-white/60 select-none whitespace-nowrap'
  const sel = 'form-select text-xs px-2 py-1'

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <button
            onClick={() => setShowColPicker(v => !v)}
            className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-white/50 hover:bg-white/10 border border-white/10"
          >
            ⚙ Колонки
          </button>
          {showColPicker && (
            <div className="absolute top-full mt-1 left-0 z-20 glass-popup rounded-xl p-3 space-y-1.5 min-w-[160px]">
              {COLUMNS.filter(c => !c.always && !(c.key === 'service' && !showService)).map(c => (
                <label key={c.key} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={visibleCols.has(c.key)}
                    onChange={() => toggleCol(c.key)}
                    className="accent-blue-500"
                  />
                  <span className="text-xs text-white/60 group-hover:text-white/80">{c.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <select value={groupBy} onChange={e => setGroupBy(e.target.value as GroupBy)} className={sel}>
          <option value="none">Без группировки</option>
          <option value="schedule">По графику</option>
          <option value="shift">По смене</option>
          <option value="position">По должности</option>
        </select>

        <span className="text-xs text-white/30 ml-auto">{users.length} сотрудников</span>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              {visibleDefs.map(c => (
                <th key={c.key} className={th} onClick={() => handleSort(c.key)}>
                  {c.label}
                  {sortCol === c.key && <span className="ml-1 text-blue-400">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...grouped.entries()].map(([group, rows]) => (
              <GroupRows
                key={group || '__root__'}
                group={group}
                rows={rows}
                visibleDefs={visibleDefs}
                groupBy={groupBy}
                svcMap={svcMap}
                today={today}
              />
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={visibleDefs.length} className="px-3 py-12 text-center text-white/20">
                  Нет сотрудников
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Sub-component for a group of rows ────────────────────────────────

function GroupRows({ group, rows, visibleDefs, groupBy, svcMap, today }: {
  group: string
  rows: UserWithAssignment[]
  visibleDefs: typeof COLUMNS[number][]
  groupBy: GroupBy
  svcMap: Record<string, string>
  today: Date
}) {
  return (
    <>
      {groupBy !== 'none' && (
        <tr className="bg-white/3 border-t border-white/10">
          <td colSpan={visibleDefs.length} className="px-3 py-1.5 text-xs font-bold text-white/50 uppercase tracking-wider">
            {group} <span className="text-white/25 font-normal normal-case">({rows.length})</span>
          </td>
        </tr>
      )}
      {rows.map(u => (
        <UserRow key={u.user_id} user={u} visibleDefs={visibleDefs} svcMap={svcMap} today={today} />
      ))}
    </>
  )
}

function UserRow({ user: u, visibleDefs, svcMap, today }: {
  user: UserWithAssignment
  visibleDefs: typeof COLUMNS[number][]
  svcMap: Record<string, string>
  today: Date
}) {
  const a = u.assignment
  const status = a ? resolveShiftStatus({
    schedule_code: a.schedule_code ?? '',
    shift_num: a.shift_num,
    rotation_group: a.rotation_group,
    shift_reference_date: a.shift_reference_date,
    active_phase: a.active_phase,
  }, today) : null
  const todayMeta = status?.working && status.phase ? phaseMeta(status.phase) : null

  return (
    <tr className="border-b border-white/5 hover:bg-white/3">
      {visibleDefs.map(c => (
        <td key={c.key} className="px-3 py-2">
          {c.key === 'tab_number' && (
            <span className="text-xs font-mono text-white/40">{u.tab_number ?? '—'}</span>
          )}
          {c.key === 'name' && (
            <span className="text-white/80">{u.full_name}</span>
          )}
          {c.key === 'position' && (
            <span className="text-xs text-white/50">{u.position ?? '—'}</span>
          )}
          {c.key === 'service' && (
            <span className="text-xs text-white/40">{svcMap[u.service_id ?? ''] ?? '—'}</span>
          )}
          {c.key === 'schedule' && (
            <span className="text-xs bg-white/5 text-white/60 px-1.5 py-0.5 rounded">
              {a?.schedule_code ?? <span className="text-white/20">—</span>}
            </span>
          )}
          {c.key === 'shift' && (
            a?.shift_num
              ? <span className={`text-xs font-medium ${SHIFT_COLORS[a.shift_num]}`}>Смена {a.shift_num}</span>
              : <span className="text-white/20 text-xs">—</span>
          )}
          {c.key === 'ref_info' && (
            <span className="text-xs text-white/30">
              {a?.shift_reference_date ? `от ${a.shift_reference_date}` :
               a?.rotation_group ? `гр. ${a.rotation_group}` : '—'}
            </span>
          )}
          {c.key === 'status_today' && (
            !a
              ? <span className="text-yellow-400/40 text-xs">нет графика</span>
              : todayMeta
                ? <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ color: todayMeta.color, background: todayMeta.color + '26' }}>
                    {todayMeta.emoji} {todayMeta.label}
                    {status?.shift_start && <span className="ml-1 opacity-60">{status.shift_start}</span>}
                  </span>
                : <span className="text-xs text-white/25">выходной</span>
          )}
          {c.key === 'is_driver' && (
            a?.is_driver ? <span className="text-sm">🚗</span> : null
          )}
        </td>
      ))}
    </tr>
  )
}
