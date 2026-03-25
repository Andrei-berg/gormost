'use client'
import { useState, useEffect, useRef } from 'react'
import type { UserWithAssignment, Schedule, AuthSession } from '@/types'
import { upsertEmployeeAssignment } from '@/lib/api'

interface Props {
  user: UserWithAssignment
  schedules: Schedule[]
  session: AuthSession
  onClose: () => void
  onSaved: () => void
}

const SHIFT_BASED_CODES  = new Set(['1/3', '5/2'])
const REF_DATE_CODES     = new Set(['2/2', '3/3', '6/6'])
const ROTATION_CODES     = new Set(['15/15'])
const CUSTOM_CODE        = 'X/Y'

export default function PlannerScheduleEditor({ user, schedules, session, onClose, onSaved }: Props) {
  const a = user.assignment

  const [scheduleId,      setScheduleId]      = useState(a?.schedule_id ?? '')
  const [shiftNum,        setShiftNum]         = useState<string>(String(a?.shift_num ?? ''))
  const [refDate,         setRefDate]          = useState(a?.shift_reference_date ?? '')
  const [rotationGroup,   setRotationGroup]    = useState(a?.rotation_group ?? '')
  const [isDriver,        setIsDriver]         = useState(a?.is_driver ?? false)
  const [customWork,      setCustomWork]       = useState<string>(String(a?.custom_work_days ?? ''))
  const [customRest,      setCustomRest]       = useState<string>(String(a?.custom_rest_days ?? ''))
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const selectedSchedule = schedules.find(s => s.id === scheduleId)
  const code = selectedSchedule?.code ?? ''

  const needsShiftNum  = SHIFT_BASED_CODES.has(code)
  const needsRefDate   = REF_DATE_CODES.has(code)
  const needsRotation  = ROTATION_CODES.has(code)
  const isCustom       = code === CUSTOM_CODE

  async function handleSave() {
    if (!scheduleId) return
    setSaving(true)
    await upsertEmployeeAssignment(
      user.user_id,
      {
        schedule_id: scheduleId,
        shift_num: needsShiftNum && shiftNum ? (Number(shiftNum) as 1 | 2 | 3 | 4) : null,
        rotation_group: needsRotation ? (rotationGroup || null) : null,
        shift_reference_date: needsRefDate ? (refDate || null) : null,
        is_driver: isDriver,
        custom_work_days: isCustom ? (Number(customWork) || null) : null,
        custom_rest_days: isCustom ? (Number(customRest) || null) : null,
        driver_group_number: a?.driver_group_number ?? null, // preserve existing value
      },
      session.user_id,
    )
    setSaving(false)
    onSaved()
  }

  return (
    <div
      ref={ref}
      className="w-72 glass-popup rounded-2xl shadow-2xl p-4 space-y-3"
      // Positioned by parent (inline)
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-white/80 font-medium text-xs truncate max-w-[200px]">{user.full_name}</div>
          <div className="text-white/30 text-[10px] mt-0.5">Назначение графика</div>
        </div>
        <button onClick={onClose} className="text-white/25 hover:text-white/60 text-xl leading-none ml-2">×</button>
      </div>

      {/* Schedule selector */}
      <div>
        <label className="text-white/35 text-[10px] block mb-1 uppercase tracking-wide">График работы</label>
        <select
          value={scheduleId}
          onChange={e => setScheduleId(e.target.value)}
          className="form-select text-xs w-full"
        >
          <option value="">— выбрать —</option>
          {schedules.map(s => (
            <option key={s.id} value={s.id}>{s.code} · {s.name}</option>
          ))}
        </select>
      </div>

      {/* Shift number (1/3, 5/2) */}
      {needsShiftNum && (
        <div>
          <label className="text-white/35 text-[10px] block mb-1 uppercase tracking-wide">Номер смены</label>
          <select value={shiftNum} onChange={e => setShiftNum(e.target.value)} className="form-select text-xs w-full">
            <option value="">— выбрать —</option>
            {[1, 2, 3, 4].map(n => <option key={n} value={n}>Смена {n}</option>)}
          </select>
        </div>
      )}

      {/* Reference date (2/2, 3/3, 6/6) */}
      {needsRefDate && (
        <div>
          <label className="text-white/35 text-[10px] block mb-1 uppercase tracking-wide">
            Опорная дата <span className="normal-case text-white/20">(первый рабочий день)</span>
          </label>
          <input
            type="date"
            value={refDate}
            onChange={e => setRefDate(e.target.value)}
            className="form-input text-xs w-full"
          />
        </div>
      )}

      {/* Rotation group (15/15) */}
      {needsRotation && (
        <div>
          <label className="text-white/35 text-[10px] block mb-1 uppercase tracking-wide">Группа ротации</label>
          <select value={rotationGroup} onChange={e => setRotationGroup(e.target.value)} className="form-select text-xs w-full">
            <option value="">— выбрать —</option>
            <option value="1">Группа 1 (1–15)</option>
            <option value="2">Группа 2 (16–конец)</option>
          </select>
        </div>
      )}

      {/* Custom X/Y */}
      {isCustom && (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-white/35 text-[10px] block mb-1 uppercase tracking-wide">Рабочих</label>
            <input type="number" min={1} max={30} value={customWork} onChange={e => setCustomWork(e.target.value)} className="form-input text-xs w-full" />
          </div>
          <div className="flex-1">
            <label className="text-white/35 text-[10px] block mb-1 uppercase tracking-wide">Выходных</label>
            <input type="number" min={1} max={30} value={customRest} onChange={e => setCustomRest(e.target.value)} className="form-input text-xs w-full" />
          </div>
        </div>
      )}

      {/* Driver toggle */}
      <label className="flex items-center gap-2 text-xs text-white/50 cursor-pointer select-none py-1">
        <input
          type="checkbox"
          checked={isDriver}
          onChange={e => setIsDriver(e.target.checked)}
          className="w-3.5 h-3.5 accent-amber-500"
        />
        Водитель (группа назначается в разделе Водители)
      </label>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-white/5">
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-white/35 hover:bg-white/10 transition-colors"
        >Отмена</button>
        <div className="flex-1" />
        <button
          onClick={handleSave}
          disabled={saving || !scheduleId}
          className="px-4 py-1.5 rounded-lg text-xs bg-blue-600/35 text-blue-100 hover:bg-blue-600/50 border border-blue-500/25 transition-colors disabled:opacity-40"
        >
          {saving ? '…' : 'Назначить'}
        </button>
      </div>
    </div>
  )
}
