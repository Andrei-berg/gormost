'use client'
import { useState } from 'react'
import type { WorkPlan, AuthSession, ShiftType } from '@/types'
import { createWorkPlan } from '@/lib/api'

interface SlotOption {
  date: string
  shift: ShiftType
  label: string
}

function getPlanOptions(existing: WorkPlan[]): SlotOption[] {
  const taken = new Set(existing.map(p => `${p.plan_date}_${p.shift_type}`))
  const options: SlotOption[] = []
  const today = new Date()
  const dow = today.getDay() // 0=Sun, 5=Fri

  const add = (offset: number, shift: ShiftType) => {
    const d = new Date(today)
    d.setDate(d.getDate() + offset)
    const dateStr = d.toISOString().split('T')[0]
    const key = `${dateStr}_${shift}`
    if (taken.has(key)) return
    const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
    const dd = d.getDate().toString().padStart(2, '0')
    const mm = (d.getMonth() + 1).toString().padStart(2, '0')
    const shiftLabel = shift === 'DAY' ? '☀️ День · 07:30–19:00' : '🌙 Ночь · 21:00–07:00'
    options.push({ date: dateStr, shift, label: `${dayNames[d.getDay()]} ${dd}.${mm} · ${shiftLabel}` })
  }

  add(0, 'NIGHT')
  add(1, 'DAY')
  add(1, 'NIGHT')

  // Friday → also plan for Saturday and Sunday
  if (dow === 5) {
    add(2, 'DAY'); add(2, 'NIGHT')
    add(3, 'DAY'); add(3, 'NIGHT')
  }

  return options
}

interface Props {
  session: AuthSession
  existingPlans: WorkPlan[]
  onClose: () => void
  onSaved: () => void
}

export default function CreatePlanModal({ session, existingPlans, onClose, onSaved }: Props) {
  const options = getPlanOptions(existingPlans)
  const [selected, setSelected] = useState(options[0] ? `${options[0].date}_${options[0].shift}` : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!selected) return
    if (!session.service_id) {
      setError('У вашего аккаунта не указана служба. Назначьте службу в Админ-панели.')
      return
    }
    setError(null)
    const [date, shift] = selected.split('_') as [string, ShiftType]
    setSaving(true)
    try {
      await createWorkPlan({ service_id: session.service_id, plan_date: date, shift_type: shift }, session.user_id)
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка при создании плана')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="glass rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-white mb-4">Новый план работ</h2>

        {options.length === 0 ? (
          <div className="text-center text-white/40 py-8 text-sm">
            Все ближайшие смены уже запланированы
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-6">
              {options.map(opt => {
                const key = `${opt.date}_${opt.shift}`
                return (
                  <label
                    key={key}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-colors ${
                      selected === key
                        ? 'bg-blue-500/20 border-blue-500/40 text-white'
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    <input type="radio" name="slot" value={key} checked={selected === key} onChange={() => setSelected(key)} className="sr-only" />
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selected === key ? 'border-blue-400' : 'border-white/20'}`}>
                      {selected === key && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                    </div>
                    <span className="text-sm">{opt.label}</span>
                  </label>
                )
              })}
            </div>
            {error && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleCreate}
                disabled={!selected || saving}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium text-sm"
              >
                {saving ? 'Создаётся...' : 'Создать план'}
              </button>
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 text-sm">
                Отмена
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
