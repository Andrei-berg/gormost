'use client'
import { useState } from 'react'
import type { Vehicle, VehicleType, User } from '@/types'
import { VEHICLE_TYPE_CONFIG, VEHICLE_STATUS_CONFIG } from '@/types'
import { createVehicle, updateVehicle } from '@/lib/api-client'

interface Props {
  vehicle?: Vehicle
  drivers: User[]
  onSave: () => void
  onClose: () => void
}

// Units from fleet inventory — used as datalist suggestions
const UNIT_SUGGESTIONS = [
  'Лефортово', 'АВР', 'АУП', 'Внуково', 'Восток',
  'Зеленоград', 'МРВУ', 'Новые территории', 'Переходы.Тоннели',
  'Ремонт домов', 'Север', 'СЭК', 'Техцентр', 'ТиНАО',
  'Тоннели', 'ТСБ', 'Фонтаны', 'Юг', '7 Участок', '15 Участок',
]

const DEPLOYMENT_SUGGESTIONS = ['Валдай', 'Курск', 'Луганск']

const EMPTY = {
  name: '', plate: '', vehicle_type: 'KMU' as VehicleType,
  fleet_number: '', make: '', model: '', year: '',
  chassis: '', equipment_specs: '',
  payload_kg: '', seats: '', max_height_m: '',
  has_water_tank: false,
  unit: '', garage_location: '', current_location: '', deployment: '',
  assigned_driver_id: '', notes: '',
}

// Section header component
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[10px] font-semibold tracking-widest text-white/30 uppercase">{title}</span>
      <div className="flex-1 h-px bg-white/5" />
    </div>
  )
}

// Field wrapper
function Field({ label, children, half }: { label: string; children: React.ReactNode; half?: boolean }) {
  return (
    <div className={half ? '' : ''}>
      <label className="block text-[11px] text-white/35 mb-1">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-white/20'

export default function VehicleForm({ vehicle, drivers, onSave, onClose }: Props) {
  const isEdit = !!vehicle

  const [form, setForm] = useState({
    ...EMPTY,
    name:               vehicle?.name ?? '',
    plate:              vehicle?.plate ?? '',
    vehicle_type:       (vehicle?.vehicle_type ?? 'KMU') as VehicleType,
    fleet_number:       vehicle?.fleet_number ?? '',
    make:               vehicle?.make ?? '',
    model:              vehicle?.model ?? '',
    year:               vehicle?.year?.toString() ?? '',
    chassis:            vehicle?.chassis ?? '',
    equipment_specs:    vehicle?.equipment_specs ?? '',
    payload_kg:         vehicle?.payload_kg?.toString() ?? '',
    seats:              vehicle?.seats?.toString() ?? '',
    max_height_m:       vehicle?.max_height_m?.toString() ?? '',
    has_water_tank:     vehicle?.has_water_tank ?? false,
    unit:               vehicle?.unit ?? '',
    garage_location:    vehicle?.garage_location ?? '',
    current_location:   vehicle?.current_location ?? '',
    deployment:         vehicle?.deployment ?? '',
    assigned_driver_id: vehicle?.assigned_driver_id ?? '',
    notes:              vehicle?.notes ?? '',
  })

  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const set = (field: string, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    if (!form.name.trim() || !form.plate.trim()) {
      setError('Заполните название и гос. номер')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name:               form.name.trim(),
        plate:              form.plate.trim().toUpperCase(),
        vehicle_type:       form.vehicle_type,
        fleet_number:       form.fleet_number.trim() || null,
        make:               form.make.trim() || null,
        model:              form.model.trim() || null,
        year:               form.year ? parseInt(form.year) : null,
        chassis:            form.chassis.trim() || null,
        equipment_specs:    form.equipment_specs.trim() || null,
        payload_kg:         form.payload_kg ? parseInt(form.payload_kg) : null,
        seats:              form.seats ? parseInt(form.seats) : null,
        max_height_m:       form.max_height_m ? parseFloat(form.max_height_m) : null,
        has_water_tank:     form.has_water_tank,
        unit:               form.unit.trim() || null,
        garage_location:    form.garage_location.trim() || null,
        current_location:   form.current_location.trim() || null,
        deployment:         form.deployment.trim() || null,
        assigned_driver_id: form.assigned_driver_id || null,
        notes:              form.notes.trim() || null,
      }
      if (isEdit) {
        await updateVehicle(vehicle!.id, payload)
      } else {
        await createVehicle({ ...payload, status: 'ACTIVE', breakdown_details: null, maintenance_until: null, status_changed_at: null, is_active: true })
      }
      onSave()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const cfg = VEHICLE_TYPE_CONFIG[form.vehicle_type]

  const showPayload   = ['TRUCK', 'TRACTOR', 'LOADER', 'SPECIAL', 'KMU', 'CRANE'].includes(form.vehicle_type)
  const showSeats     = ['CAR', 'BUS'].includes(form.vehicle_type)
  const showHeight    = ['AERIAL', 'KMU', 'CRANE'].includes(form.vehicle_type)
  const showEquipment = ['AERIAL', 'KMU', 'CRANE', 'SPECIAL', 'WASHER'].includes(form.vehicle_type)
  const showWater     = form.vehicle_type === 'WASHER'

  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-start justify-center z-50 p-4 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="glass rounded-2xl w-full max-w-xl my-6 overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-white/5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl">
                {cfg.emoji}
              </div>
              <div>
                <h2 className="text-white font-semibold text-base leading-tight">
                  {isEdit
                    ? (vehicle!.name || 'Транспортное средство')
                    : 'Новое транспортное средство'
                  }
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-white/40 font-mono">
                    {isEdit ? vehicle!.plate : cfg.label}
                  </span>
                  {isEdit && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${VEHICLE_STATUS_CONFIG[vehicle!.status].bg}`}
                      style={{ color: VEHICLE_STATUS_CONFIG[vehicle!.status].color }}>
                      {VEHICLE_STATUS_CONFIG[vehicle!.status].label}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white/60 text-xl leading-none mt-1">×</button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Type selector */}
          <div>
            <SectionHeader title="Тип ТС" />
            <div className="grid grid-cols-5 gap-1.5">
              {(Object.entries(VEHICLE_TYPE_CONFIG) as [VehicleType, typeof VEHICLE_TYPE_CONFIG[VehicleType]][]).map(([t, c]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('vehicle_type', t)}
                  className={`py-2 px-1 rounded-xl text-center text-xs transition-all border ${
                    form.vehicle_type === t
                      ? 'bg-blue-600/30 border-blue-500/50 text-white shadow-sm'
                      : 'bg-white/5 border-white/8 text-white/40 hover:bg-white/10 hover:text-white/60'
                  }`}
                >
                  <div className="text-base mb-0.5">{c.emoji}</div>
                  <div className="leading-tight text-[10px]">{c.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Identity */}
          <div>
            <SectionHeader title="Идентификация" />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Название *">
                <input value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="КАМАЗ 65115-50" className={inputCls} />
              </Field>
              <Field label="Гос. номер *">
                <input value={form.plate} onChange={e => set('plate', e.target.value)}
                  placeholder="Т 533 РР 799" className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Гаражный номер">
                <input value={form.fleet_number} onChange={e => set('fleet_number', e.target.value)}
                  placeholder="№ 07" className={inputCls} />
              </Field>
              <Field label="Год выпуска">
                <input type="number" value={form.year} onChange={e => set('year', e.target.value)}
                  placeholder="2022" min={1970} max={new Date().getFullYear()} className={inputCls} />
              </Field>
            </div>
          </div>

          {/* Technical */}
          <div>
            <SectionHeader title="Характеристики" />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Марка">
                <input value={form.make} onChange={e => set('make', e.target.value)}
                  placeholder="КАМАЗ" className={inputCls} />
              </Field>
              <Field label="Модель / Серия">
                <input value={form.model} onChange={e => set('model', e.target.value)}
                  placeholder="65115-50" className={inputCls} />
              </Field>
            </div>
            <div className="mb-3">
              <Field label="Базовое шасси">
                <input value={form.chassis} onChange={e => set('chassis', e.target.value)}
                  placeholder="КАМАЗ 65115, ГАЗ C42R33, ГАЗ 330230…" className={inputCls} />
              </Field>
            </div>
            {showEquipment && (
              <div className="mb-3">
                <Field label="Оснащение / Комплектация">
                  <input value={form.equipment_specs} onChange={e => set('equipment_specs', e.target.value)}
                    placeholder="АГП-14Р (14м), Телескопический (54м), КМУ Palfinger…" className={inputCls} />
                </Field>
              </div>
            )}
            {(showPayload || showSeats || showHeight) && (
              <div className="grid grid-cols-2 gap-3">
                {showPayload && (
                  <Field label="Грузоподъёмность (кг)">
                    <input type="number" value={form.payload_kg} onChange={e => set('payload_kg', e.target.value)}
                      placeholder="10 000" className={inputCls} />
                  </Field>
                )}
                {showHeight && (
                  <Field label="Высота подъёма (м)">
                    <input type="number" step="0.5" value={form.max_height_m} onChange={e => set('max_height_m', e.target.value)}
                      placeholder="22" className={inputCls} />
                  </Field>
                )}
                {showSeats && (
                  <Field label="Количество мест">
                    <input type="number" value={form.seats} onChange={e => set('seats', e.target.value)}
                      placeholder="8" className={inputCls} />
                  </Field>
                )}
              </div>
            )}
            {showWater && (
              <label className="flex items-center gap-2.5 mt-3 cursor-pointer group">
                <input type="checkbox" checked={form.has_water_tank}
                  onChange={e => set('has_water_tank', e.target.checked)}
                  className="w-4 h-4 accent-blue-500" />
                <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors">Наличие цистерны для воды</span>
              </label>
            )}
          </div>

          {/* Location */}
          <div>
            <SectionHeader title="Дислокация" />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Участок">
                <>
                  <input value={form.unit} onChange={e => set('unit', e.target.value)}
                    placeholder="Лефортово" list="unit-list" className={inputCls} />
                  <datalist id="unit-list">
                    {UNIT_SUGGESTIONS.map(u => <option key={u} value={u} />)}
                  </datalist>
                </>
              </Field>
              <Field label="Место стоянки (бокс)">
                <input value={form.garage_location} onChange={e => set('garage_location', e.target.value)}
                  placeholder="Бокс №3" className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Место нахождения">
                <input value={form.current_location} onChange={e => set('current_location', e.target.value)}
                  placeholder="на участке, ДТП, Элефант Люберцы…" className={inputCls} />
              </Field>
              <Field label="Командировка">
                <>
                  <input value={form.deployment} onChange={e => set('deployment', e.target.value)}
                    placeholder="Валдай, Курск, Луганск…" list="deploy-list" className={inputCls} />
                  <datalist id="deploy-list">
                    {DEPLOYMENT_SUGGESTIONS.map(d => <option key={d} value={d} />)}
                  </datalist>
                </>
              </Field>
            </div>
          </div>

          {/* Driver */}
          <div>
            <SectionHeader title="Водитель" />
            <Field label="Закреплённый водитель">
              <select value={form.assigned_driver_id} onChange={e => set('assigned_driver_id', e.target.value)}
                className={inputCls}>
                <option value="">— не закреплён —</option>
                {drivers.map(d => (
                  <option key={d.user_id} value={d.user_id}>
                    {d.full_name}{d.tab_number ? ` (таб. ${d.tab_number})` : ''}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* Notes */}
          <div>
            <SectionHeader title="Примечание" />
            <Field label="">
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                placeholder="Дополнительная информация…"
                rows={2}
                className={`${inputCls} resize-none`} />
            </Field>
          </div>

          {/* Error */}
          {error && (
            <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/50 text-sm hover:bg-white/10 transition-colors">
              Отмена
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-40">
              {saving ? 'Сохранение…' : isEdit ? 'Сохранить изменения' : 'Добавить ТС'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
