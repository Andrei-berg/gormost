'use client'
import type { Vehicle, VehicleWithAssignments } from '@/types'
import { VEHICLE_STATUS_CONFIG, VEHICLE_TYPE_CONFIG } from '@/types'
import VehicleNumberBadge from '@/components/VehicleNumberBadge'

interface Props {
  vehicles: VehicleWithAssignments[]
  canEdit: boolean
  onEditStatus: (v: Vehicle) => void
  onEditVehicle: (v: Vehicle) => void
  onDeleteVehicle: (v: Vehicle) => void
}

export default function FleetTable({ vehicles, canEdit, onEditStatus, onEditVehicle, onDeleteVehicle }: Props) {
  if (vehicles.length === 0) {
    return (
      <div className="text-center text-white/20 py-20">
        <div className="text-4xl mb-3">🔍</div>
        <div>Ничего не найдено</div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/8">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/8 bg-white/3">
            <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-white/30 uppercase tracking-wide">Тип</th>
            <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-white/30 uppercase tracking-wide">Название / Номер</th>
            <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-white/30 uppercase tracking-wide">Шасси / Оснащение</th>
            <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-white/30 uppercase tracking-wide">Участок</th>
            <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-white/30 uppercase tracking-wide w-12">Год</th>
            <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-white/30 uppercase tracking-wide">Статус</th>
            <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-white/30 uppercase tracking-wide">Место / Командировка</th>
            {canEdit && <th className="px-3 py-2.5 w-28" />}
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => {
            const typeCfg   = VEHICLE_TYPE_CONFIG[v.vehicle_type]
            const statusCfg = VEHICLE_STATUS_CONFIG[v.status]
            const location  = v.deployment
              ? `📍 ${v.deployment}`
              : (v.current_location || '—')

            return (
              <tr
                key={v.id}
                className={`border-b border-white/5 hover:bg-white/3 transition-colors ${
                  v.status === 'BROKEN' ? 'bg-red-500/5' : ''
                }`}
              >
                {/* Type */}
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span title={typeCfg.label} className="text-base">{typeCfg.emoji}</span>
                </td>

                {/* Name / plate */}
                <td className="px-3 py-2.5">
                  <div className="text-white font-medium text-xs leading-tight">{v.name}</div>
                  <div className="mt-1">
                    <VehicleNumberBadge number={v.fleet_number} plate={v.plate} size="sm" />
                  </div>
                </td>

                {/* Chassis / equipment */}
                <td className="px-3 py-2.5 max-w-[200px]">
                  {v.chassis && <div className="text-white/60 text-xs truncate">{v.chassis}</div>}
                  {v.equipment_specs && (
                    <div className="text-white/30 text-[11px] truncate mt-0.5" title={v.equipment_specs}>
                      {v.equipment_specs}
                    </div>
                  )}
                </td>

                {/* Unit */}
                <td className="px-3 py-2.5">
                  <span className="text-white/60 text-xs">{v.unit || '—'}</span>
                </td>

                {/* Year */}
                <td className="px-3 py-2.5">
                  <span className="text-white/40 text-xs font-mono">{v.year ?? '—'}</span>
                </td>

                {/* Status */}
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusCfg.bg}`}
                    style={{ color: statusCfg.color }}
                  >
                    {statusCfg.label}
                  </span>
                  {v.breakdown_details && (
                    <div className="text-red-400/60 text-[10px] mt-0.5 truncate max-w-[120px]" title={v.breakdown_details}>
                      {v.breakdown_details}
                    </div>
                  )}
                </td>

                {/* Location */}
                <td className="px-3 py-2.5">
                  <span className={`text-xs ${v.deployment ? 'text-amber-400/70' : 'text-white/40'}`}>
                    {location}
                  </span>
                </td>

                {/* Actions */}
                {canEdit && (
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex gap-1">
                      <button
                        onClick={() => onEditStatus(v)}
                        className="px-2 py-1 rounded bg-white/5 text-white/40 hover:bg-white/10 text-[11px] transition-colors"
                      >
                        Статус
                      </button>
                      <button
                        onClick={() => onEditVehicle(v)}
                        className="px-2 py-1 rounded bg-white/5 text-white/40 hover:bg-white/10 text-[11px] transition-colors"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => onDeleteVehicle(v)}
                        className="px-2 py-1 rounded bg-red-500/10 text-red-400/60 hover:bg-red-500/20 hover:text-red-400 text-[11px] transition-colors"
                        title="Удалить ТС"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
