'use client'
import { useState, useCallback } from 'react'
import type {
  WorkPlanItem, WorkPlanItemWithVehicles, VehicleRequirement, VehicleType,
  CrossServiceDraft, UserWithAssignment, CrossServiceRequest,
} from '@/types'
import { VEHICLE_TYPE_CONFIG, SERVICE_META } from '@/types'
import { fetchUsersWithAssignments } from '@/lib/api'
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

const ROLE_GROUPS = [
  { key: 'foreman', label: 'Мастера / Бригадиры', levels: ['FOREMAN'] },
  { key: 'itr',     label: 'ИТР / Специалисты',   levels: ['HEAD', 'SPECIALIST', 'CHIEF_ENGINEER', 'ZAMPORAB', 'DISPATCHER', 'HR', 'SAFETY_ENGINEER'] },
  { key: 'worker',  label: 'Рабочие',              levels: ['WORKER'] },
  { key: 'driver',  label: 'Водители',             levels: ['DRIVER'] },
]

interface Props {
  initial?: WorkPlanItem
  serviceId: string
  existingCrossRequest?: CrossServiceRequest | null
  withCrossService?: boolean
  onSave: (data: PlanItemFormData, crossDraft: CrossServiceDraft | null) => void
  onCancel: () => void
}

export default function PlanItemForm({
  initial, serviceId, existingCrossRequest, withCrossService = false,
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
  const [pickerWorkers,    setPickerWorkers]    = useState<UserWithAssignment[]>([])
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
    if (pickerWorkers.length > 0 || pickerLoading) return
    setPickerLoading(true)
    const today = new Date()
    const all = await fetchUsersWithAssignments()
    const onDuty = all.filter(u => {
      if (u.service_id !== serviceId || !u.assignment) return false
      return isWorkerOnDuty({
        shift_num:            u.assignment.shift_num,
        schedule_code:        u.assignment.schedule_code ?? '',
        shift_reference_date: u.assignment.shift_reference_date,
        rotation_group:       u.assignment.rotation_group,
      }, today)
    })
    setPickerWorkers(onDuty)
    setPickerLoading(false)
  }, [serviceId, pickerWorkers.length, pickerLoading])

  const toggleWorkerPicker = () => {
    if (!showWorkerPicker) loadWorkers()
    setShowWorkerPicker(p => !p)
  }
  const toggleWorker = (name: string) => {
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
          <MiniStepper label="👷" title="Рабочие"    value={reqWorkers}    onChange={setReqWorkers} />
          <MiniStepper label="⭐" title="Бригадиры"  value={reqBrigadiers} onChange={setReqBrigadiers} />
          <MiniStepper label="🎓" title="Мастера"    value={reqMasters}    onChange={setReqMasters} />
          <MiniStepper label="📋" title="ИТР"        value={reqForemen}    onChange={setReqForemen} />
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
          <div className="relative inline-block">
            <button type="button" onClick={() => setShowVehicleMenu(v => !v)}
              className="text-xs px-2.5 py-1 rounded-lg border border-dashed border-amber-500/30 text-amber-400/70 hover:text-amber-300 hover:border-amber-500/50 transition-colors">
              + Добавить технику
            </button>
            {showVehicleMenu && (
              <div className="absolute z-20 top-full mt-1 left-0 glass rounded-xl border border-white/10 shadow-2xl py-1 min-w-[180px]">
                {availableTypes.map(type => {
                  const cfg = VEHICLE_TYPE_CONFIG[type]
                  return (
                    <button key={type} type="button" onClick={() => addVehicleType(type)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/8 text-left text-sm text-white/80 hover:text-white transition-colors">
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
            {showWorkerPicker ? '▲ Скрыть' : '▼ Выбрать со смены'}
          </button>
        </div>
        {selectedWorkers.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {selectedWorkers.map((w, i) => (
              <span key={i} onClick={() => toggleWorker(w)}
                className="flex items-center gap-1 text-[11px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 px-2 py-0.5 rounded-full cursor-pointer hover:bg-red-500/15 hover:text-red-300 transition-colors"
                title="Нажмите чтобы убрать">
                {w} <span className="text-[9px] opacity-60">✕</span>
              </span>
            ))}
          </div>
        )}
        {showWorkerPicker && (
          <div className="rounded-xl bg-white/4 border border-white/8 p-3 space-y-3 max-h-64 overflow-y-auto">
            {pickerLoading && <div className="text-xs text-white/30 text-center py-2">Загрузка...</div>}
            {!pickerLoading && pickerWorkers.length === 0 && (
              <div className="text-xs text-white/25 text-center py-2 italic">Нет сотрудников на смене сегодня</div>
            )}
            {!pickerLoading && ROLE_GROUPS.map(group => {
              const gw = pickerWorkers.filter(u => group.levels.includes(u.role_level))
              if (gw.length === 0) return null
              return (
                <div key={group.key}>
                  <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5">{group.label} · {gw.length}</div>
                  <div className="grid grid-cols-2 gap-1">
                    {gw.map(u => {
                      const sel = selectedWorkers.includes(u.full_name)
                      return (
                        <button key={u.user_id} type="button" onClick={() => toggleWorker(u.full_name)}
                          className={`text-left flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                            sel ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                                : 'bg-white/4 border border-transparent hover:bg-white/8 text-white/70'
                          }`}>
                          <span className={`w-3 h-3 rounded-sm border flex-shrink-0 flex items-center justify-center text-[9px] ${
                            sel ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-white/20'
                          }`}>{sel ? '✓' : ''}</span>
                          <span className="truncate">{u.full_name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
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

function MiniStepper({ label, title, value, onChange }: { label: string; title: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-0.5" title={title}>
      <span className="text-[11px]">{label}</span>
      <div className="flex items-center gap-0.5">
        <button onClick={() => onChange(Math.max(0, value - 1))} className="w-5 h-5 rounded bg-white/8 border border-white/10 text-white/50 hover:text-white hover:bg-white/15 text-xs font-bold flex items-center justify-center">−</button>
        <span className="w-6 text-center text-sm text-white font-semibold">{value}</span>
        <button onClick={() => onChange(Math.min(50, value + 1))} className="w-5 h-5 rounded bg-white/8 border border-white/10 text-white/50 hover:text-white hover:bg-white/15 text-xs font-bold flex items-center justify-center">+</button>
      </div>
    </div>
  )
}
