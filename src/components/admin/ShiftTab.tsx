'use client'
import { useState, useEffect, useCallback } from 'react'
import type { UserWithAssignment, Service, AuthSession, Schedule, EmployeeAssignmentWithScheduleCode } from '@/types'
import { fetchUsersWithAssignments, upsertEmployeeAssignment, fetchServices, fetchSchedules, openShiftPhase } from '@/lib/api'
import { getShiftForDate, isPhaseSchedule, isCustomSchedule, customScheduleLabel } from '@/lib/shifts'
import ScheduleBadge from '@/components/help/ScheduleBadge'
import { DRIVER_GROUPS, getDriverGroup } from '@/lib/driverGroups'
import ShiftRoster from '@/components/ShiftRoster'
import ShiftPhaseManager from '@/components/admin/ShiftPhaseManager'
import ShiftMonitorTab from '@/components/admin/ShiftMonitorTab'

const SHIFT_LABELS = ['', 'Смена 1', 'Смена 2', 'Смена 3', 'Смена 4']
const SHIFT_COLORS = ['', 'text-blue-400', 'text-green-400', 'text-amber-400', 'text-purple-400']
type SubTab = 'assignments' | 'phases' | 'monitor'

interface Props { session: AuthSession; hidePhases?: boolean }

export default function ShiftTab({ session, hidePhases }: Props) {
  const [users, setUsers] = useState<UserWithAssignment[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [filterShift, setFilterShift] = useState<string>('')
  const [filterService, setFilterService] = useState<string>('')
  const [searchName, setSearchName] = useState<string>('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [subTab, setSubTab] = useState<SubTab>('assignments')
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date(); return d.toISOString().split('T')[0]
  })

  const load = useCallback(async () => {
    const [u, s, sc] = await Promise.all([fetchUsersWithAssignments(), fetchServices(), fetchSchedules()])
    setUsers(u); setServices(s); setSchedules(sc)
  }, [])
  useEffect(() => { load() }, [load])

  const today = new Date()
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  const todayShift = getShiftForDate(today).shiftNumber
  const tomorrowShift = getShiftForDate(tomorrow).shiftNumber

  const filtered = users.filter(u => {
    const matchShift = !filterShift || String(u.assignment?.shift_num) === filterShift
    const matchSvc = !filterService || u.service_id === filterService
    const matchName = !searchName || u.full_name.toLowerCase().includes(searchName.toLowerCase())
    return matchShift && matchSvc && matchName
  })

  // Group by shift for overview
  const byShift = [1, 2, 3, 4].map(n => ({
    num: n,
    count: users.filter(u => u.assignment?.shift_num === n).length,
    unassigned: users.filter(u => !u.assignment).length,
  }))

  return (
    <div className="space-y-6">
      {/* Sub-tab switcher */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
        {(([['assignments', 'Назначения'], ...(!hidePhases ? [['phases', 'Фазы смен']] : []), ['monitor', '🔍 Мониторинг']] as [SubTab, string][])).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              subTab === key ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white/60'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === 'phases' && !hidePhases && (
        <ShiftPhaseManager users={users} session={session} onRefresh={load} excludeDrivers />
      )}

      {subTab === 'monitor' && (
        <ShiftMonitorTab users={users} services={services} />
      )}

      {subTab === 'assignments' && <>
      {/* Shift overview cards */}
      <div className="grid grid-cols-5 gap-3">
        {byShift.map(s => (
          <div
            key={s.num}
            onClick={() => setFilterShift(filterShift === String(s.num) ? '' : String(s.num))}
            className={`glass rounded-xl p-3 cursor-pointer border transition-all ${
              filterShift === String(s.num) ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/10 hover:border-white/20'
            }`}
          >
            <div className={`text-xl font-bold ${SHIFT_COLORS[s.num]}`}>{s.count}</div>
            <div className="text-xs text-white/50 mt-0.5">{SHIFT_LABELS[s.num]}</div>
            {todayShift === s.num && <div className="text-[10px] text-green-400 mt-1">▶ сегодня</div>}
            {tomorrowShift === s.num && <div className="text-[10px] text-blue-400 mt-1">▶ завтра</div>}
          </div>
        ))}
        <div className="glass rounded-xl p-3 border border-white/10">
          <div className="text-xl font-bold text-white/30">{byShift[0].unassigned}</div>
          <div className="text-xs text-white/40 mt-0.5">Без смены</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Roster table */}
        <div className="col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-bold text-white">Назначение по сменам</h3>
            <input
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              placeholder="Поиск по ФИО..."
              className="form-input ml-auto w-40 placeholder-white/30"
            />
            <select
              value={filterService}
              onChange={e => setFilterService(e.target.value)}
              className="form-select"
            >
              <option value="">Все службы</option>
              {services.map(s => <option key={s.service_id} value={s.service_id}>{s.service_name}</option>)}
            </select>
            <button onClick={load} className="px-2 py-1 text-xs bg-white/5 rounded-lg text-white/40 hover:bg-white/10">↻</button>
          </div>

          <div className="glass rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-white/40">
                  <th className="px-3 py-2 text-left">ФИО</th>
                  <th className="px-3 py-2 text-left">Служба</th>
                  <th className="px-3 py-2 text-left">Смена</th>
                  <th className="px-3 py-2 text-left">График</th>
                  <th className="px-3 py-2 text-left">Доп.</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <UserRow
                    key={u.user_id}
                    user={u}
                    services={services}
                    schedules={schedules}
                    isEditing={editingId === u.user_id}
                    saving={saving}
                    onEdit={() => setEditingId(u.user_id)}
                    onCancel={() => setEditingId(null)}
                    onSave={async (data, phaseData) => {
                      setSaving(true)
                      await upsertEmployeeAssignment(u.user_id, data, session.user_id)
                      if (phaseData) {
                        await openShiftPhase(u.user_id, phaseData, session.user_id)
                      }
                      setSaving(false)
                      setEditingId(null)
                      load()
                    }}
                  />
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-white/20">Нет сотрудников</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Roster preview */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-bold text-white">Состав смены</h3>
            <input
              type="date"
              value={viewDate}
              onChange={e => setViewDate(e.target.value)}
              className="form-input ml-auto"
            />
          </div>
          <ShiftRoster
            users={users}
            services={services}
            date={new Date(viewDate + 'T12:00:00')}
          />
        </div>
      </div>
      </>}
    </div>
  )
}

// ---- Row component with inline editing ----

function UserRow({ user, services, schedules, isEditing, saving, onEdit, onCancel, onSave }: {
  user: UserWithAssignment
  services: Service[]
  schedules: Schedule[]
  isEditing: boolean
  saving: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (data: {
    schedule_id: string
    shift_num: 1 | 2 | 3 | 4 | null
    rotation_group: string | null
    shift_reference_date: string | null
    is_driver: boolean
    custom_work_days?: number | null
    custom_rest_days?: number | null
    driver_group_number?: number | null
  }, phaseData: { phase: 'day' | 'night'; anchor_date: string; valid_from: string; schedule_code: string; is_alternating: boolean } | null) => Promise<void>
}) {
  const today = new Date().toISOString().split('T')[0]
  const [scheduleCode, setScheduleCode] = useState(user.assignment?.schedule_code ?? '')
  const [shiftNum, setShiftNum] = useState<string>(String(user.assignment?.shift_num ?? ''))
  const [rotationGroup, setRotationGroup] = useState(user.assignment?.rotation_group ?? '')
  const [refDate, setRefDate] = useState(user.assignment?.shift_reference_date ?? '')
  const [isDriver, setIsDriver] = useState(user.assignment?.is_driver ?? false)
  const [scheduleId, setScheduleId] = useState(user.assignment?.schedule_id ?? '')
  const [customWork, setCustomWork] = useState<string>(String(user.assignment?.custom_work_days ?? ''))
  const [customRest, setCustomRest] = useState<string>(String(user.assignment?.custom_rest_days ?? ''))
  // Phase state for cyclic schedules
  const [phaseVal, setPhaseVal] = useState<'day' | 'night'>(user.assignment?.active_phase?.phase ?? 'day')
  const [phaseFrom, setPhaseFrom] = useState(today)
  const [phaseAlt, setPhaseAlt] = useState(false)
  const [createPhase, setCreatePhase] = useState(false)
  // Driver group (1–17)
  const [driverGroupNum, setDriverGroupNum] = useState<string>(
    String(user.assignment?.driver_group_number ?? '')
  )

  // Derive scheduleId from code selection
  const handleScheduleChange = (code: string) => {
    setScheduleCode(code)
    const found = schedules.find(s => s.code === code)
    setScheduleId(found?.id ?? '')
    setShiftNum(''); setRotationGroup(''); setRefDate('')
    setCustomWork(''); setCustomRest('')
    setCreatePhase(isPhaseSchedule(code))
  }

  // Auto-fill all fields from driver group template
  const handleDriverGroupChange = (groupStr: string) => {
    setDriverGroupNum(groupStr)
    if (!groupStr) return
    const tpl = getDriverGroup(Number(groupStr))
    if (!tpl) return
    const code = tpl.schedule_code
    const found = schedules.find(s => s.code === code)
    setScheduleCode(code)
    setScheduleId(found?.id ?? '')
    setRefDate(tpl.anchor_date ?? '')
    setRotationGroup(tpl.rotation_group ?? '')
    setCustomWork(tpl.custom_work_days ? String(tpl.custom_work_days) : '')
    setCustomRest(tpl.custom_rest_days ? String(tpl.custom_rest_days) : '')
    setPhaseVal(tpl.phase)
    setPhaseAlt(tpl.is_alternating)
    setPhaseFrom(today)
    setCreatePhase(isPhaseSchedule(code) || code === 'X/Y')
  }

  // Keep local state in sync when user changes (e.g., after refresh)
  useEffect(() => {
    setScheduleCode(user.assignment?.schedule_code ?? '')
    setShiftNum(String(user.assignment?.shift_num ?? ''))
    setRotationGroup(user.assignment?.rotation_group ?? '')
    setRefDate(user.assignment?.shift_reference_date ?? '')
    setIsDriver(user.assignment?.is_driver ?? false)
    setScheduleId(user.assignment?.schedule_id ?? '')
    setCustomWork(String(user.assignment?.custom_work_days ?? ''))
    setCustomRest(String(user.assignment?.custom_rest_days ?? ''))
  }, [user.assignment])

  const svcName = services.find(s => s.service_id === user.service_id)?.service_name

  const requiresShift = scheduleCode === '1/3'
  const needsRefDate = scheduleCode === '2/2' || scheduleCode === '3/3' || scheduleCode === '6/6' || scheduleCode === '15/15'
  const needsHalf = scheduleCode === '15/15'
  const needsCustom = isCustomSchedule(scheduleCode)
  const canSelectShift = !!scheduleCode

  if (!isEditing) {
    const a = user.assignment
    const displayCode = a?.schedule_code === 'X/Y'
      ? customScheduleLabel(a.custom_work_days, a.custom_rest_days)
      : a?.schedule_code
    return (
      <tr className="border-b border-white/5 hover:bg-white/3 group cursor-pointer" onDoubleClick={onEdit} title="Двойной клик — редактировать">
        <td className="px-3 py-2 text-white/80">{user.full_name}</td>
        <td className="px-3 py-2 text-white/40 text-xs">{svcName ?? '—'}</td>
        <td className="px-3 py-2">
          {a?.shift_num
            ? <span className={`text-xs font-medium ${SHIFT_COLORS[a.shift_num]}`}>{SHIFT_LABELS[a.shift_num]}</span>
            : <span className="text-white/20 text-xs">—</span>}
        </td>
        <td className="px-3 py-2 text-xs text-white/50">
          {displayCode
            ? <ScheduleBadge scheduleCode={displayCode} size="xs" />
            : <span className="text-white/20">—</span>}
        </td>
        <td className="px-3 py-2 text-xs text-white/30">
          {a?.driver_group_number
            ? <span className="text-amber-400/70 font-medium">Гр.{a.driver_group_number}</span>
            : a?.rotation_group && `гр.${a.rotation_group}`}
          {a?.shift_reference_date && !a?.driver_group_number && ` от ${a.shift_reference_date}`}
          {a?.is_driver && ' 🚗'}
        </td>
        <td className="px-3 py-2">
          <button onClick={onEdit} className="opacity-0 group-hover:opacity-100 px-2 py-1 rounded bg-white/5 text-white/40 hover:bg-white/10 text-xs transition-opacity">
            ✏️
          </button>
        </td>
      </tr>
    )
  }

  const sel = 'form-select text-xs px-1.5 py-1'
  const inp = 'form-input text-xs px-1.5 py-1'

  const customWorkNum = customWork ? parseInt(customWork) : null
  const customRestNum = customRest ? parseInt(customRest) : null
  const customValid = !needsCustom || (!!customWorkNum && !!customRestNum && customWorkNum > 0 && customRestNum > 0)

  return (
    <tr className="border-b border-blue-500/20 bg-blue-500/5">
      <td colSpan={6} className="px-3 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white/80 text-sm font-medium mr-2">{user.full_name}</span>

          {/* Driver group quick-select — appears for drivers */}
          {isDriver && (
            <select
              value={driverGroupNum}
              onChange={e => handleDriverGroupChange(e.target.value)}
              className={`${sel} border border-amber-500/30 text-amber-300`}
              title="Выбрать группу из графика водителей (автозаполнение)"
            >
              <option value="">🚗 Группа...</option>
              {DRIVER_GROUPS.map(g => (
                <option key={g.group} value={g.group}>{g.label}</option>
              ))}
            </select>
          )}

          <select value={shiftNum} onChange={e => setShiftNum(e.target.value)} className={sel} disabled={!canSelectShift}>
            <option value="">{requiresShift ? '— смена (обяз.) —' : '— смена (опц.) —'}</option>
            {[1,2,3,4].map(n => <option key={n} value={n}>Смена {n}</option>)}
          </select>

          <select value={scheduleCode} onChange={e => handleScheduleChange(e.target.value)} className={sel}>
            <option value="">— график —</option>
            {schedules.map(s => <option key={s.id} value={s.code}>{s.code} · {s.name}</option>)}
          </select>

          {/* X/Y custom schedule: work/rest day inputs */}
          {needsCustom && (
            <>
              <div className="flex items-center gap-1">
                <input
                  type="number" min={1} max={30} value={customWork}
                  onChange={e => setCustomWork(e.target.value)}
                  className={`${inp} w-14 text-center`}
                  placeholder="раб."
                  title="Рабочих дней"
                />
                <span className="text-white/30 text-xs">/</span>
                <input
                  type="number" min={1} max={30} value={customRest}
                  onChange={e => setCustomRest(e.target.value)}
                  className={`${inp} w-14 text-center`}
                  placeholder="вых."
                  title="Выходных дней"
                />
              </div>
              <input
                type="date" value={refDate} onChange={e => setRefDate(e.target.value)}
                className={inp} title="Дата начала первой рабочей вахты (якорная дата)"
              />
              {customWorkNum && customRestNum && (
                <span className="text-xs text-white/25">
                  = цикл {customWorkNum}/{customRestNum} ({customWorkNum + customRestNum} дн.)
                </span>
              )}
            </>
          )}

          {needsRefDate && (
            <input
              type="date"
              value={refDate}
              onChange={e => setRefDate(e.target.value)}
              className={inp}
              title="Якорная дата"
            />
          )}

          {needsHalf && (
            <select value={rotationGroup} onChange={e => setRotationGroup(e.target.value)} className={sel}>
              <option value="">— группа —</option>
              <option value="1">1–15 числа</option>
              <option value="2">16–30 числа</option>
            </select>
          )}

          {isPhaseSchedule(scheduleCode) && (
            <>
              <span className="text-white/20 text-xs mx-1">|</span>
              <label className="flex items-center gap-1 text-xs text-white/50 cursor-pointer">
                <input type="checkbox" checked={createPhase} onChange={e => setCreatePhase(e.target.checked)} className="accent-indigo-400" />
                Фаза
              </label>
              {createPhase && (
                <>
                  <select value={phaseVal} onChange={e => setPhaseVal(e.target.value as 'day' | 'night')} className={sel}>
                    <option value="day">☀ День</option>
                    <option value="night">🌙 Ночь</option>
                  </select>
                  <input type="date" value={phaseFrom} onChange={e => setPhaseFrom(e.target.value)} className={inp} title="Начало фазы" />
                  {(scheduleCode === '15/15' || scheduleCode === '2/2' || scheduleCode === '6/6') && (
                    <label className="flex items-center gap-1 text-xs text-white/50 cursor-pointer" title="Автоматически чередовать день/ночь каждый цикл">
                      <input type="checkbox" checked={phaseAlt} onChange={e => setPhaseAlt(e.target.checked)} className="accent-indigo-400" />
                      чередование
                    </label>
                  )}
                </>
              )}
            </>
          )}

          <button
            disabled={saving || !scheduleId || !customValid}
            onClick={() => onSave({
              schedule_id: scheduleId,
              shift_num: shiftNum ? (Number(shiftNum) as 1|2|3|4) : null,
              rotation_group: rotationGroup || null,
              shift_reference_date: refDate || null,
              is_driver: isDriver,
              custom_work_days: needsCustom ? customWorkNum : null,
              custom_rest_days: needsCustom ? customRestNum : null,
              driver_group_number: driverGroupNum ? Number(driverGroupNum) : null,
            }, createPhase && (isPhaseSchedule(scheduleCode) || scheduleCode === 'X/Y') ? {
              phase: phaseVal,
              anchor_date: phaseFrom,
              valid_from: phaseFrom,
              schedule_code: scheduleCode,
              is_alternating: phaseAlt,
            } : null)}
            className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium"
          >
            Сохранить
          </button>
          <button onClick={onCancel} className="px-2 py-1 rounded bg-white/5 text-white/40 text-xs">✕</button>
        </div>
      </td>
    </tr>
  )
}
