'use client'
import { useState, useEffect } from 'react'
import { fetchEmployeeDetail, updateUser, fetchServices, fetchSchedules, upsertEmployeeAssignment } from '@/lib/api'
import { EMPLOYEE_STATUS_CONFIG } from '@/types'
import type { EmployeeDetail, Service, Schedule } from '@/types'

interface Props {
  userId: string
  currentUserId: string
  canAdmin: boolean
  onClose: () => void
  onDismiss: (userId: string) => void
  onTransfer: (userId: string) => void
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const ROLE_OPTIONS = [
  { value: 'WORKER', label: 'Рабочий' },
  { value: 'FOREMAN', label: 'Мастер/Бригадир' },
  { value: 'HEAD', label: 'Нач. службы' },
  { value: 'CHIEF_ENGINEER', label: 'Главный инженер' },
  { value: 'ZAMPORAB', label: 'Зам. прораба' },
  { value: 'DISPATCHER', label: 'Диспетчер' },
  { value: 'COMPLAINTS', label: 'Диспетчер жалоб' },
  { value: 'TRANSPORT', label: 'Транспорт' },
  { value: 'HR', label: 'Кадровик (HR)' },
  { value: 'BOSS', label: 'Руководитель' },
  { value: 'ADMIN', label: 'Администратор' },
]

export default function EmployeeDetailCard({
  userId,
  currentUserId,
  canAdmin,
  onClose,
  onDismiss,
  onTransfer,
}: Props) {
  const [detail, setDetail] = useState<EmployeeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Edit fields
  const [editFullName, setEditFullName] = useState('')
  const [editTabNumber, setEditTabNumber] = useState('')
  const [editPosition, setEditPosition] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editServiceId, setEditServiceId] = useState('')
  const [editRoleLevel, setEditRoleLevel] = useState('')
  const [editCategory, setEditCategory] = useState('')
  // Shift assignment fields
  const [editScheduleId, setEditScheduleId] = useState('')
  const [editShiftNum, setEditShiftNum] = useState<string>('')
  const [editIsDriver, setEditIsDriver] = useState(false)
  const [editRotationGroup, setEditRotationGroup] = useState('')
  const [editRefDate, setEditRefDate] = useState('')

  const load = async () => {
    setLoading(true)
    const [d, svcs, scheds] = await Promise.all([
      fetchEmployeeDetail(userId),
      fetchServices(),
      fetchSchedules(),
    ])
    setDetail(d)
    setServices(svcs)
    setSchedules(scheds)
    if (d) {
      setEditFullName(d.user.full_name)
      setEditTabNumber(d.user.tab_number ?? '')
      setEditPosition(d.user.position ?? '')
      setEditPhone(d.user.phone ?? '')
      setEditEmail(d.user.email ?? '')
      setEditServiceId(d.user.service_id ?? '')
      setEditRoleLevel(d.user.role_level ?? 'WORKER')
      setEditCategory(d.user.category ?? '')
      if (d.currentAssignment) {
        setEditScheduleId(d.currentAssignment.schedule_id)
        setEditShiftNum(d.currentAssignment.shift_num?.toString() ?? '')
        setEditIsDriver(d.currentAssignment.is_driver)
        setEditRotationGroup(d.currentAssignment.rotation_group ?? '')
        setEditRefDate(d.currentAssignment.shift_reference_date ?? '')
      }
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!detail) return
    setSaving(true)
    setSaveError(null)

    const { errorMsg } = await updateUser(userId, {
      full_name: editFullName.trim(),
      tab_number: editTabNumber.trim() || undefined,
      position: editPosition.trim() || undefined,
      phone: editPhone.trim() || undefined,
      email: editEmail.trim() || undefined,
      service_id: editServiceId || undefined,
      role_level: editRoleLevel as import('@/types').RoleLevel,
      category: (editCategory.trim() as 'ИТР' | 'рабочий' | null) || null,
    })

    if (errorMsg) {
      setSaveError(errorMsg)
      setSaving(false)
      return
    }

    // Update shift assignment if schedule selected
    if (editScheduleId) {
      const shiftNum = editShiftNum ? (parseInt(editShiftNum) as 1 | 2 | 3 | 4) : null
      const ok = await upsertEmployeeAssignment(
        userId,
        {
          schedule_id: editScheduleId,
          shift_num: shiftNum,
          rotation_group: editRotationGroup || null,
          shift_reference_date: editRefDate || null,
          is_driver: editIsDriver,
        },
        currentUserId
      )
      if (!ok) {
        setSaveError('Ошибка при сохранении графика')
        setSaving(false)
        return
      }
    }

    await load()
    setEditMode(false)
    setSaving(false)
  }

  const selectedSchedule = schedules.find(s => s.id === editScheduleId)
  const statusCfg = detail ? EMPLOYEE_STATUS_CONFIG[detail.currentStatus] : null

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="min-w-0">
            {loading ? (
              <div className="h-7 w-48 bg-white/10 rounded animate-pulse mb-2" />
            ) : (
              <>
                <h2 className="text-xl font-bold text-white leading-tight">
                  {detail?.user.full_name ?? '—'}
                </h2>
                {detail?.user.tab_number && (
                  <p className="text-xs text-white/40 mt-0.5">Таб. № {detail.user.tab_number}</p>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {statusCfg && !editMode && (
              <span
                className={`text-xs px-2.5 py-1 rounded-lg border ${statusCfg.bg}`}
                style={{ color: statusCfg.color }}
              >
                {statusCfg.label}
              </span>
            )}
            {canAdmin && !loading && (
              <button
                onClick={() => { setEditMode(!editMode); setSaveError(null) }}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                  editMode
                    ? 'bg-white/10 border-white/20 text-white/60'
                    : 'bg-blue-500/20 border-blue-500/30 text-blue-300 hover:bg-blue-500/30'
                }`}
              >
                {editMode ? 'Отмена' : '✏️ Изменить'}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white/80 text-xl leading-none transition-colors"
              aria-label="Закрыть"
            >
              ✕
            </button>
          </div>
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-5 bg-white/10 rounded animate-pulse" style={{ width: `${60 + i * 10}%` }} />
            ))}
          </div>
        )}

        {/* ── EDIT MODE ─────────────────────────────────────────────────── */}
        {!loading && detail && editMode && (
          <div className="space-y-4">
            <div className="text-xs text-white/40 uppercase tracking-widest mb-1">Основная информация</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <EditField label="ФИО" value={editFullName} onChange={setEditFullName} required />
              <EditField label="Табельный №" value={editTabNumber} onChange={setEditTabNumber} />
              <EditField label="Должность (текст)" value={editPosition} onChange={setEditPosition} colSpan />
              <EditField label="Телефон" value={editPhone} onChange={setEditPhone} />
              <EditField label="Email" value={editEmail} onChange={setEditEmail} />
              <div>
                <label className="block text-xs text-white/40 mb-1">Категория</label>
                <select
                  value={editCategory}
                  onChange={e => setEditCategory(e.target.value)}
                  className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                >
                  <option value="">—</option>
                  <option value="ИТР">ИТР</option>
                  <option value="рабочий">Рабочий</option>
                </select>
              </div>
            </div>

            {/* Service + Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/40 mb-1">Служба</label>
                <select
                  value={editServiceId}
                  onChange={e => setEditServiceId(e.target.value)}
                  className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                >
                  <option value="">— без службы —</option>
                  {services.map(s => (
                    <option key={s.service_id} value={s.service_id}>{s.service_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">Системная роль</label>
                <select
                  value={editRoleLevel}
                  onChange={e => setEditRoleLevel(e.target.value)}
                  className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                >
                  {ROLE_OPTIONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Shift assignment */}
            <div className="border-t border-white/10 pt-4">
              <div className="text-xs text-white/40 uppercase tracking-widest mb-3">График работы</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/40 mb-1">График</label>
                  <select
                    value={editScheduleId}
                    onChange={e => setEditScheduleId(e.target.value)}
                    className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                  >
                    <option value="">— не назначен —</option>
                    {schedules.map(s => (
                      <option key={s.id} value={s.id}>{s.code} · {s.name}</option>
                    ))}
                  </select>
                </div>
                {selectedSchedule?.is_shift_based && (
                  <div>
                    <label className="block text-xs text-white/40 mb-1">Смена (1–4)</label>
                    <select
                      value={editShiftNum}
                      onChange={e => setEditShiftNum(e.target.value)}
                      className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                    >
                      <option value="">—</option>
                      {[1, 2, 3, 4].map(n => <option key={n} value={n}>Смена {n}</option>)}
                    </select>
                  </div>
                )}
                {selectedSchedule && !selectedSchedule.is_shift_based && (
                  <div>
                    <label className="block text-xs text-white/40 mb-1">Опорная дата</label>
                    <input
                      type="date"
                      value={editRefDate}
                      onChange={e => setEditRefDate(e.target.value)}
                      className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                )}
              </div>
              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editIsDriver}
                  onChange={e => setEditIsDriver(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-500"
                />
                <span className="text-sm text-white/70">Является водителем (виден в транспортной панели)</span>
              </label>
            </div>

            {saveError && (
              <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {saveError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving || !editFullName.trim()}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium text-sm transition-all"
              >
                {saving ? 'Сохраняется...' : 'Сохранить изменения'}
              </button>
              <button
                onClick={() => { setEditMode(false); setSaveError(null) }}
                className="px-5 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-sm transition-all"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* ── VIEW MODE ─────────────────────────────────────────────────── */}
        {!loading && detail && !editMode && (
          <div className="space-y-4">
            {/* Contact row */}
            {(detail.user.phone || detail.user.email) && (
              <div className="flex flex-wrap gap-4 text-sm">
                {detail.user.phone && (
                  <span className="text-white/60"><span className="text-white/30 mr-1">Тел:</span>{detail.user.phone}</span>
                )}
                {detail.user.email && (
                  <span className="text-white/60"><span className="text-white/30 mr-1">Email:</span>{detail.user.email}</span>
                )}
              </div>
            )}

            {/* Profile grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {detail.user.position && (
                <div className="bg-white/5 rounded-lg p-3 col-span-2 sm:col-span-2">
                  <div className="text-xs text-white/30 mb-1">Должность</div>
                  <div className="text-white/80 font-medium">{detail.user.position}</div>
                </div>
              )}
              {detail.user.category && (
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-white/30 mb-1">Категория</div>
                  <div className="text-white/80 font-medium">{detail.user.category}</div>
                </div>
              )}
              {detail.currentPosition && (
                <div className="bg-white/5 rounded-lg p-3 col-span-2 sm:col-span-1">
                  <div className="text-xs text-white/30 mb-1">Профессия (классификатор)</div>
                  <div className="text-white/80 font-medium">
                    {detail.currentPosition.profession.name}
                    {detail.currentPosition.profession.grade && ` ${detail.currentPosition.profession.grade}`}
                  </div>
                </div>
              )}
              {detail.currentAssignment ? (
                <>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-white/30 mb-1">График</div>
                    <div className="text-white/80 font-medium">{detail.currentAssignment.schedule.code}</div>
                    <div className="text-xs text-white/40 mt-0.5">{detail.currentAssignment.schedule.name}</div>
                  </div>
                  {detail.currentAssignment.shift_num !== null && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-xs text-white/30 mb-1">Смена</div>
                      <div className="text-2xl font-bold text-blue-400">{detail.currentAssignment.shift_num}</div>
                    </div>
                  )}
                  {detail.currentAssignment.is_driver && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-xs text-white/30 mb-1">Водитель</div>
                      <div className="text-white/80">🚗 Да</div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 col-span-full">
                  <div className="text-xs text-amber-400/80">График не назначен — нажмите «Изменить» чтобы добавить</div>
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="flex flex-wrap gap-4 text-sm">
              <span><span className="text-white/30 mr-1">Принят:</span><span className="text-white/70">{formatDate(detail.user.date_hired)}</span></span>
              {detail.user.probation_end && (
                <span><span className="text-white/30 mr-1">Испыт. срок до:</span>
                  <span className={new Date(detail.user.probation_end) >= new Date() ? 'text-yellow-300' : 'text-white/40 line-through'}>
                    {formatDate(detail.user.probation_end)}
                  </span>
                </span>
              )}
            </div>

            {/* Disability */}
            {detail.user.is_disabled && (
              <div className="text-sm bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
                <span className="text-orange-400/80">
                  Группа {detail.user.disability_group}
                  {detail.user.disability_notes && `: ${detail.user.disability_notes}`}
                </span>
              </div>
            )}

            {/* Position history */}
            {detail.positionHistory.length > 0 && (
              <div>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors mb-2"
                >
                  <span className="text-xs">{showHistory ? '▲' : '▼'}</span>
                  История должностей ({detail.positionHistory.length})
                </button>
                {showHistory && (
                  <div className="space-y-1.5 ml-4">
                    {detail.positionHistory.map(pos => (
                      <div key={pos.id} className="text-xs text-white/50 flex gap-3">
                        <span className="text-white/30 shrink-0">{formatDate(pos.started_at)}</span>
                        <span>
                          {pos.profession.name}
                          {pos.profession.grade && ` ${pos.profession.grade}`}
                          {pos.change_reason && <span className="text-white/30"> · {pos.change_reason}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Recent requests */}
            {detail.recentRequests.length > 0 && (
              <div>
                <div className="text-xs text-white/30 mb-2 uppercase tracking-wider">Последние заявки</div>
                <div className="space-y-1">
                  {detail.recentRequests.map(ra => (
                    <div key={ra.id} className="text-xs text-white/50 flex gap-3">
                      <span className="text-white/30 shrink-0">{formatDate(ra.created_at)}</span>
                      <span className="font-mono">{ra.request_id}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin actions */}
            {canAdmin && (
              <div className="flex gap-3 pt-2 border-t border-white/10">
                <button
                  onClick={() => onDismiss(userId)}
                  className="flex-1 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 text-sm font-medium transition-colors"
                >
                  Уволить
                </button>
                <button
                  onClick={() => onTransfer(userId)}
                  className="flex-1 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 text-sm font-medium transition-colors"
                >
                  Перевести
                </button>
              </div>
            )}
          </div>
        )}

        {!loading && !detail && (
          <div className="text-center text-white/30 py-8">Сотрудник не найден</div>
        )}
      </div>
    </div>
  )
}

// ── Reusable text edit field ───────────────────────────────────────────────
function EditField({
  label, value, onChange, required, colSpan
}: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; colSpan?: boolean
}) {
  return (
    <div className={colSpan ? 'sm:col-span-2' : ''}>
      <label className="block text-xs text-white/40 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 placeholder-white/20"
      />
    </div>
  )
}
