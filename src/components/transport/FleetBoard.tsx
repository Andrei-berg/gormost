'use client'
import { useConfirm } from '@/components/ConfirmDialog'
import { useState, useMemo } from 'react'
import type { Vehicle, VehicleStatus, VehicleType, VehicleWithAssignments, User } from '@/types'
import { VEHICLE_STATUS_CONFIG, VEHICLE_TYPE_CONFIG } from '@/types'
import { updateVehicleStatus, deleteVehicle } from '@/lib/api-client'
import VehicleStatusModal from './VehicleStatusModal'
import VehicleForm from './VehicleForm'
import FleetTable from './FleetTable'

interface Props {
  vehicles: VehicleWithAssignments[]
  drivers: User[]
  canEdit: boolean
  onRefresh: () => void
}

// Export fleet data to CSV grouped by vehicle type (matches авто.xlsx format)
function exportFleetCsv(vehicles: Vehicle[]) {
  const STATUS_RU: Record<string, string> = {
    ACTIVE:      'Исправен',
    BROKEN:      'Неисправен',
    MAINTENANCE: 'В сервисе',
  }

  const typeOrder = Object.keys(VEHICLE_TYPE_CONFIG) as VehicleType[]
  const grouped = new Map<VehicleType, Vehicle[]>()
  for (const t of typeOrder) grouped.set(t, [])
  for (const v of vehicles) grouped.get(v.vehicle_type)?.push(v)

  const esc = (s: string | null | undefined) => {
    const val = s ?? ''
    return val.includes(',') || val.includes('"') || val.includes('\n')
      ? `"${val.replace(/"/g, '""')}"`
      : val
  }

  const header = ['№', 'Гос.рег.номер', 'Назв. ТС', 'Классификация ТС', 'Базовое шасси',
                  'Оснащение / Комплектация', 'Участок', 'Год', 'Состояние',
                  'Место нахождения', 'Командировка', 'Примечание']

  const rows: string[] = []
  for (const [type, group] of grouped) {
    if (group.length === 0) continue
    const cfg = VEHICLE_TYPE_CONFIG[type]
    rows.push(cfg.emoji + ' ' + cfg.label)
    rows.push(header.join(','))
    group.forEach((v, i) => {
      rows.push([
        i + 1,
        esc(v.plate),
        esc(v.name),
        esc(v.make ? `${v.make}${v.model ? ' ' + v.model : ''}` : cfg.label),
        esc(v.chassis),
        esc(v.equipment_specs),
        esc(v.unit),
        v.year ?? '',
        STATUS_RU[v.status] ?? v.status,
        esc(v.current_location),
        esc(v.deployment),
        esc(v.notes),
      ].join(','))
    })
    rows.push('')
  }

  const bom = '\uFEFF'
  const blob = new Blob([bom + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `автопарк_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

function daysLabel(n: number): string {
  if (n === 0) return 'сегодня'
  if (n === 1) return '1 день'
  if (n < 5) return `${n} дня`
  return `${n} дней`
}

function VehicleSpecs({ v }: { v: Vehicle }) {
  const parts: string[] = []
  if (v.year)         parts.push(String(v.year))
  if (v.payload_kg)   parts.push(`${(v.payload_kg / 1000).toFixed(1)} т`)
  if (v.seats)        parts.push(`${v.seats} мест`)
  if (v.max_height_m) parts.push(`↑${v.max_height_m} м`)
  if (v.has_water_tank) parts.push('цистерна')
  if (v.garage_location) parts.push(v.garage_location)
  if (parts.length === 0) return null
  return <div className="text-[11px] text-white/25 mt-0.5">{parts.join(' · ')}</div>
}

type ViewMode = 'tiles' | 'table'

export default function FleetBoard({ vehicles, drivers, canEdit, onRefresh }: Props) {
  const confirmDialog = useConfirm()
  const [statusVehicle, setStatusVehicle] = useState<Vehicle | null>(null)
  const [editVehicle, setEditVehicle]     = useState<Vehicle | null>(null)
  const [showAddForm, setShowAddForm]     = useState(false)
  const [view, setView]                   = useState<ViewMode>('tiles')

  // Filters
  const [search, setSearch]           = useState('')
  const [filterStatus, setFilterStatus] = useState<VehicleStatus | 'ALL'>('ALL')
  const [filterType, setFilterType]   = useState<VehicleType | 'ALL'>('ALL')

  const filtered = useMemo(() => {
    let list = [...vehicles]

    if (filterStatus !== 'ALL')
      list = list.filter(v => v.status === filterStatus)

    if (filterType !== 'ALL')
      list = list.filter(v => v.vehicle_type === filterType)

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(v =>
        v.plate.toLowerCase().includes(q) ||
        v.name.toLowerCase().includes(q) ||
        (v.unit ?? '').toLowerCase().includes(q) ||
        (v.chassis ?? '').toLowerCase().includes(q)
      )
    }

    // Sort: BROKEN first → MAINTENANCE → ACTIVE
    const order: Record<VehicleStatus, number> = { BROKEN: 0, MAINTENANCE: 1, ACTIVE: 2 }
    list.sort((a, b) => order[a.status] - order[b.status])

    return list
  }, [vehicles, filterStatus, filterType, search])

  // Used types for filter dropdown
  const usedTypes = useMemo(() => {
    const types = new Set(vehicles.map(v => v.vehicle_type))
    return (Object.keys(VEHICLE_TYPE_CONFIG) as VehicleType[]).filter(t => types.has(t))
  }, [vehicles])

  const handleDelete = async (v: Vehicle) => {
    if (!(await confirmDialog(`Удалить «${v.name}» (${v.plate})?`, { confirmLabel: 'Удалить' }))) return
    await deleteVehicle(v.id)
    onRefresh()
  }

  const handleSaveStatus = async (
    status: VehicleStatus,
    breakdown: string | null,
    maintenanceUntil: string | null
  ) => {
    if (!statusVehicle) return
    await updateVehicleStatus(statusVehicle.id, status, breakdown, maintenanceUntil)
    onRefresh()
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск: номер, участок, шасси…"
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/25 placeholder:text-white/20 w-56"
        />

        {/* Status filter */}
        <div className="flex rounded-lg overflow-hidden border border-white/10">
          {(['ALL', 'ACTIVE', 'BROKEN', 'MAINTENANCE'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 text-xs transition-colors ${
                filterStatus === s
                  ? 'bg-white/15 text-white'
                  : 'bg-white/5 text-white/35 hover:bg-white/10'
              }`}
            >
              {s === 'ALL' ? 'Все' : VEHICLE_STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as VehicleType | 'ALL')}
          className="form-select text-xs px-3 py-2"
        >
          <option value="ALL">Все типы</option>
          {usedTypes.map(t => (
            <option key={t} value={t}>
              {VEHICLE_TYPE_CONFIG[t].emoji} {VEHICLE_TYPE_CONFIG[t].label}
            </option>
          ))}
        </select>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Count */}
        <span className="text-xs text-white/25">
          {filtered.length} из {vehicles.length}
        </span>

        {/* View toggle */}
        <div className="flex rounded-lg overflow-hidden border border-white/10">
          <button
            onClick={() => setView('tiles')}
            title="Плитки"
            className={`px-3 py-2 text-sm transition-colors ${view === 'tiles' ? 'bg-white/15 text-white' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}
          >
            ⊞
          </button>
          <button
            onClick={() => setView('table')}
            title="Таблица"
            className={`px-3 py-2 text-sm transition-colors ${view === 'table' ? 'bg-white/15 text-white' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}
          >
            ≡
          </button>
        </div>

        {/* Export */}
        <button
          onClick={() => exportFleetCsv(vehicles)}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/40 text-xs hover:bg-white/10 hover:text-white/60 transition-colors"
        >
          ↓ CSV
        </button>

        {/* Add */}
        {canEdit && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-3 py-2 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs hover:bg-blue-600/30 transition-colors"
          >
            + Добавить ТС
          </button>
        )}
      </div>

      {/* Table view */}
      {view === 'table' && (
        <FleetTable
          vehicles={filtered}
          canEdit={canEdit}
          onEditStatus={setStatusVehicle}
          onEditVehicle={setEditVehicle}
          onDeleteVehicle={handleDelete}
        />
      )}

      {/* Tiles view */}
      {view === 'tiles' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(v => {
            const cfg     = VEHICLE_STATUS_CONFIG[v.status]
            const typeCfg = VEHICLE_TYPE_CONFIG[v.vehicle_type]
            const since   = v.status_changed_at || v.updated_at
            const days    = daysSince(since)
            const isStale = v.status !== 'ACTIVE' && days >= 3

            return (
              <div
                key={v.id}
                className={`glass rounded-xl p-4 border ${
                  isStale ? 'border-red-500/40' : v.status === 'BROKEN' ? 'border-red-500/20' : 'border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-2xl shrink-0">{typeCfg.emoji}</span>
                    <div className="min-w-0">
                      <div className="text-white font-medium text-sm truncate">{v.name}</div>
                      <div className="text-xs text-white/30">
                        {v.plate}
                        {v.fleet_number ? ` · №${v.fleet_number}` : ''}
                        {' · '}{typeCfg.label}
                      </div>
                      <VehicleSpecs v={v} />
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-lg border shrink-0 ${cfg.bg}`}
                    style={{ color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                </div>

                {v.unit && (
                  <div className="text-[11px] text-white/30 mb-2">📍 {v.unit}{v.deployment ? ` · ${v.deployment}` : ''}</div>
                )}

                {v.status !== 'ACTIVE' && (
                  <div className={`rounded-lg px-3 py-2 mb-3 text-xs space-y-1 ${
                    isStale ? 'bg-red-500/10 border border-red-500/30' : 'bg-white/5'
                  }`}>
                    {v.breakdown_details && (
                      <div className="text-white/70">{v.breakdown_details}</div>
                    )}
                    <div className="flex items-center justify-between text-white/40">
                      <span>{daysLabel(days)}</span>
                      {isStale && <span className="text-red-400 font-medium">⚠ Долго в ремонте</span>}
                    </div>
                    {v.maintenance_until && v.status === 'MAINTENANCE' && (
                      <div className="text-blue-400">
                        Возврат: {new Date(v.maintenance_until).toLocaleDateString('ru-RU')}
                      </div>
                    )}
                  </div>
                )}

                {v.status === 'ACTIVE' && (
                  <div className="mb-3">
                    {v.assignments.length > 0 ? (
                      <div className="space-y-1">
                        {v.assignments.map(a => (
                          <div key={a.id} className="bg-white/5 rounded-lg px-2 py-1.5 text-xs text-white/60 flex items-center gap-2">
                            <span className="text-white/30 font-mono shrink-0">
                              {a.plan_item?.time_start?.slice(0, 5) || '?'}–{a.plan_item?.time_end?.slice(0, 5) || '?'}
                            </span>
                            <span className="truncate">{a.plan_item?.location}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-green-400">Свободен сегодня</div>
                    )}
                  </div>
                )}

                {canEdit && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setStatusVehicle(v)}
                      className="flex-1 py-1.5 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 text-xs transition-colors"
                    >
                      Статус
                    </button>
                    <button
                      onClick={() => setEditVehicle(v)}
                      className="flex-1 py-1.5 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 text-xs transition-colors"
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => handleDelete(v)}
                      className="py-1.5 px-2.5 rounded-lg bg-red-500/10 text-red-400/60 hover:bg-red-500/20 hover:text-red-400 text-xs transition-colors"
                      title="Удалить ТС"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="col-span-3 text-center text-white/20 py-20">
              <div className="text-4xl mb-3">🔍</div>
              <div>Ничего не найдено</div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {statusVehicle && (
        <VehicleStatusModal
          vehicle={statusVehicle}
          onSave={handleSaveStatus}
          onClose={() => setStatusVehicle(null)}
        />
      )}
      {(showAddForm || editVehicle) && (
        <VehicleForm
          vehicle={editVehicle ?? undefined}
          drivers={drivers}
          onSave={onRefresh}
          onClose={() => { setShowAddForm(false); setEditVehicle(null) }}
        />
      )}
    </>
  )
}
