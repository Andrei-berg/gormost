'use client'
import { useState } from 'react'
import type { Vehicle, VehicleStatus } from '@/types'
import { VEHICLE_STATUS_CONFIG } from '@/types'
import VehicleNumberBadge from '@/components/VehicleNumberBadge'

interface Props {
  vehicle: Vehicle
  onSave: (status: VehicleStatus, breakdown: string | null, maintenanceUntil: string | null) => Promise<void>
  onClose: () => void
}

export default function VehicleStatusModal({ vehicle, onSave, onClose }: Props) {
  const [status, setStatus] = useState<VehicleStatus>(vehicle.status)
  const [breakdown, setBreakdown] = useState(vehicle.breakdown_details || '')
  const [maintenanceUntil, setMaintenanceUntil] = useState(vehicle.maintenance_until || '')
  const [saving, setSaving] = useState(false)

  const needsDetails = status !== 'ACTIVE'

  const handleSave = async () => {
    if (needsDetails && !breakdown.trim()) return
    setSaving(true)
    await onSave(status, breakdown.trim() || null, maintenanceUntil || null)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="glass rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-white font-semibold mb-0.5">{vehicle.name}</h2>
        <div className="mb-4"><VehicleNumberBadge number={vehicle.fleet_number} plate={vehicle.plate} /></div>

        {/* Status buttons */}
        <div className="flex gap-2 mb-4">
          {(['ACTIVE', 'BROKEN', 'MAINTENANCE'] as VehicleStatus[]).map(s => {
            const cfg = VEHICLE_STATUS_CONFIG[s]
            const selected = status === s
            return (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                  selected ? cfg.bg : 'bg-white/5 border-white/10 text-white/40'
                }`}
                style={selected ? { color: cfg.color } : {}}
              >
                {cfg.label}
              </button>
            )
          })}
        </div>

        {/* Reason */}
        {needsDetails && (
          <div className="mb-4">
            <label className="text-xs text-white/40 mb-1 block">
              {status === 'BROKEN' ? 'Причина неисправности *' : 'Описание / причина *'}
            </label>
            <textarea
              value={breakdown}
              onChange={e => setBreakdown(e.target.value)}
              placeholder={status === 'BROKEN' ? 'Например: течь масла, не заводится…' : 'Например: плановое ТО, замена резины…'}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30 resize-none"
              rows={3}
              autoFocus
            />
          </div>
        )}

        {/* Expected return date — MAINTENANCE only */}
        {status === 'MAINTENANCE' && (
          <div className="mb-4">
            <label className="text-xs text-white/40 mb-1 block">Ожидаемая дата возврата</label>
            <input
              type="date"
              value={maintenanceUntil}
              onChange={e => setMaintenanceUntil(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
            />
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-white/5 text-white/50 text-sm">
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (needsDetails && !breakdown.trim())}
            className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-40"
          >
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}
