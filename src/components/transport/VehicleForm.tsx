'use client'
import { useState } from 'react'
import type { Vehicle, VehicleType, VehicleStatus, User } from '@/types'
import { VEHICLE_TYPE_CONFIG } from '@/types'
import { createVehicle, updateVehicle } from '@/lib/api'

interface Props {
  vehicle?: Vehicle           // when editing; undefined = create mode
  drivers: User[]             // list of users who are drivers (for assigned_driver dropdown)
  onSave: () => void
  onClose: () => void
}

const EMPTY: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'> = {
  name: '',
  plate: '',
  vehicle_type: 'TRUCK',
  status: 'ACTIVE',
  breakdown_details: null,
  maintenance_until: null,
  status_changed_at: null,
  notes: null,
  is_active: true,
  fleet_number: null,
  make: null,
  model: null,
  year: null,
  payload_kg: null,
  seats: null,
  max_height_m: null,
  has_water_tank: false,
  garage_location: null,
  assigned_driver_id: null,
}

export default function VehicleForm({ vehicle, drivers, onSave, onClose }: Props) {
  const isEdit = !!vehicle

  const [form, setForm] = useState({
    name:               vehicle?.name ?? '',
    plate:              vehicle?.plate ?? '',
    vehicle_type:       (vehicle?.vehicle_type ?? 'TRUCK') as VehicleType,
    fleet_number:       vehicle?.fleet_number ?? '',
    make:               vehicle?.make ?? '',
    model:              vehicle?.model ?? '',
    year:               vehicle?.year?.toString() ?? '',
    payload_kg:         vehicle?.payload_kg?.toString() ?? '',
    seats:              vehicle?.seats?.toString() ?? '',
    max_height_m:       vehicle?.max_height_m?.toString() ?? '',
    has_water_tank:     vehicle?.has_water_tank ?? false,
    garage_location:    vehicle?.garage_location ?? '',
    assigned_driver_id: vehicle?.assigned_driver_id ?? '',
    notes:              vehicle?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const set = (field: string, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    if (!form.name.trim() || !form.plate.trim()) {
      setError('Название и гос. номер обязательны')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload: Partial<Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>> = {
        ...EMPTY,
        name:               form.name.trim(),
        plate:              form.plate.trim().toUpperCase(),
        vehicle_type:       form.vehicle_type,
        fleet_number:       form.fleet_number.trim() || null,
        make:               form.make.trim() || null,
        model:              form.model.trim() || null,
        year:               form.year ? parseInt(form.year) : null,
        payload_kg:         form.payload_kg ? parseInt(form.payload_kg) : null,
        seats:              form.seats ? parseInt(form.seats) : null,
        max_height_m:       form.max_height_m ? parseFloat(form.max_height_m) : null,
        has_water_tank:     form.has_water_tank,
        garage_location:    form.garage_location.trim() || null,
        assigned_driver_id: form.assigned_driver_id || null,
        notes:              form.notes.trim() || null,
      }
      if (isEdit) {
        await updateVehicle(vehicle!.id, payload)
      } else {
        await createVehicle(payload as Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>)
      }
      onSave()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const showSeats    = ['CAR', 'BUS'].includes(form.vehicle_type)
  const showHeight   = form.vehicle_type === 'AERIAL'
  const showPayload  = ['TRUCK', 'TRACTOR', 'LOADER', 'SPECIAL'].includes(form.vehicle_type)

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="glass rounded-2xl p-6 w-full max-w-lg my-4">
        <h2 className="text-white font-semibold text-lg mb-4">
          {isEdit ? 'Редактировать ТС' : 'Добавить транспортное средство'}
        </h2>

        {/* Type selector */}
        <div className="mb-4">
          <label className="text-xs text-white/40 mb-2 block">Тип ТС</label>
          <div className="grid grid-cols-4 gap-1.5">
            {(Object.keys(VEHICLE_TYPE_CONFIG) as VehicleType[]).map(t => {
              const cfg = VEHICLE_TYPE_CONFIG[t]
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('vehicle_type', t)}
                  className={`py-2 px-1 rounded-lg text-center text-xs transition-all border ${
                    form.vehicle_type === t
                      ? 'bg-blue-600/30 border-blue-500/50 text-white'
                      : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                  }`}
                >
                  <div className="text-lg mb-0.5">{cfg.emoji}</div>
                  <div className="leading-tight">{cfg.label}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Name + Plate */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-white/40 mb-1 block">Название *</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="КАМАЗ-5511"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Гос. номер *</label>
            <input
              value={form.plate}
              onChange={e => set('plate', e.target.value)}
              placeholder="А123БВ77"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
            />
          </div>
        </div>

        {/* Fleet number + Garage */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-white/40 mb-1 block">Гаражный номер</label>
            <input
              value={form.fleet_number}
              onChange={e => set('fleet_number', e.target.value)}
              placeholder="№ 07"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Место стоянки</label>
            <input
              value={form.garage_location}
              onChange={e => set('garage_location', e.target.value)}
              placeholder="Бокс №3"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
            />
          </div>
        </div>

        {/* Make + Model + Year */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-xs text-white/40 mb-1 block">Марка</label>
            <input
              value={form.make}
              onChange={e => set('make', e.target.value)}
              placeholder="КАМАЗ"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Модель</label>
            <input
              value={form.model}
              onChange={e => set('model', e.target.value)}
              placeholder="5511"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Год</label>
            <input
              type="number"
              value={form.year}
              onChange={e => set('year', e.target.value)}
              placeholder="2018"
              min={1970}
              max={new Date().getFullYear()}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
            />
          </div>
        </div>

        {/* Type-specific fields */}
        {(showPayload || showSeats || showHeight) && (
          <div className="grid grid-cols-2 gap-3 mb-3">
            {showPayload && (
              <div>
                <label className="text-xs text-white/40 mb-1 block">Грузоподъёмность (кг)</label>
                <input
                  type="number"
                  value={form.payload_kg}
                  onChange={e => set('payload_kg', e.target.value)}
                  placeholder="10000"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
                />
              </div>
            )}
            {showSeats && (
              <div>
                <label className="text-xs text-white/40 mb-1 block">Кол-во мест</label>
                <input
                  type="number"
                  value={form.seats}
                  onChange={e => set('seats', e.target.value)}
                  placeholder="8"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
                />
              </div>
            )}
            {showHeight && (
              <div>
                <label className="text-xs text-white/40 mb-1 block">Высота подъёма (м)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.max_height_m}
                  onChange={e => set('max_height_m', e.target.value)}
                  placeholder="12.5"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
                />
              </div>
            )}
          </div>
        )}

        {/* Water tank checkbox (WASHER) */}
        {form.vehicle_type === 'WASHER' && (
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.has_water_tank}
              onChange={e => set('has_water_tank', e.target.checked)}
              className="w-4 h-4 accent-blue-500"
            />
            <span className="text-sm text-white/60">Наличие цистерны для воды</span>
          </label>
        )}

        {/* Assigned driver */}
        <div className="mb-3">
          <label className="text-xs text-white/40 mb-1 block">Закреплённый водитель</label>
          <select
            value={form.assigned_driver_id}
            onChange={e => set('assigned_driver_id', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
          >
            <option value="">— не закреплён —</option>
            {drivers.map(d => (
              <option key={d.user_id} value={d.user_id}>
                {d.full_name} {d.tab_number ? `(таб. ${d.tab_number})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label className="text-xs text-white/40 mb-1 block">Комментарий</label>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Дополнительная информация…"
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30 resize-none"
          />
        </div>

        {error && (
          <div className="mb-3 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-white/5 text-white/50 text-sm">
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-40"
          >
            {saving ? 'Сохранение…' : isEdit ? 'Сохранить изменения' : 'Добавить ТС'}
          </button>
        </div>
      </div>
    </div>
  )
}
