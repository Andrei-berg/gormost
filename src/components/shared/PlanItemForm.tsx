'use client'
import { useState, useCallback } from 'react'
import type {
  WorkPlanItem, WorkPlanItemWithVehicles, VehicleRequirement, VehicleType,
  CrossServiceDraft, UserWithAssignment, CrossServiceRequest,
  EmployeeStatusType,
} from '@/types'
import { VEHICLE_TYPE_CONFIG, SERVICE_META, EMPLOYEE_STATUS_CONFIG } from '@/types'
import { fetchUsersWithAssignments, fetchAllCurrentStatuses } from '@/lib/api-client'
import { isWorkerOnDuty } from '@/lib/shifts'

// ── Exported type used by all callers ──────────────────────────────────────
export type PlanItemFormData = Omit<WorkPlanItemWithVehicles,
  'id' | 'plan_id' | 'created_at' | 'updated_at' | 'sort_order' | 'vehicles' | 'cross_requests'
>

const ALL_SERVICES = Object.keys(SERVICE_META)

const SERVICE_NAMES: Record<string, string> = {
  'SRV-ENG':  'Инженерные системы',
  'SRV-STR':  'Строительная служба',
  'SRV-FIRE': 'Пожарная безопасность',
  'SRV-VENT': 'Вентиляция',
  'SRV-CCTV': 'Видеонаблюдение',
}

// Statuses that mean the employee cannot work (absent/sick/leave)
const BLOCKED_STATUSES = new Set<EmployeeStatusType>([
  'Otgul', 'Bolnichniy', 'Otpusk', 'Komandirovka',
  'Uchebniy_otpusk', 'Dekret', 'Mobilizovan', 'SVO', 'Troydoustroyen_s_SVO',
])

const ROLE_GROUPS = [
  { key: 'foreman', label: 'Мастера / Бригадиры', levels: ['FOREMAN'] },
  { key: 'itr',     label: 'ИТР / Специалисты',   levels: ['HEAD', 'SPECIALIST', 'CHIEF_ENGINEER', 'ZAMPORAB', 'DISPATCHER', 'HR', 'SAFETY_ENGINEER'] },
  { key: 'worker',  label: 'Рабочие',              levels: ['WORKER'] },
  { key: 'driver',  label: 'Водители',             levels: ['DRIVER'] },
]

type WorkerWithStatus = UserWithAssignment & {
  onDuty: boolean
  currentStatus: EmployeeStatusType
}

interface Props {
  initial?: WorkPlanItem
  serviceId: string
  planDate?: string
  existingCrossRequest?: CrossServiceRequest | null
  withCrossService?: boolean
  /** Names already picked in OTHER work items of this plan (informational) */
  allPlanWorkers?: string[]
  onSave: (data: PlanItemFormData, crossDraft: CrossServiceDraft | null) => void
  onCancel: () => void
}

export default function PlanItemForm({
  initial, serviceId, planDate, existingCrossRequest, withCrossService = false,
  allPlanWorkers = [],
  onSave, onCancel,
}: Props) {
  const [location,  setLocation]  = useState(initial?.location || '')
  const [workDesc,  setWorkDesc]  = useState(initial?.work_description || '')
  const [timeStart, setTimeStart] = useState(initial?.time_start || '')
  const [timeEnd,   setTimeEnd]   = useState(initial?.time_end || '')
  const [notes,     setNotes]     = useState(initial?.notes || '')

  const [reqWorkers,    setReqWorkers]    = useState(initial?.required_workers    ?? 0)
  const [reqBrigadiers, setReqBrigadiers] = useState(initial?.required_brigadiers ?? 0)
  const [reqMasters,    setReqMasters]    = useState(initial?.required_masters    ?? 0)
  const [reqForemen,    setReqForemen]    = useState(initial?.required_foremen    ?? 0)

  // Vehicle type picker
  const [vehicleReqs,    setVehicleReqs]    = useState<VehicleRequirement[]>(initial?.required_vehicle_types ?? [])
  const [showVehicleMenu, setShowVehicleMenu] = useState(false)

  // Smart worker picker
  const [selectedWorkers,  setSelectedWorkers]  = useState<string[]>(initial?.workers ?? [])
  const [showWorkerPicker, setShowWorkerPicker] = useState(false)
  const [pickerWorkers,    setPickerWorkers]    = useState<WorkerWithStatus[]>([])
  const [pickerLoading,    setPickerLoading]    = useState(false)

  // Cross-service
  const otherServices = ALL_SERVICES.filter(id => id !== serviceId)
  const initCross = (): CrossServiceDraft => existingCrossRequest ? {
    to_service_id: existingCrossRequest.to_service_id,
    description:   existingCrossRequest.description,
    needed_count:  existingCrossRequest.needed_count,
    time_start:    existingCrossRequest.time_start || '',
    time_end:      existingCrossRequest.time_end   || '',
  } : {
    to_service_id: otherServices[0] ?? '',
    description:   '',
    needed_count:  1,
    time_start:    initial?.time_start || '',
    time_end:      initial?.time_end   || '',
  }
  const [crossDraft, setCrossDraft] = useState<CrossServiceDraft | null>(
    existingCrossRequest ? initCross() : null
  )
  const [showCross, setShowCross] = useState(!!existingCrossRequest)

  // ── Vehicle helpers ────────────────────────────────────────────────────
  const addVehicleType = (type: VehicleType) => {
    setShowVehicleMenu(false)
    if (vehicleReqs.find(r => r.type === type)) return
    setVehicleReqs(prev => [...prev, { type, count: 1 }])
  }
  const changeVehicleCount = (type: VehicleType, delta: number) => {
    setVehicleReqs(prev => prev.map(r => r.type === type ? { ...r, count: Math.max(1, r.count + delta) } : r))
  }
  const removeVehicleType = (type: VehicleType) => {
    setVehicleReqs(prev => prev.filter(r => r.type !== type))
  }

  // ── Worker picker helpers ──────────────────────────────────────────────
  const loadWorkers = useCallback(async () => {
    if (pickerLoading) return
    setPickerLoading(true)
    const today = planDate ? new Date(planDate + 'T00:00:00') : new Date()
    const [usersWithAssign, statuses] = await Promise.all([
      fetchUsersWithAssignments(),
      fetchAllCurrentStatuses(),
    ])
    const serviceWorkers = usersWithAssign.filter(u => u.service_id === serviceId && u.is_active)
    const enriched: WorkerWithStatus[] = serviceWorkers.map(u => {
      const onDuty = u.assignment
        ? isWorkerOnDuty({
            shift_num:            u.assignment.shift_num,
            schedule_code:        u.assignment.schedule_code ?? '',
            shift_reference_date: u.assignment.shift_reference_date,
            rotation_group:       u.assignment.rotation_group,
            active_phase:         u.assignment.active_phase ?? null,
            custom_work_days:     u.assignment.custom_work_days,
            custom_rest_days:     u.assignment.custom_rest_days,
          }, today)
        : false
      const statusRecord = statuses.find(s => s.user.user_id === u.user_id)
      const currentStatus: EmployeeStatusType = statusRecord?.currentStatus ?? 'Na_rabote'
      return { ...u, onDuty, currentStatus }
    })
    setPickerWorkers(enriched)
    setPickerLoading(false)
  }, [serviceId, pickerLoading, planDate])

  const toggleWorkerPicker = () => {
    if (!showWorkerPicker) loadWorkers()
    setShowWorkerPicker(p => !p)
  }
  const toggleWorker = (name: string, blocked: boolean) => {
    if (blocked) return
    setSelectedWorkers(prev => prev.includes(name) ? prev.filter(w => w !== name) : [...prev, name])
  }

  // ── Cross-service helpers ──────────────────────────────────────────────
  const toggleCross = () => {
    if (crossDraft) { setShowCross(v => !v) }
    else { setCrossDraft(initCross()); setShowCross(true) }
  }

  // ── Save ───────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!location.trim() || !workDesc.trim()) return
    onSave({
      location:               location.trim(),
      work_description:       workDesc.trim(),
      workers:                selectedWorkers,
      time_start:             timeStart || null,
      time_end:               timeEnd   || null,
      notes:                  notes.trim() || null,
      required_workers:       reqWorkers,
      required_brigadiers:    reqBrigadiers,
      required_masters:       reqMasters,
      required_foremen:       reqForemen,
      required_vehicles:      vehicleReqs.reduce((s, r) => s + r.count, 0),
      required_vehicle_types: vehicleReqs,
      is_redirected:          initial?.is_redirected  ?? false,
      redirect_reason:        initial?.redirect_reason ?? null,
    }, withCrossService ? crossDraft : null)
  }

  const inp = 'form-input w-full text-sm px-2.5 py-1.5 placeholder-white/30'
  const lbl = 'block text-[10px] text-white/40 uppercase tracking-wider mb-1'
  const usedTypes = new Set(vehicleReqs.map(r => r.type))
  const availableTypes = (Object.keys(VEHICLE_TYPE_CONFIG) as VehicleType[]).filter(t => !usedTypes.has(t))

  // Group workers for picker
  const dutyWorkers    = pickerWorkers.filter(w => w.onDuty && !BLOCKED_STATUSES.has(w.currentStatus))
  const offDayWorkers  = pickerWorkers.filter(w => !w.onDuty && !BLOCKED_STATUSES.has(w.currentStatus))
  const absentWorkers  = pickerWorkers.filter(w => BLOCKED_STATUSES.has(w.currentStatus))

  return (
    <div className="p-3 rounded-xl bg-blue-500/8 border border-blue-500/20 space-y-3">

      {/* Location + work description */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={lbl}>Место / Объект *</label>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Тоннель, портал..." className={inp} />
        </div>
        <div>
          <label className={lbl}>Вид работ *</label>
          <input value={workDesc} onChange={e => setWorkDesc(e.target.value)} placeholder="Замена ламп, промывка..." className={inp} />
        </div>
      </div>

      {/* Time + headcount steppers */}
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className={lbl}>С</label>
          <input type="time" value={timeStart} onChange={e => setTimeStart(e.target.value)} className="form-input text-sm px-2 py-1.5" />
        </div>
        <div>
          <label className={lbl}>До</label>
          <input type="time" value={timeEnd} onChange={e => setTimeEnd(e.target.value)} className="form-input text-sm px-2 py-1.5" />
        </div>
        <div className="flex items-end gap-2 ml-2 flex-wrap">
          <MiniStepper emoji="👷" label="Рабочие"   value={reqWorkers}    onChange={setReqWorkers} />
          <MiniStepper emoji="⭐" label="Бригадир"  value={reqBrigadiers} onChange={setReqBrigadiers} />
          <MiniStepper emoji="🎓" label="Мастер"    value={reqMasters}    onChange={setReqMasters} />
          <MiniStepper emoji="📋" label="ИТР"       value={reqForemen}    onChange={setReqForemen} />
        </div>
        <div className="flex-1 min-w-32">
          <label className={lbl}>Примечание</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="..." className={inp} />
        </div>
      </div>

      {/* Vehicle type picker */}
      <div>
        <label className={lbl}>🚛 Спецтехника</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {vehicleReqs.map(vr => {
            const cfg = VEHICLE_TYPE_CONFIG[vr.type]
            return (
              <div key={vr.type} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-200 text-xs">
                <span>{cfg.emoji}</span><span>{cfg.label}</span>
                <button onClick={() => changeVehicleCount(vr.type, -1)} className="w-4 h-4 flex items-center justify-center hover:bg-amber-500/20 rounded text-[10px] font-bold">−</button>
                <span className="font-mono font-semibold">{vr.count}</span>
                <button onClick={() => changeVehicleCount(vr.type, +1)} className="w-4 h-4 flex items-center justify-center hover:bg-amber-500/20 rounded text-[10px] font-bold">+</button>
                <button onClick={() => removeVehicleType(vr.type)} className="ml-0.5 hover:text-red-400 text-amber-400/60 text-[11px]">✕</button>
              </div>
            )
          })}
        </div>
        {availableTypes.length > 0 && (
          <div>
            <button type="button" onClick={() => setShowVehicleMenu(v => !v)}
              className="text-xs px-2.5 py-1 rounded-lg border border-dashed border-amber-500/30 text-amber-400/70 hover:text-amber-300 hover:border-amber-500/50 transition-colors">
              {showVehicleMenu ? '▲ Скрыть типы' : '+ Добавить технику'}
            </button>
            {showVehicleMenu && (
              <div className="mt-2 flex flex-wrap gap-1.5 p-2 rounded-xl bg-white/4 border border-amber-500/15">
                {availableTypes.map(type => {
                  const cfg = VEHICLE_TYPE_CONFIG[type]
                  return (
                    <button key={type} type="button" onClick={() => addVehicleType(type)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-200 text-xs transition-colors">
                      <span>{cfg.emoji}</span><span>{cfg.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Smart worker picker */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={lbl + ' mb-0'}>👷 Работники поимённо</label>
          <button type="button" onClick={toggleWorkerPicker}
            className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
              showWorkerPicker ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300' : 'border-white/15 text-white/40 hover:text-white/60'
            }`}>
            {showWorkerPicker ? '▲ Скрыть' : '▼ Выбрать из состава'}
          </button>
        </div>

        {/* Selected workers */}
        {selectedWorkers.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {selectedWorkers.map((w, i) => {
              const alreadyInOther = allPlanWorkers.includes(w)
              return (
                <span key={i} onClick={() => setSelectedWorkers(prev => prev.filter(x => x !== w))}
                  className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                    alreadyInOther
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25 hover:bg-red-500/15 hover:text-red-300'
                      : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 hover:bg-red-500/15 hover:text-red-300'
                  }`}
                  title={alreadyInOther ? 'Уже назначен на другую работу. Нажмите чтобы убрать' : 'Нажмите чтобы убрать'}
                >
                  {alreadyInOther && <span className="text-[9px]">⚠</span>}
                  {w}
                  <span className="text-[9px] opacity-60">✕</span>
                </span>
              )
            })}
          </div>
        )}

        {showWorkerPicker && (
          <div className="rounded-xl bg-white/4 border border-white/8 p-3 space-y-3 max-h-72 overflow-y-auto">
            {pickerLoading && <div className="text-xs text-white/30 text-center py-2">Загрузка...</div>}
            {!pickerLoading && pickerWorkers.length === 0 && (
              <div className="text-xs text-white/25 text-center py-2 italic">Нет сотрудников в службе</div>
            )}

            {/* On duty - grouped by role */}
            {!pickerLoading && dutyWorkers.length > 0 && (
              <div>
                <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full inline-block bg-emerald-400" />
                  На смене {planDate ? `· ${planDate.split('-').reverse().slice(0, 2).join('.')}` : 'сегодня'} · {dutyWorkers.length} чел.
                </div>
                {ROLE_GROUPS.map(rg => {
                  const groupWorkers = dutyWorkers.filter(w => rg.levels.includes(w.role_level))
                  if (groupWorkers.length === 0) return null
                  return (
                    <div key={rg.key} className="mb-2">
                      <div className="text-[9px] text-white/20 uppercase tracking-widest mb-1 px-0.5">{rg.label} · {groupWorkers.length}</div>
                      <div className="grid grid-cols-2 gap-1">
                        {groupWorkers.map(u => {
                          const sel = selectedWorkers.includes(u.full_name)
                          const inOtherItem = allPlanWorkers.includes(u.full_name)
                          return (
                            <button key={u.user_id} type="button" onClick={() => toggleWorker(u.full_name, false)}
                              className={`text-left flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                                sel
                                  ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                                  : 'bg-white/4 border border-transparent hover:bg-white/8 text-white/70'
                              }`}>
                              <span className={`w-3 h-3 rounded-sm border flex-shrink-0 flex items-center justify-center text-[9px] ${
                                sel ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-white/20'
                              }`}>{sel ? '✓' : ''}</span>
                              <span className="truncate flex-1">{u.full_name}</span>
                              {inOtherItem && <span className="text-[9px] text-amber-400/80 shrink-0">⚠</span>}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Not on duty (but at work, not absent) */}
            {!pickerLoading && offDayWorkers.length > 0 && (
              <WorkerGroup
                title="Не дежурят / без графика"
                workers={offDayWorkers}
                selectedWorkers={selectedWorkers}
                allPlanWorkers={allPlanWorkers}
                onToggle={toggleWorker}
                dotColor="bg-white/30"
                dimmed
              />
            )}

            {/* Absent / blocked */}
            {!pickerLoading && absentWorkers.length > 0 && (
              <div>
                <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
                  Отсутствуют (нельзя добавить) · {absentWorkers.length}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {absentWorkers.map(u => {
                    const stCfg = EMPLOYEE_STATUS_CONFIG[u.currentStatus]
                    return (
                      <div key={u.user_id}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/3 border border-white/5 opacity-50 cursor-not-allowed"
                        title={`${stCfg.label} — недоступен для назначения`}
                      >
                        <span className="w-3 h-3 rounded-sm border border-white/15 flex-shrink-0" />
                        <span className="text-xs text-white/50 truncate flex-1">{u.full_name}</span>
                        <span className="text-[10px] shrink-0" style={{ color: stCfg.color }}>{stCfg.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Staffing check */}
        {(reqWorkers > 0 || reqBrigadiers > 0 || reqMasters > 0 || reqForemen > 0) && pickerWorkers.length > 0 && (
          <div className="mt-2 p-2 rounded-lg bg-white/3 border border-white/8 text-[11px]">
            {(() => {
              const ITR_ROLES = ['HEAD', 'SPECIALIST', 'CHIEF_ENGINEER', 'ZAMPORAB', 'DISPATCHER', 'HR', 'SAFETY_ENGINEER']
              const selWorkers = selectedWorkers.filter(n => pickerWorkers.find(w => w.full_name === n)?.role_level === 'WORKER').length
              const selForemen = selectedWorkers.filter(n => pickerWorkers.find(w => w.full_name === n)?.role_level === 'FOREMAN').length
              const selItr     = selectedWorkers.filter(n => ITR_ROLES.includes(pickerWorkers.find(w => w.full_name === n)?.role_level ?? '')).length
              const needForemen = reqBrigadiers + reqMasters
              const items = [
                reqWorkers > 0  ? { label: '👷 Рабочие',         got: selWorkers,  need: reqWorkers }  : null,
                needForemen > 0 ? { label: '🦺 Мастера/Бригад.', got: selForemen,  need: needForemen } : null,
                reqForemen > 0  ? { label: '📋 ИТР',             got: selItr,      need: reqForemen }  : null,
              ].filter(Boolean) as { label: string; got: number; need: number }[]
              return (
                <div className="space-y-0.5">
                  {items.map(it => (
                    <div key={it.label} className="flex items-center gap-2">
                      <span className="text-white/35 w-36 truncate">{it.label}</span>
                      <span className={it.got >= it.need ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
                        {it.got}/{it.need}
                      </span>
                      {it.got < it.need
                        ? <span className="text-amber-400/60">⚠ нужно ещё {it.need - it.got}</span>
                        : <span className="text-emerald-400/40">✓</span>
                      }
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        )}
      </div>

      {/* Cross-service section (optional) */}
      {withCrossService && (
        <div>
          <button type="button" onClick={toggleCross}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
              crossDraft
                ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                : 'bg-violet-500/8 border-violet-500/20 text-violet-400/70 hover:text-violet-300 hover:bg-violet-500/15'
            }`}>
            <span>🔗</span>
            <span>{crossDraft
              ? `${SERVICE_META[crossDraft.to_service_id]?.emoji ?? ''} ${SERVICE_NAMES[crossDraft.to_service_id] ?? crossDraft.to_service_id} ${showCross ? '▾' : '▸'}`
              : 'Смежная служба'
            }</span>
          </button>

          {crossDraft && showCross && (
            <div className="mt-2 rounded-lg bg-violet-500/5 border border-violet-500/20 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-violet-300 uppercase tracking-wider">🔗 Запрос смежной службе</span>
                <button type="button" onClick={() => { setCrossDraft(null); setShowCross(false) }}
                  className="text-white/25 hover:text-red-400 text-xs px-1">✕ убрать</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {otherServices.map(sid => (
                  <button key={sid} type="button"
                    onClick={() => setCrossDraft(d => d ? { ...d, to_service_id: sid } : d)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      crossDraft.to_service_id === sid
                        ? 'bg-violet-600/40 border-violet-500/60 text-white'
                        : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                    }`}>
                    <span>{SERVICE_META[sid]?.emoji ?? ''}</span>
                    <span>{SERVICE_NAMES[sid] ?? sid}</span>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-white/40">Людей</span>
                  <div className="flex items-center gap-0.5">
                    <button type="button" onClick={() => setCrossDraft(d => d ? { ...d, needed_count: Math.max(1, d.needed_count - 1) } : d)}
                      className="w-6 h-6 rounded bg-white/8 border border-white/10 text-white/50 hover:text-white text-xs font-bold flex items-center justify-center">−</button>
                    <span className="w-7 text-center text-sm font-semibold text-white">{crossDraft.needed_count}</span>
                    <button type="button" onClick={() => setCrossDraft(d => d ? { ...d, needed_count: Math.min(20, d.needed_count + 1) } : d)}
                      className="w-6 h-6 rounded bg-white/8 border border-white/10 text-white/50 hover:text-white text-xs font-bold flex items-center justify-center">+</button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-white/40">с</span>
                  <input type="time" value={crossDraft.time_start} onChange={e => setCrossDraft(d => d ? { ...d, time_start: e.target.value } : d)}
                    className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50" />
                  <span className="text-white/30 text-xs">–</span>
                  <input type="time" value={crossDraft.time_end} onChange={e => setCrossDraft(d => d ? { ...d, time_end: e.target.value } : d)}
                    className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50" />
                </div>
              </div>
              <input type="text" value={crossDraft.description}
                onChange={e => setCrossDraft(d => d ? { ...d, description: e.target.value } : d)}
                placeholder="Что нужно сделать для другой службы..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50" />
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={!location.trim() || !workDesc.trim()}
          className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium transition-colors">
          Сохранить
        </button>
        <button onClick={onCancel} className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-sm transition-colors">
          Отмена
        </button>
      </div>
    </div>
  )
}

// ── Worker group sub-component ──────────────────────────────────────────────
function WorkerGroup({
  title, workers, selectedWorkers, allPlanWorkers, onToggle, dotColor, dimmed = false,
}: {
  title: string
  workers: WorkerWithStatus[]
  selectedWorkers: string[]
  allPlanWorkers: string[]
  onToggle: (name: string, blocked: boolean) => void
  dotColor: string
  dimmed?: boolean
}) {
  return (
    <div>
      <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full inline-block ${dotColor}`} />
        {title} · {workers.length}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {workers.map(u => {
          const sel           = selectedWorkers.includes(u.full_name)
          const inOtherItem   = allPlanWorkers.includes(u.full_name)
          const roleGroups    = ROLE_GROUPS.find(g => g.levels.includes(u.role_level))
          return (
            <button key={u.user_id} type="button" onClick={() => onToggle(u.full_name, false)}
              className={`text-left flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                sel         ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                : dimmed    ? 'bg-white/2 border border-transparent hover:bg-white/6 text-white/45'
                :             'bg-white/4 border border-transparent hover:bg-white/8 text-white/70'
              }`}>
              <span className={`w-3 h-3 rounded-sm border flex-shrink-0 flex items-center justify-center text-[9px] ${
                sel ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-white/20'
              }`}>{sel ? '✓' : ''}</span>
              <span className="truncate flex-1">{u.full_name}</span>
              {inOtherItem && (
                <span className="text-[9px] text-amber-400/80 shrink-0" title="Уже в другой работе">⚠</span>
              )}
              {roleGroups && !sel && (
                <span className="text-[9px] text-white/25 shrink-0">{roleGroups.label.split(' ')[0]}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MiniStepper({ emoji, label, value, onChange }: { emoji: string; label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] text-white/40 leading-none">{label}</span>
      <div className="flex items-center gap-0.5">
        <button onClick={() => onChange(Math.max(0, value - 1))} className="w-5 h-5 rounded bg-white/8 border border-white/10 text-white/50 hover:text-white hover:bg-white/15 text-xs font-bold flex items-center justify-center">−</button>
        <span className="w-6 text-center text-sm text-white font-semibold">{value}</span>
        <button onClick={() => onChange(Math.min(50, value + 1))} className="w-5 h-5 rounded bg-white/8 border border-white/10 text-white/50 hover:text-white hover:bg-white/15 text-xs font-bold flex items-center justify-center">+</button>
      </div>
      <span className="text-[11px] leading-none">{emoji}</span>
    </div>
  )
}
