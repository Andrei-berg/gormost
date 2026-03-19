'use client'
import { useState, useEffect, useCallback } from 'react'
import type { UserWithAssignment, ShiftPhase, AuthSession } from '@/types'
import { fetchAllShiftPhases, openShiftPhase, closeShiftPhase, deleteShiftPhase } from '@/lib/api'
import { isPhaseSchedule } from '@/lib/shifts'

interface Props {
  users: UserWithAssignment[]
  session: AuthSession
  onRefresh: () => void
}

const PHASE_LABEL: Record<'day' | 'night', string> = { day: 'ДЕНЬ', night: 'НОЧЬ' }
const PHASE_COLOR: Record<'day' | 'night', string> = {
  day:   'bg-amber-500/20 text-amber-300 border-amber-500/30',
  night: 'bg-blue-500/20  text-blue-300  border-blue-500/30',
}

export default function ShiftPhaseManager({ users, session, onRefresh }: Props) {
  const [allPhases, setAllPhases] = useState<ShiftPhase[]>([])
  const [loading, setLoading] = useState(false)
  const [openFormFor, setOpenFormFor] = useState<string | null>(null)
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null)
  const [filterCode, setFilterCode] = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true)
    const phases = await fetchAllShiftPhases()
    setAllPhases(phases)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Only show employees with cyclic schedules that need phases
  const cyclicUsers = users.filter(u => {
    const code = u.assignment?.schedule_code ?? ''
    return isPhaseSchedule(code) && (!filterCode || code === filterCode)
  })

  // Build phase map: employee_id → all phases sorted newest first
  const phasesByEmployee = new Map<string, ShiftPhase[]>()
  for (const p of allPhases) {
    const arr = phasesByEmployee.get(p.employee_id) ?? []
    arr.push(p)
    phasesByEmployee.set(p.employee_id, arr)
  }

  const today = new Date().toISOString().split('T')[0]

  const handleDelete = async (phase: ShiftPhase) => {
    if (!confirm('Удалить запись о фазе?')) return
    await deleteShiftPhase(phase.id, session.user_id)
    await load()
    onRefresh()
  }

  const handleClose = async (phase: ShiftPhase) => {
    const closeTo = prompt('Закрыть фазу. Введите дату окончания (YYYY-MM-DD):', today)
    if (!closeTo) return
    await closeShiftPhase(phase.id, closeTo, session.user_id)
    await load()
    onRefresh()
  }

  const uniqueCodes = [...new Set(
    users
      .map(u => u.assignment?.schedule_code ?? '')
      .filter(isPhaseSchedule)
  )].sort()

  return (
    <div className="space-y-4">
      {/* Header + filter */}
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-bold text-white">Фазы смен (Вариант 2)</h3>
        <span className="text-xs text-white/30">— явные записи день/ночь для водителей и вахтовых</span>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={filterCode}
            onChange={e => setFilterCode(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/70 focus:outline-none"
          >
            <option value="">Все графики</option>
            {uniqueCodes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={() => { load(); onRefresh() }}
            className="px-2 py-1 text-xs bg-white/5 rounded-lg text-white/40 hover:bg-white/10"
          >
            ↻
          </button>
        </div>
      </div>

      {loading && <div className="text-xs text-white/30 py-4 text-center">Загрузка...</div>}

      {cyclicUsers.length === 0 && !loading && (
        <div className="glass rounded-xl p-6 text-center text-white/20 text-sm">
          Нет сотрудников с циклическими графиками (2/2, 3/3, 6/6, 15/15)
        </div>
      )}

      <div className="space-y-2">
        {cyclicUsers.map(u => {
          const phases = phasesByEmployee.get(u.user_id) ?? []
          const activePhase = phases.find(p => !p.valid_to || p.valid_to >= today)
          const isExpanded = expandedEmployee === u.user_id
          const isFormOpen = openFormFor === u.user_id

          return (
            <div key={u.user_id} className="glass rounded-xl border border-white/10 overflow-hidden">
              {/* Employee row */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-white/90 font-medium">{u.full_name}</span>
                  <span className="ml-2 text-xs text-white/30">{u.assignment?.schedule_code}</span>
                </div>

                {/* Active phase badge */}
                {activePhase ? (
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${PHASE_COLOR[activePhase.phase]}`}>
                    {PHASE_LABEL[activePhase.phase]}
                    <span className="font-normal ml-1 opacity-60">с {activePhase.valid_from}</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-white/20 px-2 py-0.5 rounded-full border border-white/10">
                    нет фазы
                  </span>
                )}

                {/* Actions */}
                <button
                  onClick={() => setOpenFormFor(isFormOpen ? null : u.user_id)}
                  className="px-2 py-1 rounded bg-blue-600/70 hover:bg-blue-600 text-white text-xs transition-colors"
                >
                  + фаза
                </button>
                {phases.length > 0 && (
                  <button
                    onClick={() => setExpandedEmployee(isExpanded ? null : u.user_id)}
                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/40 text-xs transition-colors"
                  >
                    {isExpanded ? '▲' : `▼ ${phases.length}`}
                  </button>
                )}
              </div>

              {/* New phase form */}
              {isFormOpen && (
                <NewPhaseForm
                  user={u}
                  session={session}
                  onSaved={() => { setOpenFormFor(null); load(); onRefresh() }}
                  onCancel={() => setOpenFormFor(null)}
                />
              )}

              {/* Phase history */}
              {isExpanded && phases.length > 0 && (
                <div className="border-t border-white/5">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-white/30 border-b border-white/5">
                        <th className="px-4 py-1.5 text-left">Фаза</th>
                        <th className="px-4 py-1.5 text-left">Период</th>
                        <th className="px-4 py-1.5 text-left">Якорь</th>
                        <th className="px-4 py-1.5 text-left">График</th>
                        <th className="px-4 py-1.5 text-left">Заметки</th>
                        <th className="px-4 py-1.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {phases.map(p => (
                        <tr key={p.id} className="border-b border-white/5 hover:bg-white/3">
                          <td className="px-4 py-1.5">
                            <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${PHASE_COLOR[p.phase]}`}>
                              {PHASE_LABEL[p.phase]}
                            </span>
                          </td>
                          <td className="px-4 py-1.5 text-white/60">
                            {p.valid_from} → {p.valid_to ?? <span className="text-green-400">сейчас</span>}
                          </td>
                          <td className="px-4 py-1.5 text-white/40">{p.anchor_date}</td>
                          <td className="px-4 py-1.5 text-white/40">{p.schedule_code}</td>
                          <td className="px-4 py-1.5 text-white/30 max-w-[120px] truncate">{p.notes ?? '—'}</td>
                          <td className="px-4 py-1.5">
                            <div className="flex gap-1">
                              {!p.valid_to && (
                                <button
                                  onClick={() => handleClose(p)}
                                  className="text-white/30 hover:text-white/60 text-[10px] px-1"
                                  title="Закрыть фазу"
                                >
                                  закрыть
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(p)}
                                className="text-red-400/40 hover:text-red-400 text-[10px] px-1"
                                title="Удалить запись"
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---- New Phase Form ----

function NewPhaseForm({
  user,
  session,
  onSaved,
  onCancel,
}: {
  user: UserWithAssignment
  session: AuthSession
  onSaved: () => void
  onCancel: () => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [phase, setPhase] = useState<'day' | 'night'>('day')
  const [validFrom, setValidFrom] = useState(today)
  const [anchorDate, setAnchorDate] = useState(today)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scheduleCode = user.assignment?.schedule_code ?? ''
  const is1515 = scheduleCode === '15/15'
  const [isAlternating, setIsAlternating] = useState(false)

  const handleSave = async () => {
    if (!validFrom) { setError('Укажите дату начала фазы'); return }
    if (!is1515 && anchorDate > validFrom) { setError('Якорная дата не может быть позже начала фазы'); return }
    setSaving(true); setError(null)
    const result = await openShiftPhase(
      user.user_id,
      {
        phase,
        anchor_date: is1515 ? validFrom : anchorDate,
        valid_from: validFrom,
        schedule_code: scheduleCode,
        is_alternating: is1515 ? isAlternating : false,
        notes: notes || undefined,
      },
      session.user_id
    )
    setSaving(false)
    if (result.ok) onSaved()
    else setError(`Ошибка: ${result.error ?? 'см. консоль'}`)
  }

  const inp = 'bg-gray-900 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500/50 w-full'

  return (
    <div className="border-t border-blue-500/20 bg-blue-500/5 px-4 py-3 space-y-3">
      <div className="text-xs text-blue-300/70 font-medium">Новая фаза для {user.full_name}</div>

      <div className={`grid gap-3 ${is1515 ? 'grid-cols-3' : 'grid-cols-4'}`}>
        <div>
          <label className="block text-[10px] text-white/30 mb-1">{is1515 && isAlternating ? 'Стартовая фаза' : 'Фаза'}</label>
          <div className="flex gap-1">
            {(['day', 'night'] as const).map(p => (
              <button key={p} onClick={() => setPhase(p)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${phase === p ? PHASE_COLOR[p] : 'bg-white/5 border-white/10 text-white/30'}`}>
                {PHASE_LABEL[p]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[10px] text-white/30 mb-1">Начало фазы</label>
          <input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} className={inp} />
        </div>
        {!is1515 && (
          <div>
            <label className="block text-[10px] text-white/30 mb-1">Якорная дата <span className="text-white/20">(1-й рабочий день)</span></label>
            <input type="date" value={anchorDate} onChange={e => setAnchorDate(e.target.value)} className={inp} />
          </div>
        )}
        <div>
          <label className="block text-[10px] text-white/30 mb-1">Заметки</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="необязательно" className={inp} />
        </div>
      </div>

      {is1515 && (
        <div className={`rounded-xl px-3 py-2.5 border ${isAlternating ? 'border-amber-500/30 bg-amber-500/10' : 'border-white/10 bg-white/5'}`}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isAlternating} onChange={e => setIsAlternating(e.target.checked)} className="accent-amber-500" />
            <span className="text-xs text-white/70 font-medium">Чередовать фазы каждый месяц</span>
          </label>
          <div className="mt-1 text-[10px] text-white/40">
            {isAlternating
              ? `${validFrom.slice(0,7)}: ${PHASE_LABEL[phase]} → следующий месяц: ${PHASE_LABEL[phase === 'day' ? 'night' : 'day']} → и т.д. Одна запись на весь период.`
              : `Фиксированная фаза «${PHASE_LABEL[phase]}» — одна и та же каждую вахту`}
          </div>
        </div>
      )}

      {error && <div className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</div>}

      <div className="flex gap-2">
        <button disabled={saving} onClick={handleSave}
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium transition-colors">
          {saving ? 'Сохраняю...' : 'Сохранить фазу'}
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs">Отмена</button>
      </div>
    </div>
  )
}
