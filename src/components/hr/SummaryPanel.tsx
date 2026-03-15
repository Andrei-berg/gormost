'use client'
import type { EnrichedEmployee, EmployeeStatusType, Service, UserWithAssignment } from '@/types'
import { SERVICE_META } from '@/types'
import { getCurrentShift, isWorkerOnDuty } from '@/lib/shifts'

const ABSENT_STATUSES: EmployeeStatusType[] = [
  'Otgul', 'Bolnichniy', 'Otpusk', 'Uvolen',
  'Komandirovka', 'Uchebniy_otpusk', 'Dekret',
  'Mobilizovan', 'SVO', 'Troydoustroyen_s_SVO',
]

interface Props {
  employees: EnrichedEmployee[]
  services: Service[]
  assignmentMap?: Map<string, UserWithAssignment['assignment']>
}

export default function SummaryPanel({ employees, services, assignmentMap }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const shift = getCurrentShift()

  const total = employees.length
  const activeTotal = employees.filter(e => !ABSENT_STATUSES.includes(e.currentStatus)).length

  // On duty today by schedule calculation
  const todayDate = new Date(today)
  const onDutyTotal = assignmentMap
    ? employees.filter(e => {
        const assign = assignmentMap.get(e.user.user_id)
        if (!assign || !assign.schedule_code) return false
        return isWorkerOnDuty({ ...assign, schedule_code: assign.schedule_code }, todayDate)
      }).length
    : null

  const tiles = services
    .map(svc => {
      const svcEmps = employees.filter(e => e.user.service_id === svc.service_id)
      if (svcEmps.length === 0) return null
      const svcTotal = svcEmps.length
      const svcActive = svcEmps.filter(e => !ABSENT_STATUSES.includes(e.currentStatus)).length
      const svcOnDuty = assignmentMap
        ? svcEmps.filter(e => {
            const assign = assignmentMap.get(e.user.user_id)
            if (!assign || !assign.schedule_code) return false
            return isWorkerOnDuty({ ...assign, schedule_code: assign.schedule_code }, todayDate)
          }).length
        : null
      return { svc, svcTotal, svcActive, svcOnDuty }
    })
    .filter((t): t is NonNullable<typeof t> => t !== null)

  if (tiles.length === 0) return null

  return (
    <div className="mb-6 space-y-4">
      {/* Top-level summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryTile label="Всего сотрудников" value={total} color="text-white/80" />
        <SummaryTile label="На работе сегодня" value={activeTotal} color="text-green-400" />
        {onDutyTotal !== null && (
          <SummaryTile
            label={`На дежурстве (Смена ${shift.shiftNumber})`}
            value={onDutyTotal}
            color="text-blue-400"
          />
        )}
        <SummaryTile label="Служб" value={tiles.length} color="text-violet-400" />
      </div>

      {/* Per-service breakdown */}
      <div>
        <div className="text-xs text-white/40 uppercase tracking-widest mb-3">По службам</div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {tiles.map(({ svc, svcTotal, svcActive, svcOnDuty }) => {
            const meta = SERVICE_META[svc.service_id]
            return (
              <div key={svc.service_id} className="glass rounded-xl p-3 min-w-[130px] shrink-0 border border-white/5">
                <div className="text-xl mb-1">{meta?.emoji ?? '📋'}</div>
                <div className="text-xs text-white/60 mb-2 leading-tight">{svc.service_name}</div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/30">Всего</span>
                    <span className="text-sm font-bold text-white/80">{svcTotal}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/30">На работе</span>
                    <span className="text-sm font-bold text-green-400">{svcActive}</span>
                  </div>
                  {svcOnDuty !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/30">Дежурство</span>
                      <span className="text-sm font-bold text-blue-400">{svcOnDuty}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SummaryTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="glass rounded-xl p-4 border border-white/5">
      <div className={`text-3xl font-bold font-mono ${color}`}>{value}</div>
      <div className="text-xs text-white/40 mt-1 leading-tight">{label}</div>
    </div>
  )
}
