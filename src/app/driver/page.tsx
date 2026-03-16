'use client'
import { useState, useEffect, useCallback } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import { fetchVehicleByDriver } from '@/lib/api'
import type { AuthSession, VehicleWithAssignments } from '@/types'
import { VEHICLE_STATUS_CONFIG, VEHICLE_TYPE_CONFIG } from '@/types'

export default function DriverPage() {
  return (
    <AuthGuard roles={['DRIVER']}>
      {(session) => <Content session={session} />}
    </AuthGuard>
  )
}

function Content({ session }: { session: AuthSession }) {
  const [vehicle, setVehicle] = useState<VehicleWithAssignments | null | undefined>(undefined)

  const today = new Date().toISOString().split('T')[0]

  const load = useCallback(async () => {
    const v = await fetchVehicleByDriver(session.user_id, today)
    setVehicle(v)
  }, [session.user_id, today])

  useEffect(() => { load() }, [load])

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <Header session={session} title="Мой транспорт" emoji="🚌" />

      {vehicle === undefined && (
        <div className="glass rounded-2xl p-8 text-center text-white/40">Загрузка...</div>
      )}

      {vehicle === null && (
        <div className="glass rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">🚗</div>
          <div className="text-white/60 text-sm">Авто не закреплено</div>
          <div className="text-white/30 text-xs mt-1">Обратитесь к главному механику</div>
        </div>
      )}

      {vehicle && (
        <div className="space-y-4">
          {/* Vehicle card */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{VEHICLE_TYPE_CONFIG[vehicle.vehicle_type]?.emoji ?? '🚗'}</span>
                  <h2 className="text-lg font-bold text-white">{vehicle.name}</h2>
                </div>
                {vehicle.fleet_number && (
                  <div className="text-white/40 text-xs">Гар. №{vehicle.fleet_number}</div>
                )}
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium border ${VEHICLE_STATUS_CONFIG[vehicle.status]?.bg ?? ''}`}
                style={{ color: VEHICLE_STATUS_CONFIG[vehicle.status]?.color }}>
                {VEHICLE_STATUS_CONFIG[vehicle.status]?.label ?? vehicle.status}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-white/40 text-xs mb-0.5">Гос. номер</div>
                <div className="text-white font-mono">{vehicle.plate}</div>
              </div>
              <div>
                <div className="text-white/40 text-xs mb-0.5">Тип</div>
                <div className="text-white/80">{VEHICLE_TYPE_CONFIG[vehicle.vehicle_type]?.label ?? vehicle.vehicle_type}</div>
              </div>
              {vehicle.make && (
                <div>
                  <div className="text-white/40 text-xs mb-0.5">Марка / Модель</div>
                  <div className="text-white/80">{vehicle.make}{vehicle.model ? ` ${vehicle.model}` : ''}</div>
                </div>
              )}
              {vehicle.year && (
                <div>
                  <div className="text-white/40 text-xs mb-0.5">Год выпуска</div>
                  <div className="text-white/80">{vehicle.year}</div>
                </div>
              )}
              {vehicle.garage_location && (
                <div>
                  <div className="text-white/40 text-xs mb-0.5">Место стоянки</div>
                  <div className="text-white/80">{vehicle.garage_location}</div>
                </div>
              )}
              {vehicle.current_location && (
                <div>
                  <div className="text-white/40 text-xs mb-0.5">Текущее местонахождение</div>
                  <div className="text-white/80">{vehicle.current_location}</div>
                </div>
              )}
            </div>

            {vehicle.breakdown_details && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {vehicle.breakdown_details}
              </div>
            )}
            {vehicle.notes && (
              <div className="mt-2 text-white/30 text-xs">{vehicle.notes}</div>
            )}
          </div>

          {/* Today's assignments */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white/70 mb-3">
              Задания на сегодня
              <span className="ml-2 text-white/30 font-normal">{today}</span>
            </h3>
            {vehicle.assignments.length === 0 ? (
              <div className="text-center py-6 text-white/25 text-sm">Нет заданий на сегодня</div>
            ) : (
              <div className="space-y-2">
                {vehicle.assignments.map(a => (
                  <div key={a.id} className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                    <div className="font-medium text-white/80 text-sm mb-1">
                      {a.plan_item?.work_description ?? 'Задание'}
                    </div>
                    {a.plan_item?.time_start && (
                      <div className="text-white/40 text-xs">
                        {a.plan_item.time_start}{a.plan_item.time_end ? ` — ${a.plan_item.time_end}` : ''}
                      </div>
                    )}
                    {a.notes && (
                      <div className="text-white/30 text-xs mt-1">{a.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
