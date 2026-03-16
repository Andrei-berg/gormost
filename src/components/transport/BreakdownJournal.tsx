'use client'
import { useState } from 'react'
import type {
  VehicleBreakdownWithVehicle, VehicleBreakdownSeverity, VehicleBreakdownStatus,
  Vehicle, User,
} from '@/types'
import {
  VEHICLE_BREAKDOWN_SEVERITY_CONFIG, VEHICLE_BREAKDOWN_STATUS_CONFIG, VEHICLE_TYPE_CONFIG,
} from '@/types'
import { createBreakdown, updateBreakdownStatus } from '@/lib/api'

interface Props {
  breakdowns: VehicleBreakdownWithVehicle[]
  vehicles: Vehicle[]         // all active vehicles (for "add breakdown" dropdown)
  currentUser: User
  canEdit: boolean
  onRefresh: () => void
}

// ---- Add breakdown modal ----
function AddBreakdownModal({
  vehicles,
  currentUser,
  onSave,
  onClose,
}: {
  vehicles: Vehicle[]
  currentUser: User
  onSave: () => void
  onClose: () => void
}) {
  const [vehicleId, setVehicleId]   = useState('')
  const [description, setDesc]      = useState('')
  const [severity, setSeverity]     = useState<VehicleBreakdownSeverity>('MINOR')
  const [notes, setNotes]           = useState('')
  const [saving, setSaving]         = useState(false)

  const handleSave = async () => {
    if (!vehicleId || !description.trim()) return
    setSaving(true)
    try {
      await createBreakdown({
        vehicle_id:    vehicleId,
        reported_by:   currentUser.user_id,
        description:   description.trim(),
        severity,
        mechanic_notes: notes.trim() || null,
      })
      onSave()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="glass rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-white font-semibold mb-4">Зафиксировать дефект / поломку</h2>

        <div className="mb-3">
          <label className="text-xs text-white/40 mb-1 block">Транспортное средство *</label>
          <select
            value={vehicleId}
            onChange={e => setVehicleId(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
          >
            <option value="">— выберите ТС —</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>
                {VEHICLE_TYPE_CONFIG[v.vehicle_type].emoji} {v.name} · {v.plate}
                {v.fleet_number ? ` (№${v.fleet_number})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="text-xs text-white/40 mb-1 block">Описание дефекта *</label>
          <textarea
            value={description}
            onChange={e => setDesc(e.target.value)}
            placeholder="Что случилось? Например: течь масла из двигателя, не заводится…"
            rows={3}
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30 resize-none"
          />
        </div>

        <div className="mb-3">
          <label className="text-xs text-white/40 mb-2 block">Степень серьёзности</label>
          <div className="flex gap-2">
            {(['MINOR', 'MAJOR', 'CRITICAL'] as VehicleBreakdownSeverity[]).map(s => {
              const cfg = VEHICLE_BREAKDOWN_SEVERITY_CONFIG[s]
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                    severity === s ? cfg.bg : 'bg-white/5 border-white/10 text-white/40'
                  }`}
                  style={severity === s ? { color: cfg.color } : {}}
                >
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs text-white/40 mb-1 block">Заметки механика (необязательно)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Предварительный диагноз, что нужно…"
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30 resize-none"
          />
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-white/5 text-white/50 text-sm">
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !vehicleId || !description.trim()}
            className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-40"
          >
            {saving ? 'Сохранение…' : 'Зафиксировать'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Update status modal ----
function UpdateStatusModal({
  breakdown,
  onSave,
  onClose,
}: {
  breakdown: VehicleBreakdownWithVehicle
  onSave: () => void
  onClose: () => void
}) {
  const [status, setStatus]   = useState<VehicleBreakdownStatus>(breakdown.status)
  const [resolution, setRes]  = useState(breakdown.resolution_notes || '')
  const [mechNotes, setMech]  = useState(breakdown.mechanic_notes || '')
  const [saving, setSaving]   = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateBreakdownStatus(breakdown.id, status, resolution.trim() || null, mechNotes.trim() || null)
      onSave()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="glass rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-white font-semibold mb-1">Обновить статус дефекта</h2>
        <p className="text-white/30 text-xs mb-4">
          {breakdown.vehicle.name} · {breakdown.vehicle.plate}
        </p>
        <p className="text-white/60 text-sm bg-white/5 rounded-lg px-3 py-2 mb-4">
          {breakdown.description}
        </p>

        <div className="mb-3">
          <label className="text-xs text-white/40 mb-2 block">Статус</label>
          <div className="flex gap-2">
            {(['OPEN', 'IN_REPAIR', 'RESOLVED'] as VehicleBreakdownStatus[]).map(s => {
              const cfg = VEHICLE_BREAKDOWN_STATUS_CONFIG[s]
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                    status === s ? cfg.bg : 'bg-white/5 border-white/10 text-white/40'
                  }`}
                  style={status === s ? { color: cfg.color } : {}}
                >
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </div>

        {status === 'RESOLVED' && (
          <div className="mb-3">
            <label className="text-xs text-white/40 mb-1 block">Что было сделано *</label>
            <textarea
              value={resolution}
              onChange={e => setRes(e.target.value)}
              placeholder="Опишите выполненный ремонт…"
              rows={2}
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30 resize-none"
            />
          </div>
        )}

        <div className="mb-4">
          <label className="text-xs text-white/40 mb-1 block">Заметки механика</label>
          <textarea
            value={mechNotes}
            onChange={e => setMech(e.target.value)}
            placeholder="Диагноз, запчасти, рекомендации…"
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30 resize-none"
          />
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-white/5 text-white/50 text-sm">
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (status === 'RESOLVED' && !resolution.trim())}
            className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-40"
          >
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Main component ----
export default function BreakdownJournal({ breakdowns, vehicles, currentUser, canEdit, onRefresh }: Props) {
  const [showAdd, setShowAdd]           = useState(false)
  const [editItem, setEditItem]         = useState<VehicleBreakdownWithVehicle | null>(null)
  const [filterStatus, setFilterStatus] = useState<VehicleBreakdownStatus | 'ALL'>('ALL')

  const filtered = filterStatus === 'ALL'
    ? breakdowns
    : breakdowns.filter(b => b.status === filterStatus)

  // Vehicles with BROKEN/MAINTENANCE status that have no breakdown entry
  const breakdownVehicleIds = new Set(breakdowns.map(b => b.vehicle_id))
  const unregisteredBroken = vehicles.filter(
    v => (v.status === 'BROKEN' || v.status === 'MAINTENANCE') && !breakdownVehicleIds.has(v.id)
  )

  const openCount = breakdowns.filter(b => b.status === 'OPEN').length
  const inRepair  = breakdowns.filter(b => b.status === 'IN_REPAIR').length

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {openCount > 0 && (
            <span className="text-xs bg-red-500/20 border border-red-500/30 text-red-400 px-2 py-1 rounded-lg">
              {openCount} открытых
            </span>
          )}
          {inRepair > 0 && (
            <span className="text-xs bg-orange-500/20 border border-orange-500/30 text-orange-400 px-2 py-1 rounded-lg">
              {inRepair} в ремонте
            </span>
          )}
          {unregisteredBroken.length > 0 && (
            <span className="text-xs bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 px-2 py-1 rounded-lg">
              {unregisteredBroken.length} без карточки
            </span>
          )}
        </div>
        {canEdit && (
          <button
            onClick={() => setShowAdd(true)}
            className="px-3 py-1.5 rounded-lg bg-red-600/20 border border-red-500/30 text-red-400 text-sm hover:bg-red-600/30 transition-colors"
          >
            + Зафиксировать дефект
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(['ALL', 'OPEN', 'IN_REPAIR', 'RESOLVED'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === s ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'
            }`}
          >
            {s === 'ALL' ? 'Все' : VEHICLE_BREAKDOWN_STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {/* Unregistered broken vehicles — no breakdown entry yet */}
      {unregisteredBroken.length > 0 && (
        <div className="mb-4">
          <div className="text-[11px] font-semibold text-yellow-400/60 uppercase tracking-widest mb-2">
            Сломаны / На ТО — без карточки дефекта
          </div>
          <div className="space-y-2">
            {unregisteredBroken.map(v => {
              const typeCfg   = VEHICLE_TYPE_CONFIG[v.vehicle_type]
              const statusCfg = v.status === 'BROKEN'
                ? { label: 'Сломан', color: '#ef4444', bg: 'bg-red-500/10 border-red-500/20' }
                : { label: 'ТО / Ремонт', color: '#f97316', bg: 'bg-orange-500/10 border-orange-500/20' }
              return (
                <div key={v.id} className={`glass rounded-xl px-4 py-3 border flex items-center gap-3 ${statusCfg.bg}`}>
                  <span className="text-xl">{typeCfg.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium">{v.name}</div>
                    <div className="text-white/30 text-xs font-mono">{v.plate}{v.unit ? ` · ${v.unit}` : ''}</div>
                    {v.breakdown_details && (
                      <div className="text-white/50 text-xs mt-0.5">{v.breakdown_details}</div>
                    )}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full border" style={{ color: statusCfg.color, borderColor: statusCfg.color + '40' }}>
                    {statusCfg.label}
                  </span>
                  {canEdit && (
                    <button
                      onClick={() => setShowAdd(true)}
                      className="text-xs px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors whitespace-nowrap"
                    >
                      + Карточку
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Breakdown list */}
      {filtered.length === 0 && unregisteredBroken.length === 0 ? (
        <div className="text-center text-white/20 py-16">
          <div className="text-4xl mb-3">✅</div>
          <div>Дефектов нет</div>
        </div>
      ) : filtered.length === 0 ? null : (
        <div className="space-y-3">
          {filtered.map(b => {
            const severityCfg = VEHICLE_BREAKDOWN_SEVERITY_CONFIG[b.severity]
            const statusCfg   = VEHICLE_BREAKDOWN_STATUS_CONFIG[b.status]
            const typeCfg     = VEHICLE_TYPE_CONFIG[b.vehicle.vehicle_type]
            const date        = new Date(b.reported_at).toLocaleDateString('ru-RU', {
              day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
            })

            return (
              <div
                key={b.id}
                className={`glass rounded-xl p-4 border ${
                  b.status === 'RESOLVED' ? 'border-transparent opacity-60' : severityCfg.bg
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{typeCfg.emoji}</span>
                    <div>
                      <div className="text-white font-medium text-sm">{b.vehicle.name}</div>
                      <div className="text-white/30 text-xs">{b.vehicle.plate}</div>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-lg border ${severityCfg.bg}`} style={{ color: severityCfg.color }}>
                      {severityCfg.label}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-lg border ${statusCfg.bg}`} style={{ color: statusCfg.color }}>
                      {statusCfg.label}
                    </span>
                  </div>
                </div>

                <p className="text-white/80 text-sm mb-2">{b.description}</p>

                {b.mechanic_notes && (
                  <p className="text-white/40 text-xs italic mb-2">🔧 {b.mechanic_notes}</p>
                )}
                {b.resolution_notes && (
                  <p className="text-green-400 text-xs mb-2">✓ {b.resolution_notes}</p>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-white/25 text-xs">{date}</span>
                  {canEdit && b.status !== 'RESOLVED' && (
                    <button
                      onClick={() => setEditItem(b)}
                      className="text-xs text-white/40 hover:text-white/70 px-2 py-1 rounded hover:bg-white/10 transition-colors"
                    >
                      Обновить статус
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showAdd && (
        <AddBreakdownModal
          vehicles={vehicles}
          currentUser={currentUser}
          onSave={onRefresh}
          onClose={() => setShowAdd(false)}
        />
      )}
      {editItem && (
        <UpdateStatusModal
          breakdown={editItem}
          onSave={onRefresh}
          onClose={() => setEditItem(null)}
        />
      )}
    </>
  )
}
