'use client'
import { useState, useEffect } from 'react'
import { fetchProfessions, fetchSchedules, fetchServices, createEmployee } from '@/lib/api'
import type { Profession, Schedule, Service } from '@/types'

interface Props {
  currentUserId: string
  onClose: () => void
  onSuccess: () => void
}

export default function HireModal({ currentUserId, onClose, onSuccess }: Props) {
  const [professions, setProfessions] = useState<Profession[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [serviceId, setServiceId] = useState('')
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [tabNumber, setTabNumber] = useState('')
  const [professionId, setProfessionId] = useState('')
  const [category, setCategory] = useState<'ИТР' | 'рабочий'>('рабочий')
  const [scheduleId, setScheduleId] = useState('')
  const [shiftNum, setShiftNum] = useState<number | null>(null)
  const [phone, setPhone] = useState('')
  const [dateHired, setDateHired] = useState(new Date().toISOString().split('T')[0])
  const [probationStart, setProbationStart] = useState('')
  const [probationEnd, setProbationEnd] = useState('')

  useEffect(() => {
    Promise.all([fetchProfessions(), fetchSchedules(), fetchServices()]).then(([profs, scheds, svcs]) => {
      setProfessions(profs)
      setSchedules(scheds)
      setServices(svcs)
      if (profs.length > 0) setProfessionId(profs[0].id)
      if (scheds.length > 0) setScheduleId(scheds[0].id)
      // No default for serviceId — user must choose explicitly (shows placeholder)
      setLoadingOptions(false)
    })
  }, [])

  const selectedSchedule = schedules.find(s => s.id === scheduleId) ?? null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lastName.trim() || !firstName.trim() || !tabNumber.trim() || !professionId || !scheduleId || !serviceId) {
      setError('Заполните все обязательные поля')
      return
    }
    setSaving(true)
    setError(null)
    const fullName = [lastName.trim(), firstName.trim(), middleName.trim()].filter(Boolean).join(' ')
    const result = await createEmployee(
      {
        last_name: lastName.trim(),
        first_name: firstName.trim(),
        middle_name: middleName.trim(),
        full_name: fullName,
        tab_number: tabNumber.trim(),
        profession_id: professionId,
        category,
        schedule_id: scheduleId,
        shift_num: selectedSchedule?.is_shift_based ? shiftNum : null,
        phone: phone.trim() || null,
        date_hired: dateHired,
        probation_start: probationStart || null,
        probation_end: probationEnd || null,
        service_id: serviceId,
      },
      currentUserId
    )
    setSaving(false)
    if (!result) {
      setError('Не удалось создать сотрудника. Проверьте введённые данные.')
      return
    }
    onSuccess()
    onClose()
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/80 text-sm placeholder-white/20 focus:outline-none focus:border-teal-500/50"
  const labelClass = "block text-xs text-white/40 mb-1"

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-slate-800 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Нанять сотрудника</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 text-xl leading-none transition-colors">✕</button>
        </div>

        {loadingOptions ? (
          <div className="text-center text-white/30 py-8">Загрузка...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Фамилия *</label>
                <input className={inputClass} value={lastName} onChange={e => setLastName(e.target.value)} required />
              </div>
              <div>
                <label className={labelClass}>Имя *</label>
                <input className={inputClass} value={firstName} onChange={e => setFirstName(e.target.value)} required />
              </div>
              <div>
                <label className={labelClass}>Отчество</label>
                <input className={inputClass} value={middleName} onChange={e => setMiddleName(e.target.value)} />
              </div>
            </div>

            {/* Tab number */}
            <div>
              <label className={labelClass}>Табельный номер *</label>
              <input className={inputClass} value={tabNumber} onChange={e => setTabNumber(e.target.value)} required />
            </div>

            {/* Profession */}
            <div>
              <label className={labelClass}>Должность *</label>
              <select
                className={inputClass}
                value={professionId}
                onChange={e => setProfessionId(e.target.value)}
                required
              >
                {professions.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.grade ? ` ${p.grade}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Service — required */}
            <div>
              <label className={labelClass}>Служба *</label>
              <select
                className={inputClass}
                value={serviceId}
                onChange={e => setServiceId(e.target.value)}
                required
              >
                <option value="">— Выберите службу —</option>
                {services.map(s => (
                  <option key={s.service_id} value={s.service_id}>{s.service_name}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className={labelClass}>Категория</label>
              <div className="flex gap-4">
                {(['ИТР', 'рабочий'] as const).map(cat => (
                  <label key={cat} className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
                    <input
                      type="radio"
                      name="category"
                      value={cat}
                      checked={category === cat}
                      onChange={() => setCategory(cat)}
                      className="accent-teal-400"
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </div>

            {/* Schedule */}
            <div>
              <label className={labelClass}>График работы *</label>
              <select
                className={inputClass}
                value={scheduleId}
                onChange={e => setScheduleId(e.target.value)}
                required
              >
                {schedules.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Shift number — only for shift-based schedules */}
            {selectedSchedule?.is_shift_based && (
              <div>
                <label className={labelClass}>Номер смены (1–4)</label>
                <input
                  type="number"
                  min={1}
                  max={4}
                  className={inputClass}
                  value={shiftNum ?? ''}
                  onChange={e => setShiftNum(e.target.value ? Number(e.target.value) : null)}
                />
              </div>
            )}

            {/* Phone */}
            <div>
              <label className={labelClass}>Телефон</label>
              <input className={inputClass} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7..." />
            </div>

            {/* Hire date */}
            <div>
              <label className={labelClass}>Дата приёма *</label>
              <input
                type="date"
                className={inputClass}
                value={dateHired}
                onChange={e => setDateHired(e.target.value)}
                required
              />
            </div>

            {/* Probation */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Начало испытательного срока</label>
                <input type="date" className={inputClass} value={probationStart} onChange={e => setProbationStart(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Конец испытательного срока</label>
                <input type="date" className={inputClass} value={probationEnd} onChange={e => setProbationEnd(e.target.value)} />
              </div>
            </div>

            {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 text-sm transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2 rounded-lg bg-teal-500/20 border border-teal-500/30 text-teal-400 hover:bg-teal-500/30 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Сохранение...' : 'Нанять'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
